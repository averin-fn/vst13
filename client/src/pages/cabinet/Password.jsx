import { useState } from 'react';
import { api } from '../../api';

const EMPTY = { current: '', next: '', repeat: '' };

export default function CabinetPassword() {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const update = (f) => (e) => {
    setForm({ ...form, [f]: e.target.value });
    setSaved(false);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaved(false);
    setError('');
    if (form.next !== form.repeat) {
      setError('Новый пароль и подтверждение не совпадают');
      return;
    }
    if (form.next.length < 4) {
      setError('Новый пароль слишком короткий (минимум 4 символа)');
      return;
    }
    setBusy(true);
    try {
      await api.changeMyPassword(form.current, form.next);
      setForm(EMPTY);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="page-title">Безопасность</h1>
      <p className="page-subtitle">Смена пароля для входа в личный кабинет.</p>

      <form className="card admin-form" onSubmit={submit} style={{ maxWidth: 480 }}>
        <label className="field">
          <span>Текущий пароль</span>
          <input
            type="password"
            value={form.current}
            onChange={update('current')}
            required
            autoComplete="current-password"
          />
        </label>
        <label className="field">
          <span>Новый пароль</span>
          <input
            type="password"
            value={form.next}
            onChange={update('next')}
            required
            autoComplete="new-password"
          />
        </label>
        <label className="field">
          <span>Подтвердите новый пароль</span>
          <input
            type="password"
            value={form.repeat}
            onChange={update('repeat')}
            required
            autoComplete="new-password"
          />
        </label>

        {error && <p className="notice notice-error">{error}</p>}
        {saved && <p className="notice notice-success">Пароль изменён.</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Сохранение…' : 'Сменить пароль'}
          </button>
        </div>
      </form>
    </div>
  );
}
