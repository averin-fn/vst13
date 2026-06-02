import { useEffect, useState } from 'react';
import { api } from '../../api';

const ORDER = ['general', 'team', 'equipment'];

export default function RulesAdmin() {
  const [rules, setRules] = useState([]);
  const [drafts, setDrafts] = useState({}); // slug -> content
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [error, setError] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    api
      .getAdminRules()
      .then((list) => {
        const sorted = ORDER.map((slug) => list.find((r) => r.slug === slug)).filter(Boolean);
        setRules(sorted);
        const d = {};
        for (const r of sorted) d[r.slug] = r.content;
        setDrafts(d);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const onChange = (slug) => (e) => {
    setDrafts({ ...drafts, [slug]: e.target.value });
    setSaved({ ...saved, [slug]: false });
  };

  const save = (slug) => async () => {
    setSaving({ ...saving, [slug]: true });
    setError('');
    setSaved({ ...saved, [slug]: false });
    try {
      await api.updateRule(slug, drafts[slug]);
      setSaved({ ...saved, [slug]: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving({ ...saving, [slug]: false });
    }
  };

  return (
    <div className="admin-page">
      <h1 className="page-title">Правила</h1>
      <p className="page-subtitle">
        Текст правил, который виден только зарегистрированным участникам в разделе «Правила».
      </p>

      {status === 'loading' && <p className="notice">Загрузка…</p>}
      {status === 'error' && <p className="notice notice-error">Не удалось загрузить правила.</p>}
      {error && <p className="notice notice-error">{error}</p>}

      {status === 'ready' &&
        rules.map((r) => (
          <div key={r.slug} className="card admin-form rules-edit-card">
            <h3 className="admin-form-title">{r.title}</h3>
            <label className="field">
              <span>Текст</span>
              <textarea
                rows={8}
                value={drafts[r.slug] || ''}
                onChange={onChange(r.slug)}
              />
            </label>
            {saved[r.slug] && <p className="notice notice-success">Сохранено.</p>}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={save(r.slug)}
                disabled={!!saving[r.slug]}
              >
                {saving[r.slug] ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
