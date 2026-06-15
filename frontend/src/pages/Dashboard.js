import React, { useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const mockData = {
  stats: { totalOrders: 2, dispatchedToday: 1, pendingOrders: 1, vipOrders: 0, unavailable: 0 },
  warehouses: [
    { name: "Warehouse 1", dispatched: 3, limit: 380, stock: 1597 },
    { name: "Warehouse 2", dispatched: 0, limit: 460, stock: 1380 },
    { name: "Warehouse 3", dispatched: 0, limit: 360, stock: 1090 },
  ],
  vipOrders: [
    { id: 2, product: "Laptop Pro 15", qty: 500, type: "ADMIN", status: "pending",    warehouse: "—" },
    { id: 1, product: "Laptop Pro 15", qty: 3,   type: "ADMIN", status: "dispatched", warehouse: "Warehouse 1" },
  ],
  pendingOrders: [
    { id: 2, product: "Laptop Pro 15", qty: 500, type: "ADMIN", days: 5, date: "2026-06-19" },
  ],
  inventory: {
    "Warehouse 1": [
      { id: "P001", product: "Wireless Mouse",      category: "Electronics", stock: 500, unit: "pcs", restock: "—",          limit: 100 },
      { id: "P002", product: "USB-C Hub",            category: "Electronics", stock: 300, unit: "pcs", restock: "—",          limit: 80  },
      { id: "P003", product: "Mechanical Keyboard",  category: "Electronics", stock: 150, unit: "pcs", restock: "2026-06-19", limit: 40  },
      { id: "P004", product: 'Monitor 27"',          category: "Electronics", stock: 80,  unit: "pcs", restock: "—",          limit: 20  },
      { id: "P005", product: "Webcam HD",            category: "Electronics", stock: 250, unit: "pcs", restock: "—",          limit: 60  },
      { id: "P006", product: "Headphones Pro",       category: "Electronics", stock: 120, unit: "pcs", restock: "2026-06-17", limit: 30  },
    ],
    "Warehouse 2": [],
    "Warehouse 3": [],
  },
};

function Dashboard() {
  const [activeWarehouse, setActiveWarehouse] = useState("Warehouse 1");
  const [data, setData] = useState(mockData);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const username = localStorage.getItem("username") || "admin";

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const handleRefresh = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.log("Backend not connected yet, using mock data");
    }
  };

  const handlePdfUpload = async (file) => {
    if (!file || file.type !== "application/pdf") {
      setUploadMsg("❌ Please upload a valid PDF file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadMsg("❌ File too large. Max 10MB");
      return;
    }
    setUploading(true);
    setUploadMsg("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/inventory/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        setUploadMsg("✅ PDF uploaded successfully! Inventory updated.");
        handleRefresh();
      } else {
        setUploadMsg("⚠️ Backend not connected yet — PDF received on frontend.");
      }
    } catch (err) {
      setUploadMsg("⚠️ Backend not connected yet — PDF received on frontend.");
    } finally {
      setUploading(false);
    }
  };

  const statCards = [
    { icon: "📦", color: "#C0392B", bg: "#fde8e8", label: "Total Orders",     value: data.stats.totalOrders },
    { icon: "✅", color: "#27AE60", bg: "#e8f8ef", label: "Dispatched Today", value: data.stats.dispatchedToday },
    { icon: "⏰", color: "#F39C12", bg: "#fef9e7", label: "Pending Orders",   value: data.stats.pendingOrders },
    { icon: "⭐", color: "#8E44AD", bg: "#f5eef8", label: "VIP Orders",       value: data.stats.vipOrders },
    { icon: "⚠️", color: "#E74C3C", bg: "#fdecea", label: "Unavailable",      value: data.stats.unavailable },
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

      {/* Body */}
      <div style={s.body}>
        {/* Header */}
        <div style={s.headerRow}>
          <div>
            <h2 style={s.heading}>Admin Dashboard</h2>
            <p style={s.subheading}>Real-time overview of all Aditya Birla Carbon warehouse operations</p>
          </div>
          <button onClick={handleRefresh} style={s.refreshBtn}>↻ Refresh</button>
        </div>

        {/* Stat Cards */}
        <div style={s.statsRow}>
          {statCards.map((c, i) => (
            <div key={i} style={s.statCard}>
              <div style={{ ...s.statIcon, backgroundColor: c.bg, color: c.color }}>{c.icon}</div>
              <div>
                <div style={s.statValue}>{c.value}</div>
                <div style={s.statLabel}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Warehouse Utilization + VIP Orders */}
        <div style={s.row2}>
          <div style={s.card}>
            <h3 style={s.cardTitle}>⚡ Warehouse Utilization</h3>
            {data.warehouses.map((w, i) => {
              const pct = w.limit > 0 ? ((w.dispatched / w.limit) * 100).toFixed(1) : 0;
              return (
                <div key={i} style={{ marginBottom: "16px" }}>
                  <div style={s.whRow}>
                    <span style={s.whName}>{w.name}</span>
                    <span style={s.whDispatch}>{w.dispatched}/{w.limit} dispatched</span>
                  </div>
                  <div style={s.progressBg}>
                    <div style={{ ...s.progressFill, width: `${pct}%` }} />
                  </div>
                  <div style={s.whPct}>{pct}%</div>
                  <div style={s.whStock}>Stock: {w.stock.toLocaleString()} units</div>
                </div>
              );
            })}
          </div>

          <div style={s.card}>
            <h3 style={s.cardTitle}>⭐ VIP Orders ({data.vipOrders.length})</h3>
            <table style={s.table}>
              <thead>
                <tr>
                  {["ORDER","PRODUCT","QTY","TYPE","STATUS","WAREHOUSE"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.vipOrders.map((o, i) => (
                  <tr key={i}>
                    <td style={s.td}>#{o.id}</td>
                    <td style={s.td}>{o.product}</td>
                    <td style={s.td}>{o.qty}</td>
                    <td style={s.td}><span style={s.badgeAdmin}>{o.type}</span></td>
                    <td style={s.td}>
                      <span style={o.status === "dispatched" ? s.badgeGreen : s.badgeYellow}>
                        {o.status}
                      </span>
                    </td>
                    <td style={s.td}>{o.warehouse}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Orders + Warehouse Inventory */}
        <div style={s.row2}>
          <div style={s.card}>
            <h3 style={s.cardTitle}>⏰ Pending Orders ({data.pendingOrders.length})</h3>
            {data.pendingOrders.map((o, i) => (
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
              {["Warehouse 1", "Warehouse 2", "Warehouse 3"].map(w => (
                <button
                  key={w}
                  onClick={() => setActiveWarehouse(w)}
                  style={activeWarehouse === w ? s.tabActive : s.tabInactive}
                >
                  {w}
                </button>
              ))}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["PRODUCT ID","PRODUCT NAME","CATEGORY","CURRENT STOCK","UNIT","RESTOCK DATE","DISPATCH LIMIT/DAY"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.inventory[activeWarehouse] || []).length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ ...s.td, textAlign: "center", color: "#aaa" }}>
                        No inventory data
                      </td>
                    </tr>
                  ) : (
                    (data.inventory[activeWarehouse] || []).map((item, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ ...s.td, color: "#888", fontFamily: "monospace" }}>{item.id}</td>
                        <td style={{ ...s.td, fontWeight: "600" }}>{item.product}</td>
                        <td style={s.td}><span style={s.categoryBadge}>{item.category}</span></td>
                        <td style={{ ...s.td, fontWeight: "700", color: item.stock < 100 ? "#E74C3C" : "#27AE60" }}>
                          {item.stock}
                        </td>
                        <td style={s.td}>{item.unit}</td>
                        <td style={{ ...s.td, color: item.restock === "—" ? "#aaa" : "#E67E22" }}>
                          {item.restock}
                        </td>
                        <td style={{ ...s.td, fontWeight: "700", color: "#C0392B" }}>{item.limit}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Upload Monthly Report */}
        <div style={s.uploadCard}>
          <h3 style={s.cardTitle}>⬆️ Upload Monthly Warehouse Report</h3>
          <p style={s.uploadSub}>
            Upload a PDF with warehouse inventory data. The system extracts product quantities,
            dispatch limits and restock dates, then updates the database automatically.
          </p>

          {uploadMsg && (
            <div style={{
              padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "13px",
              backgroundColor: uploadMsg.startsWith("✅") ? "#e8f8ef" : "#fdecea",
              color: uploadMsg.startsWith("✅") ? "#27AE60" : "#C0392B",
            }}>
              {uploadMsg}
            </div>
          )}

          <label style={{ cursor: "pointer" }}>
            <input
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) => handlePdfUpload(e.target.files[0])}
            />
            <div
              style={{ ...s.dropzone, borderColor: uploading ? "#C0392B" : "#ddd" }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handlePdfUpload(e.dataTransfer.files[0]); }}
            >
              <div style={s.dropIcon}>{uploading ? "⏳" : "📄"}</div>
              <div style={s.dropText}>{uploading ? "Uploading..." : "Drop PDF here or click to browse"}</div>
              <div style={s.dropMax}>Max 10 MB</div>
            </div>
          </label>

          <details style={{ marginTop: "8px" }}>
            <summary style={{ cursor: "pointer", color: "#666", fontSize: "13px" }}>
              ▶ PDF format guide
            </summary>
            <p style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
              PDF should contain: Product ID, Product Name, Category, Stock, Unit, Restock Date, Dispatch Limit
            </p>
          </details>
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
  cardTitle:     { margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "#1a1a1a" },
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
};

export default Dashboard;