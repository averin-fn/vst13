import { useEffect, useState } from 'react';
import { api } from '../../api';
import FileField from '../../components/admin/FileField.jsx';

const EMPTY = { title: '', date: '', location: '', description: '', image: '' };

export default function EventsAdmin() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.getEvents().then(setList).catch(() => {});
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

  const startEdit = (ev) => {
    setForm({
      title: ev.title,
      date: ev.date,
      location: ev.location,
      description: ev.description,
      image: ev.image
    });
    setEditingId(ev.id);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editingId) await api.updateEvent(editingId, form);
      else await api.createEvent(form);
      await load();
      startCreate();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (ev) => {
    if (!window.confirm(`Удалить мероприятие «${ev.title}»?`)) return;
    try {
      await api.deleteEvent(ev.id);
      if (editingId === ev.id) startCreate();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="page-title">Мероприятия</h1>

      <form className="card admin-form" onSubmit={save}>
        <h3 className="admin-form-title">
          {editingId ? 'Редактирование мероприятия' : 'Новое мероприятие'}
        </h3>
        <div className="form-grid">
          <label className="field">
            <span>Название *</span>
            <input value={form.title} onChange={update('title')} required />
          </label>
          <label className="field">
            <span>Дата</span>
            <input type="date" value={form.date} onChange={update('date')} />
          </label>
        </div>
        <label className="field">
          <span>Место проведения</span>
          <input value={form.location} onChange={update('location')} />
        </label>
        <label className="field">
          <span>Описание</span>
          <textarea rows={3} value={form.description} onChange={update('description')} />
        </label>
        <FileField label="Изображение" value={form.image} onChange={setField('image')} accept="image/*" />

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
        {list.map((ev) => (
          <div key={ev.id} className={`admin-row ${editingId === ev.id ? 'editing' : ''}`}>
            <div className="admin-row-main">
              <strong>{ev.title}</strong>
              <span className="admin-row-sub">
                {ev.date} {ev.location && `· ${ev.location}`}
              </span>
            </div>
            <div className="admin-row-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(ev)}>
                Изменить
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(ev)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="notice">Мероприятий пока нет.</p>}
      </div>
    </div>
  );
}
