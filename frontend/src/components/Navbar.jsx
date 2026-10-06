import { NavLink, Link } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/today', label: 'Today' },
  { to: '/tasks', label: 'All tasks', end: true },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="navbar">
      <div className="navbar__inner container">
        <Link to="/" className="navbar__brand" aria-label="Focus Flow home">
          <BrandMark />
          <span>Focus Flow</span>
        </Link>

        <nav className="navbar__links" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `navlink${isActive ? ' navlink--active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
          <NavLink to="/tasks/new" className={({ isActive }) => `navlink${isActive ? ' navlink--active' : ''}`}>Add task</NavLink>
        </nav>

        <div className="navbar__user">
          <span className="navbar__name" title={user?.email}>{user?.name}</span>
          <button type="button" className="btn btn--sm btn--ghost" onClick={logout}>Log out</button>
        </div>
      </div>
    </header>
  );
}
