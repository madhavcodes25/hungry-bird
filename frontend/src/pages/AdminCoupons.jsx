import { useState } from 'react';
import { api } from '../api';
import { useApiData } from '../useApiData';
import { useAuth } from '../auth';
import { money, when } from '../orderFlow';

export default function AdminCoupons() {
  const { token } = useAuth();
  const [reload, setReload] = useState(0);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState('');
  const { data, error: loadError, loading } = useApiData('/admin/coupons', token, reload);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setCreated('');
    const body = { code: code.trim().toUpperCase(), discountType, discountValue: Number(discountValue), validUntil };
    if (minOrderValue !== '') body.minOrderValue = Number(minOrderValue);
    if (usageLimit !== '') body.usageLimit = Number(usageLimit);
    try {
      const coupon = await api('/admin/coupons', { method: 'POST', token, body });
      setCreated(coupon.code);
      setCode('');
      setDiscountValue('');
      setMinOrderValue('');
      setUsageLimit('');
      setValidUntil('');
      setReload((n) => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const describe = (c) => (c.discount_type === 'percent' ? `${Number(c.discount_value)}% off` : `${money(c.discount_value)} off`);
  const [now] = useState(() => Date.now());
  const isExpired = (c) => new Date(c.valid_until).getTime() < now;

  return (
    <>
      <div style={{ marginBottom: '24px' }}>
        <h1>Promotional Coupons</h1>
        <p className="muted">Create and manage promo discount codes for customer checkout.</p>
      </div>

      <div className="card" style={{ marginBottom: '32px', background: 'linear-gradient(135deg, #ffffff 0%, #fffaf8 100%)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🏷️</span> Create New Coupon
        </h2>
        <form onSubmit={create} style={{ maxWidth: 'none', margin: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <label>
              Promo Code
              <input
                placeholder="e.g. HUNGRY50"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}
              />
            </label>

            <label>
              Discount Type
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                <option value="percent">Percentage Off (%)</option>
                <option value="flat">Flat Amount Off (₹)</option>
              </select>
            </label>

            <label>
              {discountType === 'percent' ? 'Discount Percentage (1 - 100)' : 'Discount Value in ₹'}
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={discountType === 'percent' ? 'e.g. 20' : 'e.g. 100'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
              />
            </label>

            <label>
              Minimum Order Value ₹ (Optional)
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 299"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
              />
            </label>

            <label>
              Usage Limit (Optional, default 100)
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 50"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
              />
            </label>

            <label>
              Valid Until
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
              />
            </label>
          </div>

          <div style={{ marginTop: '16px' }}>
            <button disabled={busy} style={{ padding: '11px 26px', fontSize: '0.95rem' }}>
              {busy ? 'Creating Coupon...' : 'Create Coupon'}
            </button>
          </div>

          {error && <div className="alert-error" style={{ marginTop: '14px' }}><span>⚠️</span> {error}</div>}
          {created && <div className="alert-success" style={{ marginTop: '14px' }}><span>🎉</span> Successfully created coupon <strong>{created}</strong>.</div>}
        </form>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>All Created Coupons</h2>
        {data && <span className="muted">{data.length} coupon{data.length === 1 ? '' : 's'} available</span>}
      </div>

      {loading && (
        <div className="loading-box">
          <div className="spinner" />
          <span>Loading coupon records...</span>
        </div>
      )}

      {loadError && <div className="alert-error"><span>⚠️</span> {loadError}</div>}

      {data && data.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🎟️</div>
          <h3>No coupons yet</h3>
          <p>Create a promotional coupon above to provide discounts to customers during checkout.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Usage</th>
                <th>Expiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => {
                const expired = isExpired(c);
                const usedUp = !expired && c.times_used >= c.usage_limit;
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="badge" style={{ backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)', borderColor: 'var(--primary-border)', fontWeight: 800 }}>
                        {c.code}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{describe(c)}</td>
                    <td className="muted">{money(c.min_order_value)}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{c.times_used}</span>
                      <span className="muted"> / {c.usage_limit}</span>
                    </td>
                    <td className="muted" style={{ fontSize: '0.85rem' }}>{when(c.valid_until)}</td>
                    <td>
                      {expired ? (
                        <span className="badge badge-cancelled">Expired</span>
                      ) : usedUp ? (
                        <span className="badge badge-picked_up">Used Up</span>
                      ) : (
                        <span className="badge badge-delivered">Active</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
