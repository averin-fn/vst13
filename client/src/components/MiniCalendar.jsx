import { useMemo, useState } from 'react';

const MONTHS = [
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
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7;
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
      isToday: iso === today
    });
  }
  return cells;
}

export default function MiniCalendar({ events, onSelect, selectedDate }) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const cells = useMemo(() => buildMonthGrid(view.y, view.m), [view]);
  const eventsByDate = useMemo(() => {
    const map = new Map();
    for (const e of events || []) {
      if (!e.date) continue;
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    return map;
  }, [events]);

  const shiftMonth = (delta) => {
    setView((v) => {
      let m = v.m + delta;
      let y = v.y;
      while (m < 0) { m += 12; y -= 1; }
      while (m > 11) { m -= 12; y += 1; }
      return { y, m };
    });
  };

  return (
    <aside className="mini-cal">
      <div className="mini-cal-head">
        <button type="button" className="mini-cal-nav" onClick={() => shiftMonth(-1)} aria-label="Месяц назад">‹</button>
        <span className="mini-cal-title">{MONTHS[view.m]} {view.y}</span>
        <button type="button" className="mini-cal-nav" onClick={() => shiftMonth(1)} aria-label="Месяц вперёд">›</button>
      </div>
      <div className="mini-cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="mini-cal-wd">{w}</div>
        ))}
        {cells.map((c) => {
          const has = eventsByDate.has(c.iso);
          const cls = [
            'mini-cal-cell',
            !c.isCurrentMonth ? 'dim' : '',
            c.isToday ? 'today' : '',
            has ? 'has-events' : '',
            c.iso === selectedDate ? 'selected' : ''
          ].filter(Boolean).join(' ');
          return (
            <button
              key={c.iso}
              type="button"
              className={cls}
              onClick={() => has && onSelect && onSelect(c.iso)}
              disabled={!has}
              title={has ? eventsByDate.get(c.iso).map((e) => e.title).join(', ') : ''}
            >
              {c.day}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
