import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../../api';
import FileField from '../../components/admin/FileField.jsx';

const EMPTY_FORM = { bio: '', photo: '', model_url: '' };

export default function CabinetProfile() {
  const { me, refreshMe } = useOutletContext();
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (me) {
      setForm({ bio: me.bio || '', photo: me.photo || '', model_url: me.model_url || '' });
    }
  }, [me]);

  if (!me) return <p className="notice">Загрузка…</p>;

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
      await refreshMe();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="page-title">Профиль</h1>
      <p className="page-subtitle">
        Здесь можно отредактировать досье, фото и 3D-модель снаряжения. Позывной,
        имя, роль и дату вступления меняет администратор.
      </p>

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
            Моя карточка
          </Link>
        </div>
      </form>
    </div>
  );
}
