import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';

export default function OrderDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [reload, setReload] = useState(0);
  const [actionError, setActionError] = useState('');
  const { data, error, loading } = useApiData(`/orders/${id}`, token, reload);

  async function cancel() {
    setActionError('');
    try {
      await api(`/orders/${id}/cancel`, { method: 'POST', token });
      setReload((n) => n + 1);
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (loading) return <p>Loading order...</p>;
  if (error) return <p className="error">{error}</p>;

  const { order, items, payment, delivery } = data;
  return (
    <>
      <h1>Order #{order.id}</h1>
      <p>
        Status: <strong>{order.status}</strong>{' '}
        <button onClick={() => setReload((n) => n + 1)}>Refresh</button>
      </p>
      <ul className="list">
        {items.map((i) => (
          <li key={i.menu_item_id}>
            <span>{i.name} × {i.quantity}</span>
            <span>₹{(Number(i.price_at_order_time) * i.quantity).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <p>Discount: ₹{Number(order.discount_amount).toFixed(2)}</p>
      <p><strong>Total: ₹{Number(order.total_amount).toFixed(2)}</strong></p>
      <p>Payment: {payment.method} ({payment.status})</p>
      <p>Delivery: {delivery.status}</p>
      {order.status === 'placed' && <button onClick={cancel}>Cancel order</button>}
      {actionError && <p className="error">{actionError}</p>}
    </>
  );
}