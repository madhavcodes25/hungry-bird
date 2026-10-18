const pool = require('../db');
const { AppError } = require('../errors');
const { Order } = require('../domain/order');
const { getPaymentMethod } = require('../domain/payments');
const { CustomerNotifier, RestaurantNotifier, DeliveryPartnerNotifier } = require('../domain/observers');

const DELIVERY_PAYOUT = 40;                   
const round2 = (n) => Math.round(n * 100) / 100;

async function placeOrder({ customerId, restaurantId, items, paymentMethod, couponCode }) {
  const method = getPaymentMethod(paymentMethod);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: menu } = await client.query(
      `SELECT id, price FROM menu_item
       WHERE id = ANY($1) AND restaurant_id = $2 AND is_available = TRUE`,
      [items.map((i) => i.menuItemId), restaurantId]
    );
    const priceById = new Map(menu.map((m) => [m.id, Number(m.price)]));
    let subtotal = 0;
    for (const it of items) {
      if (!priceById.has(it.menuItemId)) {
        throw new AppError(`menu item ${it.menuItemId} is not available at this restaurant`);
      }
      subtotal += priceById.get(it.menuItemId) * it.quantity;
    }
    subtotal = round2(subtotal);

    let discount = 0;
    let couponId = null;
    if (couponCode) {
      const { rows } = await client.query('SELECT * FROM coupon WHERE code = $1 FOR UPDATE', [couponCode]);
      const c = rows[0];
      if (!c) throw new AppError('invalid coupon code');
      if (new Date(c.valid_until) < new Date()) throw new AppError('this coupon has expired');
      if (c.times_used >= c.usage_limit) throw new AppError('this coupon has been fully redeemed');
      if (subtotal < Number(c.min_order_value)) {
        throw new AppError(`this coupon needs an order of at least ${c.min_order_value}`);
      }
      const raw = c.discount_type === 'percent' ? (subtotal * Number(c.discount_value)) / 100 : Number(c.discount_value);
      discount = round2(Math.min(raw, subtotal));
      couponId = c.id;
      await client.query('UPDATE coupon SET times_used = times_used + 1 WHERE id = $1', [c.id]);
    }
    const total = round2(subtotal - discount);      

    const { rows: [order] } = await client.query(
      `INSERT INTO "order" (customer_id, restaurant_id, coupon_id, total_amount, discount_amount)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, status`,
      [customerId, restaurantId, couponId, total, discount]
    );
    for (const it of items) {
      await client.query(
        `INSERT INTO order_item (order_id, menu_item_id, quantity, price_at_order_time)
         VALUES ($1, $2, $3, $4)`,
        [order.id, it.menuItemId, it.quantity, priceById.get(it.menuItemId)]
      );
    }
    const result = method.pay(total);
    await client.query(
      'INSERT INTO payment (order_id, method, amount, status) VALUES ($1, $2, $3, $4)',
      [order.id, method.name, total, result.status]
    );
    await client.query('INSERT INTO delivery (order_id, payout_amount) VALUES ($1, $2)', [order.id, DELIVERY_PAYOUT]);

    await client.query('COMMIT');
    return { orderId: order.id, status: order.status, subtotal, discount, total,
             payment: { method: method.name, status: result.status } };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function userMayTouchOrder(db, row, user) {
  if (user.role === 'admin') return true;
  if (user.role === 'customer') return row.customer_id === user.id;
  if (user.role === 'restaurant') {
    const { rows } = await db.query(
      'SELECT 1 FROM restaurant_profile WHERE id = $1 AND user_id = $2', [row.restaurant_id, user.id]);
    return rows.length > 0;
  }
  if (user.role === 'delivery_partner') {
    const { rows } = await db.query(
      'SELECT 1 FROM delivery WHERE order_id = $1 AND delivery_partner_id = $2', [row.id, user.id]);
    return rows.length > 0;
  }
  return false;
}

async function updateStatus(orderId, user, action, forcedStatus) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM "order" WHERE id = $1 FOR UPDATE', [orderId]);
    const row = rows[0];
    if (!row || !(await userMayTouchOrder(client, row, user))) throw new AppError('order not found', 404);

    const order = new Order(row);
    for (const o of [new CustomerNotifier(), new RestaurantNotifier(), new DeliveryPartnerNotifier()]) {
      order.addObserver(o);
    }

    if (action === 'advance') order.advance(user.role);
    else if (action === 'cancel') order.cancel(user.role);
    else order.forceStatus(forcedStatus);

    await client.query('UPDATE "order" SET status = $1 WHERE id = $2', [order.status, order.id]);

    if (order.status === 'picked_up') {
      await client.query(`UPDATE delivery SET status = 'picked_up' WHERE order_id = $1`, [order.id]);
    } else if (order.status === 'delivered') {
      await client.query(`UPDATE delivery SET status = 'delivered' WHERE order_id = $1`, [order.id]);
      await client.query(`UPDATE payment SET status = 'completed' WHERE order_id = $1 AND method = 'cod'`, [order.id]);
    }

    await client.query('COMMIT');
    return { id: order.id, status: order.status };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getOrderDetails(orderId, user) {
  const { rows } = await pool.query('SELECT * FROM "order" WHERE id = $1', [orderId]);
  const row = rows[0];
  if (!row || !(await userMayTouchOrder(pool, row, user))) throw new AppError('order not found', 404);
  const items = (await pool.query(
    `SELECT oi.menu_item_id, m.name, oi.quantity, oi.price_at_order_time
     FROM order_item oi JOIN menu_item m ON m.id = oi.menu_item_id WHERE oi.order_id = $1`, [orderId])).rows;
  const payment = (await pool.query('SELECT method, amount, status FROM payment WHERE order_id = $1', [orderId])).rows[0];
  const delivery = (await pool.query(
    'SELECT status, delivery_partner_id, payout_amount FROM delivery WHERE order_id = $1', [orderId])).rows[0];
  return { order: row, items, payment, delivery };
}

module.exports = { placeOrder, updateStatus, getOrderDetails };