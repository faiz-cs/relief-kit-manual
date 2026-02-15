import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE || '/api';

function authHeaders() {
  const t = localStorage.getItem('admin_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function EventsManager() {
  const [events, setEvents] = useState([]);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  async function loadEvents() {
    const r = await axios.get(`${API}/admin/events`, { headers: authHeaders() });
    setEvents(r.data);
  }

  useEffect(() => { loadEvents(); }, []);

  async function createEvent() {
    if (!name.trim()) return;
    await axios.post(`${API}/admin/events`, { name }, { headers: authHeaders() });
    setName('');
    loadEvents();
  }

  async function closeEvent(id) {
    await axios.post(`${API}/admin/events/${id}/close`, {}, { headers: authHeaders() });
    loadEvents();
  }

  async function reopenEvent(id) {
    await axios.post(`${API}/admin/events/${id}/reopen`, {}, { headers: authHeaders() });
    loadEvents();
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin — Events</h2>

      <div style={{ marginBottom: 12 }}>
        <input
          placeholder="New event name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button onClick={createEvent}>Create</button>
      </div>

      <div>{msg}</div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {events.map(e => (
          <li key={e.id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 8 }}>
            <b>{e.name}</b> — {e.status}
            <div style={{ fontSize: 13 }}>
              Tokens: {e.used_tokens}/{e.total_tokens}
            </div>

            <div style={{ marginTop: 8 }}>
              {e.status === 'ACTIVE' && (
                <button onClick={() => closeEvent(e.id)}>Close</button>
              )}
              {e.status === 'CLOSED' && (
                <button onClick={() => reopenEvent(e.id)}>Reopen</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}