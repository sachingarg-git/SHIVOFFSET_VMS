export function initials(n) {
  return (n || '?').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
}

export function nowHM() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function mins(hm) {
  if (!hm) return 0;
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

export function fmtDur(min) {
  if (min <= 0) return '—';
  if (min < 60) return min + 'm';
  return Math.floor(min / 60) + 'h ' + (min % 60) + 'm';
}

export function liveDur(v) {
  if (v.st === 'out' && v.outT) return fmtDur(mins(v.outT) - mins(v.inT));
  const nowM = mins(nowHM());
  const d = nowM - mins(v.inT);
  return d > 0 ? fmtDur(d) : 'just now';
}

export function durMinutes(v) {
  if (v.st === 'out' && v.outT) return Math.max(0, mins(v.outT) - mins(v.inT));
  return Math.max(0, mins(nowHM()) - mins(v.inT));
}

export function formatDateNice(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

export function badgeId(v) {
  const d = (v.date || todayStr()).replace(/-/g, '').slice(2);
  return `VMS-${d}-${String(v.id).padStart(4, '0')}`;
}

export function cleanPhone(num) {
  let d = (num || '').replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;
  if (d.startsWith('0')) d = '91' + d.slice(1);
  return d;
}

export function fillTemplate(tmpl, v) {
  const dur = v.outT ? fmtDur(durMinutes(v)) : '';
  const bid = badgeId(v);
  return (tmpl || '')
    .replace(/{visitor_name}/g, v.name)
    .replace(/{visitor_mobile}/g, v.mob)
    .replace(/{host_name}/g, v.host)
    .replace(/{purpose}/g, v.purpose)
    .replace(/{company}/g, v.co && v.co !== '—' ? v.co : '')
    .replace(/{date}/g, v.date)
    .replace(/{time}/g, v.inT)
    .replace(/{duration}/g, dur)
    .replace(/{badge_url}/g, '#' + bid)
    .replace(/{badge_id}/g, bid);
}
