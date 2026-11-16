import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { isActive, money, when } from '../orderFlow';

const TITLES = {
  customer: 'My Orders',
  restaurant: 'Restaurant Orders',
  delivery_partner: 'My Deliveries',
  admin: 'All Orders',
};

function OrderList({ orders, role }) {
  if (orders.length === 0) {
    return (
      <div className="box" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-500)' }}>
        No orders found in this section.
      </div>
    );
  }

  return (
    <ul className="list" style={{ display: 'grid', gap: '14px', margin: 0 }}>
      {orders.map((o) => (
        <li key={o.id} style={{ display: 'block', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link to={`/orders/${o.id}`} style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-900)' }}>
                Order #{o.id}
              </Link>
              <span className={`badge badge-${o.status}`}>
                {o.status.replaceAll('_', ' ')}
              </span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--gray-900)' }}>
              {money(o.total_amount)}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--gray-800)', marginBottom: '4px' }}>
                {role === 'customer' ? (
                  <span>🍽️ {o.restaurant_name}</span>
                ) : (
                  <span>🍽️ {o.restaurant_name} · 👤 {o.customer_name}</span>
                )}
              </div>
              <div className="muted" style={{ fontSize: '0.825rem' }}>
                Placed {when(o.created_at)}
              </div>
            </div>

            <Link to={`/orders/${o.id}`} className="btn" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
              View Details &rarr;
            </Link>
          </div>

          {o.delivery_address && role !== 'customer' && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-light)', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
              📍 <strong>Deliver to:</strong> {o.delivery_address}
            </div>
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

  if (loading) {
    return (
      <div className="loading-box">
        <div className="spinner" />
        <span>Loading orders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-error">
        <span>⚠️</span> {error}
      </div>
    );
  }

  const orders = data || [];
  const active = orders.filter((o) => isActive(o.status));
  const past = orders.filter((o) => !isActive(o.status));

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>{TITLES[user.role]}</h1>
          <span className="muted">Track live updates and order history</span>
        </div>
        <button
          onClick={() => setReload((n) => n + 1)}
          className="btn-secondary"
        >
          🔄 Refresh
        </button>
      </div>

      {orders.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No orders yet</h3>
          <p>
            {user.role === 'customer' && 'You have not placed any orders yet. Discover delicious food nearby!'}
            {user.role === 'delivery_partner' && 'You do not have any assigned deliveries right now.'}
            {user.role === 'restaurant' && 'No customer orders have arrived yet.'}
            {user.role === 'admin' && 'No orders have been recorded in the system.'}
          </p>
          {user.role === 'customer' && (
            <Link to="/" className="btn">Browse Restaurants</Link>
          )}
          {user.role === 'delivery_partner' && (
            <Link to="/deliveries" className="btn">Find Deliveries</Link>
          )}
        </div>
      )}

      {orders.length > 0 && (
        <div style={{ display: 'grid', gap: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>In Progress</h2>
              <span className="badge" style={{ backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)', borderColor: 'var(--primary-border)' }}>
                {active.length} active
              </span>
            </div>
            <OrderList orders={active} role={user.role} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Past Orders</h2>
              <span className="badge">
                {past.length} completed
              </span>
            </div>
            <OrderList orders={past} role={user.role} />
          </div>
        </div>
      )}

      {status === 401 && (
        <div className="alert-error" style={{ marginTop: '20px' }}>
          Session expired. <Link to="/login" style={{ textDecoration: 'underline' }}>Log in again</Link>
        </div>
      )}
    </>
  );
}
