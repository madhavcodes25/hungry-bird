import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),  
      });
      navigate('/');         
    } catch (err) {
      setError(err.message);   
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Create an account</h1>
      <form onSubmit={onSubmit}>
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
               autoComplete="name" required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
               autoComplete="email" required />
        <input type="password" placeholder="Password (at least 6 characters)" value={password}
               onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} required />
        <input type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)}
               autoComplete="tel" />
        <button disabled={busy}>{busy ? 'Creating account...' : 'Sign up'}</button>
        {error && <p className="error">{error}</p>}
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </>
  );
}