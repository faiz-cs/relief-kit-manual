// frontend/src/pages/TokenView.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE || '/api';
const BACKEND = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');

function authHeaders() {
  const t = localStorage.getItem('admin_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function TokenView() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [qrError, setQrError] = useState(false);

  // Load token
  useEffect(() => {
    if (!code) return;

    setLoading(true);
    setMsg('');

    axios
      .get(`${API}/tokens/${encodeURIComponent(code)}`)
      .then(r => setToken(r.data))
      .catch(() => setMsg('Token not found'))
      .finally(() => setLoading(false));
  }, [code]);

  async function markCollected() {
    setMsg('');
    try {
      const r = await axios.post(
        `${API}/admin/tokens/${encodeURIComponent(code)}/manual-checkin`,
        { verifier_name: 'UI', verifier_id_type: 'manual' },
        { headers: authHeaders() }
      );
      setToken(prev => ({ ...prev, ...r.data.token }));
      setMsg('Marked collected');
    } catch (e) {
      setMsg('Manual check-in failed: ' + (e.response?.data?.error || e.message));
    }
  }

  async function undo() {
    setMsg('');
    try {
      const r = await axios.post(
        `${API}/admin/tokens/${encodeURIComponent(code)}/undo-checkin`,
        {},
        { headers: authHeaders() }
      );
      setToken(prev => ({ ...prev, ...r.data.token }));
      setMsg('Undo successful');
    } catch (e) {
      setMsg('Undo failed: ' + (e.response?.data?.error || e.message));
    }
  }

  async function reissue() {
    setMsg('');
    try {
      const r = await axios.post(
        `${API}/admin/tokens/${encodeURIComponent(code)}/reissue`,
        {},
        { headers: authHeaders() }
      );

      const { new_token } = r.data;

      // Navigate directly to the new token
      navigate(`/token/${new_token.token_code}`, { replace: true });
    } catch (e) {
      setMsg('Reissue failed: ' + (e.response?.data?.error || e.message));
    }
  }

  if (!code) return <div style={{ padding: 24, color: '#6b7280' }}>No token code</div>;
  if (loading) return <div style={{ padding: 24, color: '#6b7280' }}>Loading…</div>;
  if (!token) return <div style={{ padding: 24, color: '#6b7280' }}>{msg || 'No token data'}</div>;

  const getStatusColor = (status) => {
    if (status === 'active') return '#059669';
    if (status === 'used') return '#0891b2';
    if (status === 'revoked') return '#dc2626';
    return '#6b7280';
  };

  const getStatusBg = (status) => {
    if (status === 'active') return '#ecfdf5';
    if (status === 'used') return '#ecf9ff';
    if (status === 'revoked') return '#fef2f2';
    return '#f3f4f6';
  };

  const statusColor = getStatusColor(token.status || 'active');
  const statusBg = getStatusBg(token.status || 'active');

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f9fafb' }}>
      <button 
        onClick={() => navigate(-1)}
        style={{
          marginBottom: 24,
          background: 'transparent',
          border: 'none',
          color: '#3b82f6',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
          padding: 0
        }}
      >
        ← Back
      </button>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ 
          background: '#ffffff',
          borderRadius: 12,
          padding: 32,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>

          {/* QR PREVIEW */}
          <div
            style={{
              position: 'absolute',
              top: 32,
              right: 32,
              width: 120,
              height: 120,
              border: '2px solid #e5e7eb',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#9ca3af',
              background: '#fafbfc'
            }}
          >
            {!qrError ? (
              <a
                href={`${BACKEND}/qrs/${encodeURIComponent(token.token_code)}.png`}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={`${BACKEND}/qrs/${encodeURIComponent(token.token_code)}.png`}
                  alt="QR"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={() => setQrError(true)}
                />
              </a>
            ) : (
              <span>QR not available</span>
            )}
          </div>

          <div style={{ paddingRight: 140 }}>
            <h1 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: 700, color: '#111827' }}>
              Token Details
            </h1>

            {/* Token Code */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Token Code
              </label>
              <div style={{ 
                marginTop: 8,
                padding: 12,
                background: '#f3f4f6',
                borderRadius: 6,
                fontFamily: 'monospace',
                fontSize: 14,
                fontWeight: 500,
                color: '#111827',
                wordBreak: 'break-all'
              }}>
                {token.token_code}
              </div>
            </div>

            {/* Grid Layout for Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  House ID
                </label>
                <p style={{ margin: '8px 0 0 0', fontSize: 16, fontWeight: 500, color: '#111827' }}>
                  {token.house_id ?? '—'}
                </p>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Event
                </label>
                <p style={{ margin: '8px 0 0 0', fontSize: 16, fontWeight: 500, color: '#111827' }}>
                  {token.event_name || token.event_id || '—'}
                </p>
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Status
              </label>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  background: statusBg,
                  color: statusColor,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }}></span>
                  {token.status || 'active'}
                </span>
                {token.used && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    background: '#ecf9ff',
                    color: '#0891b2',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600
                  }}>
                    ✓ Used
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              {(token.status === 'active' && !token.used) && (
                <button 
                  onClick={markCollected}
                  style={{
                    padding: '10px 16px',
                    background: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.target.style.background = '#047857'}
                  onMouseLeave={e => e.target.style.background = '#059669'}
                >
                  Mark Collected
                </button>
              )}

              {token.used && (
                <button 
                  onClick={undo}
                  style={{
                    padding: '10px 16px',
                    background: '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.target.style.background = '#ea580c'}
                  onMouseLeave={e => e.target.style.background = '#f97316'}
                >
                  Undo
                </button>
              )}

              {(token.status === 'active' || token.status === 'used') && (
                <button 
                  onClick={reissue}
                  style={{
                    padding: '10px 16px',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.target.style.background = '#4f46e5'}
                  onMouseLeave={e => e.target.style.background = '#6366f1'}
                >
                  Reissue
                </button>
              )}
            </div>

            {token.status === 'revoked' && (
              <div style={{
                padding: 12,
                background: '#fef2f2',
                color: '#991b1b',
                borderRadius: 6,
                fontSize: 14,
                border: '1px solid #fecaca'
              }}>
                ⚠️ This token is revoked and replaced.
              </div>
            )}

            {msg && (
              <div style={{
                marginTop: 16,
                padding: 12,
                background: msg.includes('failed') ? '#fef2f2' : '#ecfdf5',
                color: msg.includes('failed') ? '#991b1b' : '#166534',
                borderRadius: 6,
                fontSize: 14,
                border: msg.includes('failed') ? '1px solid #fecaca' : '1px solid #bbf7d0'
              }}>
                {msg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}