import { Link } from 'react-router-dom';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { money } from '../orderFlow';

export default function Earnings() {
  const { token } = useAuth();
  const { data, error, loading } = useApiData('/deliveries/earnings', token);
  if (loading) return <p>Loading earnings...</p>;
  if (error) return <p className="error">{error}</p>;
  return (
    <>
      <h1>My earnings</h1>
      <ul className="list">
        <li><span>Deliveries completed</span><strong>{data.delivered_count}</strong></li>
        <li><span>Total payout earned</span><strong>{money(data.total_earned)}</strong></li>
        <li><span>Cash collected on cash-on-delivery orders</span><strong>{money(data.cash_collected)}</strong></li>
      </ul>
      <h2>Recent deliveries</h2>
      {data.recent.length === 0 && <p className="muted">No completed deliveries yet.</p>}
      <ul className="list">
        {data.recent.map((r) => (
          <li key={r.order_id}>
            <Link to={`/orders/${r.order_id}`}>Order #{r.order_id}</Link>
            <span>{money(r.payout_amount)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
