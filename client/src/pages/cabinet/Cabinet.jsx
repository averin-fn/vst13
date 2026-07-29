import { useEffect, useState } from 'react';
import { Outlet, NavLink, Navigate, useNavigate, Link } from 'react-router-dom';
import { api, isMemberAuthed, clearMemberToken, setToken } from '../../api';

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
  const [meLoaded, setMeLoaded] = useState(false);
  const [unread, setUnread] = useState(0);

  const refreshMe = () =>
    api
      .getMe()
      .then(setMe)
      .catch(() => {})
      .finally(() => setMeLoaded(true));
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

  // До загрузки профиля кабинет не рисуем: иначе судья на мгновение видит
  // меню с «Мероприятиями» и «Чатом» до срабатывания редиректа ниже.
  if (!meLoaded) {
    return <p className="notice">Загрузка…</p>;
  }

  // Аккаунт судьи Breakout of Zelenyi: кабинет закрыт, его место — вкладка игры
  if (me?.is_judge) {
    return <Navigate to="/game" replace />;
  }

  const logout = () => {
    clearMemberToken();
    navigate('/cabinet/login', { replace: true });
  };

  const openAdmin = async () => {
    try {
      const { token } = await api.getAdminToken();
      setToken(token);
      navigate('/admin');
    } catch {
      /* нет прав — ничего не делаем */
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <Link to="/" className="sidebar-brand" title="На главную">
          <span className="sidebar-logo">⌖</span>
          <span className="sidebar-name">ВСТ13</span>
        </Link>
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
          {!!me?.can_manage_acts && (
            <NavLink
              to="/cabinet/acts"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Акты
            </NavLink>
          )}
          {!!me?.is_admin && (
            <button type="button" className="nav-link nav-link-btn" onClick={openAdmin}>
              ⚙ Админ-панель
            </button>
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
