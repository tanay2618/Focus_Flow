import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from './Feedback.jsx';

/** Sends signed-out visitors to /login and remembers where they were headed. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Login and sign-up are for signed-out visitors; signed-in users go back to where they were headed. */
export function GuestRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader label="Checking your session" />;
  if (user) {
    const from = location.state?.from;
    return <Navigate to={from ? `${from.pathname}${from.search ?? ''}` : '/'} replace />;
  }
  return <Outlet />;
}
