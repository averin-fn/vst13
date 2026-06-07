import { useEffect, useState } from 'react';
import { api } from '../../api';
import FileField from '../../components/admin/FileField.jsx';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ru-RU');
}

const EMPTY = { title: '', description: '', image: '' };

export default function WorkshopAdmin() {
  const [works, setWorks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.getWorks().then(setWorks).catch(() => {});
    api.getRepairRequests().then(setRequests).catch(() => {});
  };
  useEffect(() => {
    load();
  }, []);

  const addWork = async (e) => {
    e.preventDefault();
    if (!form.image) {
      setError('Сначала загрузите фото работы');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.createWork(form);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeWork = async (w) => {
    if (!window.confirm('Удалить работу из галереи?')) return;
    try {
      await api.deleteWork(w.id);
      load();
    } catch {
      /* игнор */
    }
  };

  const removeRequest = async (r) => {
    if (!window.confirm('Удалить заявку?')) return;
    try {
      await api.deleteRepairRequest(r.id);
      load();
    } catch {
      /* игнор */
    }
  };

  return (
    <div className="admin-page">
      <h1 className="page-title">Мастерская</h1>

      <form className="card admin-form" onSubmit={addWork}>
        <h3 className="admin-form-title">Добавить работу в галерею</h3>
        <FileField label="Фото работы *" value={form.image} onChange={(url) => setForm((f) => ({ ...f, image: url }))} accept="image/*" />
        <div className="form-grid">
          <label className="field">
            <span>Название</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="напр. Тюнинг AK" />
          </label>
        </div>
        <label className="field">
          <span>Описание</span>
          <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        {error && <p className="notice notice-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Сохранение…' : 'Добавить'}
          </button>
        </div>
      </form>

      <h3 className="admin-form-title">Галерея ({works.length})</h3>
      {works.length === 0 ? (
        <p className="notice">Работ пока нет.</p>
      ) : (
        <div className="admin-works-grid">
          {works.map((w) => (
            <div key={w.id} className="admin-work">
              <img src={w.image} alt={w.title || 'работа'} />
              <div className="admin-work-info">
                {w.title && <strong>{w.title}</strong>}
                <button className="btn btn-danger btn-sm" onClick={() => removeWork(w)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="admin-form-title">Заявки на ремонт ({requests.length})</h3>
      {requests.length === 0 ? (
        <p className="notice">Заявок пока нет.</p>
      ) : (
        <div className="feedback-list">
          {requests.map((r) => (
            <div key={r.id} className="card feedback-item">
              <div className="feedback-head">
                <strong>{r.name}</strong>
                <span className="feedback-date">{formatDate(r.created_at)}</span>
              </div>
              {r.contact && <div className="feedback-contact">Контакт: {r.contact}</div>}
              <p className="feedback-message">{r.message}</p>
              <button className="btn btn-danger btn-sm" onClick={() => removeRequest(r)}>
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
