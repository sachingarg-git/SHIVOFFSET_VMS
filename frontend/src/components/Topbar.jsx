import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';

const pageMeta = {
  dashboard: ['Dashboard', 'Real-time visitor overview'],
  checkin: ['New Check-in', 'Capture visitor details & notify host'],
  visitors: ['All Visitors', 'Complete visitor log'],
  scheduled: ['Pre-Scheduled', 'Visitors expected today / soon'],
  hosts: ['Host Directory', 'Internal employees'],
  reports: ['Reports & Analytics', 'Insights & analytics'],
  blacklist: ['Blacklist', 'Banned visitors'],
  settings: ['Settings', 'WhatsApp API & configuration'],
  users: ['User Management', 'Internal accounts & roles'],
};

export default function Topbar({ onMenuClick, onSearch, searchVal }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { visitors, notifications, markNotifRead, markAllNotifsRead } = useApp();
  const { theme, toggleTheme } = useTheme();
  const page = location.pathname.replace('/', '') || 'dashboard';
  const [title, sub] = pageMeta[page] || ['SHIVOFFSET VMS', ''];
  const user = JSON.parse(localStorage.getItem('vms_user') || '{}');
  const initials = (user.name || 'AD').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  // Close notif panel when route changes
  useEffect(() => { setNotifOpen(false); }, [location.pathname]);

  const unread = (notifications || []).filter(n => !n.isRead).length;

  function fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString();
  }

  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onMenuClick}>☰</button>
      <div>
        <div className="page-title">{title}</div>
        <div className="page-sub">{sub}</div>
      </div>
      <div className="topbar-actions">
        <div className="search">
          <span>⌕</span>
          <input
            placeholder="Search visitors, hosts..."
            value={searchVal}
            onChange={e => { onSearch(e.target.value); if (e.target.value) navigate('/visitors'); }}
          />
        </div>
        <button className="icon-btn" onClick={() => document.dispatchEvent(new Event('showShortcuts'))}>?</button>

        {/* Theme toggle */}
        <button
          className="icon-btn theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>

        {/* Notification Bell */}
        <div ref={notifRef} className="notif-wrap">
          <button
            className="icon-btn"
            onClick={() => setNotifOpen(v => !v)}
            title="Notifications"
            aria-label="Notifications"
          >
            🔔
            {unread > 0 && (
              <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown">
              <div className="notif-hd">
                <span>🔔 Notifications {unread > 0 && <b className="notif-count-pill">{unread} new</b>}</span>
                {unread > 0 && (
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={markAllNotifsRead}
                    style={{ fontSize: 11 }}
                  >
                    ✓ Mark all read
                  </button>
                )}
              </div>

              <div className="notif-list">
                {(!notifications || notifications.length === 0) ? (
                  <div className="notif-empty">
                    <span style={{ fontSize: 28 }}>🔕</span>
                    <span>No notifications yet</span>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`notif-item${n.isRead ? '' : ' unread'}`}
                      onClick={() => { if (!n.isRead) markNotifRead(n.id); }}
                    >
                      {!n.isRead && <span className="notif-dot" />}
                      <div className="notif-body">
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-meta">
                          <span>{n.fromUser}</span>
                          <span>{fmtTime(n.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="avatar">{initials}</div>
      </div>
    </header>
  );
}
