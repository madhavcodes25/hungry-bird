const express = require('express');
const pool = require('../db');
const { AppError } = require('../errors');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('delivery_partner'));

router.get('/available', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT o.id AS order_id, r.restaurant_name, r.address, d.payout_amount
     FROM delivery d
     JOIN "order" o ON o.id = d.order_id
     JOIN restaurant_profile r ON r.id = o.restaurant_id
     WHERE d.status = 'unassigned' AND o.status IN ('accepted', 'preparing', 'ready')
     ORDER BY o.created_at`);
  res.json(rows);
});

router.post('/:orderId/accept', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE delivery d
     SET delivery_partner_id = $1, status = 'assigned'
     FROM "order" o
     WHERE d.order_id = o.id AND d.order_id = $2
       AND d.status = 'unassigned' AND o.status IN ('accepted', 'preparing', 'ready')
     RETURNING d.id, d.order_id, d.status, d.payout_amount`,
    [req.user.id, req.params.orderId]);
  if (!rows[0]) throw new AppError('this delivery is no longer available', 409);
  res.json(rows[0]);
});

module.exports = router;