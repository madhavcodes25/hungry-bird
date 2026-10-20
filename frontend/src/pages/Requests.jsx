import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { money, when } from '../orderFlow';

const STATUS_FILTERS = ['all', 'open', 'resolved', 'refunded'];

// One request, with the admin controls when it is still open
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
    <div className="box">
      <p>
        <strong>Request #{r.id}</strong> on <Link to={`/orders/${r.order_id}`}>order #{r.order_id}</Link>{' '}
        <span className="badge">{r.status}</span>
        {isAdmin && <> · from {r.customer_name}</>}
      </p>
      <p>{r.reason}</p>
      <p className="muted">
        Order total {money(r.order_total)} · order is {r.order_status} · raised {when(r.created_at)}
        {r.status === 'refunded' && <> · refunded {money(r.refund_amount)}</>}
      </p>
      {isAdmin && r.status === 'open' && (
        <>
          <p className="muted">Still refundable on this order: {money(r.refundable_remaining)}</p>
          <div className="actions">
            <button onClick={() => resolve('resolve')} disabled={busy}>Resolve without refund</button>
            <input type="number" min="0" step="0.01" placeholder="Refund amount" value={amount}
                   onChange={(e) => setAmount(e.target.value)} />
            <button onClick={() => resolve('refund', Number(amount))} disabled={busy || amount === ''}>
              Refund
            </button>
          </div>
        </>
      )}
      {error && <p className="error">{error}</p>}
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
      <h1>{isAdmin ? 'Customer requests' : 'My requests'}</h1>
      {isAdmin && (
        <p>
          Show:{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>{' '}
          <button onClick={() => setReload((n) => n + 1)}>Refresh</button>
        </p>
      )}
      {loading && <p>Loading requests...</p>}
      {error && <p className="error">{error}</p>}
      {data && data.length === 0 && (
        <p className="muted">
          {isAdmin ? 'No requests match.' : 'You have not raised any requests. You can raise one from an order page.'}
        </p>
      )}
      {data && data.map((r) => (
        <RequestRow key={r.id} r={r} isAdmin={isAdmin} token={token} onChanged={() => setReload((n) => n + 1)} />
      ))}
    </>
  );
}
