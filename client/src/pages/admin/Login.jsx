import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, isAuthed } from '../../api';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthed()) {
    navigate('/admin', { replace: true });
  }

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.login(form.username, form.password);
      setToken(token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="card login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <span className="sidebar-logo">⌖</span> ВСТ13
        </div>
        <h1 className="login-title">Вход в админ-панель</h1>

        <label className="field">
          <span>Логин</span>
          <input type="text" value={form.username} onChange={update('username')} required autoFocus />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input type="password" value={form.password} onChange={update('password')} required />
        </label>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Вход…' : 'Войти'}
        </button>

        {error && <p className="notice notice-error">{error}</p>}
      </form>
    </div>
  );
}
