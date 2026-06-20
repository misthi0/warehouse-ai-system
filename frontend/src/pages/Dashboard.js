import React, { useState, useEffect, useCallback } from "react";
import BackgroundSlider from "../components/BackgroundSlider";

// Double-check your terminal to ensure FastAPI is running on port 8000!
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// 🕹️ IMMEDATELY ACCESSIBLE MULTI-THEME TOGGLE SYSTEM 
function ThemeSwitcher() {
  const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <button onClick={toggleTheme} style={s.themeBtn}>
      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}

function Dashboard() {
  const [activeWarehouse, setActiveWarehouse] = useState("");
  const [stats, setStats] = useState({ totalOrders: 0, dispatchedToday: 0, pendingOrders: 0, vipOrders: 0, unavailable: 0 });
  const [warehouses, setWarehouses] = useState([]);
  const [vipOrders, setVipOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [inventory, setInventory] = useState({});
  const [regRequests, setRegRequests] = useState([]);
  const [orderRequests, setOrderRequests] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const username = localStorage.getItem("username") || "admin";

  const fetchAll = useCallback(async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory/all`, { headers });
      if (res.ok) {
        const json = await res.json();
        const inv = {};
        const whs = [];
        json.forEach((wh) => {
          inv[wh.warehouse_name] = wh.products.map((p) => ({
            inventory_id: p.inventory_id,
            id: p.product_id || p.pdf_product_id || `P${p.inventory_id}`,
            product: p.product_name,
            category: p.category || "General",
            stock: p.available_quantity,
            unit: "pcs",
            restock: p.restock_date || "—",
            limit: p.dispatch_limit,
          }));
          whs.push({
            name: wh.warehouse_name,
            dispatched: wh.products.reduce((s, p) => s + (p.dispatched_today || 0), 0),
            limit: wh.products.reduce((s, p) => s + (p.dispatch_limit || 0), 0),
            stock: wh.products.reduce((s, p) => s + (p.available_quantity || 0), 0),
          });
        });
        setWarehouses(whs);
        setInventory(inv);
        setStats(prev => ({ ...prev, dispatchedToday: whs.reduce((s, w) => s + w.dispatched, 0) }));
        if (whs.length > 0) setActiveWarehouse(prev => prev || whs[0].name);
      }
    } catch { console.log("Inventory fetch failed"); }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/registrations`, { headers });
      if (res.ok) setRegRequests(await res.json());
    } catch { console.log("Reg requests fetch failed"); }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/orders`, { headers });
      if (res.ok) {
        const allOrders = await res.json();
        setOrderRequests(allOrders);
        const vipList = allOrders.filter(o => o.type === "vip");
        const pendingList = allOrders.filter(o => o.status === "pending");
        setVipOrders(vipList);
        setPendingOrders(pendingList);
        setStats(prev => ({
          ...prev,
          totalOrders: allOrders.length,
          pendingOrders: pendingList.length,
          vipOrders: vipList.length,
          unavailable: allOrders.filter(o => o.status === "rejected").length
        }));
      }
    } catch { console.log("Order requests fetch failed"); }
  }, []);

  useEffect(() => { 
    fetchAll(); 
  }, [fetchAll]);

  const handleLogout = () => { 
    localStorage.clear(); 
    window.location.href = "/"; 
  };

  const handlePdfUpload = async (file) => {
    if (!file || (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".pdf"))) { 
      setUploadMsg("❌ Please upload a valid Excel or PDF file"); 
      return; 
    }
    if (file.size > 10 * 1024 * 1024) { setUploadMsg("❌ File too large. Max 10MB"); return; }
    
    setUploading(true); 
    setUploadMsg("⏳ Uploading file to server...");
    
    const formData = new FormData();
    formData.append("file", file); 
    
    const targetUrl = `${API_BASE_URL}/api/inventory/upload`;
    
    try {
      const res = await fetch(targetUrl, {
        method: "POST", 
        body: formData, 
      });
      
      if (res.ok) {
        const result = await res.json();
        setUploadMsg(`✅ Success! ${result.inventory_added || 0} records added, ${result.inventory_updated || 0} updated.`);
        await fetchAll();
      } else {
        const err = await res.json();
        const errorString = typeof err.detail === 'object' ? JSON.stringify(err.detail) : err.detail;
        setUploadMsg(`❌ Server Error (${res.status}): ${errorString || "Unknown error"}`);
      }
    } catch (e) { 
      setUploadMsg(`⚠️ Network Failure: Connection blocked. Ensure your FastAPI server is running on port 8000.`); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleRegAction = async (id, action) => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    try {
      await fetch(`${API_BASE_URL}/api/admin/registrations/${id}/${action}`, { method: "POST", headers });
      await fetchAll();
    } catch { console.log("Action failed"); }
  };

  // 🌟 MODIFIED: Redirects approval confirmations straight to the main manual dispatch engine route
  const handleOrderAction = async (id, action) => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    
    // Choose route based on context selection
    const targetUrl = action === "approved" 
      ? `${API_BASE_URL}/api/dispatch/${id}`           // Manual Engine Dispatch Route
      : `${API_BASE_URL}/api/admin/orders/${id}/rejected`; // Fallback Order Denial Route

    try {
      const res = await fetch(targetUrl, { method: "POST", headers });
      if (res.ok) {
        setOrderRequests(prev => prev.map(o => o.id === id ? { ...o, status: action } : o));
        await fetchAll();
      } else {
        const errorData = await res.json();
        alert(`Fulfillment Error: ${errorData.detail || "Unable to assign appropriate stock capacity"}`);
      }
    } catch { 
      console.log("Order Action request failed"); 
    }
  };

  const statCards = [
    { icon: "📦", color: "#C0392B", bg: "var(--bg-stat-box)", label: "Total Orders",     value: stats.totalOrders },
    { icon: "✅", color: "#27AE60", bg: "var(--bg-stat-box)", label: "Dispatched Today", value: stats.dispatchedToday },
    { icon: "⏰", color: "#F39C12", bg: "var(--bg-stat-box)", label: "Pending Orders",   value: stats.pendingOrders },
    { icon: "⭐", color: "#8E44AD", bg: "var(--bg-stat-box)", label: "VIP Orders",       value: stats.vipOrders },
    { icon: "⚠️", color: "#E74C3C", bg: "var(--bg-stat-box)", label: "Unavailable",      value: stats.unavailable },
  ];

  const warehouseNames = warehouses.map(w => w.name);
  const currentWarehouse = activeWarehouse || warehouseNames[0] || "";

  return (
    <div style={s.page}>
      <BackgroundSlider />

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
          <ThemeSwitcher /> 
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
                <div style={s.statValue}>{c.value ?? 0}</div>
                <div style={s.statLabel}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Registration Requests */}
        <div style={{ ...s.card, marginBottom: "24px" }}>
          <h3 style={s.cardTitle}>👤 Registration Requests</h3>
          {regRequests.length === 0 ? <p style={s.emptyText}>No registration requests yet.</p> : (
            <table style={s.table}>
              <thead><tr>{["ID","USERNAME","MOBILE","ROLE","DATE","STATUS","ACTION"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {regRequests.map((r, i) => (
                  <tr key={i}>
                    <td style={s.td}>#{r.id}</td>
                    <td style={{ ...s.td, fontWeight: "600", color: "var(--text-main)" }}>{r.username}</td>
                    <td style={s.td}>{r.mobile || "—"}</td>
                    <td style={s.td}><span style={r.role === "vip" ? s.badgePurple : s.badgeBlue}>{r.role?.toUpperCase()}</span></td>
                    <td style={s.td}>{r.date || r.created_at || "—"}</td>
                    <td style={s.td}><span style={r.status === "approved" ? s.badgeGreen : r.status === "rejected" ? s.badgeRejected : s.badgeYellow}>{r.status}</span></td>
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
          <h3 style={s.cardTitle}>🛒 Order Approval Requests</h3>
          {orderRequests.length === 0 ? <p style={s.emptyText}>No order requests yet.</p> : (
            <table style={s.table}>
              <thead><tr>{["ORDER","USER","PRODUCT","QTY","TYPE","DATE","STATUS","ACTION"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {orderRequests.map((o, i) => (
                  <tr key={i}>
                    <td style={s.td}>#{o.id}</td>
                    <td style={{ ...s.td, fontWeight: "600", color: "var(--text-main)" }}>{o.username}</td>
                    <td style={s.td}>{o.product}</td>
                    <td style={s.td}>{o.qty}</td>
                    <td style={s.td}><span style={o.type === "vip" ? s.badgePurple : s.badgeBlue}>{o.type?.toUpperCase()}</span></td>
                    <td style={s.td}>{o.date}</td>
                    <td style={s.td}><span style={o.status === "approved" ? s.badgeGreen : o.status === "rejected" ? s.badgeRejected : o.badgeYellow}>{o.status}</span></td>
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
            {warehouses.length === 0 ? <p style={s.emptyText}>No data yet. Upload an Excel/PDF report.</p> : warehouses.map((w, i) => {
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
            {vipOrders.length === 0 ? <p style={s.emptyText}>No VIP orders found.</p> : (
              <table style={s.table}>
                <thead><tr>{["ORDER","PRODUCT","QTY","TYPE","STATUS","WAREHOUSE"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {vipOrders.map((o, i) => (
                    <tr key={i}>
                      <td style={s.td}>#{o.id}</td>
                      <td style={s.td}>{o.product}</td>
                      <td style={s.td}>{o.qty}</td>
                      <td style={s.td}><span style={s.badgeAdmin}>{o.type?.toUpperCase()}</span></td>
                      <td style={s.td}><span style={o.status === "approved" ? s.badgeGreen : o.status === "rejected" ? s.badgeRejected : o.badgeYellow}>{o.status}</span></td>
                      <td style={s.td}>{o.warehouse || "—"}</td>
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
                  <div style={s.pendingSub}>Qty: {o.qty} · {o.type?.toUpperCase()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={s.pendingDays}>{o.days || 0} days</div>
                  <div style={s.pendingDate}>{o.date || "—"}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={s.card}>
            <h3 style={s.cardTitle}>🏭 Warehouse Inventory</h3>
            {warehouseNames.length === 0 ? <p style={s.emptyText}>Upload a report to view live inventory records.</p> : (
              <>
                <div style={s.tabRow}>
                  {warehouseNames.map(w => (
                    <button key={w} onClick={() => setActiveWarehouse(w)}
                      style={currentWarehouse === w ? s.tabActive : s.tabInactive}>{w}</button>
                  ))}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={s.table}>
                    <thead>
                      <tr>{["PRODUCT ID","PRODUCT NAME","CATEGORY","CURRENT STOCK","UNIT","RESTOCK DATE","DISPATCH LIMIT/DAY"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {(inventory[currentWarehouse] || []).map((item, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-table-stripe)" }}>
                          <td style={{ ...s.td, color: "#888", fontFamily: "monospace" }}>{item.id}</td>
                          <td style={{ ...s.td, fontWeight: "600", color: "var(--text-main)" }}>{item.product}</td>
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
              </>
            )}
          </div>
        </div>

        {/* Upload Card */}
        <div style={s.uploadCard}>
          <h3 style={s.cardTitle}>⬆️ Upload Monthly Warehouse Report</h3>
          <p style={s.uploadSub}>Drop your source Excel (.xlsx) or operational summary PDF here to instantly refresh warehouse sync values.</p>
          {uploadMsg && (
            <div style={{ padding: "12px 16px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px", lineHeight: "1.4",
              backgroundColor: uploadMsg.startsWith("✅") ? "#e8f8ef" : uploadMsg.startsWith("⏳") ? "#eef2ff" : "#fdecea",
              color: uploadMsg.startsWith("✅") ? "#27AE60" : uploadMsg.startsWith("⏳") ? "#3B5BDB" : "#C0392B" }}>
              {uploadMsg}
            </div>
          )}
          <label style={{ cursor: "pointer" }}>
            <input type="file" accept=".xlsx,.xls,.pdf" style={{ display: "none" }}
              onChange={(e) => handlePdfUpload(e.target.files[0])} />
            <div style={{ ...s.dropzone, borderColor: uploading ? "#C0392B" : "var(--border-ui)" }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handlePdfUpload(e.dataTransfer.files[0]); }}>
              <div style={s.dropIcon}>{uploading ? "⏳" : "📄"}</div>
              <div style={s.dropText}>{uploading ? "Processing layout vectors..." : "Drop file here or click to browse"}</div>
              <div style={s.dropMax}>Supports .xlsx, .xls, and .pdf up to 10MB</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:          { fontFamily: "Inter, sans-serif", backgroundColor: "var(--bg-app)", minHeight: "100vh", transition: "all 0.3s ease", position: "relative" },
  navbar:        { backgroundColor: "#8B0000", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", position: "relative", zIndex: 1 },
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
  body:          { padding: "28px 32px", position: "relative", zIndex: 1 },
  headerRow:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  heading:       { margin: 0, fontSize: "24px", fontWeight: "700", color: "var(--text-main)" },
  subheading:    { margin: "4px 0 0", color: "var(--text-muted)", fontSize: "13px" },
  refreshBtn:    { padding: "8px 16px", border: "1px solid var(--border-ui)", borderRadius: "8px", backgroundColor: "var(--bg-card)", color: "var(--text-main)", cursor: "pointer", fontSize: "13px" },
  statsRow:      { display: "flex", gap: "16px", marginBottom: "24px" },
  statCard:      { flex: 1, backgroundColor: "var(--bg-card)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 1px 4px var(--shadow-ui)", transition: "all 0.3s ease" },
  statIcon:      { width: "48px", height: "48px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" },
  statValue:     { fontSize: "28px", fontWeight: "700", color: "var(--text-main)" },
  statLabel:     { fontSize: "12px", color: "var(--text-muted)" },
  row2:          { display: "flex", gap: "20px", marginBottom: "24px" },
  card:          { flex: 1, backgroundColor: "var(--bg-card)", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 4px var(--shadow-ui)", transition: "all 0.3s ease" },
  cardTitle:     { margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "var(--text-main)" },
  emptyText:     { color: "#aaa", fontSize: "13px", textAlign: "center", padding: "20px 0" },
  whRow:         { display: "flex", justifyContent: "space-between", color: "var(--text-main)" },
  whName:        { fontWeight: "600", fontSize: "14px" },
  whDispatch:    { fontSize: "12px", color: "var(--text-muted)" },
  progressBg:    { backgroundColor: "var(--border-table)", borderRadius: "4px", height: "6px", margin: "6px 0 2px" },
  progressFill:  { backgroundColor: "#27AE60", height: "6px", borderRadius: "4px" },
  whPct:         { fontSize: "12px", color: "var(--text-muted)", textAlign: "right" },
  whStock:       { fontSize: "12px", color: "#aaa" },
  table:         { width: "100%", borderCollapse: "collapse" },
  th:            { textAlign: "left", fontSize: "11px", color: "var(--text-muted)", fontWeight: "600", padding: "6px 8px", borderBottom: "1px solid var(--border-table)", backgroundColor: "var(--bg-table-th)" },
  td:            { fontSize: "13px", padding: "10px 8px", borderBottom: "1px solid var(--border-table)", color: "var(--text-main)" },
  badgeAdmin:    { backgroundColor: "#f0eaff", color: "#8E44AD", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgeGreen:    { backgroundColor: "#e8f8ef", color: "#27AE60", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgeYellow:   { backgroundColor: "#fef9e7", color: "#F39C12", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgeRejected: { backgroundColor: "#fdecea", color: "#E74C3C", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgePurple:   { backgroundColor: "#f0eaff", color: "#8E44AD", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgeBlue:     { backgroundColor: "#eef2ff", color: "#3B5BDB", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  categoryBadge: { backgroundColor: "#eef2ff", color: "#3B5BDB", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600" },
  pendingCard:   { backgroundColor: "var(--bg-table-stripe)", borderRadius: "8px", padding: "14px 16px", display: "flex", justifyContent: "space-between", marginBottom: "10px", color: "var(--text-main)" },
  pendingTitle:  { fontWeight: "600", fontSize: "14px" },
  pendingSub:    { fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" },
  pendingDays:   { color: "#E67E22", fontWeight: "600", fontSize: "13px" },
  pendingDate:   { color: "#aaa", fontSize: "12px" },
  tabRow:        { display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" },
  tabActive:     { padding: "6px 14px", backgroundColor: "#C0392B", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" },
  tabInactive:   { padding: "6px 14px", backgroundColor: "var(--bg-table-stripe)", color: "var(--text-main)", border: "1px solid var(--border-ui)", borderRadius: "6px", cursor: "pointer", fontSize: "13px" },
  uploadCard:    { backgroundColor: "var(--bg-card)", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 4px var(--shadow-ui)", transition: "all 0.3s ease" },
  uploadSub:     { color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" },
  dropzone:      { border: "2px dashed var(--border-ui)", borderRadius: "10px", padding: "40px", textAlign: "center", cursor: "pointer" },
  dropIcon:      { fontSize: "32px", marginBottom: "8px" },
  dropText:      { fontWeight: "600", fontSize: "14px", color: "var(--text-main)" },
  dropMax:       { color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" },
  approveBtn:    { padding: "4px 10px", backgroundColor: "#e8f8ef", color: "#27AE60", border: "1px solid #27AE60", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  rejectBtn:     { padding: "4px 10px", backgroundColor: "#fdecea", color: "#E74C3C", border: "1px solid #E74C3C", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  themeBtn:      { padding: "6px 14px", backgroundColor: "rgba(255, 255, 255, 0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600", marginLeft: "10px" },
};

export default Dashboard;