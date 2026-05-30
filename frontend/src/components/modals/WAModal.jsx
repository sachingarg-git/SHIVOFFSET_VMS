import { useApp } from '../../context/AppContext';
import { fillTemplate } from '../../utils/helpers';
import BadgeModal from './BadgeModal';
import { useState } from 'react';
import { api } from '../../api';

export default function WAModal({ visitor, onClose }) {
  const { settings, showToast, approveVisitor, deleteVisitor } = useApp();
  const [badgeOpen, setBadgeOpen]   = useState(false);
  const [sending, setSending]       = useState(''); // 'host' | 'visitor' | 'both' | ''
  const user = JSON.parse(localStorage.getItem('vms_user') || '{}');
  const canApprove = ['admin', 'manager'].includes(user.role);

  // ── Direct API send — never opens WhatsApp Web ──────────────────────────────
  async function sendDirect(phone, msg, label) {
    const result = await api.waSend(phone, msg);
    if (!result || result.error) {
      throw new Error(result?.error || 'Send failed');
    }
    const modeLabel = result.mode === 'qr' ? 'QR session' : 'Meta API';
    console.log(`✅ [WAModal] Sent to ${label} via ${modeLabel}`);
    return modeLabel;
  }

  // ── Send to host ─────────────────────────────────────────────────────────────
  // First resolves mobile via /api/whatsapp/host-phone (vms_hosts → vms_users fallback)
  async function sendHost() {
    if (sending) return;
    setSending('host');
    try {
      // Resolve host mobile — backend checks vms_hosts first, then vms_users
      const hostData = await api.waHostPhone(visitor.host);
      if (!hostData?.mob) {
        showToast(`⚠ Host "${visitor.host}" ka mobile number nahi mila — Users page mein add karein`, true);
        setSending('');
        return;
      }

      const msg = fillTemplate(
        settings.hostTmpl ||
        '🔔 Visitor Alert — Hi {host_name}, {visitor_name} aapse milne aaye hain. Purpose: {purpose}. Mobile: {visitor_mobile}. Check-in: {time}.',
        visitor
      );

      const via = await sendDirect(hostData.mob, msg, 'host');
      showToast(`✅ Host ko message bheja gaya (${via})`);
    } catch (e) {
      showToast(`❌ Host send failed: ${e.message}`, true);
    }
    setSending('');
  }

  // ── Send to visitor ──────────────────────────────────────────────────────────
  async function sendVisitor() {
    if (sending) return;
    setSending('visitor');
    try {
      if (!visitor.mob) {
        showToast('⚠ Visitor ka mobile number nahi mila', true);
        setSending('');
        return;
      }
      const msg = fillTemplate(
        settings.visitorTmpl ||
        '🙏 Welcome to SHIVOFFSET! Hi {visitor_name}, aap check-in ho chuke hain on {date} {time}. Host {host_name} ko notify kar diya gaya hai.',
        visitor
      );
      const via = await sendDirect(visitor.mob, msg, 'visitor');
      showToast(`✅ Visitor ko message bheja gaya (${via})`);
    } catch (e) {
      showToast(`❌ Visitor send failed: ${e.message}`, true);
    }
    setSending('');
  }

  // ── Send both ────────────────────────────────────────────────────────────────
  async function sendBoth() {
    if (sending) return;
    setSending('both');
    let results = [];

    // Visitor first
    try {
      if (visitor.mob) {
        const msg = fillTemplate(
          settings.visitorTmpl ||
          '🙏 Welcome to SHIVOFFSET! Hi {visitor_name}, aap check-in ho chuke hain on {date} {time}. Host {host_name} ko notify kar diya gaya hai.',
          visitor
        );
        const via = await sendDirect(visitor.mob, msg, 'visitor');
        results.push(`Visitor ✓ (${via})`);
      } else {
        results.push('Visitor ✗ (no mobile)');
      }
    } catch (e) {
      results.push(`Visitor ✗ (${e.message})`);
    }

    // Host second
    try {
      const hostData = await api.waHostPhone(visitor.host);
      if (hostData?.mob) {
        const msg = fillTemplate(
          settings.hostTmpl ||
          '🔔 Visitor Alert — Hi {host_name}, {visitor_name} aapse milne aaye hain. Purpose: {purpose}. Mobile: {visitor_mobile}. Check-in: {time}.',
          visitor
        );
        const via = await sendDirect(hostData.mob, msg, 'host');
        results.push(`Host ✓ (${via})`);
      } else {
        results.push('Host ✗ (no mobile)');
      }
    } catch (e) {
      results.push(`Host ✗ (${e.message})`);
    }

    showToast(`📲 ${results.join(' • ')}`);
    setSending('');
  }

  const handleApprove = () => {
    approveVisitor(visitor.id);
    showToast(`✓ Host ${visitor.host} approved ${visitor.name}`);
    onClose();
  };

  const handleReject = () => {
    deleteVisitor(visitor.id);
    showToast(`✗ ${visitor.name} rejected`, true);
    onClose();
  };

  const isSending = (key) => sending === key || sending === 'both';

  return (
    <>
      <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal">
          <h3>📱 WhatsApp Notifications</h3>
          <p>The following messages have been triggered</p>
          <div className="wa-chat-window">

            {/* Host message preview */}
            <div className="wa-msg">
              <div className="wa-hd">📨 To Host: <span>{visitor.host}</span></div>
              <b>🔔 Visitor Arrival Alert</b><br /><br />
              Hi <b>{visitor.host.split(' ')[0]}</b>, <b>{visitor.name}</b> aapse milne aaye hain.<br /><br />
              📞 Mobile: {visitor.mob}<br />
              🎯 Purpose: <b>{visitor.purpose}</b><br />
              🕐 Check-in: {visitor.inT}<br /><br />
              <i>Visitor reception par wait kar rahe hain.</i>
              {!canApprove && (
                <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(250,204,21,0.18)', color: '#fde047', fontSize: 11, fontWeight: 700 }}>
                  ⏳ Admin/Manager approval ka wait kar rahe hain
                </div>
              )}
              <div className="wa-actions">
                <button
                  className="wa-btn"
                  onClick={sendHost}
                  disabled={!!sending}
                  style={sending === 'host' ? { opacity: 0.7 } : {}}
                >
                  {sending === 'host' ? '⏳ Sending…' : '📲 Send to Host'}
                </button>
                {canApprove && <button className="wa-btn green" onClick={handleApprove}>✓ Approve</button>}
                {canApprove && <button className="wa-btn red"   onClick={handleReject}>✗ Reject</button>}
              </div>
            </div>

            {/* Visitor message preview */}
            <div className="wa-msg user">
              <div className="wa-hd">📨 To Visitor: <span>{visitor.name}</span></div>
              🙏 <b>Welcome to SHIVOFFSET (I) PVT. LTD.</b><br /><br />
              Hi <b>{visitor.name.split(' ')[0]}</b> 👋,<br /><br />
              Aap check-in ho chuke hain on <b>{visitor.date} {visitor.inT}</b>.<br />
              Aapke host <b>{visitor.host}</b> ko notify kar diya gaya hai.
              <div className="wa-actions">
                <button
                  className="wa-btn"
                  onClick={sendVisitor}
                  disabled={!!sending}
                  style={sending === 'visitor' ? { opacity: 0.7 } : {}}
                >
                  {sending === 'visitor' ? '⏳ Sending…' : '📲 Send to Visitor'}
                </button>
                <button className="wa-btn" onClick={() => setBadgeOpen(true)}>🎫 View e-Badge</button>
              </div>
            </div>

          </div>

          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            <button
              className="btn btn-success"
              onClick={sendBoth}
              disabled={!!sending}
            >
              {sending === 'both' ? <><span className="loading-spin" /> Sending…</> : '📲 Send Both'}
            </button>
            <button className="btn btn-primary" onClick={() => setBadgeOpen(true)}>View e-Badge</button>
          </div>
        </div>
      </div>
      {badgeOpen && <BadgeModal visitor={visitor} onClose={() => setBadgeOpen(false)} />}
    </>
  );
}
