import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useCart } from '../cart';

export default function Cart() {
  const { token } = useAuth();
  const { restaurant, lines, changeQty, clear, subtotal } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  if (lines.length === 0) {
    return <p>Your cart is empty. <Link to="/">Browse restaurants</Link></p>;
  }

  async function placeOrder() {
    setBusy(true);
    setError('');
    try {
      const result = await api('/orders', {
        method: 'POST',
        token,
        body: {
          restaurantId: restaurant.id,
          items: lines.map((l) => ({ menuItemId: l.id, quantity: l.quantity })),
          paymentMethod,
          couponCode: couponCode.trim() || undefined,
        },
      });
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
            <span>₹{(l.price * l.quantity).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <p>Subtotal: ₹{subtotal.toFixed(2)} (the server works out the final total and any coupon discount)</p>
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