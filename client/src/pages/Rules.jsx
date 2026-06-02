import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, isMemberAuthed } from '../api';

const ORDER = ['general', 'team', 'equipment'];

export default function Rules() {
  const memberAuthed = isMemberAuthed();
  const [rules, setRules] = useState([]);
  const [active, setActive] = useState('general');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!memberAuthed) return;
    api
      .getRules()
      .then((list) => {
        const sorted = ORDER.map((slug) => list.find((r) => r.slug === slug)).filter(Boolean);
        setRules(sorted);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [memberAuthed]);

  if (!memberAuthed) {
    return (
      <div className="page">
        <h1 className="page-title">Правила</h1>
        <p className="notice">
          Раздел доступен только зарегистрированным участникам.{' '}
          <Link to="/cabinet/login" className="link">Войти в кабинет</Link>.
        </p>
      </div>
    );
  }

  const current = rules.find((r) => r.slug === active);

  return (
    <div className="page">
      <h1 className="page-title">Правила</h1>
      <p className="page-subtitle">Внутренние документы команды.</p>

      {status === 'loading' && <p className="notice">Загрузка…</p>}
      {status === 'error' && <p className="notice notice-error">Не удалось загрузить правила.</p>}

      {status === 'ready' && (
        <div className="rules-layout">
          <div className="rules-tabs">
            {rules.map((r) => (
              <button
                key={r.slug}
                type="button"
                className={`rules-tab ${active === r.slug ? 'active' : ''}`}
                onClick={() => setActive(r.slug)}
              >
                {r.title}
              </button>
            ))}
          </div>
          <div className="rules-content card">
            <h2 className="rules-title">{current?.title}</h2>
            <div className="rules-text">{current?.content || 'Правила не заполнены.'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
