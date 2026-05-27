import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import LocationModal from '../components/modals/LocationModal';
import OptionsModal from '../components/modals/OptionsModal';
import { initials } from '../utils/helpers';

// All configurable nav pages — order matches the sidebar
const NAV_PAGES = [
  { page: 'dashboard',  icon: '▦',  label: 'Dashboard',           locked: true },   // always on
  { page: 'checkin',    icon: '＋', label: 'New Check-in' },
  { page: 'visitors',   icon: '◉',  label: 'Visitors' },
  { page: 'scheduled',  icon: '⏱',  label: 'Pre-Scheduled' },
  { page: 'hosts',      icon: '☰',  label: 'Host Directory' },
  { page: 'reports',    icon: '▲',  label: 'Reports & Analytics' },
  { page: 'blacklist',  icon: '⊘',  label: 'Blacklist' },
  { page: 'users',      icon: '👥', label: 'User Management', adminOnly: true }, // admin only
  { page: 'settings',   icon: '⚙',  label: 'Settings', adminOnly: true }, // admin always on, not for guard
];

function RoleNavCard({ roleNav, saveRoleNav }) {
  const user = JSON.parse(localStorage.getItem('vms_user') || '{}');
  const isAdmin = user.role === 'admin';
  // guard permissions state (admin is always full — read-only display)
  const [guardPages, setGuardPages] = useState(roleNav.guard || []);

  useEffect(() => { setGuardPages(roleNav.guard || []); }, [roleNav.guard]);

  const toggle = (page) => {
    setGuardPages(prev =>
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]
    );
  };

  if (!isAdmin) return null; // Only admins see this section

  return (
    <div className="card" style={{ marginTop: 0 }}>
      <div className="card-hd">
        <div>
          <h3>🔑 Role-Based Navigation</h3>
          <p>Control which pages each role can access</p>
        </div>
      </div>

      {/* Role columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* ADMIN column — always full, read-only */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,106,0,0.08)', border: '1px solid rgba(255,106,0,0.2)' }}>
            <span style={{ fontSize: 16 }}>👑</span>
            <div>
              <b style={{ fontSize: 13 }}>Admin</b>
              <small style={{ display: 'block', color: 'var(--muted)', fontSize: 10 }}>Full access — cannot restrict</small>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NAV_PAGES.map(n => (
              <div key={n.page} className="role-nav-row locked">
                <span className="rn-ico">{n.icon}</span>
                <span className="rn-label">{n.label}</span>
                <span className="rn-badge on">✓ Always</span>
              </div>
            ))}
          </div>
        </div>

        {/* GUARD column — configurable */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--stroke)' }}>
            <span style={{ fontSize: 16 }}>🛡</span>
            <div>
              <b style={{ fontSize: 13 }}>Guard</b>
              <small style={{ display: 'block', color: 'var(--muted)', fontSize: 10 }}>Configurable access</small>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NAV_PAGES.map(n => {
              const isLocked = n.locked || n.adminOnly;
              const isOn = n.locked ? true : n.adminOnly ? false : guardPages.includes(n.page);
              return (
                <div
                  key={n.page}
                  className={`role-nav-row${isLocked ? ' locked' : ' clickable'}${isOn ? ' on' : ''}`}
                  onClick={() => !isLocked && toggle(n.page)}
                  title={n.locked ? 'Always accessible' : n.adminOnly ? 'Admin only — cannot grant to Guard' : isOn ? 'Click to revoke' : 'Click to grant'}
                >
                  <span className="rn-ico">{n.icon}</span>
                  <span className="rn-label">{n.label}</span>
                  {n.locked && <span className="rn-badge on">✓ Always</span>}
                  {n.adminOnly && <span className="rn-badge admin-only">Admin only</span>}
                  {!isLocked && !n.adminOnly && (
                    <label className="rn-toggle" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isOn} onChange={() => toggle(n.page)} />
                      <span className="rn-slider" />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 14, width: '100%' }}
            onClick={() => saveRoleNav('guard', guardPages)}
          >
            ✓ Save Guard Permissions
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)', fontSize: 12, color: 'var(--muted)' }}>
        💡 Changes apply immediately on next login. Currently logged-in Guard sessions reflect changes on page refresh.
      </div>
    </div>
  );
}

export default function Settings() {
  const { settings, locations, options, saveSettings, addLocation, updateLocation, deleteLocation, addOption, removeOption, showToast, confirmAction, roleNav, saveRoleNav } = useApp();
  const [form, setForm] = useState({ provider: '', sender: '', token: '', visitorTmpl: '', hostTmpl: '', outTmpl: '' });
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [editLoc, setEditLoc] = useState(null);
  const [optModal, setOptModal] = useState(null); // 'purpose' | 'dept' | null

  useEffect(() => {
    if (settings) setForm({
      provider: settings.provider || 'Twilio WhatsApp Business',
      sender: settings.sender || '',
      token: settings.token || '',
      visitorTmpl: settings.visitorTmpl || '',
      hostTmpl: settings.hostTmpl || '',
      outTmpl: settings.outTmpl || '',
    });
  }, [settings]);

  const handleDeleteLoc = (l) => {
    confirmAction(`Delete ${l.name}?`, 'This location will be removed.', () => { deleteLocation(l.id); showToast('✓ Location deleted'); });
  };

  return (
    <>
      <div className="split-2-equal">
        <div className="card">
          <div className="card-hd"><div><h3>WhatsApp API Settings</h3><p>Configure notification templates</p></div></div>
          <form onSubmit={e => { e.preventDefault(); saveSettings(form); }} className="form-grid">
            <div className="field field-full">
              <label>API Provider</label>
              <select value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
                {['Twilio WhatsApp Business', 'Meta Cloud API', 'Gupshup', 'Interakt'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field field-full"><label>Sender Number</label><input value={form.sender} onChange={e => setForm(f => ({ ...f, sender: e.target.value }))} /></div>
            <div className="field field-full"><label>API Key / Token</label><input type="password" value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx" /></div>
            <div className="field field-full"><label>Visitor Welcome Template</label><textarea rows={3} value={form.visitorTmpl} onChange={e => setForm(f => ({ ...f, visitorTmpl: e.target.value }))} /></div>
            <div className="field field-full"><label>Host Alert Template</label><textarea rows={3} value={form.hostTmpl} onChange={e => setForm(f => ({ ...f, hostTmpl: e.target.value }))} /></div>
            <div className="field field-full"><label>Check-out Thank-you Template</label><textarea rows={2} value={form.outTmpl} onChange={e => setForm(f => ({ ...f, outTmpl: e.target.value }))} /></div>
            <div className="field-full" style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setForm({ provider: settings.provider || '', sender: settings.sender || '', token: settings.token || '', visitorTmpl: settings.visitorTmpl || '', hostTmpl: settings.hostTmpl || '', outTmpl: settings.outTmpl || '' })}>Discard</button>
              <button type="submit" className="btn btn-primary">✓ Save Settings</button>
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-hd">
              <div><h3>Office Locations</h3><p>SHIVOFFSET check-in points</p></div>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditLoc(null); setLocModalOpen(true); }}>＋ Add Location</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!locations.length ? <div className="empty"><b>No locations</b></div> : locations.map(l => (
                <div className="host" key={l.id}>
                  <div className="row-avatar">{l.code || l.name.slice(0, 2).toUpperCase()}</div>
                  <div className="host-info"><b>{l.name}</b><small>{l.addr || '—'}</small></div>
                  <span className={`host-status${l.st === 'away' ? ' away' : ''}`}></span>
                  <div className="row-actions" style={{ marginLeft: 10 }}>
                    <button className="btn btn-ghost btn-xs" onClick={() => { setEditLoc(l); setLocModalOpen(true); }}>✎</button>
                    <button className="btn btn-danger btn-xs" onClick={() => handleDeleteLoc(l)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-hd"><div><h3>Manage Dropdowns</h3><p>Edit purpose and department lists</p></div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--stroke)' }}>
                <div><b style={{ fontSize: 13 }}>Purpose of Visit</b><small style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>{options.purpose.length} options</small></div>
                <button className="btn btn-ghost btn-sm" onClick={() => setOptModal('purpose')}>⚙ Manage</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--stroke)' }}>
                <div><b style={{ fontSize: 13 }}>Departments</b><small style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>{options.dept.length} options</small></div>
                <button className="btn btn-ghost btn-sm" onClick={() => setOptModal('dept')}>⚙ Manage</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Navigation — full width below the two columns */}
      <RoleNavCard roleNav={roleNav} saveRoleNav={saveRoleNav} />

      <LocationModal open={locModalOpen} location={editLoc} onClose={() => { setLocModalOpen(false); setEditLoc(null); }} />
      {optModal && <OptionsModal type={optModal} options={options[optModal] || []} title={optModal === 'purpose' ? 'Purpose of Visit' : 'Department'} onClose={() => setOptModal(null)} onAdd={(v) => addOption(optModal, v)} onDelete={(v) => removeOption(optModal, v)} showToast={showToast} />}
    </>
  );
}
