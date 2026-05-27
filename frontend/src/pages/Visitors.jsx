import { useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { liveDur, initials, todayStr } from '../utils/helpers';
import PillStatus from '../components/PillStatus';
import BadgeModal from '../components/modals/BadgeModal';
import ViewVisitorModal from '../components/modals/ViewVisitorModal';
import DateRangeModal from '../components/modals/DateRangeModal';

export default function Visitors() {
  const { visitors, checkOut, approveVisitor, deleteVisitor, updateVisitor, showToast, confirmAction, exportCSV } = useApp();
  const navigate = useNavigate();
  const ctx = useOutletContext() || {};
  const search = ctx.search || '';

  const user = JSON.parse(localStorage.getItem('vms_user') || '{}');
  const canApprove = ['admin', 'manager'].includes(user.role);
  const isAdmin = user.role === 'admin';

  // Admin sees "Today" by default (large dataset — date filter is useful).
  // Guard/Host sees "All Time" by default — server already scopes their data,
  // so they should see all their history without extra clicking.
  const [filter, setFilter] = useState('all');
  const [dateMode, setDateMode] = useState(isAdmin ? 'today' : 'all');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [badgeVisitor, setBadgeVisitor] = useState(null);
  const [viewVisitor, setViewVisitor] = useState(null);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  const filterByDate = (arr) => {
    if (dateMode === 'all') return arr;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return arr.filter(v => {
      if (!v.date) return false;
      const d = new Date(v.date); d.setHours(0, 0, 0, 0);
      if (dateMode === 'today') return d.getTime() === today.getTime();
      if (dateMode === 'week') { const w = new Date(today); w.setDate(today.getDate() - 6); return d >= w && d <= today; }
      if (dateMode === 'month') { const m = new Date(today); m.setDate(today.getDate() - 29); return d >= m && d <= today; }
      if (dateMode === 'custom' && customRange.from && customRange.to) {
        const f = new Date(customRange.from); f.setHours(0, 0, 0, 0);
        const t = new Date(customRange.to); t.setHours(0, 0, 0, 0);
        return d >= f && d <= t;
      }
      return true;
    });
  };

  const filtered = useMemo(() => {
    let arr = visitors.filter(v => filter === 'all' || v.st === filter);
    arr = filterByDate(arr);
    if (search) arr = arr.filter(v => JSON.stringify(v).toLowerCase().includes(search.toLowerCase()));
    return arr.sort((a, b) => b.createdAt - a.createdAt);
  }, [visitors, filter, dateMode, customRange, search]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = (e) => {
    if (e.target.checked) setSelectedIds(new Set(filtered.map(v => v.id)));
    else setSelectedIds(new Set());
  };

  const bulkDelete = () => {
    if (!selectedIds.size) return;
    confirmAction(`Delete ${selectedIds.size} record(s)?`, 'This permanently removes selected records.', async () => {
      for (const id of selectedIds) await deleteVisitor(id);
      setSelectedIds(new Set());
      showToast(`✓ ${selectedIds.size} deleted`);
    });
  };

  const bulkCheckOut = () => {
    if (!selectedIds.size) return;
    const toOut = filtered.filter(v => selectedIds.has(v.id) && v.st !== 'out');
    if (!toOut.length) { showToast('None need check-out'); return; }
    confirmAction(
      `Check out ${toOut.length} visitor(s)?`, 'Exit time will be set to now.',
      async () => { for (const v of toOut) await checkOut(v.id); setSelectedIds(new Set()); showToast(`✓ ${toOut.length} checked out`); },
      '↗ Yes, Check Out', 'btn-success'
    );
  };

  const handleCheckOut = (id, name) => {
    confirmAction(
      `Check out ${name}?`, 'Exit time will be recorded.',
      () => { checkOut(id); showToast('✓ Checked out'); },
      '↗ Yes, Check Out', 'btn-success'
    );
  };
  const handleDelete = (id, name) => {
    confirmAction(`Delete ${name}?`, 'This permanently removes the record.', () => { deleteVisitor(id); showToast('✓ Deleted'); });
  };

  const handleApprove = async (v) => {
    setApprovingId(v.id);
    await approveVisitor(v.id);
    setApprovingId(null);
  };

  const rangeLabel = { today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time', custom: customRange.from ? `${customRange.from} to ${customRange.to}` : 'Custom' }[dateMode];

  const pendingCount = visitors.filter(v => v.st === 'pending').length;

  return (
    <>
      {/* Role-scoped view hint */}
      {!isAdmin && (
        <div className="role-hint-bar">
          <span>🔒</span>
          <span>
            Showing visitors you checked in (active only) and all visitors who came to meet <b>{user.name || 'you'}</b> (full history).
            Admin sees everyone.
          </span>
        </div>
      )}

      <div className="chips">
        {[
          ['all', 'All'],
          ['in', 'Currently Inside'],
          ['out', 'Checked Out'],
          ['pending', `Pending Approval${pendingCount > 0 ? ` (${pendingCount})` : ''}`],
        ].map(([f, l]) => (
          <span key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{l}</span>
        ))}
        <span style={{ flex: 1 }} />
        {[['today', '📅 Today'], ['week', 'This Week'], ['month', 'This Month'], ['all', 'All Time']].map(([m, l]) => (
          <span key={m} className={`chip${dateMode === m ? ' active' : ''}`} onClick={() => setDateMode(m)}>{l}</span>
        ))}
        <span className={`chip${dateMode === 'custom' ? ' active' : ''}`} onClick={() => setDateRangeOpen(true)}>⚙ Custom</span>
      </div>

      <div className="card">
        <div className="card-hd">
          <div>
            <h3>All Visitors</h3>
            <p>Showing {filtered.length} of {visitors.length} entries • {rangeLabel}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⤓ Export CSV</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/checkin')}>＋ New</button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="bulk-bar">
            <span style={{ fontWeight: 700, fontSize: 13 }}>{selectedIds.size} selected</span>
            <span style={{ flex: 1 }} />
            <button className="btn btn-success btn-sm" onClick={bulkCheckOut}>↗ Check Out All</button>
            <button className="btn btn-danger btn-sm" onClick={bulkDelete}>🗑 Delete</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>✕ Clear</button>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" onChange={toggleAll}
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  style={{ cursor: 'pointer' }} />
              </th>
              <th>Visitor</th>
              <th>Mobile</th>
              <th>Company</th>
              <th>Host</th>
              <th>Purpose</th>
              <th>In</th>
              <th>Out</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={11}>
                    <div className="empty">
                      <b>No visitors</b>
                      {search ? 'Try a different search' : 'Click "+ New" to add one'}
                    </div>
                  </td>
                </tr>
              ) : filtered.map(v => (
                <tr key={v.id} className={selectedIds.has(v.id) ? 'selected' : ''}>
                  <td>
                    <input type="checkbox" className="row-check"
                      checked={selectedIds.has(v.id)} onChange={() => toggleSelect(v.id)} />
                  </td>
                  <td>
                    <div className="cell-user">
                      <div className="row-avatar">
                        {v.photo ? <img src={v.photo} alt="" /> : initials(v.name)}
                      </div>
                      <div>
                        <b>{v.name || <span style={{ color: 'var(--muted)', fontWeight: 400 }}>Unknown</span>}</b>
                        <small>{v.desig || '—'}</small>
                      </div>
                    </div>
                  </td>
                  <td>{v.mob || '—'}</td>
                  <td>{v.co || '—'}</td>
                  <td>{v.host || '—'}</td>
                  <td>{v.purpose || '—'}</td>
                  <td>{v.inT || '—'}</td>
                  <td>{v.outT || '—'}</td>
                  <td><b style={{ color: 'var(--orange-2)' }}>{liveDur(v)}</b></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <PillStatus st={v.st} />
                      {v.approvedBy && (
                        <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>
                          ✓ {v.approvedBy}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-xs" onClick={() => setViewVisitor(v)}>👁</button>
                      <button className="btn btn-ghost btn-xs" onClick={() => setBadgeVisitor(v)}>🎫</button>
                      <button className="btn btn-ghost btn-xs" onClick={() => navigate('/checkin', { state: { editId: v.id } })}>✎</button>

                      {/* Approve button — admin/manager only, on pending visitors */}
                      {canApprove && v.st === 'pending' && (
                        <button
                          className="btn btn-approve btn-xs"
                          onClick={() => handleApprove(v)}
                          disabled={approvingId === v.id}
                          title="Approve visitor"
                        >
                          {approvingId === v.id ? '…' : '✅'}
                        </button>
                      )}

                      {v.st !== 'out' && (
                        <button className="btn btn-success btn-xs" onClick={() => handleCheckOut(v.id, v.name)}>↗</button>
                      )}
                      <button className="btn btn-danger btn-xs" onClick={() => handleDelete(v.id, v.name)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {badgeVisitor && <BadgeModal visitor={badgeVisitor} onClose={() => setBadgeVisitor(null)} />}
      {viewVisitor && (
        <ViewVisitorModal
          visitor={viewVisitor}
          onClose={() => setViewVisitor(null)}
          onEdit={v => { navigate('/checkin', { state: { editId: v.id } }); setViewVisitor(null); }}
          onBadge={v => { setBadgeVisitor(v); setViewVisitor(null); }}
        />
      )}
      <DateRangeModal
        open={dateRangeOpen}
        onClose={() => setDateRangeOpen(false)}
        onApply={(from, to) => {
          setCustomRange({ from, to });
          setDateMode('custom');
          setDateRangeOpen(false);
          showToast(`✓ Filtered: ${from} to ${to}`);
        }}
      />
    </>
  );
}
