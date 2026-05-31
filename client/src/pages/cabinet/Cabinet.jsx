import { useEffect, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { api, isMemberAuthed, clearMemberToken } from '../../api';
import FileField from '../../components/admin/FileField.jsx';

export default function Cabinet() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({ bio: '', photo: '', model_url: '' });
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isMemberAuthed()) return;
    api
      .getMe()
      .then((data) => {
        setMe(data);
        setForm({
          bio: data.bio || '',
          photo: data.photo || '',
          model_url: data.model_url || ''
        });
        setStatus('ready');
      })
      .catch((err) => {
        setError(err.message);
        setStatus('error');
      });
  }, []);

  if (!isMemberAuthed()) {
    return <Navigate to="/cabinet/login" replace />;
  }

  const logout = () => {
    clearMemberToken();
    navigate('/cabinet/login', { replace: true });
  };

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setSaved(false);
  };
  const setField = (field) => (value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await api.updateMe(form);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo">⌖</span>
          <span className="sidebar-name">ВСТ13</span>
        </div>
        <div className="sidebar-tag">Личный кабинет</div>
        {me && (
          <div className="cabinet-me">
            <div className="cabinet-me-callsign">«{me.callsign}»</div>
            <div className="cabinet-me-name">{me.name}</div>
          </div>
        )}
        <div className="sidebar-bottom">
          <Link to="/" className="nav-link">↩ На сайт</Link>
          <button className="nav-link nav-link-btn" onClick={logout}>
            Выйти
          </button>
        </div>
      </aside>

      <div className="main-area">
        <main className="content">
          <div className="admin-page">
            <h1 className="page-title">Профиль</h1>
            <p className="page-subtitle">
              Здесь можно отредактировать досье, фото и 3D-модель снаряжения. Позывной,
              имя, роль и дату вступления меняет администратор.
            </p>

            {status === 'loading' && <p className="notice">Загрузка…</p>}
            {status === 'error' && <p className="notice notice-error">{error || 'Не удалось загрузить профиль.'}</p>}

            {status === 'ready' && me && (
              <form className="card admin-form" onSubmit={save}>
                <div className="form-grid">
                  <div className="field">
                    <span>Позывной</span>
                    <div className="readonly-value">«{me.callsign}»</div>
                  </div>
                  <div className="field">
                    <span>Имя</span>
                    <div className="readonly-value">{me.name}</div>
                  </div>
                  <div className="field">
                    <span>Роль</span>
                    <div className="readonly-value">{me.role}</div>
                  </div>
                  <div className="field">
                    <span>В команде с</span>
                    <div className="readonly-value">{me.joined_date || '—'}</div>
                  </div>
                </div>

                <label className="field">
                  <span>Досье / биография</span>
                  <textarea rows={4} value={form.bio} onChange={update('bio')} />
                </label>

                <div className="form-grid">
                  <FileField
                    label="Фото"
                    value={form.photo}
                    onChange={setField('photo')}
                    accept="image/*"
                    uploadFn={api.memberUpload}
                  />
                  <FileField
                    label="3D-модель (.glb / .gltf)"
                    value={form.model_url}
                    onChange={setField('model_url')}
                    accept=".glb,.gltf,model/gltf-binary"
                    uploadFn={api.memberUpload}
                    hint="Если не задана — показывается стандартная модель бойца."
                  />
                </div>

                {error && <p className="notice notice-error">{error}</p>}
                {saved && <p className="notice notice-success">Сохранено.</p>}

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy ? 'Сохранение…' : 'Сохранить'}
                  </button>
                  <Link to={`/participants/${me.id}`} className="btn btn-ghost">
                    Смотреть мою карточку
                  </Link>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
