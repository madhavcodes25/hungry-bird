const pool = require('../db');
const { AppError } = require('../errors');
const { parseRefundCents } = require('../validators');

const REQUEST_STATUSES = ['open', 'resolved', 'refunded'];
const toCents = (n) => Math.round(Number(n) * 100);
const fromCents = (c) => (c / 100).toFixed(2);

// A customer raises a request on one of their own orders.
async function createRequest({ customerId, orderId, reason }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the order row so two quick clicks can't create two open requests.
    const { rows } = await client.query(
      'SELECT id, customer_id FROM "order" WHERE id = $1 FOR UPDATE', [orderId]);
    const order = rows[0];
    if (!order || order.customer_id !== customerId) throw new AppError('order not found', 404);

    const open = await client.query(
      `SELECT 1 FROM request WHERE order_id = $1 AND status = 'open'`, [orderId]);
    if (open.rows.length > 0) throw new AppError('there is already an open request for this order', 409);

    const inserted = await client.query(
      `INSERT INTO request (order_id, raised_by, reason) VALUES ($1, $2, $3)
       RETURNING id, order_id, raised_by, reason, status, created_at`,
      [orderId, customerId, reason]
    );
    await client.query('COMMIT');
    return inserted.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Customers see their own requests, admins see everyone's (optionally filtered by status).
async function listRequests(user, status) {
  const where = [];
  const params = [];
  if (user.role === 'customer') {
    params.push(user.id);
    where.push(`r.raised_by = $${params.length}`);
  }
  if (status !== undefined) {
    if (!REQUEST_STATUSES.includes(status)) {
      throw new AppError(`status must be one of: ${REQUEST_STATUSES.join(', ')}`);
    }
    params.push(status);
    where.push(`r.status = $${params.length}`);
  }
  const { rows } = await pool.query(
    `SELECT r.id, r.order_id, r.raised_by, u.name AS customer_name, r.reason, r.status,
            r.resolved_by, r.refund_amount, r.created_at,
            o.status AS order_status, o.total_amount AS order_total,
            o.total_amount - COALESCE(
              (SELECT SUM(x.refund_amount) FROM request x
               WHERE x.order_id = r.order_id AND x.status = 'refunded'), 0) AS refundable_remaining
     FROM request r
     JOIN "order" o ON o.id = r.order_id
     JOIN "user" u ON u.id = r.raised_by
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY r.created_at DESC, r.id DESC`,
    params
  );
  return rows;
}

// Admin closes an open request, with or without a refund.
// The total refunded on one order can never go above what the customer paid.
async function resolveRequest({ adminId, requestId, action, refundAmount }) {
  if (action !== 'resolve' && action !== 'refund') {
    throw new AppError("action must be 'resolve' or 'refund'");
  }
  let refundCents = null;
  if (action === 'refund') {
    refundCents = parseRefundCents(refundAmount);
  } else if (refundAmount !== undefined && refundAmount !== null) {
    throw new AppError("refundAmount is only used with action 'refund'");
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const found = await client.query(
      'SELECT id, order_id, status FROM request WHERE id = $1 FOR UPDATE', [requestId]);
    const request = found.rows[0];
    if (!request) throw new AppError('request not found', 404);
    if (request.status !== 'open') throw new AppError(`this request is already ${request.status}`, 409);

    if (action === 'refund') {
      // Lock the order so two refunds on the same order are checked one after the other.
      const orderRes = await client.query(
        'SELECT total_amount FROM "order" WHERE id = $1 FOR UPDATE', [request.order_id]);
      const sumRes = await client.query(
        `SELECT COALESCE(SUM(refund_amount), 0) AS refunded
         FROM request WHERE order_id = $1 AND status = 'refunded'`, [request.order_id]);
      const remaining = toCents(orderRes.rows[0].total_amount) - toCents(sumRes.rows[0].refunded);
      if (refundCents > remaining) {
        throw new AppError(`refund is more than what is left on this order (${fromCents(remaining)})`);
      }
    }

    const updated = await client.query(
      `UPDATE request SET status = $1, resolved_by = $2, refund_amount = $3 WHERE id = $4
       RETURNING id, order_id, raised_by, reason, status, resolved_by, refund_amount, created_at`,
      [
        action === 'refund' ? 'refunded' : 'resolved',
        adminId,
        refundCents === null ? null : refundCents / 100,
        requestId,
      ]
    );
    await client.query('COMMIT');
    return updated.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createRequest, listRequests, resolveRequest };
