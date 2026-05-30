import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../context/AppContext';

export default function Login() {
  const navigate = useNavigate();
  const { fetchAll, showToast } = useApp();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { setError('Please enter username and password'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.login(form.username.trim(), form.password);
      if (res && res.token) {
        localStorage.setItem('vms_token', res.token);
        localStorage.setItem('vms_user', JSON.stringify(res.user));
        await fetchAll();
        navigate('/dashboard');
      } else {
        setError(res?.error || 'Invalid credentials');
      }
    } catch (e) {
      setError('Connection error — is the backend running on port 3002?');
    }
    setLoading(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-mark">S</div>
          <h1>SHIVOFFSET VMS</h1>
          <p>Visitor Management System</p>
        </div>
        {error && <div className="login-err">⚠ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Username <span className="req">*</span></label>
            <input
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="admin or guard"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="field" style={{ marginBottom: 22 }}>
            <label>Password <span className="req">*</span></label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} disabled={loading}>
            {loading ? <><span className="loading-spin" /> Signing in…</> : '→ Sign In'}
          </button>
        </form>
        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          Contact your admin if you forgot your password
        </div>
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--stroke)', textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>
          SHIVOFFSET (I) PVT. LTD. • Haridwar • Build v2.0
        </div>
      </div>
    </div>
  );
}
