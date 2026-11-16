import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(demoEmail, demoPassword) {
    setEmail(demoEmail);
    setPassword(demoPassword);
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🐦</div>
          <h1>Welcome Back</h1>
          <p>Sign in to your Hungry Bird account</p>
        </div>

        <form onSubmit={onSubmit} style={{ maxWidth: 'none', margin: 0 }}>
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
            Password
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button disabled={busy} style={{ width: '100%', padding: '12px', fontSize: '1rem', marginTop: '6px' }}>
            {busy ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                <span>Logging in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {error && <div className="alert-error" style={{ marginTop: '14px' }}><span>⚠️</span> {error}</div>}
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.925rem' }}>
          New to Hungry Bird? <Link to="/signup" style={{ fontWeight: 700 }}>Create an account</Link>
        </div>

        <div className="demo-credentials-box">
          <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--gray-800)' }}>
            ⚡ Quick Demo Logins:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => fillDemo('asha@test.com', 'password123')}
              style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#ffffff', color: 'var(--gray-700)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
            >
              Customer (Asha)
            </button>
            <button
              type="button"
              onClick={() => fillDemo('ravi@test.com', 'password123')}
              style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#ffffff', color: 'var(--gray-700)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
            >
              Restaurant (Ravi)
            </button>
            <button
              type="button"
              onClick={() => fillDemo('kiran@test.com', 'password123')}
              style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#ffffff', color: 'var(--gray-700)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
            >
              Delivery (Kiran)
            </button>
            <button
              type="button"
              onClick={() => fillDemo('admin@hungrybird.com', 'admin123')}
              style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#ffffff', color: 'var(--gray-700)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
