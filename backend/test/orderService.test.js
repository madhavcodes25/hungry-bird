// Database test: needs PostgreSQL running with db/schema.sql loaded (see backend/README.md).
const { test, after } = require('node:test');
const assert = require('node:assert');
const pool = require('../src/db');
const { placeOrder } = require('../src/services/orderService');

after(() => pool.end());

// Creates a customer, a restaurant and one menu item for a test, and returns their ids
async function setup(tag) {
  const insert = async (sql, params) => (await pool.query(sql, params)).rows[0].id;
  const customer = await insert(
    `INSERT INTO "user" (name, email, password_hash, role) VALUES ('T', $1, 'x', 'customer') RETURNING id`,
    [`c${tag}@test.com`]);
  const owner = await insert(
    `INSERT INTO "user" (name, email, password_hash, role) VALUES ('T', $1, 'x', 'restaurant') RETURNING id`,
    [`r${tag}@test.com`]);
  const restaurant = await insert(
    `INSERT INTO restaurant_profile (user_id, restaurant_name, address) VALUES ($1, 'T', 'T') RETURNING id`,
    [owner]);
  const item = await insert(
    `INSERT INTO menu_item (restaurant_id, name, price) VALUES ($1, 'T', 100) RETURNING id`,
    [restaurant]);
  return { customer, owner, restaurant, item };
}
async function cleanup({ customer, owner }) {
  await pool.query('DELETE FROM "order" WHERE customer_id = $1', [customer]);
  await pool.query('DELETE FROM "user" WHERE id = ANY($1)', [[customer, owner]]);
}

test('a failure halfway through placing an order rolls everything back', async () => {
  const t = await setup(Date.now());
  try {
    // quantity 0 breaks the CHECK on order_item AFTER the order row has been inserted.
    // The address is valid on purpose, so the failure really happens inside the transaction.
    await assert.rejects(() => placeOrder({
      customerId: t.customer, restaurantId: t.restaurant,
      items: [{ menuItemId: t.item, quantity: 0 }], paymentMethod: 'cod',
      deliveryAddress: '12 Test Street, Surat',
    }), (err) => {
      assert.ok(!/deliveryAddress/.test(err.message), 'it must fail for the quantity, not for the address');
      return true;
    });
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM "order" WHERE customer_id = $1', [t.customer]);
    assert.strictEqual(rows[0].n, 0);
  } finally {
    await cleanup(t);
  }
});

test('the delivery address is saved on the order, tidied, and is required', async () => {
  const t = await setup(Date.now() + 1);
  try {
    const result = await placeOrder({
      customerId: t.customer, restaurantId: t.restaurant,
      items: [{ menuItemId: t.item, quantity: 1 }], paymentMethod: 'cod',
      deliveryAddress: '  12 Test\n Street,   Surat  ',
    });
    assert.strictEqual(result.deliveryAddress, '12 Test Street, Surat');
    const { rows } = await pool.query('SELECT delivery_address FROM "order" WHERE id = $1', [result.orderId]);
    assert.strictEqual(rows[0].delivery_address, '12 Test Street, Surat');

    // a missing address is refused before anything is written
    await assert.rejects(() => placeOrder({
      customerId: t.customer, restaurantId: t.restaurant,
      items: [{ menuItemId: t.item, quantity: 1 }], paymentMethod: 'cod',
    }), /deliveryAddress is required/);
  } finally {
    await cleanup(t);
  }
});
