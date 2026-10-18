const { test, after } = require('node:test');
const assert = require('node:assert');
const pool = require('../src/db');
const { placeOrder } = require('../src/services/orderService');

after(() => pool.end());

test('a failure halfway through placing an order rolls everything back', async () => {
  const tag = Date.now();
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

  try {
    await assert.rejects(() => placeOrder({
      customerId: customer, restaurantId: restaurant,
      items: [{ menuItemId: item, quantity: 0 }], paymentMethod: 'cod',
    }));
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM "order" WHERE customer_id = $1', [customer]);
    assert.strictEqual(rows[0].n, 0);
  } finally {
    await pool.query('DELETE FROM "order" WHERE customer_id = $1', [customer]);
    await pool.query('DELETE FROM "user" WHERE id = ANY($1)', [[customer, owner]]);
  }
});