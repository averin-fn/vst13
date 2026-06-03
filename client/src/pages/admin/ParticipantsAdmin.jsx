import { useEffect, useState } from 'react';
import { api } from '../../api';
import { ROLES } from '../../roles';
import FileField from '../../components/admin/FileField.jsx';

const EMPTY = {
  name: '',
  callsign: '',
  role: '',
  bio: '',
  photo: '',
  model_url: '',
  joined_date: '',
  username: '',
  password: '',
  can_manage_events: false,
  is_admin: false
};

export default function ParticipantsAdmin() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [hadAccount, setHadAccount] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.getParticipants().then(setList).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setField = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const startCreate = () => {
    setForm(EMPTY);
    setEditingId(null);
    setHadAccount(false);
    setError('');
  };

  const startEdit = async (p) => {
    setError('');
    setEditingId(p.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const full = await api.getAdminParticipant(p.id);
      setForm({
        name: full.name,
        callsign: full.callsign,
        role: full.role,
        bio: full.bio,
        photo: full.photo,
        model_url: full.model_url,
        joined_date: full.joined_date,
        username: full.username || '',
        password: '',
        can_manage_events: !!full.can_manage_events,
        is_admin: !!full.is_admin
      });
      setHadAccount(!!full.username);
    } catch (err) {
      setError(err.message);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      // На обновление: отправляем username всегда (чтобы можно было убрать),
      // password — только если ввели новый.
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editingId) {
        await api.updateParticipant(editingId, payload);
      } else {
        // На создание: если username/password пустые — не отправляем эти поля.
        if (!payload.username) {
          delete payload.username;
          delete payload.password;
        }
        await api.createParticipant(payload);
      }
      await load();
      startCreate();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Удалить участника «${p.callsign}»?`)) return;
    try {
      await api.deleteParticipant(p.id);
      if (editingId === p.id) startCreate();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="page-title">Участники</h1>

      <form className="card admin-form" onSubmit={save}>
        <h3 className="admin-form-title">
          {editingId ? 'Редактирование участника' : 'Новый участник'}
        </h3>
        <div className="form-grid">
          <label className="field">
            <span>Имя *</span>
            <input value={form.name} onChange={update('name')} required />
          </label>
          <label className="field">
            <span>Позывной *</span>
            <input value={form.callsign} onChange={update('callsign')} required />
          </label>
          <label className="field">
            <span>Должность *</span>
            <select value={form.role} onChange={update('role')} required>
              <option value="" disabled>
                — выберите должность —
              </option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
              {/* Сохраняем нестандартную роль из старых данных, чтобы она не пропала */}
              {form.role && !ROLES.includes(form.role) && (
                <option value={form.role}>{form.role} (устар.)</option>
              )}
            </select>
          </label>
          <label className="field">
            <span>В команде с (дата)</span>
            <input value={form.joined_date} onChange={update('joined_date')} placeholder="2020-01-20" />
          </label>
        </div>

        <label className="field">
          <span>Досье / биография</span>
          <textarea rows={3} value={form.bio} onChange={update('bio')} />
        </label>

        <div className="form-grid">
          <FileField
            label="Фото"
            value={form.photo}
            onChange={setField('photo')}
            accept="image/*"
          />
          <FileField
            label="3D-модель (.glb / .gltf)"
            value={form.model_url}
            onChange={setField('model_url')}
            accept=".glb,.gltf,model/gltf-binary"
            hint="Если не задана — показывается стандартная модель бойца."
          />
        </div>

        <h3 className="admin-form-title">Права</h3>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.can_manage_events}
            onChange={(e) => setForm({ ...form, can_manage_events: e.target.checked })}
          />
          <span>Может редактировать календарь и мероприятия</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.is_admin}
            onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
          />
          <span>Администратор (доступ в админ-панель из личного кабинета)</span>
        </label>

        <h3 className="admin-form-title">Аккаунт личного кабинета</h3>
        <div className="form-grid">
          <label className="field">
            <span>Логин</span>
            <input
              value={form.username}
              onChange={update('username')}
              placeholder="напр. grom"
              autoComplete="off"
            />
            <span className="file-hint">
              {editingId
                ? 'Очистите поле, чтобы убрать аккаунт у участника.'
                : 'Оставьте пустым, если аккаунт пока не нужен.'}
            </span>
          </label>
          <label className="field">
            <span>{editingId && hadAccount ? 'Новый пароль' : 'Пароль'}</span>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
            />
            <span className="file-hint">
              {editingId && hadAccount
                ? 'Оставьте пустым, чтобы не менять текущий пароль.'
                : 'Минимум 4 символа.'}
            </span>
          </label>
        </div>

        {error && <p className="notice notice-error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Сохранение…' : editingId ? 'Сохранить' : 'Добавить'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={startCreate}>
              Отмена
            </button>
          )}
        </div>
      </form>

      <div className="admin-list">
        {list.map((p) => (
          <div key={p.id} className={`admin-row ${editingId === p.id ? 'editing' : ''}`}>
            <div className="admin-row-main">
              <strong>«{p.callsign}»</strong> {p.name}
              <span className="admin-row-sub">{p.role}</span>
            </div>
            <div className="admin-row-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>
                Изменить
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="notice">Участников пока нет.</p>}
      </div>
    </div>
  );
}
