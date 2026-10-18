const { AppError } = require('../errors');

class PaymentMethod {
  get name() { throw new Error('not implemented'); }
  pay(amount) { throw new Error('not implemented'); }   // returns { status }
}

class CardPayment extends PaymentMethod {
  get name() { return 'card'; }
  pay(amount) { return { status: 'completed' }; }       // mock: always succeeds
}
class UpiPayment extends PaymentMethod {
  get name() { return 'upi'; }
  pay(amount) { return { status: 'completed' }; }
}
class CodPayment extends PaymentMethod {
  get name() { return 'cod'; }
  pay(amount) { return { status: 'pending' }; }         // cash is collected at the door
}

const METHODS = new Map([
  ['card', new CardPayment()],
  ['upi', new UpiPayment()],
  ['cod', new CodPayment()],
]);

function getPaymentMethod(name) {
  const method = METHODS.get(name);
  if (!method) throw new AppError(`payment method must be one of: ${[...METHODS.keys()].join(', ')}`);
  return method;
}

module.exports = { getPaymentMethod };