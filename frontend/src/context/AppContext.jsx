import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api';
import { nowHM, todayStr } from '../utils/helpers';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [visitors, setVisitors] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({
    provider: 'Twilio WhatsApp Business', sender: '', token: '',
    visitorTmpl: '', hostTmpl: '', outTmpl: ''
  });
  const [options, setOptions] = useState({ purpose: [], dept: [] });
  const [loading, setLoading] = useState(false);

  // Role-based navigation — admin always gets all, guard is configurable
  const ALL_PAGES = ['dashboard','checkin','visitors','scheduled','hosts','reports','blacklist','settings','users'];
  const DEFAULT_GUARD = ['dashboard','checkin','visitors','scheduled'];
  const [roleNav, setRoleNav] = useState({ admin: ALL_PAGES, guard: DEFAULT_GUARD });

  // Toast
  const [toast, setToast] = useState({ msg: '', err: false, show: false });
  let toastTimer = null;
  const showToast = useCallback((msg, err = false) => {
    setToast({ msg, err, show: true });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setToast(t => ({ ...t, show: false })), 2800);
  }, []);

  // Confirm
  const [confirm, setConfirm] = useState({ show: false, title: '', msg: '', onYes: null, okLabel: 'Yes, Delete', okClass: 'btn-danger' });
  const confirmAction = useCallback((title, msg, onYes, okLabel = 'Yes, Delete', okClass = 'btn-danger') => {
    setConfirm({ show: true, title, msg, onYes, okLabel, okClass });
  }, []);
  const closeConfirm = () => setConfirm(c => ({ ...c, show: false }));

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('vms_user') || '{}');
      const isAdmin = currentUser.role === 'admin';
      const [v, h, s, b, l, set, u] = await Promise.all([
        api.getVisitors(), api.getHosts(), api.getScheduled(),
        api.getBlacklist(), api.getLocations(), api.getSettings(),
        isAdmin ? api.getUsers() : Promise.resolve([]),
      ]);
      if (v) setVisitors(v);
      if (h) setHosts(h);
      if (s) setScheduled(s);
      if (b) setBlacklist(b);
      if (l) setLocations(l);
      if (u) setUsers(u);
      if (set) {
        const s = set.settings || {};
        setSettings(s);
        setOptions(set.options || { purpose: [], dept: [] });
        // Parse stored role permissions (admin always full, guard configurable)
        setRoleNav({
          admin: ALL_PAGES,
          guard: s.roleNav_guard ? JSON.parse(s.roleNav_guard) : DEFAULT_GUARD,
        });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  // Notification polling (every 30 s after login)
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('vms_token');
    if (!token) return;
    const res = await api.getNotifications();
    if (res) setNotifications(res);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 30000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  const markNotifRead = useCallback(async (id) => {
    await api.markNotifRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllNotifsRead = useCallback(async () => {
    await api.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  // VISITOR CRUD
  const addVisitor = useCallback(async (data) => {
    const res = await api.addVisitor({ ...data, inT: nowHM(), outT: '', st: 'pending', date: todayStr(), createdAt: Date.now() });
    if (res && res.id) {
      const newV = { ...data, ...res, inT: nowHM(), outT: '', st: 'pending', date: todayStr(), createdAt: Date.now() };
      setVisitors(prev => [newV, ...prev]);
      return newV;
    }
    return null;
  }, []);

  const updateVisitor = useCallback(async (id, data) => {
    await api.updateVisitor(id, data);
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
  }, []);

  const deleteVisitor = useCallback(async (id) => {
    await api.deleteVisitor(id);
    setVisitors(prev => prev.filter(v => v.id !== id));
  }, []);

  const checkOut = useCallback(async (id) => {
    const outT = nowHM();
    // Must send full visitor data — backend PUT overwrites all fields
    // Also needed so mob/name are available for WhatsApp checkout message
    setVisitors(prev => {
      const vis = prev.find(v => v.id === id);
      if (vis) api.updateVisitor(id, { ...vis, st: 'out', outT });
      else     api.updateVisitor(id, { st: 'out', outT });
      return prev.map(v => v.id === id ? { ...v, st: 'out', outT } : v);
    });
  }, []);

  const approveVisitor = useCallback(async (id) => {
    const res = await api.approveVisitorApi(id);
    if (res && res.success) {
      setVisitors(prev => prev.map(v => v.id === id ? { ...v, st: 'in', approvedBy: res.approvedBy || '' } : v));
      showToast('✅ Visitor approved — guard ko notify kar diya');
    }
  }, [showToast]);

  // HOST CRUD
  const addHost = useCallback(async (data) => {
    const res = await api.addHost(data);
    if (res && res.id) { setHosts(prev => [...prev, { ...data, id: res.id }]); return res.id; }
    return null;
  }, []);

  const updateHost = useCallback(async (id, data) => {
    await api.updateHost(id, data);
    setHosts(prev => prev.map(h => h.id === id ? { ...h, ...data } : h));
  }, []);

  const deleteHost = useCallback(async (id) => {
    await api.deleteHost(id);
    setHosts(prev => prev.filter(h => h.id !== id));
  }, []);

  // SCHEDULED CRUD
  const addScheduled = useCallback(async (data) => {
    const res = await api.addScheduled(data);
    if (res && res.id) { setScheduled(prev => [...prev, { ...data, id: res.id }]); }
  }, []);

  const updateScheduled = useCallback(async (id, data) => {
    await api.updateScheduled(id, data);
    setScheduled(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);

  const deleteScheduled = useCallback(async (id) => {
    await api.deleteScheduled(id);
    setScheduled(prev => prev.filter(s => s.id !== id));
  }, []);

  // BLACKLIST CRUD
  const addBlacklist = useCallback(async (data) => {
    const res = await api.addBlacklist(data);
    if (res && res.id) { setBlacklist(prev => [...prev, { ...data, id: res.id }]); }
  }, []);

  const updateBlacklist = useCallback(async (id, data) => {
    await api.updateBlacklist(id, data);
    setBlacklist(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  }, []);

  const deleteBlacklist = useCallback(async (id) => {
    await api.deleteBlacklist(id);
    setBlacklist(prev => prev.filter(b => b.id !== id));
  }, []);

  // LOCATION CRUD
  const addLocation = useCallback(async (data) => {
    const res = await api.addLocation(data);
    if (res && res.id) { setLocations(prev => [...prev, { ...data, id: res.id }]); }
  }, []);

  const updateLocation = useCallback(async (id, data) => {
    await api.updateLocation(id, data);
    setLocations(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
  }, []);

  const deleteLocation = useCallback(async (id) => {
    await api.deleteLocation(id);
    setLocations(prev => prev.filter(l => l.id !== id));
  }, []);

  // SETTINGS
  const saveSettings = useCallback(async (data) => {
    await api.saveSettings(data);
    setSettings(data);
    showToast('✓ Settings saved');
  }, [showToast]);

  const saveRoleNav = useCallback(async (role, pages) => {
    // Ensure dashboard always accessible, settings always admin-only
    const safe = pages.includes('dashboard') ? pages : ['dashboard', ...pages];
    const key = `roleNav_${role}`;
    await api.saveSettings({ [key]: JSON.stringify(safe) });
    setRoleNav(prev => ({ ...prev, [role]: safe }));
    showToast(`✓ ${role} permissions saved`);
  }, [showToast]);

  // USER CRUD (admin only)
  const addUser = useCallback(async (data) => {
    const res = await api.addUser(data);
    if (res && res.id) {
      setUsers(prev => [...prev, { id: res.id, username: data.username, name: data.name, role: data.role, createdAt: new Date().toISOString() }]);
      showToast(`✓ User "${data.username}" created`);
      return res.id;
    }
    if (res && res.error) { showToast(res.error, true); }
    return null;
  }, [showToast]);

  const updateUser = useCallback(async (id, data) => {
    const res = await api.updateUser(id, data);
    if (res && res.success) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
      showToast('✓ User updated');
    } else if (res && res.error) { showToast(res.error, true); }
  }, [showToast]);

  const deleteUser = useCallback(async (id) => {
    const res = await api.deleteUser(id);
    if (res && res.success) {
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast('✓ User deleted');
    } else if (res && res.error) { showToast(res.error, true); }
  }, [showToast]);

  const addOption = useCallback(async (type, value) => {
    await api.addOption(type, value);
    setOptions(prev => ({ ...prev, [type]: [...(prev[type] || []), value] }));
  }, []);

  const removeOption = useCallback(async (type, value) => {
    await api.deleteOption(type, value);
    setOptions(prev => ({ ...prev, [type]: (prev[type] || []).filter(v => v !== value) }));
  }, []);

  // Export CSV
  const exportCSV = useCallback(() => {
    const headers = ['#','Name','Mobile','Address','Company','Department','Purpose','Host','Date','In','Out','Duration (min)','Status','Remarks'];
    const rows = visitors.map((v, i) => [
      i + 1, v.name, v.mob, v.addr, v.co, v.dept, v.purpose, v.host, v.date, v.inT, v.outT || '',
      v.st === 'out' && v.outT ? Math.max(0, (v.outT.split(':')[0]*60 + +v.outT.split(':')[1]) - (v.inT.split(':')[0]*60 + +v.inT.split(':')[1])) : '',
      v.st, v.remarks || ''
    ].map(x => `"${(x ?? '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `shivoffset-visitors-${todayStr()}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('✓ CSV exported');
  }, [visitors, showToast]);

  return (
    <AppContext.Provider value={{
      visitors, hosts, scheduled, blacklist, locations, users, settings, options, loading,
      notifications, markNotifRead, markAllNotifsRead,
      roleNav, saveRoleNav,
      addUser, updateUser, deleteUser,
      fetchAll,
      addVisitor, updateVisitor, deleteVisitor, checkOut, approveVisitor,
      addHost, updateHost, deleteHost,
      addScheduled, updateScheduled, deleteScheduled,
      addBlacklist, updateBlacklist, deleteBlacklist,
      addLocation, updateLocation, deleteLocation,
      saveSettings, addOption, removeOption,
      exportCSV,
      setVisitors, setHosts, setScheduled,
      toast, showToast,
      confirm, confirmAction, closeConfirm
    }}>
      {children}
    </AppContext.Provider>
  );
}
