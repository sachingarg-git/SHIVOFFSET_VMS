import { useState } from 'react';
import { useApp } from '../context/AppContext';

const ROLES = [
  { value: 'admin',   label: 'Admin',   color: '#ff6a00', bg: 'rgba(255,106,0,0.15)',   desc: 'Full access to all pages' },
  { value: 'guard',   label: 'Guard',   color: '#22c55e', bg: 'rgba(34,197,94,0.14)',   desc: 'Limited — check-in & visitors' },
  { value: 'manager', label: 'Manager', color: '#3b82f6', bg: 'rgba(59,130,246,0.14)',  desc: 'Can view reports & manage hosts' },
  { value: 'viewer',  label: 'Viewer',  color: '#a855f7', bg: 'rgba(168,85,247,0.14)',  desc: 'Read-only access' },
];

function roleMeta(role) {
  return ROLES.find(r => r.value === role) || { label: role, color: '#8a8a96', bg: 'rgba(138,138,150,0.14)' };
}

function RoleBadge({ role }) {
  const m = roleMeta(role);
  return (
    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, color: m.color, background: m.bg, border: `1px solid ${m.color}44`, letterSpacing: 0.4 }}>
      {m.label}
    </span>
  );
}

function UserModal({ user, onClose, onSave }) {
  const isEdit = !!user;
  const { options } = useApp();
  const [form, setForm] = useState({
    name:            user?.name     || '',
    username:        user?.username || '',
    role:            user?.role     || 'guard',
    mob:             user?.mob      || '',
    dept:            user?.dept     || '',
    password:        '',
    confirmPassword: '',
  });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) return setErr('Full name is required');
    if (!form.username.trim()) return setErr('Username is required');
    if (form.username.trim().length < 3) return setErr('Username must be at least 3 characters');
    if (!isEdit && !form.password) return setErr('Password is required for new users');
    if (form.password && form.password.length < 6) return setErr('Password must be at least 6 characters');
    if (form.password && form.password !== form.confirmPassword) return setErr('Passwords do not match');
    if (form.mob && !/^[0-9+\-\s]{7,15}$/.test(form.mob.trim())) return setErr('Invalid mobile number');

    setSaving(true);
    const data = { name: form.name.trim(), username: form.username.trim().toLowerCase(), role: form.role, mob: form.mob.trim(), dept: form.dept.trim() };
    if (form.password) data.password = form.password;
    await onSave(data);
    setSaving(false);
  };

  return (
    <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal narrow" style={{ maxWidth: 460 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,var(--orange),#ff3d00)', display: 'grid', placeItems: 'center', fontSize: 20 }}>
            {isEdit ? '✎' : '＋'}
          </div>
          <div>
            <h3 style={{ fontSize: 16, margin: 0 }}>{isEdit ? 'Edit User' : 'Create New User'}</h3>
            <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>{isEdit ? `Editing @${user.username}` : 'Add an internal system user'}</p>
          </div>
        </div>

        {err && <div className="login-err" style={{ marginBottom: 14 }}>{err}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field field-full">
            <label>Full Name <span className="req">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sachin Dhiman" autoFocus />
          </div>

          <div className="field field-full">
            <label>Username <span className="req">*</span></label>
            <input
              value={form.username}
              onChange={e => set('username', e.target.value)}
              placeholder="e.g. sachin01"
              disabled={isEdit} // username cannot be changed after creation
              style={isEdit ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
            />
            {isEdit && <small style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>Username cannot be changed</small>}
          </div>

          <div className="field field-full">
            <label>Role <span className="req">*</span></label>
            <select value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
            </select>
          </div>

          <div className="field field-full">
            <label>🏢 Department <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>(check-in mein auto-filter hoga)</span></label>
            <select value={form.dept} onChange={e => set('dept', e.target.value)}>
              <option value="">— None / Unassigned —</option>
              {options.dept.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="field field-full">
            <label>📱 Mobile Number <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>(WhatsApp alerts jayenge)</span></label>
            <input
              value={form.mob}
              onChange={e => set('mob', e.target.value)}
              placeholder="e.g. 9876543210"
              type="tel"
              inputMode="numeric"
            />
          </div>

          <div className="field">
            <label>{isEdit ? 'New Password' : 'Password'} {!isEdit && <span className="req">*</span>}</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder={isEdit ? 'Leave blank to keep current' : 'Min 6 characters'} />
          </div>

          <div className="field">
            <label>Confirm Password {!isEdit && <span className="req">*</span>}</label>
            <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Re-enter password" />
          </div>

          <div className="modal-actions field-full">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading-spin" /> : null}
              {isEdit ? '✓ Save Changes' : '＋ Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users() {
  const { users, addUser, updateUser, deleteUser, confirmAction, showToast } = useApp();
  const [modal, setModal] = useState(null); // null | 'add' | { user }
  const currentUser = JSON.parse(localStorage.getItem('vms_user') || '{}');

  const handleSave = async (data) => {
    if (modal === 'add') {
      const id = await addUser(data);
      if (id) setModal(null);
    } else {
      await updateUser(modal.id, data);
      setModal(null);
    }
  };

  const handleDelete = (u) => {
    if (u.id === currentUser.id) { showToast('Cannot delete your own account', true); return; }
    confirmAction(
      `Delete user "${u.name}"?`,
      `@${u.username} will lose all access immediately. This cannot be undone.`,
      () => deleteUser(u.id),
      'Yes, Delete',
      'btn-danger'
    );
  };

  const isSelf = (u) => u.id === currentUser.id;

  return (
    <>
      <div className="card">
        <div className="card-hd">
          <div>
            <h3>User Management</h3>
            <p>Internal system accounts • {users.length} user{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>＋ Add User</button>
        </div>

        {/* Role legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {ROLES.map(r => (
            <div key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: r.bg, border: `1px solid ${r.color}33`, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, display: 'inline-block' }} />
              <b style={{ color: r.color }}>{r.label}</b>
              <span style={{ color: 'var(--muted)' }}>— {r.desc}</span>
            </div>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>Mobile</th>
                <th>Role</th>
                <th>Department</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!users.length ? (
                <tr><td colSpan={7}><div className="empty"><b>No users found</b>Loading users…</div></td></tr>
              ) : users.map(u => (
                <tr key={u.id} style={isSelf(u) ? { background: 'rgba(255,106,0,0.05)' } : {}}>
                  <td>
                    <div className="cell-user">
                      <div className="row-avatar" style={{ background: `linear-gradient(135deg,${roleMeta(u.role).color},${roleMeta(u.role).color}99)` }}>
                        {u.name.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <b>{u.name}</b>
                        {isSelf(u) && <small style={{ color: 'var(--orange-2)', display: 'block', fontSize: 10 }}>● You</small>}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 12, color: 'var(--muted)' }}>
                    @{u.username}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {u.mob
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 14 }}>📱</span>
                          <span>{u.mob}</span>
                        </span>
                      : <span style={{ color: 'var(--muted)', fontSize: 11 }}>— not set</span>
                    }
                  </td>
                  <td><RoleBadge role={u.role} /></td>
                  <td style={{ fontSize: 12 }}>
                    {u.dept
                      ? <span style={{ padding: '3px 9px', borderRadius: 8, background: 'rgba(59,130,246,0.12)', color: '#60a5fa', fontSize: 11, fontWeight: 700, border: '1px solid rgba(59,130,246,0.25)' }}>{u.dept}</span>
                      : <span style={{ color: 'var(--muted)', fontSize: 11 }}>— none</span>
                    }
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-xs" onClick={() => setModal(u)} title="Edit user">✎ Edit</button>
                      <button
                        className="btn btn-danger btn-xs"
                        onClick={() => handleDelete(u)}
                        title={isSelf(u) ? 'Cannot delete yourself' : 'Delete user'}
                        disabled={isSelf(u)}
                        style={isSelf(u) ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)', fontSize: 12, color: 'var(--muted)' }}>
          🔒 Passwords are hashed with bcrypt and never stored in plain text. Only admins can access this page.
        </div>
      </div>

      {modal && (
        <UserModal
          user={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
