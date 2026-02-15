"use client"

import { useEffect, useState } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_BASE || "/api"

function authHeaders() {
  const t = localStorage.getItem("admin_token")
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export default function Reports() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    setLoading(true)
    axios
      .get(`${API}/admin/reports`, { headers: authHeaders() })
      .then((r) => {
        setRows(r.data)
        setMsg("")
      })
      .catch(() => setMsg("Failed to load reports"))
      .finally(() => setLoading(false))
  }, [])

  async function downloadCSV(eventId, eventName) {
    try {
      const res = await axios.get(`${API}/admin/reports/${eventId}/csv`, {
        headers: authHeaders(),
        responseType: "blob",
      })

      const blob = new Blob([res.data], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${eventName.replace(/\s+/g, "_")}_report.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      setMsg("Failed to download CSV")
    }
  }

  // Calculate totals
  const totals = {
    total: rows.reduce((sum, r) => sum + (r.total_tokens || 0), 0),
    collected: rows.reduce((sum, r) => sum + (r.collected || 0), 0),
    pending: rows.reduce((sum, r) => sum + (r.pending || 0), 0),
    revoked: rows.reduce((sum, r) => sum + (r.revoked || 0), 0),
  }

  return (
    <div style={{ padding: "32px 24px", minHeight: "100vh", background: "#f9fafb" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: "#111827" }}>Reports & Analytics</h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 15, color: "#6b7280" }}>
            Event token collection and distribution statistics
          </p>
        </div>

        {msg && (
          <div
            style={{
              marginBottom: 24,
              padding: 12,
              background: "#fef2f2",
              color: "#991b1b",
              borderRadius: 8,
              fontSize: 14,
              border: "1px solid #fecaca",
            }}
          >
            {msg}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Total Tokens
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#111827" }}>{totals.total}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>Across all events</div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#059669",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Collected
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#059669" }}>{totals.collected}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
              {totals.total > 0 ? Math.round((totals.collected / totals.total) * 100) : 0}% completion
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#f97316",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Pending
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#f97316" }}>{totals.pending}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>Awaiting collection</div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#dc2626",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Revoked
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#dc2626" }}>{totals.revoked}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>Cancelled tokens</div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: "#6b7280",
                fontSize: 15,
              }}
            >
              Loading reports...
            </div>
          ) : rows.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: "#6b7280",
                fontSize: 15,
              }}
            >
              No reports available
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f9fafb",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <th
                      style={{
                        padding: "16px 24px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#374151",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Event
                    </th>
                    <th
                      style={{
                        padding: "16px 24px",
                        textAlign: "center",
                        fontWeight: 600,
                        color: "#374151",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Total
                    </th>
                    <th
                      style={{
                        padding: "16px 24px",
                        textAlign: "center",
                        fontWeight: 600,
                        color: "#374151",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Collected
                    </th>
                    <th
                      style={{
                        padding: "16px 24px",
                        textAlign: "center",
                        fontWeight: 600,
                        color: "#374151",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Pending
                    </th>
                    <th
                      style={{
                        padding: "16px 24px",
                        textAlign: "center",
                        fontWeight: 600,
                        color: "#374151",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Revoked
                    </th>
                    <th
                      style={{
                        padding: "16px 24px",
                        textAlign: "center",
                        fontWeight: 600,
                        color: "#374151",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr
                      key={r.event_id}
                      style={{
                        borderBottom: idx !== rows.length - 1 ? "1px solid #e5e7eb" : "none",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td
                        style={{
                          padding: "16px 24px",
                          color: "#111827",
                          fontWeight: 500,
                        }}
                      >
                        {r.event_name}
                      </td>
                      <td
                        style={{
                          padding: "16px 24px",
                          textAlign: "center",
                          color: "#111827",
                          fontWeight: 600,
                        }}
                      >
                        {r.total_tokens}
                      </td>
                      <td
                        style={{
                          padding: "16px 24px",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "6px 12px",
                            background: "#ecfdf5",
                            color: "#059669",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          ✓ {r.collected}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "16px 24px",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "6px 12px",
                            background: "#fef3c7",
                            color: "#f97316",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          ◐ {r.pending}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "16px 24px",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "6px 12px",
                            background: "#fef2f2",
                            color: "#dc2626",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          ✕ {r.revoked}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "16px 24px",
                          textAlign: "center",
                        }}
                      >
                        <button
                          onClick={() => downloadCSV(r.event_id, r.event_name)}
                          style={{
                            padding: "8px 14px",
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "background 0.2s",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => (e.target.style.background = "#2563eb")}
                          onMouseLeave={(e) => (e.target.style.background = "#3b82f6")}
                        >
                          Download CSV
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
