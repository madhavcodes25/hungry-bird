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
      navigate('/');            // signup also logs you in
    } catch (err) {
      setError(err.message);    // for example "email already registered"
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Create an account</h1>
      <form onSubmit={onSubmit}>
        <label>
          I am a{' '}
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="customer">customer</option>
            <option value="restaurant">restaurant owner</option>
            <option value="delivery_partner">delivery partner</option>
          </select>
        </label>
        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
               autoComplete="name" required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
               autoComplete="email" required />
        <input type="password" placeholder="Password (at least 6 characters)" value={password}
               onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} required />
        <input type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)}
               autoComplete="tel" />
        {role === 'restaurant' && (
          <>
            <input placeholder="Restaurant name" value={restaurantName}
                   onChange={(e) => setRestaurantName(e.target.value)} required />
            <input placeholder="Restaurant address" value={address}
                   onChange={(e) => setAddress(e.target.value)} required />
            <input placeholder="Cuisine (optional)" value={cuisine} onChange={(e) => setCuisine(e.target.value)} />
          </>
        )}
        <button disabled={busy}>{busy ? 'Creating account...' : 'Sign up'}</button>
        {error && <p className="error">{error}</p>}
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
      <p className="muted">Admin accounts cannot be created here. They are created in the database.</p>
    </>
  );
}
