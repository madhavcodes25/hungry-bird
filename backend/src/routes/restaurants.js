const express = require('express');
const pool = require('../db');
const { AppError } = require('../errors');

const router = express.Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, restaurant_name, address, cuisine_type FROM restaurant_profile ORDER BY restaurant_name'
  );
  res.json(rows);
});

router.get('/:id/menu', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError('invalid restaurant id');
  const r = await pool.query(
    'SELECT id, restaurant_name, address, cuisine_type FROM restaurant_profile WHERE id = $1', [id]
  );
  if (!r.rows[0]) throw new AppError('restaurant not found', 404);
  const m = await pool.query(
    'SELECT id, name, price FROM menu_item WHERE restaurant_id = $1 AND is_available = TRUE ORDER BY name', [id]
  );
  res.json({ restaurant: r.rows[0], menu: m.rows });
});

module.exports = router;