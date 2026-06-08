import { useEffect, useState } from 'react';
import { api } from '../api';

const EMPTY = { name: '', contact: '', message: '', photo: '' };

export default function Workshop() {
  const [works, setWorks] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api
      .getWorks()
      .then(setWorks)
      .catch(() => {});
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { url } = await api.uploadRepairPhoto(file);
      setForm((f) => ({ ...f, photo: url }));
    } catch (err) {
      setError(err.message || 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await api.sendRepair(form);
      setForm(EMPTY);
      setStatus('sent');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Мастерская</h1>
      <p className="page-subtitle">
        Ремонт и тюнинг приводов и снаряжения. Оставьте заявку — посмотрите примеры наших работ.
      </p>

      <section className="workshop-section">
        <h2 className="workshop-h2">Заявка на ремонт</h2>
        <form className="feedback-form card" onSubmit={onSubmit}>
          <label className="field">
            <span>Имя *</span>
            <input
              type="text"
              value={form.name}
              onChange={update('name')}
              required
              placeholder="Как к вам обращаться"
            />
          </label>

          <label className="field">
            <span>Контакт</span>
            <input
              type="text"
              value={form.contact}
              onChange={update('contact')}
              placeholder="Телефон, e-mail или ник в мессенджере"
            />
          </label>

          <label className="field">
            <span>Что нужно отремонтировать *</span>
            <textarea
              rows={5}
              value={form.message}
              onChange={update('message')}
              required
              placeholder="Опишите привод/снаряжение и неисправность"
            />
          </label>

          <label className="field">
            <span>Фото (необязательно)</span>
            <input type="file" accept="image/*" onChange={pickPhoto} disabled={uploading} />
            {uploading && <span className="file-status">Загрузка…</span>}
          </label>
          {form.photo && (
            <div className="repair-photo-preview">
              <img src={form.photo} alt="Фото к заявке" />
              <button type="button" onClick={() => setForm((f) => ({ ...f, photo: '' }))}>
                ✕ убрать фото
              </button>
            </div>
          )}

          {error && <p className="notice notice-error">{error}</p>}
          {status === 'sent' && (
            <p className="notice notice-success">Заявка отправлена! Мы свяжемся с вами.</p>
          )}

          <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Отправка…' : 'Отправить заявку'}
          </button>
        </form>
      </section>

      <section className="workshop-section">
        <h2 className="workshop-h2">Готовые работы</h2>
        {works.length === 0 ? (
          <p className="notice">Галерея пока пуста — скоро добавим примеры работ.</p>
        ) : (
          <div className="works-gallery">
            {works.map((w) => (
              <figure
                key={w.id}
                className="work-card"
                onClick={() => setLightbox(w)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setLightbox(w)}
              >
                <div className="work-image">
                  <img src={w.image} alt={w.title || 'Работа мастерской'} loading="lazy" />
                </div>
                {(w.title || w.description) && (
                  <figcaption className="work-caption">
                    {w.title && <span className="work-title">{w.title}</span>}
                    {w.description && <span className="work-desc">{w.description}</span>}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </section>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)} role="presentation">
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Закрыть">
              ✕
            </button>
            <img src={lightbox.image} alt={lightbox.title || 'Работа'} />
            {(lightbox.title || lightbox.description) && (
              <div className="lightbox-caption">
                {lightbox.title && <strong>{lightbox.title}</strong>}
                {lightbox.description && <p>{lightbox.description}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
