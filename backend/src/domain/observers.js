class OrderObserver {
  update(order, oldStatus) { throw new Error('not implemented'); }
}

class CustomerNotifier extends OrderObserver {
  update(order, oldStatus) {
    console.log(`[notify customer ${order.customerId}] order #${order.id}: ${oldStatus} -> ${order.status}`);
  }
}
class RestaurantNotifier extends OrderObserver {
  update(order, oldStatus) {
    console.log(`[notify restaurant ${order.restaurantId}] order #${order.id}: ${oldStatus} -> ${order.status}`);
  }
}
class DeliveryPartnerNotifier extends OrderObserver {
  update(order, oldStatus) {
    console.log(`[notify delivery partner] order #${order.id}: ${oldStatus} -> ${order.status}`);
  }
}

module.exports = { CustomerNotifier, RestaurantNotifier, DeliveryPartnerNotifier };