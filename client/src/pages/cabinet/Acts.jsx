import { useEffect, useState } from 'react';
import { api } from '../../api';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const EMPTY = { client: '', device: '', note: '' };

const DEFAULT_ITEMS = [
  'Разборка гирбокса',
  'Чистка деталей',
  'Смазка',
  'Проверка/замена пружины',
  'Проверка поршня и цилиндра',
  'Настройка hop-up',
  'Проверка проводки и контактов',
  'Сборка',
  'Тест стрельбой, замер скорости (FPS)'
];
const freshItems = () => DEFAULT_ITEMS.map((text) => ({ text, done: false }));

export default function CabinetActs() {
  const [acts, setActs] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [items, setItems] = useState(freshItems());
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(null);

  const load = () => api.getActs().then(setActs).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const setField = (f) => (e) => setForm({ ...form, [f]: e.target.value });
  const toggleDone = (i) => {
    const next = items.slice();
    next[i] = { ...next[i], done: !next[i].done };
    setItems(next);
  };
  const setText = (i) => (e) => {
    const next = items.slice();
    next[i] = { ...next[i], text: e.target.value };
    setItems(next);
  };
  const addItem = () => setItems([...items, { text: '', done: false }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const addPhotos = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      for (const file of files) {
        const { url } = await api.memberUpload(file);
        setPhotos((prev) => [...prev, url]);
      }
    } catch (err) {
      setError(err.message || 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  };
  const removePhoto = (url) => setPhotos((prev) => prev.filter((u) => u !== url));

  const doneCount = items.filter((it) => it.text.trim() && it.done).length;
  const totalCount = items.filter((it) => it.text.trim()).length;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createAct({
        client: form.client,
        device: form.device,
        note: form.note,
        items: items.filter((it) => it.text.trim()).map((it) => ({ text: it.text.trim(), done: it.done })),
        photos
      });
      setForm(EMPTY);
      setItems(freshItems());
      setPhotos([]);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a) => {
    if (!window.confirm('Удалить акт?')) return;
    try {
      await api.deleteAct(a.id);
      load();
    } catch {
      /* игнор */
    }
  };

  const downloadDocx = async (a) => {
    setDownloading(a.id);
    try {
      await api.downloadActDocx(a.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="page-title">Акты выполненных работ</h1>
      <p className="page-subtitle">Чек-лист по ремонту и тюнингу привода: отметьте выполненные пункты, приложите фото, выгрузите акт в Word.</p>

      <form className="card admin-form" onSubmit={save}>
        <h3 className="admin-form-title">Новый акт</h3>
        <div className="form-grid">
          <label className="field">
            <span>Клиент</span>
            <input value={form.client} onChange={setField('client')} placeholder="Имя / позывной" />
          </label>
          <label className="field">
            <span>Привод / снаряжение</span>
            <input value={form.device} onChange={setField('device')} placeholder="напр. АК-74 CYMA CM.040" />
          </label>
        </div>

        <span className="field-label">
          Чек-лист работ — отмечайте выполненное ({doneCount}/{totalCount})
        </span>
        <div className="act-items">
          {items.map((it, i) => (
            <div className={`act-check-row ${it.done ? 'done' : ''}`} key={i}>
              <label className="act-check-box">
                <input type="checkbox" checked={it.done} onChange={() => toggleDone(i)} />
                <span className="act-check-mark" aria-hidden="true" />
              </label>
              <input
                className="act-item-text"
                value={it.text}
                onChange={setText(i)}
                placeholder="Операция (напр. замена пружины M120)"
              />
              <button type="button" className="act-item-del" onClick={() => removeItem(i)} aria-label="Удалить пункт">
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>
            + Добавить пункт
          </button>
        </div>

        <div className="field">
          <span>Фото работ</span>
          <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={uploading} />
          {uploading && <span className="file-status">Загрузка…</span>}
          {photos.length > 0 && (
            <div className="act-photos-edit">
              {photos.map((u) => (
                <div className="act-photo-edit" key={u}>
                  <img src={u} alt="фото" />
                  <button type="button" onClick={() => removePhoto(u)} aria-label="Убрать">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="field">
          <span>Примечание</span>
          <textarea rows={2} value={form.note} onChange={setField('note')} />
        </label>

        {error && <p className="notice notice-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || uploading}>
            {busy ? 'Сохранение…' : 'Создать акт'}
          </button>
        </div>
      </form>

      <h3 className="admin-form-title">Акты ({acts.length})</h3>
      {acts.length === 0 && <p className="notice">Актов пока нет.</p>}
      <div className="acts-list">
        {acts.map((a) => {
          const done = a.items.filter((it) => it.done).length;
          return (
            <article key={a.id} className="card act-card">
              <div className="act-head">
                <div>
                  <strong className="act-device">{a.device || 'Без названия'}</strong>
                  {a.client && <span className="act-client"> · {a.client}</span>}
                </div>
                <span className="act-date">{formatDate(a.created_at)}</span>
              </div>

              {a.items.length > 0 && (
                <>
                  <div className="act-progress">Выполнено {done} из {a.items.length}</div>
                  <ul className="act-checklist-view">
                    {a.items.map((it, i) => (
                      <li key={i} className={it.done ? 'done' : 'pending'}>
                        <span className="act-check-icon">{it.done ? '✓' : '○'}</span>
                        <span>{it.text}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {a.note && <p className="act-note">{a.note}</p>}

              {a.photos.length > 0 && (
                <div className="act-photos">
                  {a.photos.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="фото работы" />
                    </a>
                  ))}
                </div>
              )}

              <div className="act-card-actions">
                <button className="btn btn-primary btn-sm" onClick={() => downloadDocx(a)} disabled={downloading === a.id}>
                  {downloading === a.id ? 'Готовлю…' : '⬇ Word'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(a)}>
                  Удалить
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
