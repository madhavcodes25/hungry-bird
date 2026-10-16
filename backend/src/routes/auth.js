const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { AppError } = require('../errors');

const router = express.Router();
const SIGNUP_ROLES = ['customer', 'restaurant', 'delivery_partner'];   // admins are created by hand

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/signup', async (req, res) => {
  const { name, email, password, role, phone, restaurant_name, address, cuisine_type } = req.body;
  if ([name, email, password].some((v) => typeof v !== 'string' || !v.trim())) {
    throw new AppError('name, email and password are required');
  }
  if (!SIGNUP_ROLES.includes(role)) throw new AppError(`role must be one of: ${SIGNUP_ROLES.join(', ')}`);
  if (password.length < 6) throw new AppError('password must be at least 6 characters');
  if (role === 'restaurant' && !(restaurant_name && address)) {
    throw new AppError('restaurants need restaurant_name and address');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO "user" (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role`,
      [name.trim(), email.trim().toLowerCase(), passwordHash, role, phone || null]
    );
    const user = rows[0];
    if (role === 'restaurant') {
      await client.query(
        `INSERT INTO restaurant_profile (user_id, restaurant_name, address, cuisine_type)
         VALUES ($1, $2, $3, $4)`,
        [user.id, restaurant_name, address, cuisine_type || null]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ user, token: makeToken(user) });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') throw new AppError('email already registered', 409);
    throw err;
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError('email and password are required');
  }
  const { rows } = await pool.query(
    `SELECT id, name, email, role, password_hash, is_banned FROM "user" WHERE email = $1`,
    [email.trim().toLowerCase()]
  );
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new AppError('invalid email or password', 401);   // same message for both cases on purpose
  if (user.is_banned) throw new AppError('this account is suspended', 403);

  delete user.password_hash;
  res.json({ user, token: makeToken(user) });
});

module.exports = router;