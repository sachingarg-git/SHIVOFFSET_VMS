import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { initials, todayStr } from '../utils/helpers';
import HostModal from '../components/modals/HostModal';

export default function Hosts() {
  const { hosts, visitors, options, updateHost, deleteHost, showToast, confirmAction } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editHost, setEditHost] = useState(null);

  const today = todayStr();

  const toggleStatus = (h) => {
    const newSt = h.st === 'online' ? 'away' : 'online';
    updateHost(h.id, { ...h, st: newSt });
    showToast(`✓ ${h.name} marked ${newSt === 'online' ? 'Online' : 'Away'}`);
  };

  const handleDelete = (h) => {
    const used = visitors.filter(v => v.host === h.name).length;
    confirmAction(`Delete ${h.name}?`, used ? `This host has ${used} visitor record(s). Records will keep their host name. Continue?` : 'Permanently delete this host?', () => {
      deleteHost(h.id); showToast('✓ Host deleted');
    });
  };

  return (
    <>
      <div className="card">
        <div className="card-hd">
          <div><h3>Host Directory</h3><p>Internal employees who can receive visitors</p></div>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditHost(null); setModalOpen(true); }}>＋ Add Host</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Designation</th><th>Department</th><th>Mobile</th><th>Status</th><th>Today</th><th>Actions</th></tr></thead>
            <tbody>
              {!hosts.length ? (
                <tr><td colSpan={7}><div className="empty"><b>No hosts</b>Add your first host</div></td></tr>
              ) : hosts.map(h => {
                const todayCount = visitors.filter(v => v.host === h.name && v.date === today).length;
                return (
                  <tr key={h.id}>
                    <td><div className="cell-user">
                      <div className="row-avatar">{initials(h.name)}</div>
                      <div><b>{h.name}</b><small>{h.email || ''}</small></div>
                    </div></td>
                    <td>{h.role}</td><td>{h.dept}</td><td>{h.mob}</td>
                    <td>
                      <span style={{ cursor: 'pointer' }} onClick={() => toggleStatus(h)}>
                        {h.st === 'online' ? <span className="pill in">● Online</span> : <span className="pill pending">Away</span>}
                      </span>
                    </td>
                    <td><b>{todayCount}</b></td>
                    <td><div className="row-actions">
                      <button className="btn btn-ghost btn-xs" onClick={() => { setEditHost(h); setModalOpen(true); }}>✎ Edit</button>
                      <button className="btn btn-danger btn-xs" onClick={() => handleDelete(h)}>🗑</button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <HostModal open={modalOpen} host={editHost} options={options} onClose={() => { setModalOpen(false); setEditHost(null); }} />
    </>
  );
}
