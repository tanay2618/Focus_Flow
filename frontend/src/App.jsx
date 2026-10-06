import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import { GuestRoute, ProtectedRoute } from './components/RouteGuards.jsx';
import Login from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tasks from './pages/Tasks.jsx';
import AddTask from './pages/AddTask.jsx';
import EditTask from './pages/EditTask.jsx';
import Today from './pages/Today.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="today" element={<Today />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="tasks/new" element={<AddTask />} />
          <Route path="tasks/:id/edit" element={<EditTask />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
