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
      <div style={{ marginBottom: '24px' }}>
        <h1>User Administration</h1>
        <p className="muted">Manage accounts across customers, restaurant owners, and delivery partners.</p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span className="muted">Role:</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 'auto', minWidth: '150px' }}>
              <option value="">All Roles</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span className="muted">Status:</span>
            <select value={banned} onChange={(e) => setBanned(e.target.value)} style={{ width: 'auto', minWidth: '140px' }}>
              <option value="">All Statuses</option>
              <option value="false">Active Only</option>
              <option value="true">Suspended Only</option>
            </select>
          </label>

          <button
            onClick={() => setReload((n) => n + 1)}
            style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-800)', border: '1px solid var(--border-color)', boxShadow: 'none', marginLeft: 'auto' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {actionError && <div className="alert-error"><span>⚠️</span> {actionError}</div>}

      {loading && (
        <div className="loading-box">
          <div className="spinner" />
          <span>Loading user accounts...</span>
        </div>
      )}

      {error && <div className="alert-error"><span>⚠️</span> {error}</div>}

      {data && data.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>No users found</h3>
          <p>No user accounts match the selected filters.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, color: 'var(--gray-500)' }}>#{u.id}</td>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td className="muted">{u.email}</td>
                  <td>
                    <span className="badge" style={{ textTransform: 'capitalize' }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: '0.85rem' }}>{when(u.created_at)}</td>
                  <td>
                    <span className={`badge ${u.is_banned ? 'badge-suspended' : 'badge-active'}`}>
                      {u.is_banned ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {u.role === 'admin' ? (
                      <span className="muted" style={{ fontSize: '0.8rem' }}>Admin protected</span>
                    ) : u.is_banned ? (
                      <button
                        disabled={busyId === u.id}
                        onClick={() => setBan(u, false)}
                        style={{ backgroundColor: 'var(--success-subtle)', color: 'var(--success-text)', border: '1px solid var(--success-border)', padding: '6px 14px', fontSize: '0.825rem', boxShadow: 'none' }}
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        disabled={busyId === u.id}
                        onClick={() => setBan(u, true)}
                        style={{ backgroundColor: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger-border)', padding: '6px 14px', fontSize: '0.825rem', boxShadow: 'none' }}
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted" style={{ fontSize: '0.825rem', marginTop: '16px' }}>
        * Note: Suspended users are denied on their next API request. Suspended restaurants are immediately removed from the customer restaurant directory.
      </p>
    </>
  );
}
