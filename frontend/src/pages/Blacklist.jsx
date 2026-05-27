import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { initials } from '../utils/helpers';
import BlacklistModal from '../components/modals/BlacklistModal';

export default function Blacklist() {
  const { blacklist, deleteBlacklist, showToast, confirmAction } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);

  const handleDelete = (b) => {
    confirmAction(`Remove ${b.name} from blacklist?`, 'They will be allowed to check-in again.', () => {
      deleteBlacklist(b.id); showToast('✓ Removed from blacklist');
    });
  };

  return (
    <>
      <div className="card">
        <div className="card-hd">
          <div><h3>Blacklisted / Banned Visitors</h3><p>These visitors trigger an alert on check-in attempt</p></div>
          <button className="btn btn-danger btn-sm" onClick={() => { setEditEntry(null); setModalOpen(true); }}>＋ Add to Blacklist</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Mobile</th><th>Reason</th><th>Added By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {!blacklist.length ? (
                <tr><td colSpan={7}><div className="empty"><b>No blacklisted visitors</b>Stay safe — add an entry if needed</div></td></tr>
              ) : blacklist.map(b => (
                <tr key={b.id}>
                  <td><div className="cell-user">
                    <div className="row-avatar" style={{ background: 'linear-gradient(135deg,#ef4444,#991b1b)' }}>{initials(b.name)}</div>
                    <div><b>{b.name}</b><small>{b.sub || ''}</small></div>
                  </div></td>
                  <td>{b.mob}</td><td>{b.reason}</td><td>{b.by}</td><td>{b.date}</td>
                  <td><span className="pill banned">Banned</span></td>
                  <td><div className="row-actions">
                    <button className="btn btn-ghost btn-xs" onClick={() => { setEditEntry(b); setModalOpen(true); }}>✎ Edit</button>
                    <button className="btn btn-danger btn-xs" onClick={() => handleDelete(b)}>🗑 Remove</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <BlacklistModal open={modalOpen} entry={editEntry} onClose={() => { setModalOpen(false); setEditEntry(null); }} />
    </>
  );
}
