import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { todayStr } from '../../utils/helpers';

export default function ScheduledModal({ open, entry, hosts, options, onClose }) {
  const { addScheduled, updateScheduled, showToast } = useApp();
  const [form, setForm] = useState({ name: '', mob: '', co: '', host: '', purpose: '', date: todayStr(), time: '', st: 'approved' });

  useEffect(() => {
    if (open) {
      if (entry) setForm({ name: entry.name || '', mob: entry.mob || '', co: entry.co || '', host: entry.host || '', purpose: entry.purpose || '', date: entry.date || todayStr(), time: entry.time || '', st: entry.st || 'approved' });
      else setForm({ name: '', mob: '', co: '', host: hosts[0]?.name || '', purpose: options.purpose[0] || '', date: todayStr(), time: '', st: 'approved' });
    }
  }, [open, entry, hosts, options]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mob.trim() || !form.date) { showToast('⚠ Fill required fields', true); return; }
    if (entry) { await updateScheduled(entry.id, form); showToast('✓ Schedule updated'); }
    else { await addScheduled(form); showToast('✓ Visit scheduled'); }
    onClose();
  };

  if (!open) return null;
  return (
    <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>{entry ? 'Edit Scheduled Visit' : 'Schedule Visit'}</h3>
        <p>Pre-approve a visitor expected to arrive</p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field"><label>Visitor Name <span className="req">*</span></label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="field"><label>Mobile <span className="req">*</span></label><input value={form.mob} onChange={e => setForm(f => ({ ...f, mob: e.target.value }))} /></div>
            <div className="field"><label>Company</label><input value={form.co} onChange={e => setForm(f => ({ ...f, co: e.target.value }))} /></div>
            <div className="field"><label>Host <span className="req">*</span></label><select value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))}>{hosts.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}</select></div>
            <div className="field"><label>Purpose</label><select value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>{(options.purpose || []).map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="field"><label>Date <span className="req">*</span></label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="field"><label>Time</label><input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
            <div className="field"><label>Status</label><select value={form.st} onChange={e => setForm(f => ({ ...f, st: e.target.value }))}><option value="approved">Approved</option><option value="pending">Awaiting</option></select></div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">✓ Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
