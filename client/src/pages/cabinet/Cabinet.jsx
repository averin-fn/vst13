import { useEffect, useState } from 'react';
import { Outlet, NavLink, Navigate, useNavigate, Link } from 'react-router-dom';
import { api, isMemberAuthed, clearMemberToken } from '../../api';

const links = [
  { to: '/cabinet/profile', label: 'Профиль' },
  { to: '/cabinet/events', label: 'Мероприятия' },
  { to: '/cabinet/chat', label: 'Чат' },
  { to: '/cabinet/rules', label: 'Правила' },
  { to: '/cabinet/password', label: 'Безопасность' }
];

export default function Cabinet() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [unread, setUnread] = useState(0);

  const refreshMe = () => api.getMe().then(setMe).catch(() => {});
  const refreshUnread = () =>
    api
      .getUnreadChat()
      .then((d) => setUnread(d.unread || 0))
      .catch(() => {});

  useEffect(() => {
    if (!isMemberAuthed()) return;
    refreshMe();
    refreshUnread();
    const t = setInterval(refreshUnread, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <span>{l.label}</span>
              {l.to === '/cabinet/chat' && unread > 0 && (
                <span className="nav-badge">{unread > 99 ? '99+' : unread}</span>
              )}
            </NavLink>
          ))}
          {!!me?.can_manage_events && (
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
          <Outlet context={{ me, refreshMe, refreshUnread }} />
        </main>
      </div>
    </div>
  );
}
