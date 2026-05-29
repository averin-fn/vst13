import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Header from './Header.jsx';

export default function PublicLayout() {
  return (
    <div className="site">
      <Header />
      <div className="app">
        <Navbar />
        <div className="main-area">
          <main className="content">
            <Outlet />
          </main>
          <footer className="footer">
            © {new Date().getFullYear()} Страйкбольная команда ВСТ13
          </footer>
        </div>
      </div>
    </div>
  );
}
