import { useState } from 'react';
import { api } from '../api';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { money } from '../orderFlow';

function MenuRow({ item, token, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(Number(item.price)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function call(method, path, body) {
    setBusy(true);
    setError('');
    try {
      await api(path, { method, token, body });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li style={{ display: 'block', padding: '16px 20px' }}>
      {editing ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Item name"
            placeholder="Item name"
            style={{ flex: 1, minWidth: '180px' }}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label="Item price"
            placeholder="Price ₹"
            style={{ width: '130px' }}
          />
          <button
            disabled={busy}
            onClick={() => call('PUT', `/menu/${item.id}`, { name: name.trim(), price: Number(price) })}
          >
            Save
          </button>
          <button
            disabled={busy}
            onClick={() => { setEditing(false); setName(item.name); setPrice(String(Number(item.price))); }}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.25rem' }}>🍴</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-900)' }}>{item.name}</div>
              <div style={{ fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>{money(item.price)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`badge ${item.is_available ? 'badge-delivered' : 'badge-cancelled'}`}>
              {item.is_available ? 'Available' : 'Unavailable'}
            </span>
            <button
              disabled={busy}
              onClick={() => setEditing(true)}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Edit
            </button>
            <button
              disabled={busy}
              onClick={() => call('PUT', `/menu/${item.id}`, { is_available: !item.is_available })}
              style={{
                backgroundColor: item.is_available ? 'var(--warning-subtle)' : 'var(--success-subtle)',
                color: item.is_available ? 'var(--warning-text)' : 'var(--success-text)',
                border: `1px solid ${item.is_available ? 'var(--warning-border)' : 'var(--success-border)'}`,
                padding: '6px 12px',
                fontSize: '0.85rem',
                boxShadow: 'none'
              }}
            >
              {item.is_available ? 'Mark unavailable' : 'Mark available'}
            </button>
            <button
              disabled={busy}
              onClick={() => call('DELETE', `/menu/${item.id}`)}
              className="btn-danger"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {error && <div className="alert-error" style={{ marginTop: '10px' }}>{error}</div>}
    </li>
  );
}

export default function MenuManager() {
  const { token } = useAuth();
  const [reload, setReload] = useState(0);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { data, error: loadError, loading } = useApiData('/menu/mine', token, reload);
  const changed = () => setReload((n) => n + 1);

  async function addItem(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/menu', { method: 'POST', token, body: { name: name.trim(), price: Number(price) } });
      setName('');
      setPrice('');
      changed();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: '24px' }}>
        <h1>Menu Management</h1>
        <p className="muted">Create, edit, and control the availability of dishes at your restaurant.</p>
      </div>

      <div className="card" style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: '0 0 14px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>➕</span> Add a New Dish
        </h2>
        <form className="inline" onSubmit={addItem} style={{ margin: 0 }}>
          <input
            placeholder="Dish name (e.g. Butter Chicken)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ flex: 1, minWidth: '220px' }}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Price in ₹"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            style={{ width: '140px' }}
          />
          <button disabled={busy} style={{ padding: '10px 22px' }}>
            {busy ? 'Adding...' : 'Add Item to Menu'}
          </button>
        </form>
        {error && <div className="alert-error" style={{ marginTop: '12px' }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Your Current Menu</h2>
        {data && <span className="muted">{data.length} item{data.length === 1 ? '' : 's'} listed</span>}
      </div>

      {loading && (
        <div className="loading-box">
          <div className="spinner" />
          <span>Loading menu catalog...</span>
        </div>
      )}

      {loadError && <div className="alert-error"><span>⚠️</span> {loadError}</div>}

      {data && data.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>Your menu is empty</h3>
          <p>Add your first signature dish using the form above to start receiving customer orders.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <ul className="list">
          {data.map((item) => (
            <MenuRow key={item.id} item={item} token={token} onChanged={changed} />
          ))}
        </ul>
      )}
    </>
  );
}
