// frontend/src/admin/EventsManager.jsx
import React, {useEffect, useState} from 'react';
import { adminClient } from './adminApi';

export default function EventsManager(){
  const [events, setEvents] = useState([]);
  useEffect(()=> load(), []);
  async function load(){
    try {
      const r = await adminClient.get('/admin/events');
      setEvents(r.data);
    } catch(e){ console.error(e); }
  }
  async function createEvent(){
    const name = prompt('Event name');
    const start_date = prompt('Start date (YYYY-MM-DD)');
    if (!name || !start_date) return alert('name & start_date required');
    const r = await adminClient.post('/admin/events', { name, start_date });
    alert('Created: ' + r.data.name);
    load();
  }
  async function editEvent(ev){
    const name = prompt('Event name', ev.name);
    const start_date = prompt('Start date (YYYY-MM-DD)', ev.start_date);
    const end_date = prompt('End date (YYYY-MM-DD, optional)', ev.end_date || '');
    const status = prompt('Status (open/closed)', ev.status || 'open');
    if (!name || !start_date) return alert('name & start_date required');
    await adminClient.put(`/admin/events/${ev.id}`, { name, start_date, end_date, status });
    load();
  }
  async function deleteEvent(ev){
    if (!window.confirm('Delete event? This removes it permanently.')) return;
    await adminClient.del(`/admin/events/${ev.id}`);
    load();
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <h2 className="text-xl font-semibold">Events</h2>
        <button onClick={createEvent} className="px-3 py-1 rounded bg-brand text-white">Create event</button>
      </div>
      <div style={{display:'grid',gap:8}}>
        {events.map(ev => (
          <div key={ev.id} className="bg-white rounded shadow p-3 flex justify-between items-center">
            <div>
              <div className="font-semibold">{ev.name}</div>
              <div className="text-sm text-gray-600">{ev.start_date} → {ev.end_date || '—'}</div>
              <div className="text-xs text-gray-500">Status: {ev.status}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>editEvent(ev)} className="px-2 py-1 border rounded">Edit</button>
              <button onClick={()=>deleteEvent(ev)} className="px-2 py-1 border rounded">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
