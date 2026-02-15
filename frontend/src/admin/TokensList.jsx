import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/* ================= CONFIG ================= */

const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const PAGE_SIZE = 100;

/* ================= HELPERS ================= */

function authHeaders() {
  const t = localStorage.getItem('admin_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/* ================= COMPONENT ================= */

export default function TokensList() {
  const [tokens, setTokens] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlyActionable, setOnlyActionable] = useState(false);
  const [eventFilter, setEventFilter] = useState('all');

  const [limit] = useState(PAGE_SIZE);
  const [offset, setOffset] = useState(0);

  const navigate = useNavigate();
  const debounceRef = useRef(null);

  /* ================= LOAD TOKENS ================= */

  async function loadTokens() {
    setLoading(true);
    setMsg('');
    try {
      const res = await axios.get(
        `${API}/admin/tokens?include_used=true&limit=${limit}&offset=${offset}`,
        { headers: authHeaders() }
      );
      setTokens(res.data || []);
    } catch (err) {
      console.error(err);
      setMsg('Failed to load tokens');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTokens();
  }, [offset]);

  /* ================= FILTER + SORT ================= */

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(applyFilters, 250);
    return () => clearTimeout(debounceRef.current);
  }, [tokens, search, statusFilter, onlyActionable, eventFilter]);

  function applyFilters() {
    let out = [...tokens];

    // status
    if (statusFilter !== 'all') {
      out = out.filter(t => (t.status || 'active') === statusFilter);
    }

    // actionable
    if (onlyActionable) {
      out = out.filter(t => (t.status || 'active') === 'active' && !t.used);
    }

    // event
    if (eventFilter !== 'all') {
      out = out.filter(t => String(t.event_id) === String(eventFilter));
    }

    // search
    const term = search.trim().toLowerCase();
    if (term) {
      out = out.filter(t =>
        (t.token_code || '').toLowerCase().includes(term) ||
        (t.house_code || '').toLowerCase().includes(term) ||
        (t.owner_name || '').toLowerCase().includes(term)
      );
    }

    // ✅ FIXED SORT (newest first, stable)
    out.sort((a, b) => (b.id || 0) - (a.id || 0));

    setFiltered(out);
  }

  /* ================= ACTIONS ================= */

  async function manualCheckin(code) {
    setMsg('');
    try {
      const res = await axios.post(
        `${API}/admin/tokens/${code}/manual-checkin`,
        { verifier_name: 'UI' },
        { headers: authHeaders() }
      );
      const updated = res.data.token;
      setTokens(prev => prev.map(t => t.token_code === updated.token_code ? { ...t, ...updated } : t));
    } catch {
      setMsg('Mark collected failed');
    }
  }

  async function undoCheckin(code) {
    setMsg('');
    try {
      const res = await axios.post(
        `${API}/admin/tokens/${code}/undo-checkin`,
        {},
        { headers: authHeaders() }
      );
      const updated = res.data.token;
      setTokens(prev => prev.map(t => t.token_code === updated.token_code ? { ...t, ...updated } : t));
    } catch {
      setMsg('Undo failed');
    }
  }

  async function reissue(code) {
    setMsg('');
    try {
      const res = await axios.post(
        `${API}/admin/tokens/${code}/reissue`,
        {},
        { headers: authHeaders() }
      );

      const { new_token, revoked_tokens = [] } = res.data;
      const revokedSet = new Set(revoked_tokens.map(r => r.token_code));

      setTokens(prev => {
        let updated = prev.map(t =>
          revokedSet.has(t.token_code) ? { ...t, status: 'revoked' } : t
        );
        updated.unshift({ ...new_token, status: 'active', used: false });
        return updated;
      });
    } catch {
      setMsg('Reissue failed');
    }
  }

  /* ================= UI ================= */

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

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#111827' }}>
            Tokens Management
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: 15, color: '#6b7280' }}>
            Manage and monitor event tokens
          </p>
        </div>

        {/* Filters Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Search
              </label>
              <input
                placeholder="Search by token, house, or owner..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ minWidth: 180 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Status
              </label>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="used">Used</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
              <input
                type="checkbox"
                checked={onlyActionable}
                onChange={e => setOnlyActionable(e.target.checked)}
                id="actionable"
                style={{ cursor: 'pointer', width: 18, height: 18 }}
              />
              <label htmlFor="actionable" style={{ cursor: 'pointer', fontSize: 14, color: '#374151' }}>
                Only actionable
              </label>
            </div>

            <button 
              onClick={loadTokens}
              style={{
                padding: '10px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={e => e.target.style.background = '#2563eb'}
              onMouseLeave={e => e.target.style.background = '#3b82f6'}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Messages */}
        {msg && (
          <div style={{
            marginBottom: 16,
            padding: 12,
            background: '#fef2f2',
            color: '#991b1b',
            borderRadius: 6,
            fontSize: 14,
            border: '1px solid #fecaca'
          }}>
            {msg}
          </div>
        )}

        {loading && (
          <div style={{
            padding: 32,
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 15
          }}>
            Loading…
          </div>
        )}

        {/* Tokens List */}
        {!loading && (
          <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
            {filtered.map(t => (
              <div 
                key={t.token_code}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 16,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s',
                  hover: { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <code style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#111827',
                        fontFamily: 'monospace',
                        background: '#f3f4f6',
                        padding: '4px 8px',
                        borderRadius: 4
                      }}>
                        {t.token_code}
                      </code>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        background: getStatusBg(t.status || 'active'),
                        color: getStatusColor(t.status || 'active'),
                        borderRadius: 5,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.3
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: getStatusColor(t.status || 'active') }}></span>
                        {(t.status || 'active')}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                      <div>🏠 {t.house_code || '—'}</div>
                      <div>👤 {t.owner_name || '—'}</div>
                      <div>📅 Event {t.event_id || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                    <button 
                      onClick={() => navigate(`/token/${t.token_code}`)}
                      style={{
                        padding: '8px 14px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: 5,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.target.style.background = '#2563eb'}
                      onMouseLeave={e => e.target.style.background = '#3b82f6'}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && !loading && (
              <div style={{
                textAlign: 'center',
                padding: 48,
                color: '#6b7280',
                fontSize: 15
              }}>
                No tokens found
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          padding: 16,
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e5e7eb'
        }}>
          <button 
            disabled={offset === 0}
            onClick={() => setOffset(o => Math.max(0, o - limit))}
            style={{
              padding: '10px 16px',
              background: offset === 0 ? '#e5e7eb' : '#3b82f6',
              color: offset === 0 ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: offset === 0 ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => offset !== 0 && (e.target.style.background = '#2563eb')}
            onMouseLeave={e => offset !== 0 && (e.target.style.background = '#3b82f6')}
          >
            ← Previous
          </button>
          <button 
            onClick={() => setOffset(o => o + limit)}
            style={{
              padding: '10px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.target.style.background = '#2563eb'}
            onMouseLeave={e => e.target.style.background = '#3b82f6'}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}