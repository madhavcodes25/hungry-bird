const express = require('express');
const pool = require('../db');
const { AppError } = require('../errors');

const router = express.Router();

function restaurantIdFrom(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('invalid restaurant id');
  return id;
}

// A restaurant whose owner is banned disappears from every public route.
const VISIBLE_RESTAURANT = `
  FROM restaurant_profile r
  JOIN "user" u ON u.id = r.user_id AND u.is_banned = FALSE`;

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.restaurant_name, r.address, r.cuisine_type,
            ROUND(AVG(g.stars), 1) AS avg_rating, COUNT(g.id)::int AS rating_count
     ${VISIBLE_RESTAURANT}
     LEFT JOIN rating g ON g.restaurant_id = r.id
     GROUP BY r.id
     ORDER BY r.restaurant_name`
  );
  res.json(rows);
});

router.get('/:id/menu', async (req, res) => {
  const id = restaurantIdFrom(req);
  const r = await pool.query(
    `SELECT r.id, r.restaurant_name, r.address, r.cuisine_type
     ${VISIBLE_RESTAURANT}
     WHERE r.id = $1`, [id]);
  if (!r.rows[0]) throw new AppError('restaurant not found', 404);
  const m = await pool.query(
    'SELECT id, name, price FROM menu_item WHERE restaurant_id = $1 AND is_available = TRUE ORDER BY name', [id]);
  res.json({ restaurant: r.rows[0], menu: m.rows });
});

router.get('/:id/ratings', async (req, res) => {
  const id = restaurantIdFrom(req);
  const r = await pool.query(
    `SELECT r.id ${VISIBLE_RESTAURANT} WHERE r.id = $1`, [id]);
  if (!r.rows[0]) throw new AppError('restaurant not found', 404);

  const summary = await pool.query(
    'SELECT ROUND(AVG(stars), 1) AS average, COUNT(*)::int AS count FROM rating WHERE restaurant_id = $1', [id]);
  const list = await pool.query(
    `SELECT g.stars, g.comment, split_part(u.name, ' ', 1) AS reviewer
     FROM rating g JOIN "user" u ON u.id = g.customer_id
     WHERE g.restaurant_id = $1
     ORDER BY g.id DESC
     LIMIT 50`, [id]);
  res.json({ average: summary.rows[0].average, count: summary.rows[0].count, ratings: list.rows });
});

module.exports = router;
