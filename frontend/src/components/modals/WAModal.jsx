import { useApp } from '../../context/AppContext';
import { cleanPhone, fillTemplate } from '../../utils/helpers';
import BadgeModal from './BadgeModal';
import { useState } from 'react';

export default function WAModal({ visitor, hosts, onClose }) {
  const { settings, showToast, approveVisitor, deleteVisitor } = useApp();
  const [badgeOpen, setBadgeOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('vms_user') || '{}');
  const canApprove = ['admin', 'manager'].includes(user.role);

  const openWA = (phone, msg) => {
    if (settings.token && settings.token.trim().length > 5) {
      showToast('📲 Sending via API…');
    }
    window.open(`https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const sendHost = () => {
    const host = hosts.find(h => h.name === visitor.host);
    if (!host?.mob) { showToast('⚠ Host mobile number not found', true); return; }
    openWA(host.mob, fillTemplate(settings.hostTmpl || '🔔 Visitor Alert — Hi {host_name}, {visitor_name} aapse milne aaye hain. Purpose: {purpose}. Mobile: {visitor_mobile}. Check-in: {time}.', visitor));
    showToast('📲 Sending to host…');
  };

  const sendVisitor = () => {
    openWA(visitor.mob, fillTemplate(settings.visitorTmpl || '🙏 Welcome to SHIVOFFSET! Hi {visitor_name}, aap check-in ho chuke hain on {date} {time}. Host {host_name} ko notify kar diya gaya hai.', visitor));
    showToast('📲 Sending to visitor…');
  };

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

  return (
    <>
      <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal">
          <h3>📱 WhatsApp Notifications</h3>
          <p>The following messages have been triggered</p>
          <div className="wa-chat-window">
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
                <button className="wa-btn" onClick={sendHost}>📲 Send to Host</button>
                {canApprove && <button className="wa-btn green" onClick={handleApprove}>✓ Approve</button>}
                {canApprove && <button className="wa-btn red" onClick={handleReject}>✗ Reject</button>}
              </div>
            </div>
            <div className="wa-msg user">
              <div className="wa-hd">📨 To Visitor: <span>{visitor.name}</span></div>
              🙏 <b>Welcome to SHIVOFFSET (I) PVT. LTD.</b><br /><br />
              Hi <b>{visitor.name.split(' ')[0]}</b> 👋,<br /><br />
              Aap check-in ho chuke hain on <b>{visitor.date} {visitor.inT}</b>.<br />
              Aapke host <b>{visitor.host}</b> ko notify kar diya gaya hai.
              <div className="wa-actions">
                <button className="wa-btn" onClick={sendVisitor}>📲 Send to Visitor</button>
                <button className="wa-btn" onClick={() => setBadgeOpen(true)}>🎫 View e-Badge</button>
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            <button className="btn btn-success" onClick={() => { sendVisitor(); setTimeout(sendHost, 700); }}>📲 Send Both</button>
            <button className="btn btn-primary" onClick={() => setBadgeOpen(true)}>View e-Badge</button>
          </div>
        </div>
      </div>
      {badgeOpen && <BadgeModal visitor={visitor} onClose={() => setBadgeOpen(false)} />}
    </>
  );
}
