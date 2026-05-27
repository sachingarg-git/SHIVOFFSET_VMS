import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { useApp } from '../context/AppContext';
import { liveDur, durMinutes, fmtDur, initials } from '../utils/helpers';
import PillStatus from '../components/PillStatus';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const gridCol = 'rgba(255,255,255,0.05)';
const chartDefaults = { maintainAspectRatio: false, plugins: { legend: { display: false } } };

export default function Dashboard() {
  const { visitors, showToast, confirmAction, checkOut, approveVisitor } = useApp();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('vms_user') || '{}');
  const canApprove = ['admin', 'manager'].includes(user.role);

  const live = useMemo(() => visitors.filter(v => v.st === 'in' || v.st === 'pending'), [visitors]);
  const inside = useMemo(() => visitors.filter(v => v.st === 'in').length, [visitors]);
  const pending = useMemo(() => visitors.filter(v => v.st === 'pending').length, [visitors]);
  const done = useMemo(() => visitors.filter(v => v.st === 'out'), [visitors]);
  const avg = useMemo(() => done.length ? Math.round(done.reduce((s, v) => s + durMinutes(v), 0) / done.length) : 0, [done]);

  const hourlyData = useMemo(() => {
    const h = new Array(12).fill(0);
    visitors.forEach(v => { const hr = parseInt((v.inT || '00:00').split(':')[0]); const idx = hr - 8; if (idx >= 0 && idx < 12) h[idx]++; });
    return h;
  }, [visitors]);

  const purposeData = useMemo(() => {
    const map = {};
    visitors.forEach(v => { map[v.purpose] = (map[v.purpose] || 0) + 1; });
    return { labels: Object.keys(map), values: Object.values(map) };
  }, [visitors]);

  const hourlyChart = {
    labels: ['8AM', '9', '10', '11', '12', '1PM', '2', '3', '4', '5', '6', '7'],
    datasets: [{
      label: 'Check-ins', data: hourlyData, borderColor: '#ff6a00',
      backgroundColor: 'rgba(255,106,0,0.15)', fill: true, tension: 0.4,
      borderWidth: 2.5, pointBackgroundColor: '#ff6a00', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4
    }]
  };

  const purposeChart = {
    labels: purposeData.labels.length ? purposeData.labels : ['No data'],
    datasets: [{ data: purposeData.values.length ? purposeData.values : [1], backgroundColor: ['#ff6a00', '#ffb347', '#22c55e', '#facc15', '#3b82f6', '#a855f7', '#ef4444'], borderColor: '#0d0d14', borderWidth: 3 }]
  };

  const handleCheckOut = (id, name) => {
    confirmAction(`Check out ${name}?`, 'Exit time will be recorded.', () => {
      checkOut(id);
      showToast('✓ Checked out');
    }, '↗ Yes, Check Out', 'btn-success');
  };

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi"><div className="kico">👥</div><div className="klabel">Total Visitors</div><div className="kval">{visitors.length}</div><div className="kdelta">▲ All time</div></div>
        <div className="kpi"><div className="kico">⏱</div><div className="klabel">Avg. Time Spent</div><div className="kval">{avg}<span style={{ fontSize: 14, color: 'var(--muted)' }}> min</span></div><div className="kdelta">Computed live</div></div>
        <div className="kpi"><div className="kico">◉</div><div className="klabel">Currently Inside</div><div className="kval">{inside}</div><div className="kdelta">Live</div></div>
        <div className="kpi"><div className="kico">⏳</div><div className="klabel">Pending Approvals</div><div className="kval">{pending}</div><div className="kdelta">Awaiting host</div></div>
      </div>

      <div className="split-2">
        <div className="card">
          <div className="card-hd"><div><h3>Hourly Visitor Flow</h3><p>Today's check-ins by hour</p></div></div>
          <div className="chart-box"><Line data={hourlyChart} options={{ ...chartDefaults, scales: { x: { grid: { color: gridCol } }, y: { grid: { color: gridCol }, beginAtZero: true, ticks: { precision: 0 } } } }} /></div>
        </div>
        <div className="card">
          <div className="card-hd"><div><h3>Visit Purpose</h3><p>Distribution today</p></div></div>
          <div className="chart-box"><Doughnut data={purposeChart} options={{ ...chartDefaults, cutout: '62%', plugins: { legend: { display: true, position: 'bottom', labels: { padding: 14, boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 }, color: '#8a8a96' } } } }} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <div><h3>Live Visitors (Currently Inside)</h3><p>Real-time check-in status</p></div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/checkin')}>＋ New Check-in</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Visitor</th><th>Mobile</th><th>Purpose</th><th>Host</th><th>Check-in</th><th>Duration</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {!live.length ? (
                <tr><td colSpan={8}><div className="empty"><b>No active visitors</b>Check in someone to see them here</div></td></tr>
              ) : live.map(v => (
                <tr key={v.id}>
                  <td><div className="cell-user">
                    <div className="row-avatar">{v.photo ? <img src={v.photo} alt="" /> : initials(v.name)}</div>
                    <div><b>{v.name}</b><small>{v.co}</small></div>
                  </div></td>
                  <td>{v.mob}</td><td>{v.purpose}</td><td>{v.host}</td><td>{v.inT}</td>
                  <td><b style={{ color: 'var(--orange-2)' }}>{liveDur(v)}</b></td>
                  <td><PillStatus st={v.st} /></td>
                  <td><div className="row-actions">
                    {canApprove && v.st === 'pending' && <button className="btn btn-approve btn-xs" onClick={() => { approveVisitor(v.id); }}>✅ Approve</button>}
                    <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/visitors`)}>🎫</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => handleCheckOut(v.id, v.name)}>↗ Out</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
