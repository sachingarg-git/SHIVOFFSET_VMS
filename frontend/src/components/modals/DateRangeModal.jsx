import { useState } from 'react';
import { todayStr } from '../../utils/helpers';

export default function DateRangeModal({ open, onClose, onApply }) {
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());

  const apply = () => {
    if (!from || !to) { alert('Pick both dates'); return; }
    if (from > to) { alert("'From' must be before 'To'"); return; }
    onApply(from, to);
  };

  if (!open) return null;
  return (
    <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal narrow">
        <h3>📅 Custom Date Range</h3>
        <p>Filter visitors by check-in date</p>
        <div className="form-grid">
          <div className="field"><label>From <span className="req">*</span></label><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div className="field"><label>To <span className="req">*</span></label><input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={apply}>✓ Apply</button>
        </div>
      </div>
    </div>
  );
}
