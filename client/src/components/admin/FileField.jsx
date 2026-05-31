import { useState } from 'react';
import { api } from '../../api';

export default function FileField({ label, value, onChange, accept, hint, uploadFn }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const fn = uploadFn || api.upload;
      const { url } = await fn(file);
      onChange(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <div className="field">
      <span>{label}</span>
      <div className="file-field">
        <input type="file" accept={accept} onChange={onSelect} disabled={busy} />
        {busy && <span className="file-status">Загрузка…</span>}
      </div>
      {hint && <span className="file-hint">{hint}</span>}
      {value && (
        <div className="file-current">
          <code>{value}</code>
          <button type="button" className="link-btn" onClick={() => onChange('')}>
            убрать
          </button>
        </div>
      )}
      {error && <span className="file-error">{error}</span>}
    </div>
  );
}
