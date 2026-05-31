import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setMemberToken, isMemberAuthed } from '../../api';

export default function CabinetLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isMemberAuthed()) {
    navigate('/cabinet', { replace: true });
  }

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.memberLogin(form.username, form.password);
      setMemberToken(token);
      navigate('/cabinet', { replace: true });
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
        <h1 className="login-title">Личный кабинет участника</h1>

        <label className="field">
          <span>Позывной (логин)</span>
          <input
            type="text"
            value={form.username}
            onChange={update('username')}
            required
            autoFocus
          />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input type="password" value={form.password} onChange={update('password')} required />
        </label>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Вход…' : 'Войти'}
        </button>

        {error && <p className="notice notice-error">{error}</p>}

        <p className="login-hint">
          Логин и пароль выдаёт администратор команды. Нет аккаунта? Напишите через{' '}
          <Link to="/feedback" className="link">форму обратной связи</Link>.
        </p>
      </form>
    </div>
  );
}
