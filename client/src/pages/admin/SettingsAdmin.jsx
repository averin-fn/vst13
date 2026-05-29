import { useEffect, useState } from 'react';
import { api } from '../../api';
import FileField from '../../components/admin/FileField.jsx';

export default function SettingsAdmin() {
  const [headerImage, setHeaderImage] = useState('');
  const [status, setStatus] = useState('loading');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        setHeaderImage(s.header_image || '');
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const onChange = (url) => {
    setHeaderImage(url);
    setSaved(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await api.updateSettings({ header_image: headerImage });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="page-title">Оформление</h1>
      <p className="page-subtitle">Фото для шапки сайта — отображается во всю ширину вверху на всех страницах.</p>

      {status === 'loading' && <p className="notice">Загрузка…</p>}
      {status === 'error' && <p className="notice notice-error">Не удалось загрузить настройки.</p>}

      {status === 'ready' && (
        <form className="card admin-form" onSubmit={save}>
          <FileField
            label="Фото шапки"
            value={headerImage}
            onChange={onChange}
            accept="image/*"
            hint="Лучше широкое изображение. Если убрать — покажется камуфляжная заглушка."
          />

          {headerImage && (
            <div className="settings-preview" style={{ backgroundImage: `url(${headerImage})` }} />
          )}

          {error && <p className="notice notice-error">{error}</p>}
          {saved && <p className="notice notice-success">Сохранено. Фото обновится на сайте.</p>}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Сохранить
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
