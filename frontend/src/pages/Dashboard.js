import React, { useState, useEffect } from "react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function Dashboard() {
  const [activeWarehouse, setActiveWarehouse] = useState("Warehouse 1");
  const [stats, setStats] = useState({ totalOrders: 0, dispatchedToday: 0, pendingOrders: 0, vipOrders: 0, unavailable: 0 });
  const [warehouses, setWarehouses] = useState([]);
  const [vipOrders, setVipOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [inventory, setInventory] = useState({ "Warehouse 1": [], "Warehouse 2": [], "Warehouse 3": [] });
  const [regRequests, setRegRequests] = useState([]);
  const [orderRequests, setOrderRequests] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const username = localStorage.getItem("username") || "admin";

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const handleLogout = () => { localStorage.clear(); window.location.href = "/"; };

  const fetchAll = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard`, { headers });
      if (res.ok) {
        const json = await res.json();
        setStats(json.stats || {});
        setWarehouses(json.warehouses || []);
        setVipOrders(json.vipOrders || []);
        setPendingOrders(json.pendingOrders || []);
        setInventory(json.inventory || { "Warehouse 1": [], "Warehouse 2": [], "Warehouse 3": [] });
      }
    } catch { console.log("Dashboard fetch failed"); }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/registrations`, { headers });
      if (res.ok) setRegRequests(await res.json());
    } catch { console.log("Reg requests fetch failed"); }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/orders`, { headers });
      if (res.ok) setOrderRequests(await res.json());
    } catch { console.log("Order requests fetch failed"); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handlePdfUpload = async (file) => {
    if (!file || file.type !== "application/pdf") { setUploadMsg("❌ Please upload a valid PDF file"); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadMsg("❌ File too large. Max 10MB"); return; }
    setUploading(true); setUploadMsg("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory/upload`, {
        method: "POST", headers, body: formData,
      });
      if (res.ok) { setUploadMsg("✅ PDF uploaded successfully!"); fetchAll(); }
      else setUploadMsg("⚠️ Upload failed.");
    } catch { setUploadMsg("⚠️ Backend not connected."); }
    finally { setUploading(false); }
  };

  const handleRegAction = async (id, action) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/registrations/${id}/${action}`, {
        method: "POST", headers,
      });
      setRegRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
    } catch { console.log("Action failed"); }
  };

  const handleOrderAction = async (id, action) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/orders/${id}/${action}`, {
        method: "POST", headers,
      });
      setOrderRequests(prev => prev.map(o => o.id === id ? { ...o, status: action } : o));
    } catch { console.log("Action failed"); }
  };

  const statCards = [
    { icon: "📦", color: "#C0392B", bg: "#fde8e8", label: "Total Orders",     value: stats.totalOrders },
    { icon: "✅", color: "#27AE60", bg: "#e8f8ef", label: "Dispatched Today", value: stats.dispatchedToday },
    { icon: "⏰", color: "#F39C12", bg: "#fef9e7", label: "Pending Orders",   value: stats.pendingOrders },
    { icon: "⭐", color: "#8E44AD", bg: "#f5eef8", label: "VIP Orders",       value: stats.vipOrders },
    { icon: "⚠️", color: "#E74C3C", bg: "#fdecea", label: "Unavailable",      value: stats.unavailable },
  ];

  return (
    <div style={s.page}>
      {/* Navbar */}
      <div style={s.navbar}>
        <div style={s.navLeft}>
          <img src="/logo-abc.png" alt="logo" style={s.navLogo} />
          <div>
            <div style={s.navTitle}>Aditya Birla Carbon</div>
            <div style={s.navSub}>Multi-Warehouse Dispatch System</div>
          </div>
        </div>
        <div style={s.navLinks}>
          <a href="/order-portal" style={s.navLink}>📦 Order Portal</a>
          <a href="/vip-portal"   style={s.navLink}>⭐ VIP Portal</a>
          <span style={s.navActive}>📊 Dashboard</span>
        </div>
        <div style={s.navRight}>
          <div>
            <div style={s.navUser}>{username}</div>
            <div style={s.adminBadge}>Admin</div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn}>→ Logout</button>
        </div>
      </div>

      <div style={s.body}>
        {/* Header */}
        <div style={s.headerRow}>
          <div>
            <h2 style={s.heading}>Admin Dashboard</h2>
            <p style={s.subheading}>Real-time overview of all Aditya Birla Carbon warehouse operations</p>
          </div>
          <button onClick={fetchAll} style={s.refreshBtn}>↻ Refresh</button>
        </div>

        {/* Stat Cards */}
        <div style={s.statsRow}>
          {statCards.map((c, i) => (
            <div key={i} style={s.statCard}>
              <div style={{ ...s.statIcon, backgroundColor: c.bg, color: c.color }}>{c.icon}</div>
              <div>
                <div style={s.statValue}>{c.value ?? "—"}</div>
                <div style={s.statLabel}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Registration Requests */}
        <div style={{ ...s.card, marginBottom: "24px" }}>
          <h3 style={s.cardTitle}>
            👤 Registration Requests
            {regRequests.filter(r => r.status === "pending").length > 0 && (
              <span style={s.badgeRed}>{regRequests.filter(r => r.status === "pending").length} pending</span>
            )}
          </h3>
          {regRequests.length === 0 ? (
            <p style={s.emptyText}>No registration requests yet.</p>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>{["ID","USERNAME","MOBILE","ROLE","DATE","STATUS","ACTION"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {regRequests.map((r, i) => (
                  <tr key={i}>
                    <td style={s.td}>#{r.id}</td>
                    <td style={{ ...s.td, fontWeight: "600" }}>{r.username}</td>
                    <td style={s.td}>{r.mobile}</td>
                    <td style={s.td}><span style={r.role === "vip" ? s.badgePurple : s.badgeBlue}>{r.role?.toUpperCase()}</span></td>
                    <td style={s.td}>{r.date}</td>
                    <td style={s.td}>
                      <span style={r.status === "approved" ? s.badgeGreen : r.status === "rejected" ? s.badgeRejected : s.badgeYellow}>
                        {r.status}
                      </span>
                    </td>
                    <td style={s.td}>
                      {r.status === "pending" ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => handleRegAction(r.id, "approved")} style={s.approveBtn}>✅ Approve</button>
                          <button onClick={() => handleRegAction(r.id, "rejected")} style={s.rejectBtn}>❌ Reject</button>
                        </div>
                      ) : <span style={{ color: "#aaa", fontSize: "12px" }}>Done</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Order Approval Requests */}
        <div style={{ ...s.card, marginBottom: "24px" }}>
          <h3 style={s.cardTitle}>
            🛒 Order Approval Requests
            {orderRequests.filter(o => o.status === "pending").length > 0 && (
              <span style={s.badgeRed}>{orderRequests.filter(o => o.status === "pending").length} pending</span>
            )}
          </h3>
          {orderRequests.length === 0 ? (
            <p style={s.emptyText}>No order requests yet.</p>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>{["ORDER","USER","PRODUCT","QTY","TYPE","DATE","STATUS","ACTION"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {orderRequests.map((o, i) => (
                  <tr key={i}>
                    <td style={s.td}>#{o.id}</td>
                    <td style={{ ...s.td, fontWeight: "600" }}>{o.username}</td>
                    <td style={s.td}>{o.product}</td>
                    <td style={s.td}>{o.qty}</td>
                    <td style={s.td}><span style={o.type === "vip" ? s.badgePurple : s.badgeBlue}>{o.type?.toUpperCase()}</span></td>
                    <td style={s.td}>{o.date}</td>
                    <td style={s.td}>
                      <span style={o.status === "approved" ? s.badgeGreen : o.status === "rejected" ? s.badgeRejected : s.badgeYellow}>
                        {o.status}
                      </span>
                    </td>
                    <td style={s.td}>
                      {o.status === "pending" ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => handleOrderAction(o.id, "approved")} style={s.approveBtn}>✅ Approve</button>
                          <button onClick={() => handleOrderAction(o.id, "rejected")} style={s.rejectBtn}>❌ Reject</button>
                        </div>
                      ) : <span style={{ color: "#aaa", fontSize: "12px" }}>Done</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Warehouse Utilization + VIP Orders */}
        <div style={s.row2}>
          <div style={s.card}>
            <h3 style={s.cardTitle}>⚡ Warehouse Utilization</h3>
            {warehouses.length === 0 ? <p style={s.emptyText}>No data yet.</p> : warehouses.map((w, i) => {
              const pct = w.limit > 0 ? ((w.dispatched / w.limit) * 100).toFixed(1) : 0;
              return (
                <div key={i} style={{ marginBottom: "16px" }}>
                  <div style={s.whRow}>
                    <span style={s.whName}>{w.name}</span>
                    <span style={s.whDispatch}>{w.dispatched}/{w.limit} dispatched</span>
                  </div>
                  <div style={s.progressBg}><div style={{ ...s.progressFill, width: `${pct}%` }} /></div>
                  <div style={s.whPct}>{pct}%</div>
                  <div style={s.whStock}>Stock: {w.stock?.toLocaleString()} units</div>
                </div>
              );
            })}
          </div>

          <div style={s.card}>
            <h3 style={s.cardTitle}>⭐ VIP Orders ({vipOrders.length})</h3>
            {vipOrders.length === 0 ? <p style={s.emptyText}>No VIP orders yet.</p> : (
              <table style={s.table}>
                <thead><tr>{["ORDER","PRODUCT","QTY","TYPE","STATUS","WAREHOUSE"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {vipOrders.map((o, i) => (
                    <tr key={i}>
                      <td style={s.td}>#{o.id}</td>
                      <td style={s.td}>{o.product}</td>
                      <td style={s.td}>{o.qty}</td>
                      <td style={s.td}><span style={s.badgeAdmin}>{o.type}</span></td>
                      <td style={s.td}><span style={o.status === "dispatched" ? s.badgeGreen : s.badgeYellow}>{o.status}</span></td>
                      <td style={s.td}>{o.warehouse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pending Orders + Inventory */}
        <div style={s.row2}>
          <div style={s.card}>
            <h3 style={s.cardTitle}>⏰ Pending Orders ({pendingOrders.length})</h3>
            {pendingOrders.length === 0 ? <p style={s.emptyText}>No pending orders.</p> : pendingOrders.map((o, i) => (
              <div key={i} style={s.pendingCard}>
                <div>
                  <div style={s.pendingTitle}>#{o.id} — {o.product}</div>
                  <div style={s.pendingSub}>Qty: {o.qty} · {o.type}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={s.pendingDays}>{o.days} days</div>
                  <div style={s.pendingDate}>{o.date}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={s.card}>
            <h3 style={s.cardTitle}>🏭 Warehouse Inventory</h3>
            <div style={s.tabRow}>
              {["Warehouse 1","Warehouse 2","Warehouse 3"].map(w => (
                <button key={w} onClick={() => setActiveWarehouse(w)}
                  style={activeWarehouse === w ? s.tabActive : s.tabInactive}>{w}</button>
              ))}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>{["PRODUCT ID","PRODUCT NAME","CATEGORY","CURRENT STOCK","UNIT","RESTOCK DATE","DISPATCH LIMIT/DAY"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(inventory[activeWarehouse] || []).length === 0 ? (
                    <tr><td colSpan="7" style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No inventory data</td></tr>
                  ) : (inventory[activeWarehouse] || []).map((item, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ ...s.td, color: "#888", fontFamily: "monospace" }}>{item.id}</td>
                      <td style={{ ...s.td, fontWeight: "600" }}>{item.product}</td>
                      <td style={s.td}><span style={s.categoryBadge}>{item.category}</span></td>
                      <td style={{ ...s.td, fontWeight: "700", color: item.stock < 100 ? "#E74C3C" : "#27AE60" }}>{item.stock}</td>
                      <td style={s.td}>{item.unit}</td>
                      <td style={{ ...s.td, color: item.restock === "—" ? "#aaa" : "#E67E22" }}>{item.restock}</td>
                      <td style={{ ...s.td, fontWeight: "700", color: "#C0392B" }}>{item.limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Upload */}
        <div style={s.uploadCard}>
          <h3 style={s.cardTitle}>⬆️ Upload Monthly Warehouse Report</h3>
          <p style={s.uploadSub}>Upload a PDF with warehouse inventory data. The system extracts product quantities, dispatch limits and restock dates, then updates the database automatically.</p>
          {uploadMsg && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "13px",
              backgroundColor: uploadMsg.startsWith("✅") ? "#e8f8ef" : "#fdecea",
              color: uploadMsg.startsWith("✅") ? "#27AE60" : "#C0392B" }}>
              {uploadMsg}
            </div>
          )}
          <label style={{ cursor: "pointer" }}>
            <input type="file" accept="application/pdf" style={{ display: "none" }}
              onChange={(e) => handlePdfUpload(e.target.files[0])} />
            <div style={{ ...s.dropzone, borderColor: uploading ? "#C0392B" : "#ddd" }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handlePdfUpload(e.dataTransfer.files[0]); }}>
              <div style={s.dropIcon}>{uploading ? "⏳" : "📄"}</div>
              <div style={s.dropText}>{uploading ? "Uploading..." : "Drop PDF here or click to browse"}</div>
              <div style={s.dropMax}>Max 10 MB</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:          { fontFamily: "Inter, sans-serif", backgroundColor: "#f4f6f9", minHeight: "100vh" },
  navbar:        { backgroundColor: "#8B0000", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px" },
  navLeft:       { display: "flex", alignItems: "center", gap: "12px" },
  navLogo:       { width: "48px", height: "48px", objectFit: "contain", borderRadius: "6px" },
  navTitle:      { color: "#fff", fontWeight: "700", fontSize: "16px" },
  navSub:        { color: "#ffcccc", fontSize: "11px" },
  navLinks:      { display: "flex", alignItems: "center", gap: "24px" },
  navLink:       { color: "#ffcccc", textDecoration: "none", fontSize: "14px" },
  navActive:     { color: "#fff", fontWeight: "700", fontSize: "14px", backgroundColor: "#C0392B", padding: "8px 16px", borderRadius: "8px" },
  navRight:      { display: "flex", alignItems: "center", gap: "12px" },
  navUser:       { color: "#fff", fontWeight: "600", fontSize: "14px", textAlign: "right" },
  adminBadge:    { backgroundColor: "#C0392B", color: "#fff", fontSize: "11px", padding: "2px 8px", borderRadius: "4px", textAlign: "center" },
  logoutBtn:     { backgroundColor: "transparent", color: "#fff", border: "1px solid #fff", borderRadius: "6px", padding: "6px 14px", cursor: "pointer", fontSize: "13px" },
  body:          { padding: "28px 32px" },
  headerRow:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  heading:       { margin: 0, fontSize: "24px", fontWeight: "700", color: "#1a1a1a" },
  subheading:    { margin: "4px 0 0", color: "#666", fontSize: "13px" },
  refreshBtn:    { padding: "8px 16px", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#fff", cursor: "pointer", fontSize: "13px" },
  statsRow:      { display: "flex", gap: "16px", marginBottom: "24px" },
  statCard:      { flex: 1, backgroundColor: "#fff", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  statIcon:      { width: "48px", height: "48px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" },
  statValue:     { fontSize: "28px", fontWeight: "700", color: "#1a1a1a" },
  statLabel:     { fontSize: "12px", color: "#888" },
  row2:          { display: "flex", gap: "20px", marginBottom: "24px" },
  card:          { flex: 1, backgroundColor: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardTitle:     { margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "#1a1a1a", display: "flex", alignItems: "center", gap: "8px" },
  emptyText:     { color: "#aaa", fontSize: "13px", textAlign: "center", padding: "20px 0" },
  whRow:         { display: "flex", justifyContent: "space-between" },
  whName:        { fontWeight: "600", fontSize: "14px" },
  whDispatch:    { fontSize: "12px", color: "#888" },
  progressBg:    { backgroundColor: "#eee", borderRadius: "4px", height: "6px", margin: "6px 0 2px" },
  progressFill:  { backgroundColor: "#27AE60", height: "6px", borderRadius: "4px" },
  whPct:         { fontSize: "12px", color: "#888", textAlign: "right" },
  whStock:       { fontSize: "12px", color: "#aaa" },
  table:         { width: "100%", borderCollapse: "collapse" },
  th:            { textAlign: "left", fontSize: "11px", color: "#999", fontWeight: "600", padding: "6px 8px", borderBottom: "1px solid #eee" },
  td:            { fontSize: "13px", padding: "10px 8px", borderBottom: "1px solid #f5f5f5", color: "#333" },
  badgeAdmin:    { backgroundColor: "#f0eaff", color: "#8E44AD", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgeGreen:    { backgroundColor: "#e8f8ef", color: "#27AE60", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgeYellow:   { backgroundColor: "#fef9e7", color: "#F39C12", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgeRed:      { backgroundColor: "#fdecea", color: "#C0392B", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgeRejected: { backgroundColor: "#fdecea", color: "#E74C3C", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgePurple:   { backgroundColor: "#f0eaff", color: "#8E44AD", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgeBlue:     { backgroundColor: "#eef2ff", color: "#3B5BDB", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  categoryBadge: { backgroundColor: "#eef2ff", color: "#3B5BDB", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600" },
  pendingCard:   { backgroundColor: "#fef9e7", borderRadius: "8px", padding: "14px 16px", display: "flex", justifyContent: "space-between", marginBottom: "10px" },
  pendingTitle:  { fontWeight: "600", fontSize: "14px" },
  pendingSub:    { fontSize: "12px", color: "#888", marginTop: "2px" },
  pendingDays:   { color: "#E67E22", fontWeight: "600", fontSize: "13px" },
  pendingDate:   { color: "#aaa", fontSize: "12px" },
  tabRow:        { display: "flex", gap: "8px", marginBottom: "12px" },
  tabActive:     { padding: "6px 14px", backgroundColor: "#C0392B", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" },
  tabInactive:   { padding: "6px 14px", backgroundColor: "#f5f5f5", color: "#333", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", fontSize: "13px" },
  uploadCard:    { backgroundColor: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  uploadSub:     { color: "#888", fontSize: "13px", marginBottom: "16px" },
  dropzone:      { border: "2px dashed #ddd", borderRadius: "10px", padding: "40px", textAlign: "center", cursor: "pointer" },
  dropIcon:      { fontSize: "32px", marginBottom: "8px" },
  dropText:      { fontWeight: "600", fontSize: "14px", color: "#444" },
  dropMax:       { color: "#aaa", fontSize: "12px", marginTop: "4px" },
  approveBtn:    { padding: "4px 10px", backgroundColor: "#e8f8ef", color: "#27AE60", border: "1px solid #27AE60", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  rejectBtn:     { padding: "4px 10px", backgroundColor: "#fdecea", color: "#E74C3C", border: "1px solid #E74C3C", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
};

export default Dashboard;