import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { ROLE_LABELS, STATUSES, actorFor, canAdvance, canCancel, money, nextStatus, when } from '../orderFlow';

const REQUEST_LABELS = { open: 'Open', resolved: 'Resolved', refunded: 'Refunded' };

const ORDER_STEPS = [
  { key: 'placed', label: 'Placed', icon: '📝' },
  { key: 'accepted', label: 'Accepted', icon: '👨‍🍳' },
  { key: 'preparing', label: 'Preparing', icon: '🍳' },
  { key: 'ready', label: 'Ready', icon: '📦' },
  { key: 'picked_up', label: 'Picked Up', icon: '🛵' },
  { key: 'out_for_delivery', label: 'On The Way', icon: '🚀' },
  { key: 'delivered', label: 'Delivered', icon: '🎉' },
];

function OrderStepper({ currentStatus }) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="alert-error" style={{ margin: '20px 0', padding: '16px 20px', borderRadius: 'var(--radius-lg)' }}>
        <span style={{ fontSize: '1.25rem' }}>❌</span>
        <div>
          <strong>This order was cancelled.</strong>
          <div style={{ fontSize: '0.85rem' }}>No further actions can be taken on this order.</div>
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="order-stepper">
      {ORDER_STEPS.map((step, index) => {
        const isCompleted = currentIndex > index || currentStatus === 'delivered';
        const isCurrent = currentStatus === step.key && currentStatus !== 'delivered';
        const stateClass = isCompleted ? 'completed' : isCurrent ? 'current' : '';

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: index === ORDER_STEPS.length - 1 ? 0 : 1 }}>
            <div className={`stepper-step ${stateClass}`}>
              <div className="stepper-circle">
                {isCompleted ? '✓' : step.icon}
              </div>
              <span className="stepper-label">{step.label}</span>
            </div>
            {index < ORDER_STEPS.length - 1 && (
              <div className={`stepper-connector ${currentIndex > index ? 'active' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [forced, setForced] = useState('delivered');
  const { data, error, loading } = useApiData(`/orders/${id}`, token, reload);

  const refresh = () => setReload((n) => n + 1);

  // Runs one action, shows any error, then reloads the order
  async function run(action, onSuccess) {
    setBusy(true);
    setActionError('');
    try {
      await action();
      if (onSuccess) onSuccess();
      refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const post = (path, body) => api(path, { method: 'POST', token, body });
  const advance = () => run(() => post(`/orders/${id}/advance`));
  const cancel = () => run(() => post(`/orders/${id}/cancel`));
  const force = () => run(() => post(`/orders/${id}/force-status`, { status: forced }));

  function submitRating(e) {
    e.preventDefault();
    run(
      () => post('/ratings', { orderId: Number(id), stars: Number(stars), comment: comment.trim() || undefined }),
      () => setComment('')
    );
  }

  function submitRequest(e) {
    e.preventDefault();
    run(() => post('/requests', { orderId: Number(id), reason: reason.trim() }), () => setReason(''));
  }

  if (loading) {
    return (
      <div className="loading-box">
        <div className="spinner" />
        <span>Loading order details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-error">
        <span>⚠️</span> {error}
        <Link to="/orders" style={{ marginLeft: '12px', textDecoration: 'underline' }}>Back to orders</Link>
      </div>
    );
  }

  const { order, items, payment, delivery, rating, requests, restaurant, customer } = data;
  const role = user.role;
  const hasOpenRequest = requests.some((r) => r.status === 'open');
  const next = nextStatus(order.status);
  const waitingFor = actorFor(order.status);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
        <div>
          <Link to="/orders" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            &larr; Back to orders
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0 }}>Order #{order.id}</h1>
            <span className={`badge badge-${order.status}`}>{order.status.replaceAll('_', ' ')}</span>
          </div>
        </div>
        <button
          onClick={refresh}
          style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-800)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
        >
          🔄 Refresh Status
        </button>
      </div>

      <OrderStepper currentStatus={order.status} />

      <div className="order-detail-grid">
        {/* Left Column: Items, Actions, Rating, Support */}
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Action Bar for Status progression */}
          {(canAdvance(order.status, role) || canCancel(order.status, role) || (next && role !== 'customer' && role !== 'admin')) && (
            <div className="card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff7f5 100%)', borderColor: 'var(--primary-border)' }}>
              <h3 style={{ margin: '0 0 12px' }}>Order Actions</h3>
              <div className="actions" style={{ margin: 0 }}>
                {canAdvance(order.status, role) && (
                  <button onClick={advance} disabled={busy} style={{ padding: '12px 24px', fontSize: '1rem' }}>
                    {busy ? 'Updating...' : `Mark as ${next.replaceAll('_', ' ')}`}
                  </button>
                )}
                {!canAdvance(order.status, role) && next && role !== 'customer' && role !== 'admin' && (
                  <div className="muted" style={{ padding: '6px 0' }}>
                    ⏳ Next step is awaiting the <strong>{ROLE_LABELS[waitingFor]}</strong>.
                  </div>
                )}
                {canCancel(order.status, role) && (
                  <button
                    onClick={cancel}
                    disabled={busy}
                    style={{ backgroundColor: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger-border)', boxShadow: 'none' }}
                  >
                    Cancel order
                  </button>
                )}
              </div>
              {actionError && <div className="alert-error" style={{ marginTop: '12px' }}>{actionError}</div>}
            </div>
          )}

          {/* Admin Force Status Controls */}
          {role === 'admin' && (
            <div className="card" style={{ background: 'var(--gray-50)', border: '1.5px dashed var(--gray-300)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: 'var(--gray-800)' }}>⚡ Admin: Override Order Status</h3>
              <p className="muted" style={{ fontSize: '0.85rem' }}>Overrides the normal flow to unstick disputed orders.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <select value={forced} onChange={(e) => setForced(e.target.value)} style={{ width: 'auto', minWidth: '180px' }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={force} disabled={busy} style={{ backgroundColor: 'var(--secondary)' }}>
                  Force status
                </button>
              </div>
            </div>
          )}

          {/* Ordered Items Breakdown */}
          <div className="card">
            <h2 style={{ margin: '0 0 16px', fontSize: '1.25rem' }}>Items Ordered</h2>
            <div style={{ borderTop: '1px solid var(--border-light)' }}>
              {items.map((i) => (
                <div key={i.menu_item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{i.name}</div>
                    <span className="muted" style={{ fontSize: '0.825rem' }}>Quantity: {i.quantity}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {money(Number(i.price_at_order_time) * i.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray-600)', fontSize: '0.9rem' }}>
                <span>Discount applied</span>
                <span style={{ color: order.discount_amount > 0 ? 'var(--success)' : 'inherit' }}>
                  -{money(order.discount_amount)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', color: 'var(--gray-900)' }}>
                <span>Total Amount</span>
                <span>{money(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Rating Section */}
          {(rating || (role === 'customer' && order.status === 'delivered')) && (
            <div className="card">
              <h2 style={{ margin: '0 0 14px', fontSize: '1.2rem' }}>Order Review & Rating</h2>
              {rating ? (
                <div style={{ background: 'var(--gray-50)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div className="review-stars" style={{ fontSize: '1.25rem', marginBottom: '6px' }}>
                    {'★'.repeat(rating.stars)}{'☆'.repeat(5 - rating.stars)}
                  </div>
                  {rating.comment ? (
                    <p style={{ margin: 0, fontWeight: 500, color: 'var(--gray-800)' }}>"{rating.comment}"</p>
                  ) : (
                    <span className="muted">No written feedback provided.</span>
                  )}
                </div>
              ) : (
                <form onSubmit={submitRating} style={{ margin: 0, maxWidth: 'none' }}>
                  <label>
                    Your Rating
                    <select value={stars} onChange={(e) => setStars(e.target.value)} style={{ width: 'auto', minWidth: '160px' }}>
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Stars {'★'.repeat(n)}</option>)}
                    </select>
                  </label>
                  <input
                    placeholder="Tell us about the food and delivery experience (optional)"
                    value={comment}
                    maxLength={500}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div>
                    <button disabled={busy} style={{ width: 'auto' }}>Submit Review</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Customer Support & Requests Section */}
          {(role === 'customer' || role === 'admin') && (
            <div className="card">
              <h2 style={{ margin: '0 0 14px', fontSize: '1.2rem' }}>
                {role === 'customer' ? 'Need Help With This Order?' : 'Customer Support Requests'}
              </h2>
              {requests.length === 0 ? (
                <p className="muted">No support requests have been raised for this order.</p>
              ) : (
                <ul className="list" style={{ margin: '12px 0' }}>
                  {requests.map((r) => (
                    <li key={r.id} style={{ display: 'block', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600 }}>{r.reason}</span>
                        <span className={`badge badge-${r.status}`}>
                          {REQUEST_LABELS[r.status] || r.status}
                        </span>
                      </div>
                      {r.status === 'refunded' && (
                        <div style={{ color: 'var(--success-text)', fontWeight: 700, fontSize: '0.875rem' }}>
                          Refund processed: {money(r.refund_amount)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {role === 'admin' && hasOpenRequest && (
                <div style={{ marginTop: '12px' }}>
                  <Link to="/requests" className="btn" style={{ fontSize: '0.85rem', padding: '8px 16px' }}>
                    Resolve on Requests Page &rarr;
                  </Link>
                </div>
              )}

              {role === 'customer' && (hasOpenRequest ? (
                <div className="box" style={{ background: 'var(--warning-subtle)', borderColor: 'var(--warning-border)', margin: '12px 0 0' }}>
                  ⏳ Your support request is currently under review by our care team.
                </div>
              ) : (
                <form onSubmit={submitRequest} style={{ margin: '16px 0 0', maxWidth: 'none' }}>
                  <label>
                    Report an issue with this order
                    <input
                      placeholder="What went wrong? (e.g. Missing item, spill, delayed - min 5 characters)"
                      value={reason}
                      minLength={5}
                      maxLength={500}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  </label>
                  <div>
                    <button disabled={busy} style={{ width: 'auto', backgroundColor: 'var(--secondary)' }}>
                      Raise Support Request
                    </button>
                  </div>
                </form>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Restaurant, Customer, Delivery & Payment details */}
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Restaurant & Customer card */}
          <div className="card">
            <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem' }}>Order Information</h3>
            <div style={{ marginBottom: '14px' }}>
              <div className="muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Restaurant</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>{restaurant.restaurant_name}</div>
              <div className="muted" style={{ fontSize: '0.85rem' }}>{restaurant.address}</div>
            </div>

            {role !== 'customer' && customer && (
              <div style={{ marginBottom: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                <div className="muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customer</div>
                <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{customer.name}</div>
              </div>
            )}

            <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
              <div className="muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Placed At</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)', fontWeight: 500 }}>{when(order.created_at)}</div>
            </div>
          </div>

          {/* Delivery Address Card */}
          {order.delivery_address && (
            <div className="card">
              <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📍</span> {role === 'delivery_partner' ? 'Drop-off Address' : 'Delivery Address'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.925rem', color: 'var(--gray-800)', lineHeight: 1.5 }}>
                {order.delivery_address}
              </p>
            </div>
          )}

          {/* Payment Card */}
          <div className="card">
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>Payment & Delivery Details</h3>
            <div style={{ display: 'grid', gap: '10px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Payment Method</span>
                <strong style={{ textTransform: 'uppercase' }}>{payment.method}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Payment Status</span>
                <span className={`badge ${payment.status === 'completed' ? 'badge-delivered' : 'badge-placed'}`}>
                  {payment.status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                <span className="muted">Delivery Status</span>
                <span className="badge">{delivery.status}</span>
              </div>
              {delivery.delivery_partner_id && role !== 'customer' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">Assigned Partner</span>
                  <span>Partner #{delivery.delivery_partner_id}</span>
                </div>
              )}
              {role !== 'customer' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                  <span className="muted">Partner Payout</span>
                  <strong style={{ color: 'var(--success)' }}>{money(delivery.payout_amount)}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
