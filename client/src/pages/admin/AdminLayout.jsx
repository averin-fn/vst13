import { Outlet, NavLink, Navigate, useNavigate, Link } from 'react-router-dom';
import { isAuthed, clearToken } from '../../api';

const links = [
  { to: '/admin/participants', label: 'Участники' },
  { to: '/admin/events', label: 'Мероприятия' },
  { to: '/admin/feedback', label: 'Обратная связь' },
  { to: '/admin/workshop', label: 'Мастерская' },
  { to: '/admin/acts', label: 'Акты' },
  { to: '/admin/rules', label: 'Правила' },
  { to: '/admin/settings', label: 'Оформление' }
];

export default function AdminLayout() {
  const navigate = useNavigate();

  if (!isAuthed()) {
    return <Navigate to="/admin/login" replace />;
  }

  const logout = () => {
    clearToken();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo">⌖</span>
          <span className="sidebar-name">ВСТ13</span>
        </div>
        <div className="sidebar-tag">Панель администратора</div>
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
