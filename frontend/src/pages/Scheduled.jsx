import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { initials, nowHM, todayStr } from '../utils/helpers';
import PillStatus from '../components/PillStatus';
import ScheduledModal from '../components/modals/ScheduledModal';

export default function Scheduled() {
  const { scheduled, hosts, options, addVisitor, deleteScheduled, showToast, confirmAction } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);

  const sorted = [...scheduled].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

  const markArrived = (s) => {
    confirmAction(`Check in ${s.name}?`, 'This will create a live visitor entry and notify the host.', async () => {
      const hostRec = hosts.find(h => h.name === s.host);
      await addVisitor({
        name: s.name, mob: s.mob, addr: '—', co: s.co || '—', desig: '—',
        idType: '', idNum: '', vehicle: '', count: 0,
        dept: hostRec?.dept || 'Operations',
        purpose: s.purpose, remarks: `Pre-scheduled visit (from schedule #${s.id})`,
        host: s.host, photo: null,
      });
      await deleteScheduled(s.id);
      showToast('✓ Auto check-in created from schedule');
    });
  };

  const handleDelete = (s) => {
    confirmAction(`Cancel visit for ${s.name}?`, 'This will remove the scheduled entry.', () => {
      deleteScheduled(s.id); showToast('✓ Visit cancelled');
    });
  };

  return (
    <>
      <div className="card">
        <div className="card-hd">
          <div><h3>Pre-Scheduled Visitors</h3><p>Visits scheduled in advance — auto-approved on arrival</p></div>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditEntry(null); setModalOpen(true); }}>＋ Schedule Visit</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Visitor</th><th>Mobile</th><th>Company</th><th>Host</th><th>Purpose</th><th>Scheduled</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {!sorted.length ? (
                <tr><td colSpan={8}><div className="empty"><b>No scheduled visits</b>Click "+ Schedule Visit" to add one</div></td></tr>
              ) : sorted.map(s => (
                <tr key={s.id}>
                  <td><div className="cell-user">
                    <div className="row-avatar">{initials(s.name)}</div>
                    <div><b>{s.name}</b><small>{s.co || ''}</small></div>
                  </div></td>
                  <td>{s.mob}</td><td>{s.co || '—'}</td><td>{s.host}</td><td>{s.purpose}</td>
                  <td>{s.date} {s.time || ''}</td>
                  <td><PillStatus st={s.st} /></td>
                  <td><div className="row-actions">
                    <button className="btn btn-success btn-xs" onClick={() => markArrived(s)}>✓ Arrived</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => { setEditEntry(s); setModalOpen(true); }}>✎</button>
                    <button className="btn btn-danger btn-xs" onClick={() => handleDelete(s)}>🗑</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ScheduledModal open={modalOpen} entry={editEntry} hosts={hosts} options={options} onClose={() => { setModalOpen(false); setEditEntry(null); }} />
    </>
  );
}
