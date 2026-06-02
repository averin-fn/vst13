import { useEffect, useState } from 'react';
import { Outlet, NavLink, Navigate, useNavigate, Link } from 'react-router-dom';
import { api, isMemberAuthed, clearMemberToken } from '../../api';

const links = [
  { to: '/cabinet/profile', label: 'Профиль' },
  { to: '/cabinet/events', label: 'Мероприятия' },
  { to: '/cabinet/chat', label: 'Чат' },
  { to: '/cabinet/password', label: 'Безопасность' }
];

export default function Cabinet() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  useEffect(() => {
    if (!isMemberAuthed()) return;
    api
      .getMe()
      .then(setMe)
      .catch(() => clearMemberToken());
  }, []);

  if (!isMemberAuthed()) {
    return <Navigate to="/cabinet/login" replace />;
  }

  const logout = () => {
    clearMemberToken();
    navigate('/cabinet/login', { replace: true });
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo">⌖</span>
          <span className="sidebar-name">ВСТ13</span>
        </div>
        <div className="sidebar-tag">Личный кабинет</div>
        {me && (
          <div className="cabinet-me">
            <div className="cabinet-me-callsign">«{me.callsign}»</div>
            <div className="cabinet-me-name">{me.name}</div>
          </div>
        )}
        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {l.label}
            </NavLink>
          ))}
          {me?.can_manage_events && (
            <NavLink
              to="/cabinet/events-manage"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Управление играми
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/" className="nav-link">↩ На сайт</Link>
          <button className="nav-link nav-link-btn" onClick={logout}>
            Выйти
          </button>
        </div>
      </aside>
      <div className="main-area">
        <main className="content">
          <Outlet context={{ me, refreshMe: () => api.getMe().then(setMe).catch(() => {}) }} />
        </main>
      </div>
    </div>
  );
}
