import React, { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE || '/api';

function authHeaders() {
  const t = localStorage.getItem('admin_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function UploadHouses() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(null);

  // -----------------------------
  // PREVIEW CSV (READ AS TEXT)
  // -----------------------------
  async function uploadPreview() {
    if (!file) {
      setMsg('Select a CSV file');
      return;
    }

    setMsg('');
    setLoading(true);

    try {
      // 🔑 READ FILE AS TEXT
      const csvText = await file.text();

      const res = await axios.post(
        `${API}/admin/houses/preview-csv`,
        { csvText }, // ✅ JSON BODY
        { headers: authHeaders() }
      );

      setPreview(res.data.preview || []);
      setSkipped(res.data.skipped || []);
      setImported(null);

    } catch (e) {
      setMsg(e.response?.data?.error || 'Preview failed');
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // CONFIRM IMPORT
  // -----------------------------
  async function confirmImport() {
    if (!preview.length) {
      setMsg('Nothing to import');
      return;
    }

    setLoading(true);
    setMsg('');

    try {
      const res = await axios.post(
        `${API}/admin/houses/import`,
        { rows: preview },
        { headers: authHeaders() }
      );

      setImported(res.data);
      setPreview([]);
      setSkipped([]);

    } catch (e) {
      setMsg(e.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>CSV Upload — Houses</h2>

      <input
        type="file"
        accept=".csv"
        onChange={e => setFile(e.target.files[0])}
      />

      <button onClick={uploadPreview} disabled={loading}>
        Preview
      </button>

      {msg && <div style={{ color: 'red', marginTop: 10 }}>{msg}</div>}

      {preview.length > 0 && (
        <>
          <h3>Preview ({preview.length})</h3>

          <table border="1" cellPadding="6">
            <thead>
              <tr>
                <th>House Code</th>
                <th>Owner</th>
                <th>Phone</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i}>
                  <td>{r.house_code}</td>
                  <td>{r.owner_name}</td>
                  <td>{r.phone || '-'}</td>
                  <td>{r.address}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            style={{ marginTop: 12 }}
            onClick={confirmImport}
            disabled={loading}
          >
            Confirm Import
          </button>
        </>
      )}

      {skipped.length > 0 && (
        <>
          <h3>Skipped Rows</h3>
          <ul>
            {skipped.map((s, i) => (
              <li key={i}>
                Row {s.row} — {s.house_code || 'UNKNOWN'} ({s.reason})
              </li>
            ))}
          </ul>
        </>
      )}

      {imported && (
        <div style={{ marginTop: 12, color: 'green' }}>
          ✅ Inserted: {imported.inserted}
        </div>
      )}
    </div>
  );
}