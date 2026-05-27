import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import ShortcutsModal from './modals/ShortcutsModal';
import { useApp } from '../context/AppContext';

export default function Layout() {
  const { fetchAll } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-close sidebar on ANY route change (bottom nav, keyboard, browser back)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    fetchAll();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const inField = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-wrap.show').forEach(m => m.classList.remove('show'));
        return;
      }
      if (inField && !((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) return;
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'n') { e.preventDefault(); navigate('/checkin'); }
        else if (k === '1') { e.preventDefault(); navigate('/dashboard'); }
        else if (k === '2') { e.preventDefault(); navigate('/visitors'); }
        else if (k === '3') { e.preventDefault(); navigate('/reports'); }
        else if (k === 'k') {
          e.preventDefault();
          document.querySelector('.search input')?.focus();
        }
      } else if (e.key === '?') {
        e.preventDefault();
        document.dispatchEvent(new Event('showShortcuts'));
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <div className="app">
      <div
        className={`backdrop${sidebarOpen ? ' show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main">
        <Topbar
          onMenuClick={() => setSidebarOpen(s => !s)}
          onSearch={setSearch}
          searchVal={search}
        />
        <div className="content page-anim">
          <Outlet context={{ search, setSearch }} />
        </div>
      </main>
      <BottomNav />
      <Toast />
      <ConfirmModal />
      <ShortcutsModal />
    </div>
  );
}
