import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { api, isMemberAuthed } from '../api';

export default function Navbar() {
  // Судейский аккаунт кабинета не имеет — ссылку в него не показываем
  const [isJudge, setIsJudge] = useState(false);

  useEffect(() => {
    if (!isMemberAuthed()) return;
    api
      .getMe()
      .then((me) => setIsJudge(!!me.is_judge))
      .catch(() => {});
  }, []);

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-brand" title="На главную">
        <span className="sidebar-logo">⌖</span>
        <span className="sidebar-name">ВСТ13</span>
      </Link>

      <nav className="sidebar-nav">
        <NavLink
          to="/game"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          Breakout of Zelenyi
        </NavLink>
        {!isJudge && (
          <NavLink
            to="/cabinet"
            className={({ isActive }) =>
              `nav-link nav-link-cabinet ${isActive ? 'active' : ''}`
            }
          >
            Личный кабинет
          </NavLink>
        )}
      </nav>

      <div className="sidebar-foot">Страйкбольная команда</div>
    </aside>
  );
}
