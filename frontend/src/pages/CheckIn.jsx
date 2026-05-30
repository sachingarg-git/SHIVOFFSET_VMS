import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { nowHM, todayStr, initials } from '../utils/helpers';
import WAModal from '../components/modals/WAModal';
import CameraModal from '../components/modals/CameraModal';

export default function CheckIn() {
  const { hosts, options, blacklist, addVisitor, updateVisitor, visitors, showToast, confirmAction } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', mob: '', addr: '', count: 0, dept: '', purpose: '', remarks: '' });
  const [selectedHost, setSelectedHost] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [waVisitor, setWaVisitor] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    // Pre-fill dept from logged-in user's assigned department; fallback to first option
    const userDept = (JSON.parse(localStorage.getItem('vms_user') || '{}').dept || '').trim();
    if (options.dept.length && !form.dept) {
      const defaultDept = (userDept && options.dept.includes(userDept)) ? userDept : options.dept[0];
      setForm(f => ({ ...f, dept: defaultDept }));
    }
    if (options.purpose.length && !form.purpose) setForm(f => ({ ...f, purpose: options.purpose[0] }));
  }, [options]);

  // Support edit mode via navigation state (react-router v6 puts state in location.state)
  useEffect(() => {
    const editId = location.state?.editId;
    if (editId) {
      const v = visitors.find(x => x.id === editId);
      if (v) loadEdit(v);
      // Clear state so refreshing doesn't re-trigger edit
      window.history.replaceState({}, '');
    }
  }, [location.state, visitors]);

  const loadEdit = (v) => {
    setEditId(v.id);
    setForm({ name: v.name || '', mob: v.mob || '', addr: v.addr || '', count: v.count || 0, dept: v.dept || '', purpose: v.purpose || '', remarks: v.remarks || '' });
    setSelectedHost(v.host || null);
    setPhoto(v.photo || null);
  };

  const resetForm = () => {
    setEditId(null);
    const userDept = (JSON.parse(localStorage.getItem('vms_user') || '{}').dept || '').trim();
    const defaultDept = (userDept && options.dept.includes(userDept)) ? userDept : (options.dept[0] || '');
    setForm({ name: '', mob: '', addr: '', count: 0, dept: defaultDept, purpose: options.purpose[0] || '', remarks: '' });
    setSelectedHost(null);
    setPhoto(null);
    setErrors({});
  };

  const handleSubmit = async () => {
    const errs = {};
    if (!form.name.trim()) errs.name = true;
    if (!form.mob.trim()) errs.mob = true;
    if (!selectedHost) { showToast('⚠ Please select a host', true); return; }
    setErrors(errs);
    if (Object.keys(errs).length) { showToast('⚠ Fill required fields', true); return; }

    const blocked = blacklist.find(b => b.mob.replace(/\D/g, '') === form.mob.replace(/\D/g, ''));
    if (blocked && !editId) {
      confirmAction('⚠ Blacklisted Visitor', `This mobile is blacklisted: ${blocked.reason}. Proceed anyway?`, () => doSave(), 'Proceed', 'btn-danger');
      return;
    }
    doSave();
  };

  const doSave = async () => {
    const data = { ...form, host: selectedHost, photo, co: '—', desig: '—', idType: '', idNum: '', vehicle: '' };
    if (editId) {
      await updateVisitor(editId, data);
      showToast('✓ Visitor updated');
      navigate('/visitors');
      resetForm();
    } else {
      const newV = await addVisitor(data);
      if (newV) { setWaVisitor({ ...newV, ...data, inT: nowHM(), date: todayStr() }); resetForm(); }
    }
  };

  const handleUpload = (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { showToast('⚠ Max 5 MB', true); return; }
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 400;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = img.width * scale; cv.height = img.height * scale;
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        setPhoto(cv.toDataURL('image/jpeg', 0.75));
        showToast('✓ Photo uploaded');
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
    e.target.value = '';
  };

  // Filter hosts by selected department — if no dept selected show all
  const filteredHosts = form.dept
    ? hosts.filter(h => h.dept === form.dept)
    : hosts;

  const selectedHostObj = filteredHosts.find(h => h.name === selectedHost)
    || hosts.find(h => h.name === selectedHost); // fallback for edit mode

  return (
    <>
      <div className="split-2">
        <div className="card">
          <div className="card-hd">
            <div><h3>{editId ? `Edit Visitor #${editId}` : 'New Visitor Check-in'}</h3><p>Visitor ki details bharein</p></div>
            <span className="pill in">● Live</span>
          </div>
          <div className="form-grid">
            {/* Photo capture box */}
            <div className="photo-box">
              <div className="photo-preview">
                {photo ? <img src={photo} alt="" /> : <div className="avatar-big">📷</div>}
              </div>
              <div className="photo-actions">
                <b style={{ fontSize: 13 }}>Visitor Photo</b>
                <p>Camera se photo lein ya upload karein.</p>
                <div className="cam-controls">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setCameraOpen(true)}>📸 Photo Lein</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>⤴ Upload</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPhoto(null)}>✕ Clear</button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleUpload} />
              </div>
            </div>

            <div className="field field-full">
              <label>Pura Naam <span className="req">*</span></label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rahul Verma" className={errors.name ? 'err' : ''} />
            </div>
            <div className="field field-full">
              <label>Mobile Number <span className="req">*</span></label>
              <input value={form.mob} onChange={e => setForm(f => ({ ...f, mob: e.target.value }))} type="tel" inputMode="numeric" placeholder="98XXX XXXXX" className={errors.mob ? 'err' : ''} />
            </div>
            <div className="field field-full">
              <label>Address</label>
              <input value={form.addr} onChange={e => setForm(f => ({ ...f, addr: e.target.value }))} placeholder="Shehar / Area (optional)" />
            </div>
            <div className="field">
              <label>Purpose <span className="req">*</span></label>
              <select value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                {options.purpose.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Department</label>
              <select
                value={form.dept}
                onChange={e => {
                  const newDept = e.target.value;
                  setForm(f => ({ ...f, dept: newDept }));
                  // Clear host if it doesn't belong to the new department
                  if (selectedHost) {
                    const stillValid = hosts.find(h => h.name === selectedHost && h.dept === newDept);
                    if (!stillValid) setSelectedHost(null);
                  }
                }}
              >
                {options.dept.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Saath mein log</label>
              <input value={form.count} onChange={e => setForm(f => ({ ...f, count: parseInt(e.target.value) || 0 }))} type="number" inputMode="numeric" min="0" />
            </div>
            <div className="field field-full">
              <label>Remarks</label>
              <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Koi extra note... (optional)" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="step-head">
            <span className="step-badge">2</span>
            Kisse Milna Hai?
            <span className="sub">
              {form.dept
                ? `${filteredHosts.length} host${filteredHosts.length !== 1 ? 's' : ''} in ${form.dept}`
                : '* host chunein'}
            </span>
          </div>

          {/* Dept-filter hint */}
          {form.dept && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,106,0,0.07)', border: '1px solid rgba(255,106,0,0.2)', marginBottom: 12, fontSize: 12 }}>
              <span>🔍</span>
              <span style={{ color: 'var(--orange-2)', fontWeight: 700 }}>{form.dept}</span>
              <span style={{ color: 'var(--muted)' }}>department ke hosts dikh rahe hain</span>
              <button
                type="button"
                style={{ marginLeft: 'auto', border: 0, background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                onClick={() => setForm(f => ({ ...f, dept: '' }))}
              >
                ✕ Sab dikhao
              </button>
            </div>
          )}

          <div className="field" style={{ marginBottom: 14 }}>
            <label>Host Select Karein <span className="req">*</span></label>
            <select value={selectedHost || ''} onChange={e => setSelectedHost(e.target.value || null)}>
              <option value="">
                {filteredHosts.length === 0 && form.dept
                  ? `-- ${form.dept} mein koi host nahi --`
                  : '-- Host select karein --'}
              </option>
              {filteredHosts.map(h => (
                <option key={h.id} value={h.name}>
                  {h.name} — {h.role}{h.status === 'away' ? ' ⚠ Away' : ' ✓ Online'}
                </option>
              ))}
            </select>
          </div>
          {selectedHostObj && (
            <div className="host selected" style={{ cursor: 'default', marginBottom: 12 }}>
              <div className="row-avatar">{initials(selectedHostObj.name)}</div>
              <div className="host-info">
                <b>{selectedHostObj.name}</b>
                <small>{selectedHostObj.role} • {selectedHostObj.dept} • {selectedHostObj.mob}</small>
              </div>
              <span className={`host-status${selectedHostObj.status === 'away' ? ' away' : ''}`} title={selectedHostObj.status === 'away' ? 'Away' : 'Online'} />
            </div>
          )}
          {!selectedHostObj && filteredHosts.length === 0 && form.dept && (
            <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              <b style={{ display: 'block', marginBottom: 4, color: 'var(--red)' }}>⚠ Koi host nahi mila</b>
              {form.dept} department mein koi registered host nahi hai.<br />
              <span style={{ color: 'var(--muted)' }}>"Sab dikhao" se doosre dept ke hosts choose karein.</span>
            </div>
          )}
          <div className="checkin-actions">
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={resetForm}>Reset</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit}>
              {editId ? '✓ Update Visitor' : '✓ Submit & Notify Host'}
            </button>
          </div>
        </div>
      </div>

      <CameraModal open={cameraOpen} onClose={() => setCameraOpen(false)} onPhoto={dataUrl => { setPhoto(dataUrl); setCameraOpen(false); showToast('✓ Photo captured'); }} />
      {waVisitor && <WAModal visitor={waVisitor} hosts={hosts} onClose={() => { setWaVisitor(null); navigate('/visitors'); }} />}
    </>
  );
}
