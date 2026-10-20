import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { money } from '../orderFlow';

export default function Deliveries() {
  const { token } = useAuth();
  const [reload, setReload] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(null);
  const { data, error: loadError, loading } = useApiData('/deliveries/available', token, reload);

  async function accept(orderId) {
    setBusyId(orderId);
    setError('');
    setAccepted(null);
    try {
      await api(`/deliveries/${orderId}/accept`, { method: 'POST', token });
      setAccepted(orderId);
    } catch (err) {
      setError(err.message);     // for example "this delivery is no longer available"
    } finally {
      setBusyId(null);
      setReload((n) => n + 1);
    }
  }

  return (
    <>
      <h1>Available deliveries</h1>
      <button onClick={() => setReload((n) => n + 1)}>Refresh</button>
      {accepted && (
        <p className="ok">
          You took order #{accepted}. <Link to={`/orders/${accepted}`}>Open it</Link> to update its status.
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {loadError && <p className="error">{loadError}</p>}
      {data && data.length === 0 && (
        <p className="muted">Nothing waiting. A delivery appears here once a restaurant accepts an order.</p>
      )}
      {data && data.length > 0 && (
        <ul className="list">
          {data.map((d) => (
            <li key={d.order_id}>
              <span>Order #{d.order_id}</span>
              <span>Pick up from {d.restaurant_name} <span className="muted">({d.address})</span></span>
              <span>Payout {money(d.payout_amount)}</span>
              <button disabled={busyId === d.order_id} onClick={() => accept(d.order_id)}>Accept</button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted">
        The drop-off address is shown once you accept the delivery. After accepting, the order shows up under <Link to="/orders">My deliveries</Link>. You can move it forward
        once the restaurant marks it ready.
      </p>
    </>
  );
}
