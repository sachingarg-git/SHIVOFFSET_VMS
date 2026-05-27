import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function HostModal({ open, host, options, onClose }) {
  const { addHost, updateHost, showToast } = useApp();
  const [form, setForm] = useState({ name: '', role: '', dept: '', mob: '', email: '', st: 'online' });

  useEffect(() => {
    if (open) {
      if (host) setForm({ name: host.name || '', role: host.role || '', dept: host.dept || '', mob: host.mob || '', email: host.email || '', st: host.st || 'online' });
      else setForm({ name: '', role: '', dept: options.dept[0] || 'Management', mob: '', email: '', st: 'online' });
    }
  }, [open, host, options]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim() || !form.mob.trim()) { showToast('⚠ Fill required fields', true); return; }
    if (host) { await updateHost(host.id, form); showToast('✓ Host updated'); }
    else { await addHost(form); showToast('✓ Host added'); }
    onClose();
  };

  if (!open) return null;
  return (
    <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>{host ? 'Edit Host' : 'Add Host'}</h3>
        <p>Internal employee who can receive visitors</p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field"><label>Full Name <span className="req">*</span></label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="field"><label>Designation <span className="req">*</span></label><input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
            <div className="field"><label>Department <span className="req">*</span></label><select value={form.dept} onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}>{(options.dept || []).map(d => <option key={d}>{d}</option>)}</select></div>
            <div className="field"><label>Mobile <span className="req">*</span></label><input value={form.mob} onChange={e => setForm(f => ({ ...f, mob: e.target.value }))} /></div>
            <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="field"><label>Status</label><select value={form.st} onChange={e => setForm(f => ({ ...f, st: e.target.value }))}><option value="online">Online</option><option value="away">Away</option></select></div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">✓ Save Host</button>
          </div>
        </form>
      </div>
    </div>
  );
}
