import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const ALL_NAV = [
  { page: 'dashboard', icon: '▦', label: 'Dashboard', section: 'Main' },
  { page: 'checkin',   icon: '＋', label: 'New Check-in' },
  { page: 'visitors',  icon: '◉', label: 'Visitors', badge: true },
  { page: 'scheduled', icon: '⏱', label: 'Pre-Scheduled' },
  { page: 'hosts',     icon: '☰', label: 'Host Directory', section: 'Management' },
  { page: 'reports',   icon: '▲', label: 'Reports & Analytics' },
  { page: 'blacklist', icon: '⊘', label: 'Blacklist' },
  { page: 'users',     icon: '👥', label: 'User Management', section: 'System' },
  { page: 'settings',  icon: '⚙', label: 'Settings' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { visitors, roleNav } = useApp();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('vms_user') || '{}');
  const userRole = user.role || 'guard';
  // Admin always gets everything; other roles are filtered by saved permissions
  const allowed = userRole === 'admin' ? null : (roleNav[userRole] || ['dashboard','checkin','visitors','scheduled']);
  const navItems = allowed ? ALL_NAV.filter(n => allowed.includes(n.page)) : ALL_NAV;

  const handleLogout = () => {
    localStorage.removeItem('vms_token');
    localStorage.removeItem('vms_user');
    navigate('/login');
  };

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`} id="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div className="brand-text"><b>SHIVOFFSET VMS</b><small>Visitor Management</small></div>
      </div>
      <nav className="nav">
        {navItems.map((item, i) => (
          <div key={item.page}>
            {item.section && <div className="nav-section">{item.section}</div>}
            <NavLink
              to={`/${item.page}`}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="ico">{item.icon}</span>
              {item.label}
              {item.badge && <span className="badge">{visitors.length}</span>}
            </NavLink>
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <b>SHIVOFFSET (I) PVT. LTD.</b><br />
        Haridwar • Build v2.0<br />
        Logged in as <b>{user.name || 'Guard'}</b>
        <button className="btn btn-danger btn-sm" onClick={handleLogout} style={{ marginTop: 10, width: '100%' }}>
          ↩ Logout
        </button>
      </div>
    </aside>
  );
}
