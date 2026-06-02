import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, isMemberAuthed } from '../api';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => {
  const d = new Date();
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
};

function buildMonthGrid(year, month) {
  // 42 ячейки = 6 строк по 7 дней, начало с понедельника
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // 0 = Пн
  const start = new Date(year, month, 1 - startWeekday);
  const cells = [];
  const today = todayIso();
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = isoDate(d.getFullYear(), d.getMonth(), d.getDate());
    cells.push({
      iso,
      day: d.getDate(),
      isCurrentMonth: d.getMonth() === month,
      isToday: iso === today,
      isWeekend: (i % 7) >= 5
    });
  }
  return cells;
}

function formatDateRu(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Calendar() {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(todayIso());
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState({}); // eventId -> 'yes'|'no'|'maybe'
  const [error, setError] = useState('');
  const memberAuthed = isMemberAuthed();

  useEffect(() => {
    api.getEvents().then(setEvents).catch(() => {});
    if (memberAuthed) {
      api
        .getMyRsvps()
        .then((list) => {
          const map = {};
          for (const r of list) if (r.my_status) map[r.id] = r.my_status;
          setRsvps(map);
        })
        .catch(() => {});
    }
  }, [memberAuthed]);

  const cells = useMemo(() => buildMonthGrid(view.y, view.m), [view]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      if (!e.date) continue;
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDate.get(selected) || [];

  const shiftMonth = (delta) => {
    setView((v) => {
      let m = v.m + delta;
      let y = v.y;
      while (m < 0) { m += 12; y -= 1; }
      while (m > 11) { m -= 12; y += 1; }
      return { y, m };
    });
  };
  const shiftYear = (delta) => setView((v) => ({ ...v, y: v.y + delta }));
  const goToday = () => {
    const d = new Date();
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(todayIso());
  };

  const setRsvp = async (eventId, status) => {
    setError('');
    try {
      if (rsvps[eventId] === status) {
        await api.clearMyRsvp(eventId);
        setRsvps((prev) => {
          const c = { ...prev };
          delete c[eventId];
          return c;
        });
      } else {
        await api.setMyRsvp(eventId, status);
        setRsvps((prev) => ({ ...prev, [eventId]: status }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page calendar-page">
      <h1 className="page-title">Календарь</h1>
      <p className="page-subtitle">
        Расписание игр и тренировок. Зарегистрированные участники могут голосовать прямо отсюда.
      </p>

      <div className="calendar-toolbar">
        <button type="button" className="cal-nav" onClick={() => shiftYear(-1)} title="Год назад">« {view.y - 1}</button>
        <button type="button" className="cal-nav" onClick={() => shiftMonth(-1)} title="Месяц назад">‹</button>
        <span className="cal-title">{MONTH_NAMES[view.m]} {view.y}</span>
        <button type="button" className="cal-nav" onClick={() => shiftMonth(1)} title="Месяц вперёд">›</button>
        <button type="button" className="cal-nav" onClick={() => shiftYear(1)} title="Год вперёд">{view.y + 1} »</button>
        <button type="button" className="btn btn-ghost btn-sm cal-today" onClick={goToday}>Сегодня</button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar-weekday">{w}</div>
        ))}
        {cells.map((c) => {
          const evs = eventsByDate.get(c.iso) || [];
          const classes = [
            'calendar-cell',
            c.isCurrentMonth ? '' : 'dim',
            c.isToday ? 'today' : '',
            c.iso === selected ? 'selected' : '',
            evs.length ? 'has-events' : '',
            c.isWeekend ? 'weekend' : ''
          ].filter(Boolean).join(' ');
          return (
            <button
              key={c.iso}
              type="button"
              className={classes}
              onClick={() => setSelected(c.iso)}
            >
              <span className="cal-day">{c.day}</span>
              {evs.length > 0 && (
                <span className="cal-dots">
                  {evs.slice(0, 3).map((e) => (
                    <span key={e.id} className="cal-dot" />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="calendar-panel">
        <h3 className="calendar-panel-title">{formatDateRu(selected)}</h3>

        {selectedEvents.length === 0 && (
          <p className="notice">На эту дату игр пока не запланировано.</p>
        )}

        {selectedEvents.map((e) => (
          <article key={e.id} className="card event-card cal-event">
            <div className="event-body">
              <h3 className="event-title">{e.title}</h3>
              {e.location && <p className="event-location">📍 {e.location}</p>}
              {e.description && <p className="event-description">{e.description}</p>}

              {memberAuthed ? (
                <div className="rsvp-actions">
                  <button
                    type="button"
                    className={`rsvp-btn rsvp-yes ${rsvps[e.id] === 'yes' ? 'active' : ''}`}
                    onClick={() => setRsvp(e.id, 'yes')}
                  >
                    Поеду
                  </button>
                  <button
                    type="button"
                    className={`rsvp-btn rsvp-no ${rsvps[e.id] === 'no' ? 'active' : ''}`}
                    onClick={() => setRsvp(e.id, 'no')}
                  >
                    Не поеду
                  </button>
                </div>
              ) : (
                <p className="cal-login-hint">
                  Войдите в <Link to="/cabinet/login" className="link">личный кабинет</Link>, чтобы голосовать.
                </p>
              )}
            </div>
          </article>
        ))}
        {error && <p className="notice notice-error">{error}</p>}
      </div>
    </div>
  );
}
