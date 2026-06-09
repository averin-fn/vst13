import { NavLink, Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-brand" title="На главную">
        <span className="sidebar-logo">⌖</span>
        <span className="sidebar-name">ВСТ13</span>
      </Link>

      <nav className="sidebar-nav">
        <NavLink
          to="/cabinet"
          className={({ isActive }) =>
            `nav-link nav-link-cabinet ${isActive ? 'active' : ''}`
          }
        >
          Личный кабинет
        </NavLink>
      </nav>

      <div className="sidebar-foot">Страйкбольная команда</div>
    </aside>
  );
}
