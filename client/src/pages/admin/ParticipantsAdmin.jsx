import { useEffect, useState } from 'react';
import { api } from '../../api';
import FileField from '../../components/admin/FileField.jsx';

const EMPTY = {
  name: '',
  callsign: '',
  role: '',
  bio: '',
  photo: '',
  model_url: '',
  joined_date: ''
};

export default function ParticipantsAdmin() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
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
    setError('');
  };

  const startEdit = (p) => {
    setForm({
      name: p.name,
      callsign: p.callsign,
      role: p.role,
      bio: p.bio,
      photo: p.photo,
      model_url: p.model_url,
      joined_date: p.joined_date
    });
    setEditingId(p.id);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editingId) await api.updateParticipant(editingId, form);
      else await api.createParticipant(form);
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
            <span>Роль *</span>
            <input value={form.role} onChange={update('role')} required />
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
