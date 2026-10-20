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
  try { localStorage.setItem(ADDRESS_KEY, value); } catch { /* storage unavailable, so nothing is remembered */ }
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
    return <p>Your cart is empty. <Link to="/">Browse restaurants</Link></p>;
  }

  async function placeOrder() {
    setError('');
    setStatus(null);
    if (address.trim().length < 5) {
      setError('Please enter your delivery address (at least 5 characters).');
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
      saveAddress(result.deliveryAddress || address.trim());   // keep the tidied version the server confirmed
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
      <h1>Your cart</h1>
      <p>From {restaurant.name}</p>
      <ul className="list">
        {lines.map((l) => (
          <li key={l.id}>
            <span>{l.name}</span>
            <button onClick={() => changeQty(l.id, -1)}>-</button>
            <span>{l.quantity}</span>
            <button onClick={() => changeQty(l.id, 1)}>+</button>
            <span>{money(l.price * l.quantity)}</span>
          </li>
        ))}
      </ul>
      <p>Subtotal: {money(subtotal)} <span className="muted">(the server works out the final total and any coupon discount)</span></p>
      <label>
        Delivery address
        <textarea rows={2} maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="House or flat, building, street, area, city" style={{ display: 'block', width: '100%', maxWidth: 420 }} />
      </label>
      <div className="form-row">
        <label>
          Payment{' '}
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="cod">Cash on delivery</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
          </select>
        </label>
        <input placeholder="Coupon code (optional)" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
      </div>
      <button onClick={placeOrder} disabled={busy}>{busy ? 'Placing order...' : 'Place order'}</button>
      {error && (
        <p className="error">
          {error} {status === 401 && <Link to="/login">Log in again</Link>}
        </p>
      )}
    </>
  );
}
