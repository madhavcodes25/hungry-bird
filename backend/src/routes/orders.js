const express = require('express');
const pool = require('../db');
const { AppError } = require('../errors');
const { requireAuth, requireRole } = require('../middleware/auth');
const { placeOrder, updateStatus, getOrderDetails } = require('../services/orderService');
const { STATUS_NAMES } = require('../domain/orderStates');

const router = express.Router();
const isPositiveInt = (n) => Number.isInteger(n) && n > 0;

function orderIdFrom(req) {
  const id = Number(req.params.id);
  if (!isPositiveInt(id)) throw new AppError('invalid order id');
  return id;
}

router.post('/', requireAuth, requireRole('customer'), async (req, res) => {
  const { restaurantId, items, paymentMethod, couponCode } = req.body;
  if (!isPositiveInt(restaurantId)) throw new AppError('restaurantId must be a positive integer');
  if (!Array.isArray(items) || items.length === 0) throw new AppError('items must be a non-empty array');
  for (const it of items) {
    if (!isPositiveInt(it?.menuItemId) || !isPositiveInt(it?.quantity)) {
      throw new AppError('each item needs a positive integer menuItemId and quantity');
    }
  }
  const result = await placeOrder({ customerId: req.user.id, restaurantId, items, paymentMethod, couponCode });
  res.status(201).json(result);
});

router.get('/', requireAuth, async (req, res) => {
  const { id, role } = req.user;
  let sql;
  let params = [id];
  if (role === 'customer') {
    sql = 'SELECT * FROM "order" WHERE customer_id = $1 ORDER BY created_at DESC';
  } else if (role === 'restaurant') {
    sql = `SELECT o.* FROM "order" o JOIN restaurant_profile r ON r.id = o.restaurant_id
           WHERE r.user_id = $1 ORDER BY o.created_at DESC`;
  } else if (role === 'delivery_partner') {
    sql = `SELECT o.* FROM "order" o JOIN delivery d ON d.order_id = o.id
           WHERE d.delivery_partner_id = $1 ORDER BY o.created_at DESC`;
  } else {
    sql = 'SELECT * FROM "order" ORDER BY created_at DESC';
    params = [];
  }
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

router.get('/:id', requireAuth, async (req, res) => {
  res.json(await getOrderDetails(orderIdFrom(req), req.user));
});

router.post('/:id/advance', requireAuth, requireRole('restaurant', 'delivery_partner'), async (req, res) => {
  res.json(await updateStatus(orderIdFrom(req), req.user, 'advance'));
});

router.post('/:id/cancel', requireAuth, requireRole('customer', 'restaurant', 'admin'), async (req, res) => {
  res.json(await updateStatus(orderIdFrom(req), req.user, 'cancel'));
});

router.post('/:id/force-status', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  if (!STATUS_NAMES.includes(status)) throw new AppError(`status must be one of: ${STATUS_NAMES.join(', ')}`);
  res.json(await updateStatus(orderIdFrom(req), req.user, 'force', status));
});

module.exports = router;