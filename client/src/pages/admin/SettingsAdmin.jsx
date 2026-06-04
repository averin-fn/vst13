import { useEffect, useState } from 'react';
import { api } from '../../api';
import FileField from '../../components/admin/FileField.jsx';

export default function SettingsAdmin() {
  const [headerImage, setHeaderImage] = useState('');
  const [status, setStatus] = useState('loading');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

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

  const exportDb = async () => {
    setExporting(true);
    setExportError('');
    try {
      const { blob, filename } = await api.exportDb();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
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

      <div className="card admin-form">
        <h3 className="admin-form-title">Резервная копия базы</h3>
        <p className="file-hint">
          Скачать всю базу данных (SQLite): участники, мероприятия, обратная связь,
          настройки, правила, чат и аккаунты. Файл можно хранить как бэкап или
          восстановить на сервере.
        </p>
        {exportError && <p className="notice notice-error">{exportError}</p>}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportDb}
            disabled={exporting}
          >
            {exporting ? 'Экспорт…' : '⬇ Экспортировать базу'}
          </button>
        </div>
      </div>
    </div>
  );
}
