import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

export default function AppLayout() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main" className="container page">
        <Outlet />
      </main>
    </>
  );
}
