// Run everything with `npm test`.
const { test } = require('node:test');
const assert = require('node:assert');
const { Order } = require('../src/domain/order');
const { STATUS_NAMES } = require('../src/domain/orderStates');
const { getPaymentMethod } = require('../src/domain/payments');
const { AppError } = require('../src/errors');
const { parseNewCoupon, parseRefundCents, parseDeliveryAddress } = require('../src/validators');

const makeOrder = (status = 'placed') =>
  new Order({ id: 7, customer_id: 1, restaurant_id: 2, status });

const throwsApp = (fn, status, pattern) =>
  assert.throws(fn, (err) => {
    assert.ok(err instanceof AppError, `expected AppError, got ${err}`);
    assert.strictEqual(err.status, status);
    if (pattern) assert.match(err.message, pattern);
    return true;
  });

// ---------- order state machine ----------

test('an order moves through the full lifecycle when the right roles act', () => {
  const order = makeOrder();
  const steps = [
    ['restaurant', 'accepted'], ['restaurant', 'preparing'], ['restaurant', 'ready'],
    ['delivery_partner', 'picked_up'], ['delivery_partner', 'out_for_delivery'],
    ['delivery_partner', 'delivered'],
  ];
  for (const [role, expected] of steps) {
    order.advance(role);
    assert.strictEqual(order.status, expected);
  }
});

test('the wrong role cannot advance an order', () => {
  throwsApp(() => makeOrder('placed').advance('delivery_partner'), 403);
  throwsApp(() => makeOrder('placed').advance('customer'), 403);
  throwsApp(() => makeOrder('ready').advance('restaurant'), 403);
});

test('finished orders cannot be advanced', () => {
  throwsApp(() => makeOrder('delivered').advance('restaurant'), 409, /already delivered/);
  throwsApp(() => makeOrder('cancelled').advance('delivery_partner'), 409, /already cancelled/);
});

test('cancel rules depend on the role and the current status', () => {
  const cases = [
    // [status, role, allowed]
    ['placed', 'customer', true], ['placed', 'restaurant', true], ['placed', 'admin', true],
    ['accepted', 'customer', false], ['accepted', 'restaurant', true], ['accepted', 'admin', true],
    ['preparing', 'restaurant', false], ['preparing', 'admin', true],
    ['ready', 'customer', false], ['out_for_delivery', 'admin', true],
    ['delivered', 'admin', false], ['cancelled', 'admin', false],
  ];
  for (const [status, role, allowed] of cases) {
    const order = makeOrder(status);
    if (allowed) {
      order.cancel(role);
      assert.strictEqual(order.status, 'cancelled', `${role} should cancel '${status}'`);
    } else {
      throwsApp(() => order.cancel(role), 409);
      assert.strictEqual(order.status, status, 'a refused cancel must not change the status');
    }
  }
});

test('forceStatus lets an admin jump to any valid status', () => {
  const order = makeOrder('placed');
  order.forceStatus('delivered');
  assert.strictEqual(order.status, 'delivered');
});

test('unknown statuses are rejected', () => {
  assert.throws(() => makeOrder('teleported'), /unknown order status/);
  assert.throws(() => makeOrder().forceStatus('teleported'), /unknown order status/);
});

test('there are exactly eight statuses, matching the database enum', () => {
  assert.deepStrictEqual(STATUS_NAMES, [
    'placed', 'accepted', 'preparing', 'ready',
    'picked_up', 'out_for_delivery', 'delivered', 'cancelled',
  ]);
});

// ---------- observers ----------

test('observers are told about every change, with the old status', () => {
  const order = makeOrder('placed');
  const seen = [];
  order.addObserver({ update: (o, old) => seen.push(`${old}->${o.status}`) });
  order.addObserver({ update: (o) => seen.push(`second:${o.status}`) });
  order.advance('restaurant');
  order.cancel('admin');
  assert.deepStrictEqual(seen, [
    'placed->accepted', 'second:accepted',
    'accepted->cancelled', 'second:cancelled',
  ]);
});

test('observers are not told when a change is refused', () => {
  const order = makeOrder('delivered');
  let calls = 0;
  order.addObserver({ update: () => { calls++; } });
  assert.throws(() => order.advance('restaurant'));
  assert.throws(() => order.cancel('admin'));
  assert.strictEqual(calls, 0);
});

// ---------- payment strategies ----------

test('card and UPI payments complete at once, cash on delivery stays pending', () => {
  assert.strictEqual(getPaymentMethod('card').pay(100).status, 'completed');
  assert.strictEqual(getPaymentMethod('upi').pay(100).status, 'completed');
  assert.strictEqual(getPaymentMethod('cod').pay(100).status, 'pending');
});

test('each payment method reports the name stored in the database', () => {
  for (const name of ['card', 'upi', 'cod']) {
    assert.strictEqual(getPaymentMethod(name).name, name);
  }
});

test('an unknown payment method is a 400 error', () => {
  throwsApp(() => getPaymentMethod('bitcoin'), 400, /payment method must be one of/);
  throwsApp(() => getPaymentMethod(undefined), 400);
});

// ---------- coupon validation ----------

const NOW = new Date('2026-10-20T10:00:00');
const goodCoupon = () => ({
  code: ' summer20 ', discountType: 'percent', discountValue: 20,
  minOrderValue: 150, usageLimit: 50, validUntil: '2026-12-31',
});

test('a valid coupon is cleaned up: code in upper case, date-only means end of that day', () => {
  const c = parseNewCoupon(goodCoupon(), NOW);
  assert.strictEqual(c.code, 'SUMMER20');
  assert.strictEqual(c.discountType, 'percent');
  assert.strictEqual(c.discountValue, 20);
  assert.strictEqual(c.minOrderValue, 150);
  assert.strictEqual(c.usageLimit, 50);
  assert.strictEqual(c.validUntil.getHours(), 23);
  assert.strictEqual(c.validUntil.getMinutes(), 59);
  assert.strictEqual(c.validUntil.getDate(), 31);
});

test('optional coupon fields get defaults', () => {
  const { minOrderValue, usageLimit } = parseNewCoupon(
    { code: 'ABC', discountType: 'flat', discountValue: 30, validUntil: '2026-12-31' }, NOW);
  assert.strictEqual(minOrderValue, 0);
  assert.strictEqual(usageLimit, 100);
});

test('bad coupons are rejected', () => {
  const bad = (change) => throwsApp(() => parseNewCoupon({ ...goodCoupon(), ...change }, NOW), 400);
  bad({ code: 'a' });
  bad({ code: 'has space' });
  bad({ code: 12345 });
  bad({ discountType: 'bogus' });
  bad({ discountValue: 0 });
  bad({ discountValue: -5 });
  bad({ discountValue: '20' });
  bad({ discountValue: 101 });                       // percent over 100
  bad({ minOrderValue: -1 });
  bad({ usageLimit: 0 });
  bad({ usageLimit: 2.5 });
  bad({ validUntil: 'not a date' });
  bad({ validUntil: '2026-02-31' });                 // no such day
  bad({ validUntil: '2026-10-01' });                 // in the past
  bad({ validUntil: undefined });
});

test('a flat discount can be more than 100', () => {
  const c = parseNewCoupon(
    { code: 'BIG', discountType: 'flat', discountValue: 500, validUntil: '2026-12-31' }, NOW);
  assert.strictEqual(c.discountValue, 500);
});

// ---------- refund validation ----------

test('refund amounts become whole cents', () => {
  assert.strictEqual(parseRefundCents(60), 6000);
  assert.strictEqual(parseRefundCents(12.5), 1250);
  assert.strictEqual(parseRefundCents(0.29), 29);    // 0.29 * 100 is 28.999999999999996 in floating point
});

test('bad refund amounts are rejected', () => {
  for (const amount of [0, -5, '60', null, undefined, NaN, Infinity, 10.005]) {
    throwsApp(() => parseRefundCents(amount), 400);
  }
});

// ---------- delivery address validation ----------

test('a delivery address is trimmed and tidied into one line', () => {
  assert.strictEqual(parseDeliveryAddress('  B-12, Sunrise Apartments,\n  Adajan,   Surat '), 'B-12, Sunrise Apartments, Adajan, Surat');
  assert.strictEqual(parseDeliveryAddress('12345'), '12345');                       // exactly 5 characters is fine
  assert.strictEqual(parseDeliveryAddress('x'.repeat(300)).length, 300);              // exactly 300 is fine
});

test('missing, short, long or non-text addresses are rejected', () => {
  for (const bad of [undefined, null, 12345, {}, [], '', '    ', 'abcd', '  a b  ', 'x'.repeat(301)]) {
    throwsApp(() => parseDeliveryAddress(bad), 400);
  }
  throwsApp(() => parseDeliveryAddress(undefined), 400, /deliveryAddress is required/);
  throwsApp(() => parseDeliveryAddress('abc'), 400, /5 to 300 characters/);
});
