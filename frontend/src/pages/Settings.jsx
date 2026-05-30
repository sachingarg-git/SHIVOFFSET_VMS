import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import LocationModal from '../components/modals/LocationModal';
import OptionsModal from '../components/modals/OptionsModal';
import { initials } from '../utils/helpers';
import { api } from '../api';

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

  // ── WhatsApp state ──────────────────────────────────────────────────────────
  const [waTab,       setWaTab]       = useState('qr'); // 'qr' | 'api'
  const [qrStatus,    setQrStatus]    = useState('disconnected');
  const [qrImage,     setQrImage]     = useState(null);
  const [qrInfo,      setQrInfo]      = useState(null);
  const [qrLoading,   setQrLoading]   = useState(false);
  const [waApiForm,   setWaApiForm]   = useState({ wa_token: '', wa_phone_id: '' });
  const [testPhone,   setTestPhone]   = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const qrPollRef = useRef(null);

  // Poll QR status every 2s when qr_ready/connecting, else 5s
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('/api/whatsapp/status', {
          headers: { Authorization: 'Bearer ' + (localStorage.getItem('vms_token') || '') }
        });
        const d = await r.json();
        setQrStatus(d.status);
        if (d.qr)   setQrImage(d.qr);
        if (d.info) setQrInfo(d.info);
        if (d.status === 'connected') { setQrImage(null); }
      } catch {}
    };
    poll();
    const delay = (qrStatus === 'qr_ready' || qrStatus === 'connecting') ? 2000 : 5000;
    qrPollRef.current = setInterval(poll, delay);
    return () => clearInterval(qrPollRef.current);
  }, [qrStatus]);

  const startQrConnect = async () => {
    setQrLoading(true);
    try {
      await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + (localStorage.getItem('vms_token') || '') }
      });
      setQrStatus('connecting');
    } catch { showToast('Connection failed', true); }
    setQrLoading(false);
  };

  const disconnectQr = async () => {
    if (!window.confirm('Disconnect WhatsApp? Session will be cleared.')) return;
    try {
      await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + (localStorage.getItem('vms_token') || '') }
      });
      setQrStatus('disconnected'); setQrImage(null); setQrInfo(null);
      showToast('✓ WhatsApp disconnected');
    } catch { showToast('Disconnect failed', true); }
  };

  const sendTestMsg = async () => {
    if (!testPhone) { showToast('Phone number required', true); return; }
    setTestLoading(true);
    try {
      const r = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + (localStorage.getItem('vms_token') || ''), 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone }),
      });
      const d = await r.json();
      if (d.ok) showToast(`✅ Test sent via ${d.mode === 'qr' ? 'QR session' : 'Meta API'}`);
      else showToast(d.error || 'Send failed', true);
    } catch { showToast('Test failed', true); }
    setTestLoading(false);
  };

  const saveApiSettings = async () => {
    try {
      const r = await fetch('/api/whatsapp/settings', {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + (localStorage.getItem('vms_token') || ''), 'Content-Type': 'application/json' },
        body: JSON.stringify(waApiForm),
      });
      const d = await r.json();
      if (d.ok) showToast('✓ API settings saved');
      else showToast(d.error || 'Save failed', true);
    } catch { showToast('Save failed', true); }
  };

  const STATUS_COLOR = { disconnected: '#94a3b8', connecting: '#f59e0b', qr_ready: '#3b82f6', connected: '#22c55e' };
  const STATUS_LABEL = { disconnected: 'Not Connected', connecting: 'Connecting...', qr_ready: 'Scan QR Code', connected: 'Connected ✅' };

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
        {/* ── WhatsApp Section ── */}
        <div className="card">
          <div className="card-hd"><div><h3>💬 WhatsApp Notifications</h3><p>Auto-send messages on check-in, approval &amp; checkout</p></div></div>

          {/* Mode Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--stroke)' }}>
            {[['qr','📱 QR Scan (Personal WhatsApp)'],['api','☁ Meta Cloud API']].map(([k, lbl]) => (
              <button key={k} onClick={() => setWaTab(k)}
                style={{ flex: 1, padding: '9px 0', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: waTab === k ? 'var(--orange)' : 'var(--surface2)',
                  color: waTab === k ? '#fff' : 'var(--muted)' }}>
                {lbl}
              </button>
            ))}
          </div>

          {/* ── QR TAB ── */}
          {waTab === 'qr' && (
            <div>
              {/* Status bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--stroke)', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[qrStatus], display: 'inline-block', boxShadow: qrStatus === 'connected' ? '0 0 6px #22c55e88' : 'none' }} />
                  <b style={{ fontSize: 13 }}>{STATUS_LABEL[qrStatus]}</b>
                  {qrInfo && <span style={{ fontSize: 11, color: 'var(--muted)' }}>({qrInfo.name} · +{qrInfo.phone})</span>}
                </div>
                {qrStatus === 'connected'
                  ? <button onClick={disconnectQr} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #f87171', background: 'rgba(248,113,113,0.1)', color: '#f87171', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Disconnect</button>
                  : <button onClick={startQrConnect} disabled={qrLoading || qrStatus === 'connecting' || qrStatus === 'qr_ready'}
                      style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', opacity: (qrLoading || qrStatus !== 'disconnected') ? 0.7 : 1 }}>
                      {qrLoading ? '⏳ Starting...' : qrStatus === 'qr_ready' ? '🔄 Refresh QR' : '📱 Connect WhatsApp'}
                    </button>
                }
              </div>

              {/* QR Code */}
              {qrStatus === 'qr_ready' && qrImage && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <img src={qrImage} alt="WhatsApp QR" style={{ width: 220, height: 220, borderRadius: 12, border: '3px solid #25D36633', padding: 8, background: '#fff' }} />
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                    1. Open WhatsApp on your phone<br />
                    2. Tap <b>⋮ Menu → Linked Devices</b><br />
                    3. Tap <b>Link a Device</b> → Scan this QR code
                  </div>
                  <div style={{ marginTop: 6, fontSize: 10, color: '#25D366', fontWeight: 700 }}>QR refreshes automatically every ~20s — scan quickly!</div>
                </div>
              )}

              {/* Connected info */}
              {qrStatus === 'connected' && (
                <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>✅ WhatsApp Connected!</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Messages will auto-send on check-in, approval &amp; checkout</div>
                </div>
              )}

              {/* Disconnected info */}
              {qrStatus === 'disconnected' && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--stroke)', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 14 }}>
                  <b style={{ color: '#25D366' }}>💡 QR Scan kaise kaam karta hai:</b><br />
                  • Kisi Meta developer account ki zaroorat nahi<br />
                  • Messages aapke connected phone number se jayenge<br />
                  • Session disk par save hoti hai — server restart par auto-reconnect<br />
                  • Jab tak logout ya disconnect na karein, connected rahega
                </div>
              )}

              {/* Test message */}
              {(qrStatus === 'connected') && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="Test phone (10 digits)" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--stroke)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' }} />
                  <button onClick={sendTestMsg} disabled={testLoading} className="btn btn-success btn-sm">{testLoading ? '⏳' : '📲 Test'}</button>
                </div>
              )}
            </div>
          )}

          {/* ── API TAB ── */}
          {waTab === 'api' && (
            <div>
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--muted)' }}>
                <b style={{ color: '#3b82f6' }}>☁ Meta Cloud API</b> — Official WhatsApp Business API.<br />
                Requires Meta developer account + approved phone number.<br />
                <a href="https://developers.facebook.com/docs/whatsapp" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>→ Setup guide</a>
              </div>
              <div className="form-grid">
                <div className="field field-full">
                  <label>Phone Number ID</label>
                  <input value={waApiForm.wa_phone_id} onChange={e => setWaApiForm(f => ({ ...f, wa_phone_id: e.target.value }))} placeholder="From Meta Developer Console" />
                </div>
                <div className="field field-full">
                  <label>Permanent Access Token</label>
                  <input type="password" value={waApiForm.wa_token} onChange={e => setWaApiForm(f => ({ ...f, wa_token: e.target.value }))} placeholder="EAAxxxxxxxxxx..." />
                </div>
                <div className="field-full" style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="Test phone (10 digits)" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--stroke)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' }} />
                  <button onClick={sendTestMsg} disabled={testLoading} className="btn btn-success btn-sm">{testLoading ? '⏳' : '📲 Test'}</button>
                </div>
                <div className="field-full" style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={saveApiSettings} className="btn btn-primary">✓ Save API Settings</button>
                </div>
              </div>
            </div>
          )}
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
