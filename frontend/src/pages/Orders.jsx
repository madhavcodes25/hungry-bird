import { Link } from 'react-router-dom';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';

export default function Orders() {
  const { token } = useAuth();
  const { data, error, status, loading } = useApiData('/orders', token);
  if (loading) return <p>Loading your orders...</p>;
  if (error) return <p className="error">{error} {status === 401 && <Link to="/login">Log in again</Link>}</p>;
  if (data.length === 0) return <p>No orders yet. <Link to="/">Order something</Link></p>;
  return (
    <>
      <h1>My orders</h1>
      <ul className="list">
        {data.map((o) => (
          <li key={o.id}>
            <Link to={`/orders/${o.id}`}>Order #{o.id}</Link>
            <span>{o.status}</span>
            <span>₹{Number(o.total_amount).toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}