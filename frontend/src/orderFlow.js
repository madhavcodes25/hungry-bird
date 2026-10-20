// Mirrors the backend state machine so each screen can show the right buttons.
// The server enforces every rule again, so these only decide what to display.
export const STATUSES = [
  'placed', 'accepted', 'preparing', 'ready',
  'picked_up', 'out_for_delivery', 'delivered', 'cancelled',
];

const FLOW = {
  placed:           { next: 'accepted',         actor: 'restaurant',       cancel: ['customer', 'restaurant', 'admin'] },
  accepted:         { next: 'preparing',        actor: 'restaurant',       cancel: ['restaurant', 'admin'] },
  preparing:        { next: 'ready',            actor: 'restaurant',       cancel: ['admin'] },
  ready:            { next: 'picked_up',        actor: 'delivery_partner', cancel: ['admin'] },
  picked_up:        { next: 'out_for_delivery', actor: 'delivery_partner', cancel: ['admin'] },
  out_for_delivery: { next: 'delivered',        actor: 'delivery_partner', cancel: ['admin'] },
  delivered:        { next: null, actor: null, cancel: [] },
  cancelled:        { next: null, actor: null, cancel: [] },
};

export const nextStatus = (status) => FLOW[status]?.next ?? null;
export const actorFor = (status) => FLOW[status]?.actor ?? null;
export const canAdvance = (status, role) => !!FLOW[status]?.next && FLOW[status].actor === role;
export const canCancel = (status, role) => !!FLOW[status]?.cancel.includes(role);
export const isActive = (status) => status !== 'delivered' && status !== 'cancelled';

export const ROLE_LABELS = {
  customer: 'customer',
  restaurant: 'restaurant',
  delivery_partner: 'delivery partner',
  admin: 'admin',
};

export const money = (value) => `₹${Number(value).toFixed(2)}`;
export const when = (value) => (value ? new Date(value).toLocaleString() : '');
