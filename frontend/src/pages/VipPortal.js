import React, { useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const mockProducts = [
  { id: "P001", name: "Laptop Pro 15" },
  { id: "P002", name: "Wireless Mouse" },
  { id: "P003", name: "USB-C Hub" },
  { id: "P004", name: "Mechanical Keyboard" },
  { id: "P005", name: "Monitor 27\"" },
  { id: "P006", name: "Webcam HD" },
];

const mockOrders = [
  { id: 3, product: "Laptop Pro 15", qty: 1,   warehouse: "Warehouse 1", status: "dispatched", wait: "—" },
  { id: 2, product: "Laptop Pro 15", qty: 500, warehouse: "—",           status: "pending",    wait: "5d" },
  { id: 1, product: "Laptop Pro 15", qty: 3,   warehouse: "Warehouse 1", status: "dispatched", wait: "—" },
];

function VipPortal() {
  const [search, setSearch]       = useState("");
  const [product, setProduct]     = useState("Laptop Pro 15");
  const [quantity, setQuantity]   = useState(1);
  const [orders, setOrders]       = useState(mockOrders);
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const username = localStorage.getItem("username") || "admin";

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const filteredProducts = mockProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/orders/vip`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product, quantity, type: "vip" }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setOrders(prev => [{ id: prev.length + 1, product, qty: quantity, warehouse: data.warehouse, status: data.status, wait: "—" }, ...prev]);
      } else {
        throw new Error("Backend not connected");
      }
    } catch {
      // Mock response jab backend nahi hai
      const mockResult = { warehouse: "Warehouse 1", status: "dispatched" };
      setResult(mockResult);
      setOrders(prev => [{ id: prev.length + 1, product, qty: quantity, warehouse: mockResult.warehouse, status: mockResult.status, wait: "—" }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

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
          <span style={s.navActive}>⭐ VIP Portal</span>
          <a href="/dashboard" style={s.navLink}>📊 Dashboard</a>
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={s.starIcon}>⭐</span>
            <div>
              <h2 style={s.heading}>VIP Order Portal</h2>
              <p style={s.subheading}>
                As a VIP customer, your orders receive{" "}
                <span style={{ color: "#8E44AD", fontWeight: "700" }}>highest priority</span>
                {" "}and are processed before regular orders. The system allocates maximum dispatch capacity for VIP orders.
              </p>
            </div>
          </div>
        </div>

        {/* VIP Priority Banner */}
        <div style={s.banner}>
          ⚡ <strong>VIP Priority Rules:</strong> VIP orders are matched to warehouses with the highest remaining dispatch capacity. Your orders skip the standard queue and are fulfilled first.
        </div>

        {/* Two Column Layout */}
        <div style={s.row2}>
          {/* Place VIP Order */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>🛒 Place VIP Order</h3>

            <label style={s.label}>Search Product</label>
            <div style={s.searchWrapper}>
              <span style={s.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Filter products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={s.searchInput}
              />
            </div>

            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              style={s.select}
            >
              {filteredProducts.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>

            <label style={s.label}>Quantity</label>
            <input
              type="number"
              value={quantity}
              min="1"
              onChange={(e) => setQuantity(e.target.value)}
              style={s.input}
            />

            <button onClick={handleOrder} style={s.vipBtn} disabled={loading}>
              {loading ? "Processing..." : "⭐ Place VIP Order"}
            </button>

            {/* Result */}
            {result && (
              <div style={s.resultCard}>
                <div style={s.resultTitle}>✅ VIP Order {result.status === "dispatched" ? "Dispatched!" : "Placed!"}</div>
                <div style={s.resultSub}>
                  Order {result.status === "dispatched" ? `dispatched from ${result.warehouse}` : "is pending — stock unavailable"}.
                </div>
                <div style={s.resultBox}>
                  {result.status === "dispatched"
                    ? `Dispatched from: ${result.warehouse}`
                    : "No warehouse available right now"}
                </div>
                <div style={s.pdfLink}>⬇️ Download PDF Report</div>
              </div>
            )}
          </div>

          {/* My VIP Orders */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>📦 My VIP Orders</h3>
            <table style={s.table}>
              <thead>
                <tr>
                  {["ORDER","PRODUCT","QTY","WAREHOUSE","STATUS","WAIT","PDF"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={i}>
                    <td style={s.td}>#{o.id}</td>
                    <td style={s.td}>{o.product}</td>
                    <td style={s.td}>{o.qty}</td>
                    <td style={s.td}>{o.warehouse}</td>
                    <td style={s.td}>
                      <span style={o.status === "dispatched" ? s.badgeGreen : s.badgeYellow}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: o.wait === "—" ? "#aaa" : "#E67E22", fontWeight: "600" }}>
                      {o.wait}
                    </td>
                    <td style={s.td}>
                      <span style={s.pdfIcon}>⬇️</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:        { fontFamily: "Inter, sans-serif", backgroundColor: "#f4f6f9", minHeight: "100vh" },
  navbar:      { backgroundColor: "#8B0000", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px" },
  navLeft:     { display: "flex", alignItems: "center", gap: "12px" },
  navLogo:     { width: "48px", height: "48px", objectFit: "contain", borderRadius: "6px" },
  navTitle:    { color: "#fff", fontWeight: "700", fontSize: "16px" },
  navSub:      { color: "#ffcccc", fontSize: "11px" },
  navLinks:    { display: "flex", alignItems: "center", gap: "24px" },
  navLink:     { color: "#ffcccc", textDecoration: "none", fontSize: "14px" },
  navActive:   { color: "#fff", fontWeight: "700", fontSize: "14px", backgroundColor: "#7D3C98", padding: "8px 16px", borderRadius: "8px" },
  navRight:    { display: "flex", alignItems: "center", gap: "12px" },
  navUser:     { color: "#fff", fontWeight: "600", fontSize: "14px", textAlign: "right" },
  adminBadge:  { backgroundColor: "#C0392B", color: "#fff", fontSize: "11px", padding: "2px 8px", borderRadius: "4px", textAlign: "center" },
  logoutBtn:   { backgroundColor: "transparent", color: "#fff", border: "1px solid #fff", borderRadius: "6px", padding: "6px 14px", cursor: "pointer", fontSize: "13px" },
  body:        { padding: "28px 32px" },
  headerRow:   { marginBottom: "16px" },
  starIcon:    { fontSize: "32px", backgroundColor: "#f5eef8", borderRadius: "10px", padding: "8px" },
  heading:     { margin: 0, fontSize: "24px", fontWeight: "700", color: "#1a1a1a" },
  subheading:  { margin: "4px 0 0", color: "#666", fontSize: "13px", maxWidth: "700px" },
  banner:      { backgroundColor: "#f5eef8", border: "1px solid #d7bde2", borderRadius: "10px", padding: "14px 18px", fontSize: "13px", color: "#6C3483", marginBottom: "24px" },
  row2:        { display: "flex", gap: "20px" },
  card:        { flex: 1, backgroundColor: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardTitle:   { margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "#1a1a1a" },
  label:       { fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px", display: "block" },
  searchWrapper:{ position: "relative", marginBottom: "10px" },
  searchIcon:  { position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" },
  searchInput: { width: "100%", padding: "10px 10px 10px 32px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" },
  select:      { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", marginBottom: "16px", boxSizing: "border-box" },
  input:       { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", marginBottom: "16px", boxSizing: "border-box" },
  vipBtn:      { width: "100%", padding: "13px", backgroundColor: "#8E44AD", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" },
  resultCard:  { marginTop: "16px", backgroundColor: "#f0fff4", border: "1px solid #b2dfdb", borderRadius: "10px", padding: "16px" },
  resultTitle: { fontWeight: "700", fontSize: "15px", color: "#1a7a4a", marginBottom: "4px" },
  resultSub:   { fontSize: "13px", color: "#555", marginBottom: "10px" },
  resultBox:   { backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "6px", padding: "10px", fontSize: "13px", marginBottom: "10px" },
  pdfLink:     { color: "#3B5BDB", fontSize: "13px", cursor: "pointer" },
  table:       { width: "100%", borderCollapse: "collapse" },
  th:          { textAlign: "left", fontSize: "11px", color: "#999", fontWeight: "600", padding: "6px 8px", borderBottom: "1px solid #eee" },
  td:          { fontSize: "13px", padding: "10px 8px", borderBottom: "1px solid #f5f5f5", color: "#333" },
  badgeGreen:  { backgroundColor: "#e8f8ef", color: "#27AE60", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgeYellow: { backgroundColor: "#fef9e7", color: "#F39C12", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  pdfIcon:     { color: "#3B5BDB", cursor: "pointer", fontSize: "16px" },
};

export default VipPortal;