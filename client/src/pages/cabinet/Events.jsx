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

function VoteGroup({ label, status, people }) {
  return (
    <div className={`vote-group vote-${status}`}>
      <div className="vote-group-head">
        <span className="vote-group-label">{label}</span>
        <span className="vote-group-count">{people.length}</span>
      </div>
      {people.length > 0 && (
        <div className="vote-chips">
          {people.map((p) => (
            <span key={p.id} className="vote-chip" title={p.name}>
              «{p.callsign}»
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Сегодня в формате YYYY-MM-DD (локальное время)
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CabinetEvents() {
  const [events, setEvents] = useState([]);
  const [votes, setVotes] = useState({}); // eventId -> [{id, callsign, name, status}]
  const [status, setStatus] = useState('loading');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [archive, setArchive] = useState(false); // показывать прошедшие игры

  const loadVotes = (eventId) =>
    api
      .getEventVotes(eventId)
      .then((list) => setVotes((prev) => ({ ...prev, [eventId]: list })))
      .catch(() => {});

  const load = () =>
    api
      .getMyRsvps()
      .then((data) => {
        setEvents(data);
        setStatus('ready');
        data.forEach((e) => loadVotes(e.id));
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
      await loadVotes(eventId);
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

  const today = todayIso();
  const isPast = (e) => e.date && e.date < today;
  const upcoming = events.filter((e) => !isPast(e));
  const past = events.filter(isPast).sort((a, b) => (a.date < b.date ? 1 : -1)); // свежие сверху
  const shown = archive ? past : upcoming;

  return (
    <div className="admin-page">
      <h1 className="page-title">Мероприятия</h1>
      <p className="page-subtitle">
        {archive
          ? 'Прошедшие игры.'
          : 'Отметьте, идёте ли вы на игру — администратор увидит список.'}
      </p>

      <div className="events-tabs">
        <button
          type="button"
          className={`events-tab ${archive ? '' : 'active'}`}
          onClick={() => setArchive(false)}
        >
          Актуальные
        </button>
        <button
          type="button"
          className={`events-tab ${archive ? 'active' : ''}`}
          onClick={() => setArchive(true)}
        >
          Архив{past.length ? ` (${past.length})` : ''}
        </button>
      </div>

      {status === 'loading' && <p className="notice">Загрузка…</p>}
      {status === 'error' && <p className="notice notice-error">Не удалось загрузить мероприятия.</p>}
      {status === 'ready' && shown.length === 0 && (
        <p className="notice">{archive ? 'В архиве пока нет прошедших игр.' : 'Предстоящих игр пока нет.'}</p>
      )}
      {error && <p className="notice notice-error">{error}</p>}

      {status === 'ready' && shown.length > 0 && (
        <div className="cabinet-events-layout">
          <div className="events-list">
            {shown.map((e) => {
              const list = votes[e.id] || [];
              const yes = list.filter((v) => v.status === 'yes');
              const no = list.filter((v) => v.status === 'no');
              return (
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

                    {!archive && (
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
                    )}

                    <div className="vote-stats">
                      <VoteGroup label="Поеду" status="yes" people={yes} />
                      <VoteGroup label="Не поеду" status="no" people={no} />
                      {list.length === 0 && <p className="vote-empty">Голосов пока нет.</p>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <MiniCalendar events={shown} onSelect={onDateSelect} selectedDate={selectedDate} />
        </div>
      )}
    </div>
  );
}
