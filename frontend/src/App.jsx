import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CheckIn from './pages/CheckIn';
import Visitors from './pages/Visitors';
import Scheduled from './pages/Scheduled';
import Hosts from './pages/Hosts';
import Reports from './pages/Reports';
import Blacklist from './pages/Blacklist';
import Settings from './pages/Settings';
import Users from './pages/Users';

function AuthGuard({ children }) {
  const token = localStorage.getItem('vms_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// Redirects to /dashboard when the user's role doesn't include this page
function RoleGuard({ page, children }) {
  const { roleNav } = useApp();
  const user = JSON.parse(localStorage.getItem('vms_user') || '{}');
  const role = user.role || 'guard';
  // Admin always has access; for other roles check allowed list
  if (role !== 'admin') {
    const allowed = roleNav[role] || ['dashboard', 'checkin', 'visitors', 'scheduled'];
    if (!allowed.includes(page)) return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="checkin"   element={<RoleGuard page="checkin"><CheckIn /></RoleGuard>} />
        <Route path="visitors"  element={<RoleGuard page="visitors"><Visitors /></RoleGuard>} />
        <Route path="scheduled" element={<RoleGuard page="scheduled"><Scheduled /></RoleGuard>} />
        <Route path="hosts"     element={<RoleGuard page="hosts"><Hosts /></RoleGuard>} />
        <Route path="reports"   element={<RoleGuard page="reports"><Reports /></RoleGuard>} />
        <Route path="blacklist" element={<RoleGuard page="blacklist"><Blacklist /></RoleGuard>} />
        <Route path="settings"  element={<RoleGuard page="settings"><Settings /></RoleGuard>} />
        <Route path="users"     element={<RoleGuard page="users"><Users /></RoleGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
