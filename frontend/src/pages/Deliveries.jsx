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
      setError(err.message);
    } finally {
      setBusyId(null);
      setReload((n) => n + 1);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Available Deliveries</h1>
          <span className="muted">Claim orders ready for pickup and earn on every delivery</span>
        </div>
        <button
          onClick={() => setReload((n) => n + 1)}
          className="btn-secondary"
        >
          🔄 Check For Orders
        </button>
      </div>

      {accepted && (
        <div className="alert-success" style={{ marginBottom: '20px' }}>
          <span>🎉</span>
          <div>
            You accepted order <strong>#{accepted}</strong>!{' '}
            <Link to={`/orders/${accepted}`} style={{ fontWeight: 700, textDecoration: 'underline' }}>
              Open Order #{accepted}
            </Link> to start delivery.
          </div>
        </div>
      )}

      {error && <div className="alert-error"><span>⚠️</span> {error}</div>}

      {loading && (
        <div className="loading-box">
          <div className="spinner" />
          <span>Searching for nearby deliveries...</span>
        </div>
      )}

      {loadError && <div className="alert-error"><span>⚠️</span> {loadError}</div>}

      {data && data.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🛵</div>
          <h3>No deliveries waiting</h3>
          <p>Orders appear here as soon as restaurants accept and begin preparing them. Keep an eye on this page!</p>
          <button onClick={() => setReload((n) => n + 1)} className="btn">
            Refresh List
          </button>
        </div>
      )}

      {data && data.length > 0 && (
        <ul className="list" style={{ display: 'grid', gap: '16px', margin: 0 }}>
          {data.map((d) => (
            <li key={d.order_id} style={{ display: 'block', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--gray-900)' }}>
                    Order #{d.order_id}
                  </span>
                  <span className="badge" style={{ backgroundColor: 'var(--info-subtle)', color: 'var(--info-text)', borderColor: 'var(--info-border)' }}>
                    Ready for Pickup
                  </span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success-text)' }}>
                  {money(d.payout_amount)} payout
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--gray-800)', marginBottom: '4px' }}>
                    🏪 Pick up from {d.restaurant_name}
                  </div>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    📍 {d.address}
                  </div>
                </div>

                <button
                  disabled={busyId === d.order_id}
                  onClick={() => accept(d.order_id)}
                  style={{ padding: '10px 24px', fontSize: '0.95rem' }}
                >
                  {busyId === d.order_id ? 'Accepting...' : 'Accept Delivery'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="card" style={{ marginTop: '28px', background: 'var(--gray-50)', border: '1px dashed var(--gray-300)' }}>
        <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: 'var(--gray-800)' }}>💡 Partner Delivery Guide</h4>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6 }}>
          Customer drop-off address is displayed once you accept a delivery. After accepting, open <Link to="/orders">My Deliveries</Link> to progress the order as you pick it up and deliver it to the customer.
        </p>
      </div>
    </>
  );
}
