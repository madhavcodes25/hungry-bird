const { stateFor } = require('./orderStates');
const { AppError } = require('../errors');

class Order {
  #state;
  #observers = [];

  constructor(row) {
    this.id = row.id;
    this.customerId = row.customer_id;
    this.restaurantId = row.restaurant_id;
    this.#state = stateFor(row.status);
  }

  get status() { return this.#state.name; }

  addObserver(observer) { this.#observers.push(observer); }

  advance(role) {
    const next = this.#state.next();
    if (!next) throw new AppError(`order is already ${this.status}`, 409);
    if (role !== this.#state.actorRole()) {
      throw new AppError(`a ${role} cannot move an order out of '${this.status}'`, 403);
    }
    this.#moveTo(next);
  }

  cancel(role) {
    if (!this.#state.cancellableBy().includes(role)) {
      throw new AppError(`a ${role} cannot cancel an order that is '${this.status}'`, 409);
    }
    this.#moveTo('cancelled');
  }

  forceStatus(name) {                  // admin only; the route checks the role
    this.#moveTo(name);
  }

  #moveTo(name) {
    const old = this.status;
    this.#state = stateFor(name);
    for (const observer of this.#observers) observer.update(this, old);
  }
}

module.exports = { Order };