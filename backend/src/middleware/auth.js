const jwt = require('jsonwebtoken');
const { AppError } = require('../errors');

function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('missing token', 401);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);   // { id, role, iat, exp }
  } catch {
    throw new AppError('invalid or expired token', 401);
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) throw new AppError('forbidden', 403);
    next();
  };
}

module.exports = { requireAuth, requireRole };