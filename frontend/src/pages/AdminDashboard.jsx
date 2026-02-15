import { useEffect, useState } from "react";
import { isAdminLoggedIn } from "../utils/auth";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  // PROTECT THIS PAGE
  if (!isAdminLoggedIn()) {
    window.location.href = "/admin";
    return null;
  }

  useEffect(() => {
    fetch("http://127.0.0.1:5000/admin/stats", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("adminToken"),
      },
    })
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err));
  }, []);

  const logout = () => {
    localStorage.removeItem("adminToken");
    window.location.href = "/admin";
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin Dashboard</h2>

      <button onClick={logout} style={{ background: "red", color: "white" }}>
        Logout
      </button>

      {!stats ? (
        <p>Loading...</p>
      ) : (
        <div style={{ marginTop: 20 }}>
          <p><strong>Total Houses:</strong> {stats.houses}</p>
          <p><strong>Total Tokens Issued:</strong> {stats.tokens}</p>
          <p><strong>Total Collected:</strong> {stats.collected}</p>

          <br />

          <h3>Navigation</h3>
          <ul>
            <li><a href="/tokens">View Tokens</a></li>
            <li><a href="/houses">View Houses</a></li>
            <li><a href="/audit">Audit Logs</a></li>
          </ul>
        </div>
      )}
    </div>
  );
}
