import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { isActive, money, when } from '../orderFlow';

const TITLES = {
  customer: 'My orders',
  restaurant: 'Orders at my restaurant',
  delivery_partner: 'My deliveries',
  admin: 'All orders',
};

function OrderList({ orders, role }) {
  if (orders.length === 0) return <p className="muted">Nothing here.</p>;
  return (
    <ul className="list">
      {orders.map((o) => (
        <li key={o.id}>
          <Link to={`/orders/${o.id}`}>Order #{o.id}</Link>
          <span>
            {role === 'customer' ? o.restaurant_name : `${o.restaurant_name} · for ${o.customer_name}`}
          </span>
          <span className="badge">{o.status}</span>
          <span>{money(o.total_amount)}</span>
          <span className="muted">{when(o.created_at)}</span>
          {o.delivery_address && role !== 'customer' && (
            <span className="muted" style={{ flexBasis: '100%' }}>Deliver to: {o.delivery_address}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Orders() {
  const { token, user } = useAuth();
  const [reload, setReload] = useState(0);
  const { data, error, status, loading } = useApiData('/orders', token, reload);

  if (loading) return <p>Loading orders...</p>;
  if (error) return <p className="error">{error}</p>;

  const active = data.filter((o) => isActive(o.status));
  const past = data.filter((o) => !isActive(o.status));

  return (
    <>
      <h1>{TITLES[user.role]}</h1>
      <button onClick={() => setReload((n) => n + 1)}>Refresh</button>
      {data.length === 0 && (
        <p>
          No orders yet.{' '}
          {user.role === 'customer' && <Link to="/">Order something</Link>}
          {user.role === 'delivery_partner' && <Link to="/deliveries">Find a delivery</Link>}
        </p>
      )}
      {data.length > 0 && (
        <>
          <h2>In progress ({active.length})</h2>
          <OrderList orders={active} role={user.role} />
          <h2>Past orders ({past.length})</h2>
          <OrderList orders={past} role={user.role} />
        </>
      )}
      {status === 401 && <p><Link to="/login">Log in again</Link></p>}
    </>
  );
}
