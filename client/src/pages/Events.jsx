import { useEffect, useState } from 'react';
import { api } from '../api';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    api
      .getEvents()
      .then((data) => {
        setEvents(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">Мероприятия</h1>
      <p className="page-subtitle">Игры, тренировки и выезды команды.</p>

      {status === 'loading' && <p className="notice">Загрузка…</p>}
      {status === 'error' && (
        <p className="notice notice-error">Не удалось загрузить мероприятия.</p>
      )}
      {status === 'ready' && events.length === 0 && (
        <p className="notice">Запланированных мероприятий пока нет.</p>
      )}

      {status === 'ready' && events.length > 0 && (
        <div className="events-list">
          {events.map((e) => (
            <article key={e.id} className="card event-card">
              {e.image && (
                <div className="event-image">
                  <img src={e.image} alt={e.title} />
                </div>
              )}
              <div className="event-body">
                <span className="event-date">{formatDate(e.date)}</span>
                <h3 className="event-title">{e.title}</h3>
                {e.location && <p className="event-location">📍 {e.location}</p>}
                <p className="event-description">{e.description}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
