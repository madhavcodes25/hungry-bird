const express = require('express');
const pool = require('../db');
const { AppError } = require('../errors');
const { requireAuth, requireRole } = require('../middleware/auth');
const { parseNewCoupon } = require('../validators');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const ROLES = ['customer', 'restaurant', 'delivery_partner', 'admin'];

function userIdFrom(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('invalid user id');
  return id;
}

// ---- users ----

router.get('/users', async (req, res) => {
  const { role, banned } = req.query;
  const where = [];
  const params = [];
  if (role !== undefined) {
    if (!ROLES.includes(role)) throw new AppError(`role must be one of: ${ROLES.join(', ')}`);
    params.push(role);
    where.push(`role = $${params.length}`);
  }
  if (banned !== undefined) {
    if (banned !== 'true' && banned !== 'false') throw new AppError("banned must be 'true' or 'false'");
    params.push(banned === 'true');
    where.push(`is_banned = $${params.length}`);
  }
  const { rows } = await pool.query(
    `SELECT id, name, email, role, phone, is_banned, created_at
     FROM "user" ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY id`,
    params
  );
  res.json(rows);
});

async function setBanned(req, res, banned) {
  const id = userIdFrom(req);
  const found = await pool.query('SELECT id, role FROM "user" WHERE id = $1', [id]);
  if (!found.rows[0]) throw new AppError('user not found', 404);
  if (banned && found.rows[0].role === 'admin') throw new AppError('admins cannot be banned', 403);

  const { rows } = await pool.query(
    'UPDATE "user" SET is_banned = $1 WHERE id = $2 RETURNING id, name, email, role, is_banned',
    [banned, id]
  );
  res.json(rows[0]);
}

router.post('/users/:id/ban', (req, res) => setBanned(req, res, true));
router.post('/users/:id/unban', (req, res) => setBanned(req, res, false));

// ---- coupons ----

router.get('/coupons', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, code, discount_type, discount_value, min_order_value, usage_limit, times_used, valid_until
     FROM coupon ORDER BY id DESC`
  );
  res.json(rows);
});

router.post('/coupons', async (req, res) => {
  const c = parseNewCoupon(req.body);
  try {
    const { rows } = await pool.query(
      `INSERT INTO coupon (code, discount_type, discount_value, min_order_value, usage_limit, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, code, discount_type, discount_value, min_order_value, usage_limit, times_used, valid_until`,
      [c.code, c.discountType, c.discountValue, c.minOrderValue, c.usageLimit, c.validUntil]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') throw new AppError('a coupon with this code already exists', 409);
    throw err;
  }
});

module.exports = router;
