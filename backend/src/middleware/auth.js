const jwt = require('jsonwebtoken');
const pool = require('../db');
const { AppError } = require('../errors');

// Checks the token, then re-reads the user from the database, so a ban
// (or a deleted account) takes effect immediately instead of when the token expires.
async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('missing token', 401);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);   // { id, role, iat, exp }
  } catch {
    throw new AppError('invalid or expired token', 401);
  }

  const { rows } = await pool.query('SELECT id, role, is_banned FROM "user" WHERE id = $1', [payload.id]);
  const user = rows[0];
  if (!user) throw new AppError('this account no longer exists', 401);
  if (user.is_banned) throw new AppError('this account is suspended', 403);

  req.user = { id: user.id, role: user.role };   // role comes from the database, not the token
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) throw new AppError('forbidden', 403);
    next();
  };
}

module.exports = { requireAuth, requireRole };
