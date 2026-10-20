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
    <li>
      {editing ? (
        <>
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Item name" />
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
                 aria-label="Item price" />
          <button disabled={busy} onClick={() => call('PUT', `/menu/${item.id}`, { name: name.trim(), price: Number(price) })}>
            Save
          </button>
          <button disabled={busy} onClick={() => { setEditing(false); setName(item.name); setPrice(String(Number(item.price))); }}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <span>{item.name}</span>
          <span>{money(item.price)}</span>
          <span className="badge">{item.is_available ? 'available' : 'unavailable'}</span>
          <button disabled={busy} onClick={() => setEditing(true)}>Edit</button>
          <button disabled={busy} onClick={() => call('PUT', `/menu/${item.id}`, { is_available: !item.is_available })}>
            {item.is_available ? 'Mark unavailable' : 'Mark available'}
          </button>
          <button disabled={busy} onClick={() => call('DELETE', `/menu/${item.id}`)}>Delete</button>
        </>
      )}
      {error && <span className="error">{error}</span>}
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
      <h1>My menu</h1>
      <form className="inline" onSubmit={addItem}>
        <input placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="number" min="0" step="0.01" placeholder="Price" value={price}
               onChange={(e) => setPrice(e.target.value)} required />
        <button disabled={busy}>Add item</button>
      </form>
      {error && <p className="error">{error}</p>}

      {loading && <p>Loading menu...</p>}
      {loadError && <p className="error">{loadError}</p>}
      {data && data.length === 0 && <p className="muted">No items yet. Add your first one above.</p>}
      {data && (
        <ul className="list">
          {data.map((item) => <MenuRow key={item.id} item={item} token={token} onChanged={changed} />)}
        </ul>
      )}
      <p className="muted">
        Only available items appear on the public menu. An item that is in past orders cannot be deleted,
        so mark it unavailable instead.
      </p>
    </>
  );
}
