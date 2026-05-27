export default function PillStatus({ st }) {
  if (st === 'in') return <span className="pill in">● Inside</span>;
  if (st === 'out') return <span className="pill out">Checked Out</span>;
  if (st === 'pending') return <span className="pill pending">Awaiting Host</span>;
  if (st === 'approved') return <span className="pill approved">Approved</span>;
  if (st === 'banned') return <span className="pill banned">Banned</span>;
  return <span className="pill out">{st}</span>;
}
