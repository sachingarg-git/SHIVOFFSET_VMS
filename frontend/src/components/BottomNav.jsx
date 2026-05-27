import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// Up to 5 items in bottom nav — pick the most useful ones
const BOT_NAV_ALL = [
  { page: 'dashboard', icon: '▦', label: 'Home' },
  { page: 'visitors',  icon: '◉', label: 'Visitors' },
  { page: 'checkin',   icon: '＋', label: 'New', fab: true },
  { page: 'reports',   icon: '▲', label: 'Reports' },
  { page: 'hosts',     icon: '☰', label: 'Hosts' },
];

export default function BottomNav() {
  const { roleNav } = useApp();
  const user = JSON.parse(localStorage.getItem('vms_user') || '{}');
  const userRole = user.role || 'guard';
  const allowed = userRole === 'admin' ? null : (roleNav[userRole] || ['dashboard','checkin','visitors','scheduled']);
  const items = (allowed ? BOT_NAV_ALL.filter(n => allowed.includes(n.page)) : BOT_NAV_ALL);

  // Always ensure checkin (fab) appears in the middle if allowed
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner" style={{ gridTemplateColumns: `repeat(${items.length},1fr)` }}>
        {items.map(n => (
          <NavLink
            key={n.page}
            to={`/${n.page}`}
            className={({ isActive }) => `bn-item${n.fab ? ' fab' : ''}${isActive ? ' active' : ''}`}
          >
            <div className="bn-ico">{n.icon}</div>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
