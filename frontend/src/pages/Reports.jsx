import { useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js';
import { useApp } from '../context/AppContext';
import { durMinutes, fmtDur, initials, liveDur } from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const gridCol = 'rgba(255,255,255,0.05)';

// Normalize host names for grouping — "manpreet bedi" and "Manpreet Bedi" → same bucket
function normalizeKey(str) {
  return (str || '').trim().toLowerCase();
}
function displayName(str) {
  return (str || '').trim().replace(/\b\w/g, c => c.toUpperCase());
}

const RANGES = [
  { label: 'Today',      key: 'today' },
  { label: 'This Week',  key: 'week'  },
  { label: 'This Month', key: 'month' },
  { label: 'All Time',   key: 'all'   },
];

function inRange(v, range) {
  const now   = new Date();
  // visitors store date as "YYYY-MM-DD" string or use createdAt (ms)
  const raw   = v.date || '';
  const parts = raw.split('-');
  const vDate = parts.length === 3
    ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    : new Date(v.createdAt);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mon   = new Date(today); mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const m1    = new Date(now.getFullYear(), now.getMonth(), 1);

  if (range === 'today') return vDate >= today;
  if (range === 'week')  return vDate >= mon;
  if (range === 'month') return vDate >= m1;
  return true; // 'all'
}

export default function Reports() {
  const { visitors, exportCSV, showToast } = useApp();
  const [range, setRange] = useState('month');

  // Filter visitors by date range
  const filtered = useMemo(() => visitors.filter(v => inRange(v, range)), [visitors, range]);
  const done     = useMemo(() => filtered.filter(v => v.st === 'out'), [filtered]);
  const avg      = useMemo(() => done.length
    ? Math.round(done.reduce((s, v) => s + durMinutes(v), 0) / done.length) : 0, [done]);

  // Case-insensitive host grouping
  const hostMap = useMemo(() => {
    const m = {};
    filtered.forEach(v => {
      const key = normalizeKey(v.host);
      if (!key) return;
      if (!m[key]) m[key] = { display: displayName(v.host), count: 0 };
      m[key].count++;
    });
    return m;
  }, [filtered]);

  const purposeMap = useMemo(() => {
    const m = {};
    filtered.forEach(v => {
      const key = (v.purpose || 'Other').trim();
      m[key] = (m[key] || 0) + 1;
    });
    return m;
  }, [filtered]);

  const topHostEntry = Object.values(hostMap).sort((a, b) => b.count - a.count)[0];
  const topHost    = topHostEntry ? [topHostEntry.display, topHostEntry.count] : ['—', 0];
  const topPurposeEntry = Object.entries(purposeMap).sort((a, b) => b[1] - a[1])[0];
  const topPurpose = topPurposeEntry || ['—', 0];

  // Weekly trend — visits by day of week (Mon–Sun)
  const weekData = useMemo(() => {
    const vals = new Array(7).fill(0);
    filtered.forEach(v => {
      const raw   = v.date || '';
      const parts = raw.split('-');
      const d = parts.length === 3
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        : new Date(v.createdAt);
      let wd = d.getDay(); wd = wd === 0 ? 6 : wd - 1;
      vals[wd]++;
    });
    return vals;
  }, [filtered]);

  // Dept avg duration (checked-out only)
  const deptData = useMemo(() => {
    const m = {};
    done.forEach(v => {
      const d = (v.dept || 'Other').trim();
      if (!m[d]) m[d] = { s: 0, c: 0 };
      m[d].s += durMinutes(v); m[d].c++;
    });
    return { labels: Object.keys(m), values: Object.values(m).map(x => Math.round(x.s / x.c)) };
  }, [done]);

  const pColors  = ['#ff6a00', '#ffb347', '#22c55e', '#facc15', '#3b82f6', '#a855f7', '#ef4444'];
  const topHosts = Object.values(hostMap).sort((a, b) => b.count - a.count).slice(0, 5);

  const sorted = [...filtered].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div>
      {/* ── Date Range Selector ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {RANGES.map(r => (
          <button key={r.key} onClick={() => setRange(r.key)}
            style={{
              padding: '7px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: range === r.key ? 'none' : '1px solid var(--stroke)',
              background: range === r.key ? 'var(--orange)' : 'var(--surface2)',
              color: range === r.key ? '#fff' : 'var(--muted)',
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
            {r.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>
          {filtered.length} visitor{filtered.length !== 1 ? 's' : ''} in range
        </span>
      </div>

      {/* ── KPIs ── */}
      <div className="kpi-grid">
        <div className="kpi"><div className="kico">📈</div><div className="klabel">Total Visitors</div><div className="kval">{filtered.length}</div><div className="kdelta">{RANGES.find(r=>r.key===range)?.label}</div></div>
        <div className="kpi"><div className="kico">⏱</div><div className="klabel">Avg. Duration</div><div className="kval">{avg}<span style={{ fontSize: 14, color: 'var(--muted)' }}> min</span></div><div className="kdelta">Checked-out only</div></div>
        <div className="kpi"><div className="kico">🏆</div><div className="klabel">Top Host</div><div className="kval" style={{ fontSize: 16 }}>{topHost[0]}</div><div className="kdelta">{topHost[1]} visitor{topHost[1] !== 1 ? 's' : ''}</div></div>
        <div className="kpi"><div className="kico">📅</div><div className="klabel">Most Common Purpose</div><div className="kval" style={{ fontSize: 16 }}>{topPurpose[0]}</div><div className="kdelta">{topPurpose[1]} visit{topPurpose[1] !== 1 ? 's' : ''}</div></div>
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="split-2-equal">
        <div className="card">
          <div className="card-hd"><div><h3>Weekly Trend</h3><p>Visitors per day of week</p></div></div>
          <div className="chart-box">
            <Bar data={{ labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], datasets: [{ label: 'Visitors', data: weekData, backgroundColor: '#ff6a00', borderRadius: 8, maxBarThickness: 36 }] }}
              options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: gridCol }, beginAtZero: true, ticks: { precision: 0 } } } }} />
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><div><h3>Time Spent by Department</h3><p>Avg minutes per visit</p></div></div>
          <div className="chart-box">
            <Bar data={{ labels: deptData.labels.length ? deptData.labels : ['No data'], datasets: [{ label: 'Avg min', data: deptData.values.length ? deptData.values : [0], backgroundColor: pColors, borderRadius: 8, maxBarThickness: 42 }] }}
              options={{ maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridCol }, beginAtZero: true }, y: { grid: { display: false } } } }} />
          </div>
        </div>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="split-2-equal">
        <div className="card">
          <div className="card-hd"><div><h3>Top Hosts</h3><p>By visitor count</p></div></div>
          <div className="chart-box">
            <Bar data={{ labels: topHosts.length ? topHosts.map(x => x.display) : ['No data'], datasets: [{ label: 'Visitors', data: topHosts.length ? topHosts.map(x => x.count) : [0], backgroundColor: '#ffb347', borderRadius: 8, maxBarThickness: 36 }] }}
              options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: gridCol }, beginAtZero: true, ticks: { precision: 0 } } } }} />
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><div><h3>Purpose Breakdown</h3><p>All visits in range</p></div></div>
          <div className="chart-box">
            <Doughnut data={{ labels: Object.keys(purposeMap).length ? Object.keys(purposeMap) : ['No data'], datasets: [{ data: Object.values(purposeMap).length ? Object.values(purposeMap) : [1], backgroundColor: pColors, borderColor: '#0d0d14', borderWidth: 3 }] }}
              options={{ maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { padding: 14, boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 11 }, color: '#8a8a96' } } } }} />
          </div>
        </div>
      </div>

      {/* ── Visitor Table ── */}
      <div className="card">
        <div className="card-hd">
          <div><h3>Visitor Report</h3><p>{RANGES.find(r=>r.key===range)?.label} • Total: {sorted.length}</p></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⤓ CSV</button>
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨 Print</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Visitor</th><th>Mobile</th><th>Host</th><th>Purpose</th><th>In</th><th>Out</th><th>Duration</th></tr>
            </thead>
            <tbody>
              {!sorted.length ? (
                <tr><td colSpan={8}><div className="empty"><b>No visitors</b> in this date range</div></td></tr>
              ) : sorted.map((v, i) => (
                <tr key={v.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                  <td>
                    <div className="cell-user">
                      <div className="row-avatar">{v.photo ? <img src={v.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(v.name)}</div>
                      <div><b>{v.name || '—'}</b><small style={{ color: 'var(--muted)' }}>{v.co && v.co !== '—' ? v.co : ''}</small></div>
                    </div>
                  </td>
                  <td>{v.mob || '—'}</td>
                  <td>{displayName(v.host)}</td>
                  <td>{v.purpose || '—'}</td>
                  <td>{v.inT || '—'}</td>
                  <td>{v.outT || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  <td><b style={{ color: v.st === 'out' ? 'var(--orange-2)' : '#22c55e' }}>{liveDur(v)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
