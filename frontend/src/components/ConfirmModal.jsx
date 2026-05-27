import { useApp } from '../context/AppContext';

export default function ConfirmModal() {
  const { confirm, closeConfirm } = useApp();
  return (
    <div className={`modal-wrap${confirm.show ? ' show' : ''}`} onClick={e => { if (e.target === e.currentTarget) closeConfirm(); }}>
      <div className="modal narrow">
        <h3>{confirm.title}</h3>
        <p>{confirm.msg}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={closeConfirm}>Cancel</button>
          <button
            className={`btn ${confirm.okClass || 'btn-danger'}`}
            onClick={() => { closeConfirm(); confirm.onYes && confirm.onYes(); }}
          >{confirm.okLabel || 'Yes, Delete'}</button>
        </div>
      </div>
    </div>
  );
}
