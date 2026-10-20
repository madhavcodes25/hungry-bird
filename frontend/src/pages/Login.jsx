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
      navigate('/');            // Home sends each role to its own dashboard
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Log in</h1>
      <form onSubmit={onSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
               autoComplete="email" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
               autoComplete="current-password" required />
        <button disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
        {error && <p className="error">{error}</p>}
      </form>
      <p>New here? <Link to="/signup">Create an account</Link></p>
      <p className="muted">
        Demo accounts (after running db/seed.sql): admin@hungrybird.com / admin123, and asha@test.com,
        rohan@test.com, ravi@test.com, meena@test.com, kiran@test.com, sunil@test.com / password123.
      </p>
    </>
  );
}
