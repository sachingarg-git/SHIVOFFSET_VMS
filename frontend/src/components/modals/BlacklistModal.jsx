import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { todayStr } from '../../utils/helpers';

export default function BlacklistModal({ open, entry, onClose }) {
  const { addBlacklist, updateBlacklist, showToast } = useApp();
  const [form, setForm] = useState({ name: '', mob: '', reason: '', by: 'Manpreet Bedi', sub: '' });

  useEffect(() => {
    if (open) {
      if (entry) setForm({ name: entry.name || '', mob: entry.mob || '', reason: entry.reason || '', by: entry.by || 'Admin', sub: entry.sub || '' });
      else setForm({ name: '', mob: '', reason: '', by: 'Manpreet Bedi', sub: '' });
    }
  }, [open, entry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mob.trim() || !form.reason.trim()) { showToast('⚠ Fill required fields', true); return; }
    const data = { ...form, date: todayStr() };
    if (entry) { await updateBlacklist(entry.id, data); showToast('✓ Entry updated'); }
    else { await addBlacklist(data); showToast('✓ Added to blacklist'); }
    onClose();
  };

  if (!open) return null;
  return (
    <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>{entry ? 'Edit Blacklist Entry' : 'Add to Blacklist'}</h3>
        <p>Banned visitor — flagged on entry attempt</p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field"><label>Name <span className="req">*</span></label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="field"><label>Mobile <span className="req">*</span></label><input value={form.mob} onChange={e => setForm(f => ({ ...f, mob: e.target.value }))} /></div>
            <div className="field field-full"><label>Reason <span className="req">*</span></label><textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} /></div>
            <div className="field"><label>Added By</label><input value={form.by} onChange={e => setForm(f => ({ ...f, by: e.target.value }))} /></div>
            <div className="field"><label>Sub-label</label><input value={form.sub} onChange={e => setForm(f => ({ ...f, sub: e.target.value }))} placeholder="e.g. Ex-employee" /></div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger">✓ Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
