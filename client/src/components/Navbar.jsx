import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { isMemberAuthed } from '../api';

const memberLinks = [
  { to: '/', label: 'Основной', end: true },
  { to: '/participants', label: 'Участники' },
  { to: '/calendar', label: 'Календарь' }
];
const guestLinks = [
  { to: '/', label: 'Основной', end: true },
  { to: '/participants', label: 'Участники' },
  { to: '/calendar', label: 'Календарь' }
];
const cabinetLink = { to: '/cabinet', label: 'Личный кабинет', highlight: true };

export default function Navbar() {
  const authed = isMemberAuthed();
  const links = [cabinetLink, ...(authed ? memberLinks : guestLinks)];
  const [open, setOpen] = useState(false);

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-brand" onClick={() => setOpen(false)} title="На главную">
        <span className="sidebar-logo">⌖</span>
        <span className="sidebar-name">ВСТ13</span>
      </Link>

      <button
        type="button"
        className="nav-toggle"
        aria-label="Меню"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '✕' : '☰'}
      </button>

      <nav className={open ? 'sidebar-nav open' : 'sidebar-nav'}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              [
                isActive ? 'nav-link active' : 'nav-link',
                l.highlight ? 'nav-link-cabinet' : ''
              ].filter(Boolean).join(' ')
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">Страйкбольная команда</div>
    </aside>
  );
}
