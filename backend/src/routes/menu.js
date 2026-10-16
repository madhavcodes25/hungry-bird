const express = require('express');
const pool = require('../db');
const { AppError } = require('../errors');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('restaurant'));

async function myRestaurantId(userId) {
  const { rows } = await pool.query('SELECT id FROM restaurant_profile WHERE user_id = $1', [userId]);
  if (!rows[0]) throw new AppError('restaurant profile not found', 404);
  return rows[0].id;
}

router.get('/mine', async (req, res) => {
  const rid = await myRestaurantId(req.user.id);
  const { rows } = await pool.query(
    'SELECT id, name, price, is_available FROM menu_item WHERE restaurant_id = $1 ORDER BY id', [rid]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, price } = req.body;
  if (typeof name !== 'string' || !name.trim() || typeof price !== 'number' || price < 0) {
    throw new AppError('name (text) and price (number, 0 or more) are required');
  }
  const rid = await myRestaurantId(req.user.id);
  const { rows } = await pool.query(
    `INSERT INTO menu_item (restaurant_id, name, price) VALUES ($1, $2, $3)
     RETURNING id, name, price, is_available`,
    [rid, name.trim(), price]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, price, is_available } = req.body;
  const rid = await myRestaurantId(req.user.id);
  const { rows } = await pool.query(
    `UPDATE menu_item
     SET name = COALESCE($1, name), price = COALESCE($2, price), is_available = COALESCE($3, is_available)
     WHERE id = $4 AND restaurant_id = $5
     RETURNING id, name, price, is_available`,
    [name ?? null, price ?? null, is_available ?? null, req.params.id, rid]
  );
  if (!rows[0]) throw new AppError('menu item not found', 404);
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const rid = await myRestaurantId(req.user.id);
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM menu_item WHERE id = $1 AND restaurant_id = $2', [req.params.id, rid]
    );
    if (!rowCount) throw new AppError('menu item not found', 404);
    res.status(204).end();
  } catch (err) {
    if (err.code === '23503') {
      throw new AppError('this item is in past orders, so mark it unavailable instead of deleting it', 409);
    }
    throw err;
  }
});

module.exports = router;