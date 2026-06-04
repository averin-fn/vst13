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

  // Смена пароля администратора
  const [pw, setPw] = useState({ current: '', next: '', repeat: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

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

  const pwUpdate = (field) => (e) => {
    setPw({ ...pw, [field]: e.target.value });
    setPwSaved(false);
    setPwError('');
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwSaved(false);
    setPwError('');
    if (pw.next !== pw.repeat) {
      setPwError('Новый пароль и подтверждение не совпадают');
      return;
    }
    if (pw.next.length < 8) {
      setPwError('Новый пароль слишком короткий (минимум 8 символов)');
      return;
    }
    setPwBusy(true);
    try {
      await api.changeAdminPassword(pw.current, pw.next);
      setPw({ current: '', next: '', repeat: '' });
      setPwSaved(true);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwBusy(false);
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

      <form className="card admin-form" onSubmit={changePassword} style={{ maxWidth: 480 }}>
        <h3 className="admin-form-title">Смена пароля администратора</h3>
        <label className="field">
          <span>Текущий пароль</span>
          <input
            type="password"
            value={pw.current}
            onChange={pwUpdate('current')}
            required
            autoComplete="current-password"
          />
        </label>
        <label className="field">
          <span>Новый пароль</span>
          <input
            type="password"
            value={pw.next}
            onChange={pwUpdate('next')}
            required
            autoComplete="new-password"
          />
          <span className="file-hint">Минимум 8 символов.</span>
        </label>
        <label className="field">
          <span>Подтвердите новый пароль</span>
          <input
            type="password"
            value={pw.repeat}
            onChange={pwUpdate('repeat')}
            required
            autoComplete="new-password"
          />
        </label>

        {pwError && <p className="notice notice-error">{pwError}</p>}
        {pwSaved && <p className="notice notice-success">Пароль изменён.</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={pwBusy}>
            {pwBusy ? 'Сохранение…' : 'Сменить пароль'}
          </button>
        </div>
      </form>
    </div>
  );
}
