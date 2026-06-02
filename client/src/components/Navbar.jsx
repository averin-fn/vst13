import { NavLink } from 'react-router-dom';
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

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">⌖</span>
        <span className="sidebar-name">ВСТ13</span>
      </div>
      <nav className="sidebar-nav">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
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
