import { useEffect, useState } from 'react';
import { api } from '../../api';
import MiniCalendar from '../../components/MiniCalendar.jsx';

const STATUS_OPTIONS = [
  { value: 'yes', label: 'Буду' },
  { value: 'no', label: 'Не буду' }
];

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CabinetEvents() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('loading');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);

  const load = () =>
    api
      .getMyRsvps()
      .then((data) => {
        setEvents(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));

  useEffect(() => {
    load();
  }, []);

  const choose = async (eventId, newStatus, current) => {
    setBusyId(eventId);
    setError('');
    try {
      if (current === newStatus) {
        await api.clearMyRsvp(eventId);
      } else {
        await api.setMyRsvp(eventId, newStatus);
      }
      setEvents((list) =>
        list.map((e) =>
          e.id === eventId ? { ...e, my_status: current === newStatus ? null : newStatus } : e
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  // Клик по дате в мини-календаре — выделяет и пролистывает к первой игре на этот день
  const onDateSelect = (iso) => {
    setSelectedDate(iso);
    const target = events.find((e) => e.date === iso);
    if (!target) return;
    const el = document.querySelector(`[data-event-id="${target.id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="admin-page">
      <h1 className="page-title">Мероприятия</h1>
      <p className="page-subtitle">Отметьте, идёте ли вы на игру — администратор увидит список.</p>

      {status === 'loading' && <p className="notice">Загрузка…</p>}
      {status === 'error' && <p className="notice notice-error">Не удалось загрузить мероприятия.</p>}
      {status === 'ready' && events.length === 0 && <p className="notice">Мероприятий пока нет.</p>}
      {error && <p className="notice notice-error">{error}</p>}

      {status === 'ready' && events.length > 0 && (
        <div className="cabinet-events-layout">
          <div className="events-list">
            {events.map((e) => (
              <article
                key={e.id}
                data-event-id={e.id}
                className={`card event-card rsvp-card ${e.date === selectedDate ? 'highlighted' : ''}`}
              >
                <div className="event-body">
                  <span className="event-date">{formatDate(e.date)}</span>
                  <h3 className="event-title">{e.title}</h3>
                  {e.location && <p className="event-location">📍 {e.location}</p>}
                  {e.description && <p className="event-description">{e.description}</p>}

                  <div className="rsvp-actions">
                    {STATUS_OPTIONS.map((opt) => {
                      const active = e.my_status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => choose(e.id, opt.value, e.my_status)}
                          disabled={busyId === e.id}
                          className={`rsvp-btn rsvp-${opt.value} ${active ? 'active' : ''}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <MiniCalendar events={events} onSelect={onDateSelect} selectedDate={selectedDate} />
        </div>
      )}
    </div>
  );
}
