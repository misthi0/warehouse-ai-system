import React, { useState, useEffect } from "react";
import API_BASE_URL from "../config";

function Dashboard() {
  const [activeWarehouse, setActiveWarehouse] = useState("Warehouse 1");
  const [stats, setStats] = useState({ totalOrders: 0, dispatchedToday: 0, pendingOrders: 0, vipOrders: 0, unavailable: 0 });
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState({});
  const [vipOrders, setVipOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const username = localStorage.getItem("username") || "admin";

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch dashboard stats
      const statsRes = await fetch(`${API_BASE_URL}/api/dashboard`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalOrders: statsData.total_orders || 0,
          dispatchedToday: statsData.dispatched_today || 0,
          pendingOrders: statsData.pending_orders || 0,
          vipOrders: statsData.vip_orders || 0,
          unavailable: 0
        });
      }

      // Fetch inventory
      const invRes = await fetch(`${API_BASE_URL}/api/inventory/all`, { headers });
      if (invRes.ok) {
        const invData = await invRes.json();
        const inventoryMap = {};
        const warehouseList = [];

        invData.forEach(wh => {
          inventoryMap[wh.warehouse_name] = wh.products.map(p => ({
            id: p.product_id,
            product: p.product_name,
            category: p.category,
            stock: p.available_quantity,
            unit: "pcs",
            restock: p.restock_date || "—",
            limit: p.dispatch_limit,
            units_to_produce: p.units_to_produce
          }));
          warehouseList.push({
            name: wh.warehouse_name,
            dispatched: wh.products.reduce((sum, p) => sum + p.dispatched_today, 0),
            limit: wh.products.reduce((sum, p) => sum + p.dispatch_limit, 0),
            stock: wh.products.reduce((sum, p) => sum + p.available_quantity, 0)
          });
        });

        setInventory(inventoryMap);
        setWarehouses(warehouseList);

        // Set active warehouse to first one
        if (warehouseList.length > 0) {
          setActiveWarehouse(warehouseList[0].name);
        }
      }

      // Fetch orders
      const ordersRes = await fetch(`${API_BASE_URL}/api/orders/1`, { headers });
      // Fetch all VIP and pending orders
      const allOrdersData = [];
      setVipOrders(allOrdersData.filter(o => o.is_vip));
      setPendingOrders(allOrdersData.filter(o => o.status === "pending"));

    } catch (err) {
      console.error("Error fetching dashboard:", err);
    }
  };

  // Auto-fetch on page load
  useEffect(() => {
    fetchDashboard();
  }, []);

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
      const res = await fetch(`${API_BASE_URL}/api/upload-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setUploadMsg(`✅ ${data.message} — ${data.products_added} products added, ${data.warehouses_total} warehouses`);
        fetchDashboard(); // refresh all data
      } else {
        const err = await res.json();
        setUploadMsg(`❌ ${err.detail || "Upload failed"}`);
      }
    } catch (err) {
      setUploadMsg("❌ Could not connect to backend");
    } finally {
      setUploading(false);
    }
  };

  const statCards = [
    { icon: "📦", color: "#C0392B", bg: "#fde8e8", label: "Total Orders",     value: stats.totalOrders },
    { icon: "✅", color: "#27AE60", bg: "#e8f8ef", label: "Dispatched Today", value: stats.dispatchedToday },
    { icon: "⏰", color: "#F39C12", bg: "#fef9e7", label: "Pending Orders",   value: stats.pendingOrders },
    { icon: "⭐", color: "#8E44AD", bg: "#f5eef8", label: "VIP Orders",       value: stats.vipOrders },
    { icon: "⚠️", color: "#E74C3C", bg: "#fdecea", label: "Unavailable",      value: stats.unavailable },
  ];

  const warehouseNames = warehouses.map(w => w.name);

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
        <div style={s.headerRow}>
          <div>
            <h2 style={s.heading}>Admin Dashboard</h2>
            <p style={s.subheading}>Real-time overview of all Aditya Birla Carbon warehouse operations</p>
          </div>
          <button onClick={fetchDashboard} style={s.refreshBtn}>↻ Refresh</button>
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
            {warehouses.map((w, i) => {
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
            <h3 style={s.cardTitle}>⭐ VIP Orders ({vipOrders.length})</h3>
            {vipOrders.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: "13px" }}>No VIP orders yet</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    {["ORDER","PRODUCT","QTY","STATUS","WAREHOUSE"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vipOrders.map((o, i) => (
                    <tr key={i}>
                      <td style={s.td}>#{o.id}</td>
                      <td style={s.td}>{o.product_name}</td>
                      <td style={s.td}>{o.quantity}</td>
                      <td style={s.td}>
                        <span style={o.status === "approved" ? s.badgeGreen : s.badgeYellow}>
                          {o.status}
                        </span>
                      </td>
                      <td style={s.td}>{o.warehouse_id || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pending Orders + Warehouse Inventory */}
        <div style={s.row2}>
          <div style={s.card}>
            <h3 style={s.cardTitle}>⏰ Pending Orders ({pendingOrders.length})</h3>
            {pendingOrders.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: "13px" }}>No pending orders</p>
            ) : (
              pendingOrders.map((o, i) => (
                <div key={i} style={s.pendingCard}>
                  <div>
                    <div style={s.pendingTitle}>#{o.id} — Product #{o.product_id}</div>
                    <div style={s.pendingSub}>Qty: {o.quantity}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={s.pendingDate}>{o.estimated_dispatch_date || "TBD"}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={s.card}>
            <h3 style={s.cardTitle}>🏭 Warehouse Inventory</h3>
            <div style={s.tabRow}>
              {warehouseNames.map(w => (
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
                    {["PRODUCT ID","PRODUCT NAME","CATEGORY","STOCK","UNITS TO PRODUCE","RESTOCK DATE","DISPATCH LIMIT/DAY"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(inventory[activeWarehouse] || []).length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ ...s.td, textAlign: "center", color: "#aaa" }}>
                        No inventory data — upload a PDF first
                      </td>
                    </tr>
                  ) : (
                    (inventory[activeWarehouse] || []).map((item, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ ...s.td, color: "#888", fontFamily: "monospace" }}>{item.id}</td>
                        <td style={{ ...s.td, fontWeight: "600" }}>{item.product}</td>
                        <td style={s.td}><span style={s.categoryBadge}>{item.category}</span></td>
                        <td style={{ ...s.td, fontWeight: "700", color: item.stock < 100 ? "#E74C3C" : "#27AE60" }}>
                          {item.stock}
                        </td>
                        <td style={{ ...s.td, color: "#3B5BDB", fontWeight: "600" }}>
                          {item.units_to_produce}
                        </td>
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

        {/* Upload */}
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
  badgeGreen:    { backgroundColor: "#e8f8ef", color: "#27AE60", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgeYellow:   { backgroundColor: "#fef9e7", color: "#F39C12", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  categoryBadge: { backgroundColor: "#eef2ff", color: "#3B5BDB", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600" },
  pendingCard:   { backgroundColor: "#fef9e7", borderRadius: "8px", padding: "14px 16px", display: "flex", justifyContent: "space-between", marginBottom: "10px" },
  pendingTitle:  { fontWeight: "600", fontSize: "14px" },
  pendingSub:    { fontSize: "12px", color: "#888", marginTop: "2px" },
  pendingDate:   { color: "#aaa", fontSize: "12px" },
  tabRow:        { display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" },
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