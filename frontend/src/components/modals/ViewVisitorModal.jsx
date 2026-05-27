import { initials, liveDur } from '../../utils/helpers';
import PillStatus from '../PillStatus';

export default function ViewVisitorModal({ visitor: v, onClose, onEdit, onBadge }) {
  if (!v) return null;
  return (
    <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal wide">
        <h3>Visitor Details</h3>
        <p>{v.co && v.co !== '—' ? v.co + ' • ' : ''}{v.purpose}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 18, alignItems: 'start' }}>
          <div style={{ textAlign: 'center' }}>
            {v.photo ? <img src={v.photo} style={{ width: 140, height: 140, borderRadius: 14, objectFit: 'cover', border: '1px solid var(--stroke-2)' }} alt="" /> : <div style={{ width: 140, height: 140, borderRadius: 14, background: 'linear-gradient(135deg,#ff6a00,#ff3d00)', display: 'grid', placeItems: 'center', fontSize: 42, fontWeight: 900 }}>{initials(v.name)}</div>}
            <div style={{ marginTop: 10 }}><PillStatus st={v.st} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
            {[['Name', v.name], ['Mobile', v.mob], ['Host', v.host], ['Purpose', v.purpose], ['Department', v.dept || '—'], ['Check-in', v.inT], ['Check-out', v.outT || '—'], ['Duration', liveDur(v)]].map(([l, val]) => (
              <div key={l}><div style={{ color: 'var(--muted)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div><b style={l === 'Duration' ? { color: 'var(--orange-2)' } : {}}>{val}</b></div>
            ))}
            {v.addr && <div style={{ gridColumn: '1/-1' }}><div style={{ color: 'var(--muted)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1 }}>Address</div><b>{v.addr}</b></div>}
            {v.remarks && <div style={{ gridColumn: '1/-1' }}><div style={{ color: 'var(--muted)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1 }}>Remarks</div><b>{v.remarks}</b></div>}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-ghost" onClick={() => onBadge(v)}>🎫 Badge</button>
          <button className="btn btn-primary" onClick={() => onEdit(v)}>✎ Edit</button>
        </div>
      </div>
    </div>
  );
}
