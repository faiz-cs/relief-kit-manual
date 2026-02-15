// frontend/src/pages/AdminLogin.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE || '/api';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  async function doLogin(e) {
    e && e.preventDefault();
    setMsg('');
    if (!username || !password) {
      setMsg('Enter username and password');
      return;
    }
    setLoading(true);
    try {
      // call backend login endpoint (make sure backend mounts adminAuth)
      const r = await axios.post(`${API}/admin/auth/login`, { username, password }, { headers: { 'Content-Type': 'application/json' }});
      // expect { token: "..." } or { token: "...", user: {...} }
      const token = r.data?.token || r.data?.accessToken || null;
      if (!token) {
        setMsg('Login succeeded but no token returned from server.');
        setLoading(false);
        return;
      }

      // Save token to localStorage
      localStorage.setItem('admin_token', token);

      // Set axios defaults so all future axios requests include the header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setMsg('Login successful. Redirecting to admin...');
      // small delay then navigate
      setTimeout(() => navigate('/admin'), 400);
    } catch (err) {
      console.error('login error', err);
      const text = err.response?.data?.error || err.response?.data?.message || err.message;
      setMsg('Login failed: ' + text);
    } finally {
      setLoading(false);
    }
  }

  // quick helper to paste a dev token (optional) — sets token directly
  function pasteTokenShortcut() {
    const t = prompt('Paste a JWT token here (dev use only)');
    if (!t) return;
    localStorage.setItem('admin_token', t);
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setMsg('Token saved. Redirecting to admin...');
    setTimeout(()=> navigate('/admin'), 300);
  }

  return (
    <div className="max-w-lg mx-auto mt-12 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Admin Login</h2>

      <form onSubmit={doLogin} className="grid gap-3">
        <label className="text-sm">
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded p-2 mt-1"
            placeholder="admin" />
        </label>

        <label className="text-sm">
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded p-2 mt-1"
            type="password"
            placeholder="••••••••" />
        </label>

        <div className="flex items-center gap-2 mt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-brand text-white">
            {loading ? 'Logging in…' : 'Login'}
          </button>

          <button
            type="button"
            onClick={pasteTokenShortcut}
            className="px-3 py-2 rounded border">
            Paste token (dev)
          </button>
        </div>

        {msg && <div className="text-sm mt-2 text-red-600">{msg}</div>}

        <div className="text-xs text-gray-500 mt-3">
          If your backend does not expose <code>/admin/auth/login</code>,
          use the <strong>Paste token (dev)</strong> button to set a token manually.
        </div>
      </form>
    </div>
  );
}
