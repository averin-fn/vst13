import { useEffect, useState } from 'react';
import { api } from '../../api';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ru-RU');
}

export default function FeedbackAdmin() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('loading');

  const load = () =>
    api
      .getFeedback()
      .then((data) => {
        setList(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));

  useEffect(() => {
    load();
  }, []);

  const remove = async (item) => {
    if (!window.confirm('Удалить сообщение?')) return;
    try {
      await api.deleteFeedback(item.id);
      await load();
    } catch {
      /* игнор */
    }
  };

  return (
    <div className="admin-page">
      <h1 className="page-title">Обратная связь</h1>
      <p className="page-subtitle">Сообщения, отправленные через форму на сайте.</p>

      {status === 'loading' && <p className="notice">Загрузка…</p>}
      {status === 'error' && <p className="notice notice-error">Не удалось загрузить сообщения.</p>}
      {status === 'ready' && list.length === 0 && <p className="notice">Сообщений пока нет.</p>}

      <div className="feedback-list">
        {list.map((item) => (
          <div key={item.id} className="card feedback-item">
            <div className="feedback-head">
              <strong>{item.name}</strong>
              <span className="feedback-date">{formatDate(item.created_at)}</span>
            </div>
            {item.contact && <div className="feedback-contact">Контакт: {item.contact}</div>}
            <p className="feedback-message">{item.message}</p>
            <button className="btn btn-danger btn-sm" onClick={() => remove(item)}>
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
