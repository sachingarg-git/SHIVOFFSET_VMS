import { useState, useEffect } from 'react';

export default function ShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener('showShortcuts', handler);
    return () => document.removeEventListener('showShortcuts', handler);
  }, []);

  if (!open) return null;
  return (
    <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="modal narrow">
        <h3>⌨ Keyboard Shortcuts</h3>
        <p>Speed up your workflow</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          {[['New Check-in', 'Ctrl + N'], ['Dashboard', 'Ctrl + 1'], ['Visitors', 'Ctrl + 2'], ['Reports', 'Ctrl + 3'], ['Search', 'Ctrl + K'], ['Close modal', 'Esc'], ['Show shortcuts', '?']].map(([label, key]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
              <span>{label}</span>
              <b>{key.split(' + ').map((k, i) => <span key={i}>{i > 0 && ' + '}<kbd>{k}</kbd></span>)}</b>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={() => setOpen(false)}>Got it</button>
        </div>
      </div>
    </div>
  );
}
