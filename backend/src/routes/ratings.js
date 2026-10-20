const express = require('express');
const pool = require('../db');
const { AppError } = require('../errors');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Customer rates one of their own delivered orders. One rating per order.
router.post('/', requireAuth, requireRole('customer'), async (req, res) => {
  const { orderId, stars, comment } = req.body;
  if (!Number.isInteger(orderId) || orderId <= 0) throw new AppError('orderId must be a positive integer');
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new AppError('stars must be a whole number from 1 to 5');
  }
  let text = null;
  if (comment !== undefined && comment !== null) {
    if (typeof comment !== 'string' || comment.length > 500) {
      throw new AppError('comment must be text of at most 500 characters');
    }
    text = comment.trim() || null;
  }

  const { rows } = await pool.query(
    'SELECT id, customer_id, restaurant_id, status FROM "order" WHERE id = $1', [orderId]);
  const order = rows[0];
  if (!order || order.customer_id !== req.user.id) throw new AppError('order not found', 404);
  if (order.status !== 'delivered') {
    throw new AppError('you can rate an order only after it is delivered', 409);
  }

  try {
    const inserted = await pool.query(
      `INSERT INTO rating (order_id, customer_id, restaurant_id, stars, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, order_id, stars, comment`,
      [order.id, req.user.id, order.restaurant_id, stars, text]
    );
    res.status(201).json(inserted.rows[0]);
  } catch (err) {
    if (err.code === '23505') throw new AppError('this order is already rated', 409);   // UNIQUE(order_id)
    throw err;
  }
});

module.exports = router;
