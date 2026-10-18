class OrderState {
  constructor(name) { this.name = name; }
  next() { return null; }            // status reached when the order advances
  actorRole() { return null; }       // role allowed to advance it
  cancellableBy() { return []; }     // roles allowed to cancel from here
}

class PlacedState extends OrderState {
  constructor() { super('placed'); }
  next() { return 'accepted'; }
  actorRole() { return 'restaurant'; }
  cancellableBy() { return ['customer', 'restaurant', 'admin']; }
}
class AcceptedState extends OrderState {
  constructor() { super('accepted'); }
  next() { return 'preparing'; }
  actorRole() { return 'restaurant'; }
  cancellableBy() { return ['restaurant', 'admin']; }
}
class PreparingState extends OrderState {
  constructor() { super('preparing'); }
  next() { return 'ready'; }
  actorRole() { return 'restaurant'; }
  cancellableBy() { return ['admin']; }
}
class ReadyState extends OrderState {
  constructor() { super('ready'); }
  next() { return 'picked_up'; }
  actorRole() { return 'delivery_partner'; }
  cancellableBy() { return ['admin']; }
}
class PickedUpState extends OrderState {
  constructor() { super('picked_up'); }
  next() { return 'out_for_delivery'; }
  actorRole() { return 'delivery_partner'; }
  cancellableBy() { return ['admin']; }
}
class OutForDeliveryState extends OrderState {
  constructor() { super('out_for_delivery'); }
  next() { return 'delivered'; }
  actorRole() { return 'delivery_partner'; }
  cancellableBy() { return ['admin']; }
}
class DeliveredState extends OrderState { constructor() { super('delivered'); } }
class CancelledState extends OrderState { constructor() { super('cancelled'); } }

const byName = new Map(
  [
    new PlacedState(), new AcceptedState(), new PreparingState(), new ReadyState(),
    new PickedUpState(), new OutForDeliveryState(), new DeliveredState(), new CancelledState(),
  ].map((s) => [s.name, s])
);

function stateFor(name) {
  const state = byName.get(name);
  if (!state) throw new Error(`unknown order status: ${name}`);
  return state;
}

module.exports = { stateFor, STATUS_NAMES: [...byName.keys()] };