const { AppError } = require('./errors');

const round2 = (n) => Math.round(n * 100) / 100;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// Validates the body of POST /admin/coupons and returns clean values.
// `now` is a parameter so tests can control the clock.
function parseNewCoupon(body, now = new Date()) {
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
    throw new AppError('code must be 3 to 20 characters: letters, digits, "-" or "_"');
  }

  if (body.discountType !== 'percent' && body.discountType !== 'flat') {
    throw new AppError("discountType must be 'percent' or 'flat'");
  }

  const value = body.discountValue;
  if (!isNum(value) || value <= 0) throw new AppError('discountValue must be a number greater than 0');
  if (body.discountType === 'percent' && value > 100) {
    throw new AppError('a percent discount cannot be more than 100');
  }
  if (value > 100000) throw new AppError('discountValue is too large');

  const minOrderValue = body.minOrderValue ?? 0;
  if (!isNum(minOrderValue) || minOrderValue < 0 || minOrderValue > 100000) {
    throw new AppError('minOrderValue must be a number from 0 to 100000');
  }

  const usageLimit = body.usageLimit ?? 100;
  if (!Number.isInteger(usageLimit) || usageLimit < 1 || usageLimit > 1000000) {
    throw new AppError('usageLimit must be a whole number from 1 to 1000000');
  }

  if (typeof body.validUntil !== 'string') {
    throw new AppError('validUntil is required, for example "2026-12-31"');
  }
  const text = body.validUntil.trim();
  // A date with no time means "until the end of that day", not "until midnight at its start".
  const until = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T23:59:59` : text);
  if (Number.isNaN(until.getTime())) {
    throw new AppError('validUntil must be a date such as 2026-12-31 or 2026-12-31T18:30:00');
  }
  if (until <= now) throw new AppError('validUntil must be in the future');

  return {
    code,
    discountType: body.discountType,
    discountValue: round2(value),
    minOrderValue: round2(minOrderValue),
    usageLimit,
    validUntil: until,
  };
}

// Returns the refund as a whole number of cents, so we never compare floating-point money.
function parseRefundCents(amount) {
  if (!isNum(amount) || amount <= 0) throw new AppError('refundAmount must be a number greater than 0');
  const cents = Math.round(amount * 100);
  if (Math.abs(amount * 100 - cents) > 1e-6) {
    throw new AppError('refundAmount can have at most 2 decimal places');
  }
  return cents;
}

// Cleans up and checks a delivery address typed by the customer.
// Line breaks and repeated spaces become single spaces, so it is stored as one tidy line.
function parseDeliveryAddress(value) {
  if (typeof value !== 'string') throw new AppError('deliveryAddress is required');
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length < 5 || text.length > 300) {
    throw new AppError('deliveryAddress must be 5 to 300 characters');
  }
  return text;
}

module.exports = { round2, parseNewCoupon, parseRefundCents, parseDeliveryAddress };
