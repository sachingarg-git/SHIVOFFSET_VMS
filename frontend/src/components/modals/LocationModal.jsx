import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function LocationModal({ open, location, onClose }) {
  const { addLocation, updateLocation, showToast } = useApp();
  const [form, setForm] = useState({ name: '', addr: '', st: 'online', code: '' });

  useEffect(() => {
    if (open) {
      if (location) setForm({ name: location.name || '', addr: location.addr || '', st: location.st || 'online', code: location.code || '' });
      else setForm({ name: '', addr: '', st: 'online', code: '' });
    }
  }, [open, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('⚠ Name required', true); return; }
    const data = { ...form, code: form.code.toUpperCase() || form.name.slice(0, 2).toUpperCase() };
    if (location) { await updateLocation(location.id, data); showToast('✓ Location updated'); }
    else { await addLocation(data); showToast('✓ Location added'); }
    onClose();
  };

  if (!open) return null;
  return (
    <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal narrow">
        <h3>{location ? 'Edit Location' : 'Add Office Location'}</h3>
        <p>SHIVOFFSET check-in point</p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field field-full"><label>Location Name <span className="req">*</span></label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="field field-full"><label>Address</label><input value={form.addr} onChange={e => setForm(f => ({ ...f, addr: e.target.value }))} /></div>
            <div className="field"><label>Status</label><select value={form.st} onChange={e => setForm(f => ({ ...f, st: e.target.value }))}><option value="online">Active</option><option value="away">Limited</option></select></div>
            <div className="field"><label>Code</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="HQ" maxLength={4} /></div>
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
