import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function OptionsModal({ type, options, title, onClose, onAdd, onDelete, showToast }) {
  const { confirmAction } = useApp();
  const [newVal, setNewVal] = useState('');

  const handleAdd = () => {
    const v = newVal.trim();
    if (!v) { showToast('⚠ Kuch type karein', true); return; }
    if (options.some(o => o.toLowerCase() === v.toLowerCase())) { showToast('⚠ Already exists', true); return; }
    onAdd(v);
    setNewVal('');
    showToast('✓ Added: ' + v);
  };

  const handleDelete = (val) => {
    if (options.length <= 1) { showToast('⚠ At least 1 option required', true); return; }
    confirmAction('Delete option?', `"${val}" ko remove karein?`, () => { onDelete(val); showToast('✓ Deleted: ' + val); });
  };

  return (
    <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal narrow">
        <h3>Manage: {title}</h3>
        <p>Add ya delete karo — list saari dropdowns mein update ho jayegi</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            placeholder="New option type karein..."
            style={{ flex: 1, padding: '11px 13px', borderRadius: 10, background: 'rgba(0,0,0,0.35)', border: '1px solid var(--stroke)', color: '#fff', fontFamily: 'inherit', fontSize: 13.5, outline: 'none' }}
          />
          <button className="btn btn-primary" onClick={handleAdd}>＋ Add</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflow: 'auto' }}>
          {!options.length ? <div className="empty"><b>No options yet</b>Add one above</div> : options.map((o, i) => (
            <div className="opt-row" key={i}>
              <span>{o}</span>
              <button onClick={() => handleDelete(o)} title="Delete">🗑</button>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>✓ Done</button>
        </div>
      </div>
    </div>
  );
}
