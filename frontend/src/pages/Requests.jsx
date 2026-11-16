import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { money, when } from '../orderFlow';

const STATUS_FILTERS = ['all', 'open', 'resolved', 'refunded'];

// One request, with admin controls when still open
function RequestRow({ r, isAdmin, token, onChanged }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function resolve(action, refundAmount) {
    setBusy(true);
    setError('');
    try {
      await api(`/requests/${r.id}/resolve`, { method: 'POST', token, body: { action, refundAmount } });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <strong style={{ fontSize: '1.05rem', color: 'var(--gray-900)' }}>Request #{r.id}</strong>
          <span className="muted">on</span>
          <Link to={`/orders/${r.order_id}`} style={{ fontWeight: 700 }}>
            Order #{r.order_id}
          </Link>
          <span className={`badge badge-${r.status}`}>{r.status}</span>
        </div>
        {isAdmin && <span className="muted">Customer: <strong>{r.customer_name}</strong></span>}
      </div>

      <div style={{ background: 'var(--gray-50)', padding: '14px', borderRadius: 'var(--radius-md)', margin: '10px 0', border: '1px solid var(--border-light)' }}>
        <p style={{ margin: 0, fontWeight: 500, color: 'var(--gray-800)' }}>"{r.reason}"</p>
      </div>

      <div className="muted" style={{ fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
        <span>Order Total: <strong>{money(r.order_total)}</strong></span>
        <span>Order Status: <span className="badge">{r.order_status}</span></span>
        <span>Raised {when(r.created_at)}</span>
        {r.status === 'refunded' && (
          <span style={{ color: 'var(--success-text)', fontWeight: 700 }}>
            Refunded: {money(r.refund_amount)}
          </span>
        )}
      </div>

      {isAdmin && r.status === 'open' && (
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-light)' }}>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '10px' }}>
            Eligible remaining refund on this order: <strong>{money(r.refundable_remaining)}</strong>
          </p>
          <div className="actions" style={{ margin: 0 }}>
            <button
              onClick={() => resolve('resolve')}
              disabled={busy}
              style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-800)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
            >
              Resolve without refund
            </button>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Refund amount ₹"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ width: '160px' }}
              />
              <button
                onClick={() => resolve('refund', Number(amount))}
                disabled={busy || amount === ''}
                style={{ backgroundColor: 'var(--primary)' }}
              >
                Issue Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert-error" style={{ marginTop: '12px' }}>{error}</div>}
    </div>
  );
}

export default function Requests() {
  const { token, user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [filter, setFilter] = useState('all');
  const [reload, setReload] = useState(0);
  const path = isAdmin && filter !== 'all' ? `/requests?status=${filter}` : '/requests';
  const { data, error, loading } = useApiData(path, token, reload);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>{isAdmin ? 'Customer Support Requests' : 'My Support Requests'}</h1>
          <span className="muted">{isAdmin ? 'Review and manage reported issues' : 'Track the resolution of your requests'}</span>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ flexDirection: 'row', alignItems: 'center', margin: 0 }}>
              <span className="muted">Filter:</span>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 'auto' }}>
                {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <button
              onClick={() => setReload((n) => n + 1)}
              className="btn-secondary"
            >
              🔄 Refresh
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-box">
          <div className="spinner" />
          <span>Loading support requests...</span>
        </div>
      )}

      {error && <div className="alert-error"><span>⚠️</span> {error}</div>}

      {data && data.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">💌</div>
          <h3>No requests to show</h3>
          <p>
            {isAdmin
              ? 'No customer requests match the selected filter.'
              : 'You have not raised any requests. You can raise a support request directly from any order page.'}
          </p>
        </div>
      )}

      {data && data.map((r) => (
        <RequestRow key={r.id} r={r} isAdmin={isAdmin} token={token} onChanged={() => setReload((n) => n + 1)} />
      ))}
    </>
  );
}
