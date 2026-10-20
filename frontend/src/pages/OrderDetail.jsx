import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { ROLE_LABELS, STATUSES, actorFor, canAdvance, canCancel, money, nextStatus, when } from '../orderFlow';

const REQUEST_LABELS = { open: 'Open', resolved: 'Resolved', refunded: 'Refunded' };

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

  if (loading) return <p>Loading order...</p>;
  if (error) return <p className="error">{error} <Link to="/orders">Back to orders</Link></p>;

  const { order, items, payment, delivery, rating, requests, restaurant, customer } = data;
  const role = user.role;
  const hasOpenRequest = requests.some((r) => r.status === 'open');
  const next = nextStatus(order.status);
  const waitingFor = actorFor(order.status);

  return (
    <>
      <p><Link to="/orders">&larr; Back to orders</Link></p>
      <h1>Order #{order.id}</h1>
      <p>
        Status: <span className="badge">{order.status}</span>{' '}
        <button onClick={refresh}>Refresh</button>
      </p>
      <p>
        {restaurant.restaurant_name} <span className="muted">({restaurant.address})</span>
        {role !== 'customer' && <> · ordered by {customer.name}</>}
        <br />
        <span className="muted">{when(order.created_at)}</span>
      </p>

      {order.delivery_address && (
        <p>
          <strong>{role === 'delivery_partner' ? 'Drop-off address' : 'Delivering to'}:</strong> {order.delivery_address}
        </p>
      )}

      <ul className="list">
        {items.map((i) => (
          <li key={i.menu_item_id}>
            <span>{i.name} × {i.quantity}</span>
            <span>{money(Number(i.price_at_order_time) * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <p>Discount: {money(order.discount_amount)}</p>
      <p><strong>Total: {money(order.total_amount)}</strong></p>
      <p>Payment: {payment.method} ({payment.status})</p>
      <p>
        Delivery: {delivery.status}
        {delivery.delivery_partner_id && role !== 'customer' && <> · partner #{delivery.delivery_partner_id}</>}
        {role !== 'customer' && <> · payout {money(delivery.payout_amount)}</>}
      </p>

      <div className="actions">
        {canAdvance(order.status, role) && (
          <button onClick={advance} disabled={busy}>Mark as {next.replaceAll('_', ' ')}</button>
        )}
        {!canAdvance(order.status, role) && next && role !== 'customer' && role !== 'admin' && (
          <span className="muted">Next step belongs to the {ROLE_LABELS[waitingFor]}.</span>
        )}
        {canCancel(order.status, role) && <button onClick={cancel} disabled={busy}>Cancel order</button>}
      </div>

      {role === 'admin' && (
        <div className="box">
          <strong>Admin: force a status</strong>{' '}
          <select value={forced} onChange={(e) => setForced(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>{' '}
          <button onClick={force} disabled={busy}>Force status</button>
          <p className="muted">Overrides the normal flow. Use it to unstick a disputed order.</p>
        </div>
      )}
      {actionError && <p className="error">{actionError}</p>}

      {(rating || (role === 'customer' && order.status === 'delivered')) && (
        <section>
          <h2>Rating</h2>
          {rating ? (
            <p>
              {'★'.repeat(rating.stars)}{'☆'.repeat(5 - rating.stars)}
              {rating.comment ? ` · ${rating.comment}` : ''}
            </p>
          ) : (
            <form onSubmit={submitRating}>
              <label>
                Stars{' '}
                <select value={stars} onChange={(e) => setStars(e.target.value)}>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <input placeholder="Comment (optional)" value={comment} maxLength={500}
                     onChange={(e) => setComment(e.target.value)} />
              <button disabled={busy}>Submit rating</button>
            </form>
          )}
        </section>
      )}

      {(role === 'customer' || role === 'admin') && (
        <section>
          <h2>{role === 'customer' ? 'Help with this order' : 'Customer requests on this order'}</h2>
          {requests.length === 0 && <p className="muted">No requests.</p>}
          {requests.length > 0 && (
            <ul className="list">
              {requests.map((r) => (
                <li key={r.id}>
                  <span>{r.reason}</span>
                  <span className="badge">{REQUEST_LABELS[r.status] || r.status}</span>
                  {r.status === 'refunded' && <span>Refund {money(r.refund_amount)}</span>}
                </li>
              ))}
            </ul>
          )}
          {role === 'admin' && hasOpenRequest && <p><Link to="/requests">Resolve it on the Requests page</Link></p>}
          {role === 'customer' && (hasOpenRequest ? (
            <p>Your request is open. Support will update it here.</p>
          ) : (
            <form onSubmit={submitRequest}>
              <input placeholder="What went wrong? (5 to 500 characters)" value={reason} minLength={5} maxLength={500}
                     onChange={(e) => setReason(e.target.value)} required />
              <button disabled={busy}>Raise a request</button>
            </form>
          ))}
        </section>
      )}
    </>
  );
}
