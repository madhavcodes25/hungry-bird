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
    const body = { code: code.trim(), discountType, discountValue: Number(discountValue), validUntil };
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
  const isExpired = (c) => new Date(c.valid_until) < new Date();

  return (
    <>
      <h1>Coupons</h1>
      <h2>Create a coupon</h2>
      <form onSubmit={create}>
        <input placeholder="Code (for example DIWALI25)" value={code} onChange={(e) => setCode(e.target.value)} required />
        <label>
          Type{' '}
          <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
            <option value="percent">percent</option>
            <option value="flat">flat amount</option>
          </select>
        </label>
        <input type="number" min="0" step="0.01" placeholder={discountType === 'percent' ? 'Percent off (1 to 100)' : 'Amount off'}
               value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} required />
        <input type="number" min="0" step="0.01" placeholder="Minimum order value (optional)" value={minOrderValue}
               onChange={(e) => setMinOrderValue(e.target.value)} />
        <input type="number" min="1" step="1" placeholder="Usage limit (optional, default 100)" value={usageLimit}
               onChange={(e) => setUsageLimit(e.target.value)} />
        <label>
          Valid until{' '}
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
        </label>
        <button disabled={busy}>{busy ? 'Creating...' : 'Create coupon'}</button>
        {error && <p className="error">{error}</p>}
        {created && <p className="ok">Created coupon {created}.</p>}
      </form>

      <h2>All coupons</h2>
      {loading && <p>Loading coupons...</p>}
      {loadError && <p className="error">{loadError}</p>}
      {data && data.length === 0 && <p className="muted">No coupons yet.</p>}
      {data && data.length > 0 && (
        <table>
          <thead>
            <tr><th>Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Valid until</th></tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id}>
                <td>{c.code}</td>
                <td>{describe(c)}</td>
                <td>{money(c.min_order_value)}</td>
                <td>{c.times_used} / {c.usage_limit}</td>
                <td>
                  {when(c.valid_until)} {isExpired(c) && <span className="badge">expired</span>}
                  {!isExpired(c) && c.times_used >= c.usage_limit && <span className="badge">used up</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
