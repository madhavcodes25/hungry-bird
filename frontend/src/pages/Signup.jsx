import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    const fields = {
      role,
      name: name.trim(),
      email: email.trim(),
      password,
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    };
    if (role === 'restaurant') {
      fields.restaurant_name = restaurantName.trim();
      fields.address = address.trim();
      if (cuisine.trim()) fields.cuisine_type = cuisine.trim();
    }
    setBusy(true);
    try {
      await signup(fields);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="auth-header">
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🐦</div>
          <h1>Create an Account</h1>
          <p>Join Hungry Bird today</p>
        </div>

        <form onSubmit={onSubmit} style={{ maxWidth: 'none', margin: 0 }}>
          <label>
            Join as:
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
              {[
                { id: 'customer', label: 'Customer', icon: '👤' },
                { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
                { id: 'delivery_partner', label: 'Partner', icon: '🛵' },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setRole(opt.id)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${role === opt.id ? 'var(--primary)' : 'var(--border-color)'}`,
                    backgroundColor: role === opt.id ? 'var(--primary-subtle)' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{opt.icon}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: role === opt.id ? 'var(--primary)' : 'var(--gray-700)' }}>
                    {opt.label}
                  </div>
                </div>
              ))}
            </div>
            {/* Kept native select hidden for accessibility and fallback */}
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ display: 'none' }}>
              <option value="customer">customer</option>
              <option value="restaurant">restaurant owner</option>
              <option value="delivery_partner">delivery partner</option>
            </select>
          </label>

          <label>
            Full Name
            <input
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </label>

          <label>
            Email Address
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password (at least 6 characters)
            <input
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <label>
            Phone Number (Optional)
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </label>

          {role === 'restaurant' && (
            <div style={{ background: 'var(--gray-50)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'grid', gap: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-800)' }}>
                Restaurant Details
              </div>
              <label>
                Restaurant Brand Name
                <input
                  placeholder="e.g. Spice Symphony"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  required
                />
              </label>

              <label>
                Restaurant Street Address
                <input
                  placeholder="Shop #, Street, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </label>

              <label>
                Cuisine Specialty (Optional)
                <input
                  placeholder="e.g. North Indian, Continental, Pizza"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                />
              </label>
            </div>
          )}

          <button disabled={busy} style={{ width: '100%', padding: '12px', fontSize: '1rem', marginTop: '8px' }}>
            {busy ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                <span>Creating account...</span>
              </>
            ) : (
              'Create Account'
            )}
          </button>

          {error && <div className="alert-error" style={{ marginTop: '14px' }}><span>⚠️</span> {error}</div>}
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.925rem' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 700 }}>Log in</Link>
        </div>
      </div>
    </div>
  );
}
