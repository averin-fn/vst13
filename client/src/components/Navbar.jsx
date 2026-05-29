import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Основной', end: true },
  { to: '/participants', label: 'Участники' },
  { to: '/events', label: 'Мероприятия' },
  { to: '/feedback', label: 'Обратная связь' }
];

export default function Navbar() {
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
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">Страйкбольная команда</div>
    </aside>
  );
}
