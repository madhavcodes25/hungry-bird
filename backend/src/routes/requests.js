const express = require('express');
const { AppError } = require('../errors');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createRequest, listRequests, resolveRequest } = require('../services/requestService');

const router = express.Router();
const isPositiveInt = (n) => Number.isInteger(n) && n > 0;

// Customer raises a request (for example a refund or a problem) on one of their orders.
router.post('/', requireAuth, requireRole('customer'), async (req, res) => {
  const { orderId, reason } = req.body;
  if (!isPositiveInt(orderId)) throw new AppError('orderId must be a positive integer');
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (text.length < 5 || text.length > 500) throw new AppError('reason must be 5 to 500 characters');
  res.status(201).json(await createRequest({ customerId: req.user.id, orderId, reason: text }));
});

// Customers see their own requests. Admins see all, and can filter with ?status=open
router.get('/', requireAuth, requireRole('customer', 'admin'), async (req, res) => {
  res.json(await listRequests(req.user, req.query.status));
});

// Admin closes a request. Body: { "action": "resolve" } or { "action": "refund", "refundAmount": 60 }
router.post('/:id/resolve', requireAuth, requireRole('admin'), async (req, res) => {
  const requestId = Number(req.params.id);
  if (!isPositiveInt(requestId)) throw new AppError('invalid request id');
  const { action, refundAmount } = req.body;
  res.json(await resolveRequest({ adminId: req.user.id, requestId, action, refundAmount }));
});

module.exports = router;
