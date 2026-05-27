import { useMemo, useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { useApp } from '../context/AppContext';
import { durMinutes, fmtDur, initials, liveDur } from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const gridCol = 'rgba(255,255,255,0.05)';

export default function Reports() {
  const { visitors, exportCSV, showToast } = useApp();

  const done = useMemo(() => visitors.filter(v => v.st === 'out'), [visitors]);
  const avg = useMemo(() => done.length ? Math.round(done.reduce((s, v) => s + durMinutes(v), 0) / done.length) : 0, [done]);

  const hostMap = useMemo(() => { const m = {}; visitors.forEach(v => { m[v.host] = (m[v.host] || 0) + 1; }); return m; }, [visitors]);
  const purposeMap = useMemo(() => { const m = {}; visitors.forEach(v => { m[v.purpose] = (m[v.purpose] || 0) + 1; }); return m; }, [visitors]);
  const topHost = Object.entries(hostMap).sort((a, b) => b[1] - a[1])[0] || ['—', 0];
  const topPurpose = Object.entries(purposeMap).sort((a, b) => b[1] - a[1])[0] || ['—', 0];

  const weekData = useMemo(() => {
    const vals = new Array(7).fill(0);
    visitors.forEach(v => { const d = new Date(v.date || v.createdAt); let wd = d.getDay(); wd = wd === 0 ? 6 : wd - 1; vals[wd]++; });
    return vals;
  }, [visitors]);

  const deptData = useMemo(() => {
    const m = {};
    visitors.forEach(v => { if (v.st === 'out') { const d = v.dept || 'Other'; if (!m[d]) m[d] = { s: 0, c: 0 }; m[d].s += durMinutes(v); m[d].c++; } });
    return { labels: Object.keys(m), values: Object.values(m).map(x => Math.round(x.s / x.c)) };
  }, [visitors]);

  const pColors = ['#ff6a00', '#ffb347', '#22c55e', '#facc15', '#3b82f6', '#a855f7', '#ef4444'];
  const topHosts = Object.entries(hostMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const sorted = [...visitors].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi"><div className="kico">📈</div><div className="klabel">Total Visitors</div><div className="kval">{visitors.length}</div><div className="kdelta">All time</div></div>
        <div className="kpi"><div className="kico">⏱</div><div className="klabel">Avg. Duration</div><div className="kval">{avg}<span style={{ fontSize: 14, color: 'var(--muted)' }}> min</span></div><div className="kdelta">Computed live</div></div>
        <div className="kpi"><div className="kico">🏆</div><div className="klabel">Top Host</div><div className="kval" style={{ fontSize: 16 }}>{topHost[0]}</div><div className="kdelta">{topHost[1]} visitor{topHost[1] !== 1 ? 's' : ''}</div></div>
        <div className="kpi"><div className="kico">📅</div><div className="klabel">Most Common Purpose</div><div className="kval" style={{ fontSize: 16 }}>{topPurpose[0]}</div><div className="kdelta">{topPurpose[1]} visit{topPurpose[1] !== 1 ? 's' : ''}</div></div>
      </div>

      <div className="split-2-equal">
        <div className="card"><div className="card-hd"><div><h3>Weekly Trend</h3><p>Visitors per day — last 7 days</p></div></div>
          <div className="chart-box"><Bar data={{ labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], datasets: [{ label: 'Visitors', data: weekData, backgroundColor: '#ff6a00', borderRadius: 8, maxBarThickness: 36 }] }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: gridCol }, beginAtZero: true, ticks: { precision: 0 } } } }} /></div>
        </div>
        <div className="card"><div className="card-hd"><div><h3>Time Spent by Department</h3><p>Avg min per visit</p></div></div>
          <div className="chart-box"><Bar data={{ labels: deptData.labels.length ? deptData.labels : ['No data'], datasets: [{ label: 'Avg min', data: deptData.values.length ? deptData.values : [0], backgroundColor: pColors, borderRadius: 8, maxBarThickness: 42 }] }} options={{ maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridCol }, beginAtZero: true }, y: { grid: { display: false } } } }} /></div>
        </div>
      </div>

      <div className="split-2-equal">
        <div className="card"><div className="card-hd"><div><h3>Top Hosts</h3><p>By visitor count</p></div></div>
          <div className="chart-box"><Bar data={{ labels: topHosts.map(x => x[0]) || ['—'], datasets: [{ label: 'Visitors', data: topHosts.map(x => x[1]), backgroundColor: '#ffb347', borderRadius: 8, maxBarThickness: 36 }] }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: gridCol }, beginAtZero: true, ticks: { precision: 0 } } } }} /></div>
        </div>
        <div className="card"><div className="card-hd"><div><h3>Purpose Breakdown</h3><p>All visits</p></div></div>
          <div className="chart-box"><Doughnut data={{ labels: Object.keys(purposeMap).length ? Object.keys(purposeMap) : ['No data'], datasets: [{ data: Object.values(purposeMap).length ? Object.values(purposeMap) : [1], backgroundColor: pColors, borderColor: '#0d0d14', borderWidth: 3 }] }} options={{ maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { padding: 14, boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 }, color: '#8a8a96' } } } }} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <div><h3>Daily Visitor Report</h3><p>Auto-generated • Total: {sorted.length}</p></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⤓ CSV</button>
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨 Print</button>
            <button className="btn btn-primary btn-sm" onClick={() => showToast('📧 Report queued for email to admin')}>📧 Email Admin</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Visitor</th><th>Mobile</th><th>Host</th><th>Purpose</th><th>In</th><th>Out</th><th>Duration</th></tr></thead>
            <tbody>
              {!sorted.length ? (
                <tr><td colSpan={8}><div className="empty">No visitor data yet</div></td></tr>
              ) : sorted.map((v, i) => (
                <tr key={v.id}>
                  <td>{i + 1}</td>
                  <td><div className="cell-user">
                    <div className="row-avatar">{v.photo ? <img src={v.photo} alt="" /> : initials(v.name)}</div>
                    <div><b>{v.name}</b><small>{v.co}</small></div>
                  </div></td>
                  <td>{v.mob}</td><td>{v.host}</td><td>{v.purpose}</td>
                  <td>{v.inT}</td><td>{v.outT || '—'}</td>
                  <td><b style={{ color: 'var(--orange-2)' }}>{liveDur(v)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
