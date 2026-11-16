import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { money } from '../orderFlow';

const ADDRESS_KEY = 'hb_address';

// The last address used, so a returning customer does not retype it
function loadAddress() {
  try { return localStorage.getItem(ADDRESS_KEY) || ''; } catch { return ''; }
}
function saveAddress(value) {
  try { localStorage.setItem(ADDRESS_KEY, value); } catch { /* storage unavailable */ }
}

export default function Cart() {
  const { token } = useAuth();
  const { restaurant, lines, changeQty, clear, subtotal } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [couponCode, setCouponCode] = useState('');
  const [address, setAddress] = useState(loadAddress);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  if (lines.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Explore restaurants, add your favorite dishes, and order in seconds!</p>
        <Link to="/" className="btn" style={{ padding: '12px 24px', fontSize: '1rem' }}>
          Browse Restaurants
        </Link>
      </div>
    );
  }

  async function placeOrder() {
    setError('');
    setStatus(null);
    if (address.trim().length < 5) {
      setError('Please enter your full delivery address (at least 5 characters).');
      return;
    }
    setBusy(true);
    try {
      const result = await api('/orders', {
        method: 'POST',
        token,
        body: {
          restaurantId: restaurant.id,
          items: lines.map((l) => ({ menuItemId: l.id, quantity: l.quantity })),
          paymentMethod,
          couponCode: couponCode.trim() || undefined,
          deliveryAddress: address.trim(),
        },
      });
      saveAddress(result.deliveryAddress || address.trim());
      clear();
      navigate(`/orders/${result.orderId}`);
    } catch (err) {
      setError(err.message);
      setStatus(err.status ?? null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: '24px' }}>
        <h1>Checkout</h1>
        <p className="muted">Review your items and complete your order from <strong>{restaurant.name}</strong></p>
      </div>

      <div className="cart-layout">
        {/* Left Column: Delivery & Payment Details */}
        <div style={{ display: 'grid', gap: '20px' }}>
          <div className="card">
            <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📍</span> Delivery Address
            </h2>
            <label style={{ display: 'block' }}>
              <span className="muted" style={{ display: 'block', marginBottom: '6px' }}>
                Where should we drop off your meal?
              </span>
              <textarea
                rows={3}
                maxLength={300}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Flat / House no, Building name, Street address, Area, City"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </label>
          </div>

          <div className="card">
            <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💳</span> Payment Option
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              {[
                { id: 'cod', label: 'Cash on Delivery', icon: '💵' },
                { id: 'card', label: 'Credit / Debit Card', icon: '💳' },
                { id: 'upi', label: 'UPI / Instant Pay', icon: '📱' },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setPaymentMethod(opt.id)}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${paymentMethod === opt.id ? 'var(--primary)' : 'var(--border-color)'}`,
                    backgroundColor: paymentMethod === opt.id ? 'var(--primary-subtle)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{opt.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: paymentMethod === opt.id ? 'var(--primary)' : 'var(--gray-800)' }}>
                    {opt.label}
                  </div>
                </div>
              ))}
            </div>
            {/* Native select kept for full accessibility */}
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ display: 'none' }}
            >
              <option value="cod">Cash on delivery</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
            </select>
          </div>

          <div className="card">
            <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏷️</span> Have a Coupon?
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                placeholder="Enter coupon code (e.g. WELCOME10)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
              />
            </div>
            <span className="muted" style={{ display: 'block', marginTop: '6px' }}>
              Discount will be verified and applied by the server during checkout.
            </span>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '90px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1.25rem', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
              Order Summary
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <span className="muted">Ordering from:</span>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-900)' }}>{restaurant.name}</div>
            </div>

            <div style={{ margin: '16px 0', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
              {lines.map((l) => (
                <div key={l.id} className="cart-item-row">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.925rem' }}>{l.name}</div>
                    <span className="muted" style={{ fontSize: '0.8rem' }}>{money(l.price)} each</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => changeQty(l.id, -1)} aria-label="Decrease quantity">-</button>
                      <span className="qty-number">{l.quantity}</span>
                      <button className="qty-btn" onClick={() => changeQty(l.id, 1)} aria-label="Increase quantity">+</button>
                    </div>
                    <span style={{ fontWeight: 700, minWidth: '65px', textAlign: 'right' }}>
                      {money(l.price * l.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: 'var(--gray-600)' }}>Subtotal</span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{money(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ color: 'var(--gray-600)' }}>Delivery Fee</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>FREE</span>
            </div>

            <button
              onClick={placeOrder}
              disabled={busy}
              style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: 'var(--radius-md)' }}
            >
              {busy ? (
                <>
                  <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                  <span>Placing order...</span>
                </>
              ) : (
                `Place Order • ${money(subtotal)}`
              )}
            </button>

            {error && (
              <div className="alert-error" style={{ marginTop: '16px' }}>
                <span>⚠️</span>
                <div>
                  {error} {status === 401 && <Link to="/login" style={{ textDecoration: 'underline' }}>Log in again</Link>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
