import { useRef, useEffect, useState } from 'react';
import { initials, badgeId, formatDateNice } from '../../utils/helpers';

export default function BadgeModal({ visitor, onClose }) {
  const qrFrontRef = useRef();
  const qrBackRef = useRef();
  const [flipped, setFlipped] = useState(false);
  const [validity, setValidity] = useState({ text: '—', pct: 92 });

  const bid = badgeId(visitor);
  const dateNice = formatDateNice(visitor.date);

  // QR Code generation
  useEffect(() => {
    const qrData = JSON.stringify({ id: bid, name: visitor.name, mob: visitor.mob, host: visitor.host, time: visitor.inT, date: visitor.date });
    if (typeof window !== 'undefined') {
      import('qrcode').then(QRCode => {
        // Front: ep-qr-box is 92px outer with 6px padding → 80px usable
        if (qrFrontRef.current) QRCode.toCanvas(qrFrontRef.current, qrData, { width: 78, margin: 1, color: { dark: '#111', light: '#fff' } }).catch(() => {});
        // Back (print): ep-print-qr is 100px outer with 4px padding → 92px usable
        if (qrBackRef.current) QRCode.toCanvas(qrBackRef.current, qrData, { width: 90, margin: 1, color: { dark: '#000', light: '#ffffff' } }).catch(() => {});
      });
    }
  }, [visitor]);

  // Validity timer
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const eod = new Date(); eod.setHours(23, 59, 0, 0);
      const ms = eod - now;
      if (ms <= 0) { setValidity({ text: 'EXPIRED', pct: 0 }); return; }
      const rem = ms / 60000;
      const h = Math.floor(rem / 60), m = Math.floor(rem % 60);
      setValidity({ text: `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`, pct: Math.min(100, (rem / (24*60)) * 200) });
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  const downloadPNG = async () => {
    try {
      const { default: html2canvas } = await import('html2canvas');
      const target = document.getElementById(flipped ? 'badge-back-card' : 'badge-front-card');
      const canvas = await html2canvas(target, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
      const link = document.createElement('a');
      link.download = `shivoffset-badge-${visitor.name.replace(/[^a-z0-9]/gi,'_').toLowerCase()}-${flipped?'back':'front'}.png`;
      link.href = canvas.toDataURL('image/png'); link.click();
    } catch (e) { alert('Download failed: ' + e.message); }
  };

  const shareBadge = async () => {
    if (!navigator.share) {
      navigator.clipboard?.writeText(`SHIVOFFSET Visitor Pass: ${bid}`).then(() => alert('Badge ID copied!'));
      return;
    }
    try {
      const { default: html2canvas } = await import('html2canvas');
      const target = document.getElementById(flipped ? 'badge-back-card' : 'badge-front-card');
      const canvas = await html2canvas(target, { backgroundColor: null, scale: 2, useCORS: true });
      canvas.toBlob(async blob => {
        const file = new File([blob], 'shivoffset-badge.png', { type: 'image/png' });
        await navigator.share({ title: 'SHIVOFFSET Visitor Pass', files: [file] });
      });
    } catch {}
  };

  return (
    <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ background: 'transparent', border: 0, boxShadow: 'none', padding: 0, maxWidth: 420 }}>
        <div className="badge-toolbar">
          <button className={`bt-pill${!flipped ? ' active' : ''}`} onClick={() => setFlipped(false)}>◐ Front</button>
          <button className={`bt-pill${flipped ? ' active' : ''}`} onClick={() => setFlipped(true)}>◑ Back (Print)</button>
        </div>

        <div className="flip-scene">
          <div className={`flip-card${flipped ? ' flipped' : ''}`}>
            {/* FRONT */}
            <div className="flip-face flip-front">
              <div className="ebadge-pro" id="badge-front-card">
                <div className="lanyard-hole" />
                <div className="ep-header">
                  <div className="ep-logo">S</div>
                  <div className="ep-title"><small>VISITOR PASS</small><b>SHIVOFFSET (I)</b></div>
                  <div className="ep-corner"><div className="ep-corner-label">ID</div><div className="ep-corner-val">{bid}</div></div>
                </div>
                <div className="ep-photo-section">
                  <div className="ep-photo-wrap">
                    <div className="ep-photo">{visitor.photo ? <img src={visitor.photo} alt="" /> : initials(visitor.name)}</div>
                  </div>
                  <div className="ep-name">{visitor.name}</div>
                  <div className="ep-purpose">{visitor.purpose}</div>
                </div>
                <div className="ep-timer">
                  <div className="ep-timer-dot" />
                  <div><small>VALID FOR</small><b style={{ display: 'block', fontFamily: "'Space Grotesk',monospace", fontSize: 14, color: '#86efac', marginTop: 1 }}>{validity.text}</b></div>
                  <div className="ep-timer-bar"><div className="ep-timer-bar-fill" style={{ width: validity.pct + '%' }} /></div>
                </div>
                <div className="ep-qr-section">
                  <div className="ep-qr-box"><canvas ref={qrFrontRef} /></div>
                  <div className="ep-qr-meta">
                    <div className="ep-meta-row"><span>Host</span><b>{visitor.host}</b></div>
                    <div className="ep-meta-row"><span>Check-in</span><b>{visitor.inT}</b></div>
                    <div className="ep-meta-row"><span>Date</span><b>{dateNice}</b></div>
                    <div className="ep-meta-scan">📱 Scan at exit to check out</div>
                  </div>
                </div>
                <div className="ep-footer">
                  <span>shivoffset.com</span>
                  <span className="ep-footer-id">{bid}</span>
                  <span>+91 89000 60000</span>
                </div>
              </div>
            </div>

            {/* BACK */}
            <div className="flip-face flip-back">
              <div className="ebadge-print" id="badge-back-card">
                <div className="lanyard-hole light" />
                <div className="ep-print-header">
                  <div className="ep-print-logo">S</div>
                  <div><small>SHIVOFFSET (I) PVT. LTD.</small><b style={{ display: 'block', fontSize: 14, fontWeight: 900, color: '#1a1a1f', marginTop: 2 }}>VISITOR PASS</b></div>
                  <div className="ep-print-id">{bid}</div>
                </div>
                <div className="ep-print-body">
                  <div className="ep-print-photo">{visitor.photo ? <img src={visitor.photo} alt="" /> : initials(visitor.name)}</div>
                  <div className="ep-print-info">
                    <div className="ep-print-name">{visitor.name}</div>
                    <div className="ep-print-purpose">{visitor.purpose}</div>
                    <div className="ep-print-grid">
                      <div><label>HOST</label><span>{visitor.host}</span></div>
                      <div><label>DEPT</label><span>{visitor.dept || '—'}</span></div>
                      <div><label>IN</label><span>{visitor.inT}</span></div>
                      <div><label>DATE</label><span>{dateNice}</span></div>
                      <div><label>VALID</label><span>Till 23:59</span></div>
                      <div><label>LOC</label><span>Haridwar HQ</span></div>
                    </div>
                  </div>
                </div>
                <div className="ep-print-qr-section">
                  <div className="ep-print-qr"><canvas ref={qrBackRef} /></div>
                  <div className="ep-print-rules">
                    <b>VISITOR RULES</b>
                    <ol>
                      <li>Wear this badge visibly at all times.</li>
                      <li>Return at exit; scan QR to check out.</li>
                      <li>Photography requires prior permission.</li>
                      <li>Stay accompanied by your host inside.</li>
                      <li>Report loss of badge to security immediately.</li>
                    </ol>
                  </div>
                </div>
                <div className="ep-print-signatures">
                  <div><div className="sig-line" /><small>Visitor Signature</small></div>
                  <div><div className="sig-line" /><small>Security / Guard</small></div>
                </div>
                <div className="ep-print-footer">
                  <span>SHIVOFFSET (I) PVT. LTD. • Haridwar</span>
                  <span>shivoffset.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="badge-actions">
          <button className="badge-act" onClick={downloadPNG}><span className="ba-ico">⬇</span><span>Download PNG</span></button>
          <button className="badge-act" onClick={() => window.print()}><span className="ba-ico">🖨</span><span>Print</span></button>
          <button className="badge-act" onClick={shareBadge}><span className="ba-ico">⤴</span><span>Share</span></button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
