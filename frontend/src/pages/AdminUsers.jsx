import { useState } from 'react';
import { api } from '../api';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { ROLE_LABELS, when } from '../orderFlow';

export default function AdminUsers() {
  const { token } = useAuth();
  const [role, setRole] = useState('');
  const [banned, setBanned] = useState('');
  const [reload, setReload] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (banned) params.set('banned', banned);
  const query = params.toString();
  const { data, error, loading } = useApiData(`/admin/users${query ? `?${query}` : ''}`, token, reload);

  async function setBan(user, ban) {
    setBusyId(user.id);
    setActionError('');
    try {
      await api(`/admin/users/${user.id}/${ban ? 'ban' : 'unban'}`, { method: 'POST', token });
      setReload((n) => n + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1>Users</h1>
      <p>
        Role:{' '}
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">all</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>{' '}
        Status:{' '}
        <select value={banned} onChange={(e) => setBanned(e.target.value)}>
          <option value="">all</option>
          <option value="false">active</option>
          <option value="true">suspended</option>
        </select>{' '}
        <button onClick={() => setReload((n) => n + 1)}>Refresh</button>
      </p>
      {actionError && <p className="error">{actionError}</p>}
      {loading && <p>Loading users...</p>}
      {error && <p className="error">{error}</p>}
      {data && data.length === 0 && <p className="muted">No users match.</p>}
      {data && data.length > 0 && (
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{ROLE_LABELS[u.role]}</td>
                <td>{when(u.created_at)}</td>
                <td>{u.is_banned ? <span className="badge">suspended</span> : 'active'}</td>
                <td>
                  {u.role === 'admin' ? (
                    <span className="muted">cannot be banned</span>
                  ) : u.is_banned ? (
                    <button disabled={busyId === u.id} onClick={() => setBan(u, false)}>Unban</button>
                  ) : (
                    <button disabled={busyId === u.id} onClick={() => setBan(u, true)}>Ban</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted">A banned user is locked out on their next request, and a banned restaurant disappears from the public list.</p>
    </>
  );
}
