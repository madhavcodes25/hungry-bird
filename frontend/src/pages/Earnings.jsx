import { Link } from 'react-router-dom';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { money } from '../orderFlow';

export default function Earnings() {
  const { token } = useAuth();
  const { data, error, loading } = useApiData('/deliveries/earnings', token);

  if (loading) {
    return (
      <div className="loading-box">
        <div className="spinner" />
        <span>Calculating your earnings...</span>
      </div>
    );
  }

  if (error) {
    return <div className="alert-error"><span>⚠️</span> {error}</div>;
  }

  return (
    <>
      <div style={{ marginBottom: '28px' }}>
        <h1>Delivery Partner Earnings</h1>
        <p className="muted">Track your completed delivery runs, earnings payouts, and cash collections.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span className="stat-card-label">Deliveries Completed</span>
            <span style={{ fontSize: '1.5rem' }}>📦</span>
          </div>
          <div className="stat-card-value">{data.delivered_count}</div>
          <span className="muted" style={{ fontSize: '0.8rem', marginTop: '6px' }}>Successful drop-offs</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span className="stat-card-label">Total Payout Earned</span>
            <span style={{ fontSize: '1.5rem' }}>💰</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--success-text)' }}>
            {money(data.total_earned)}
          </div>
          <span className="muted" style={{ fontSize: '0.8rem', marginTop: '6px' }}>Direct driver earnings</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span className="stat-card-label">Cash Collected</span>
            <span style={{ fontSize: '1.5rem' }}>💵</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--info-text)' }}>
            {money(data.cash_collected)}
          </div>
          <span className="muted" style={{ fontSize: '0.8rem', marginTop: '6px' }}>Cash on Delivery collections</span>
        </div>
      </div>

      <div style={{ marginTop: '36px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Recent Completed Deliveries</h2>
        {data.recent.length === 0 ? (
          <div className="box" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500)' }}>
            No completed deliveries recorded yet. Accept an available order to get started!
          </div>
        ) : (
          <ul className="list">
            {data.recent.map((r) => (
              <li key={r.order_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🎉</span>
                  <Link to={`/orders/${r.order_id}`} style={{ fontWeight: 700, fontSize: '1rem' }}>
                    Order #{r.order_id}
                  </Link>
                  <span className="badge badge-delivered">Completed</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--success-text)' }}>
                  +{money(r.payout_amount)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
