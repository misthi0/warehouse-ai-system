import React, { useState, useEffect } from "react";
import API_BASE_URL from "../config";

// 🕹️ CONTEXTUAL MULTI-THEME TOGGLE SYSTEM 
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

function OrderPortal() {
  const [search, setSearch]     = useState("");
  const [products, setProducts] = useState([]);
  const [product, setProduct]   = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [orders, setOrders]     = useState([]);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const username = localStorage.getItem("username") || "admin";

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/products`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
          if (data.length > 0) setProduct(data[0]);
        }
      } catch (err) {
        console.error("Could not fetch products:", err);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!product) return;
    setLoading(true);
    setResult(null);
    try {
      const token = localStorage.getItem("token");

      const orderRes = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_name: username,
          product_id: product.db_product_id,
          quantity: parseInt(quantity),
          is_vip: false
        }),
      });
      const orderData = await orderRes.json();

      setResult({ status: "PENDING", message: "Order placed successfully. Waiting for admin approval." });
      
      setOrders(prev => [{
        id: orderData.id,
        product: product.product_name,
        qty: quantity,
        warehouse: "—",
        status: "pending",
        info: "Awaiting admin approval"
      }, ...prev]);

    } catch (err) {
      console.error("Order failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.navbar}>
        <div style={s.navLeft}>
          <img src="/logo-abc.png" alt="logo" style={s.navLogo} />
          <div>
            <div style={s.navTitle}>Aditya Birla Carbon</div>
            <div style={s.navSub}>Multi-Warehouse Dispatch System</div>
          </div>
        </div>
        <div style={s.navLinks}>
          <span style={s.navActive}>📦 Order Portal</span>
          <a href="/vip-portal"  style={s.navLink}>⭐ VIP Portal</a>
          <a href="/dashboard"   style={s.navLink}>📊 Dashboard</a>
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

      {/* 🌟 Shifted entire content container upward */}
      <div style={{ ...s.body, paddingTop: "12px" }}>
        {/* 🌟 Wrapped text headers inside a compact row layout matching the VIP portal format */}
        <div style={{ marginBottom: "12px" }}>
          {/* 🌟 Title text shrunk from 24px down to 1.45rem */}
          <h2 style={{ ...s.heading, fontSize: "1.45rem", fontWeight: "700" }}>Order Portal</h2>
          {/* 🌟 Subheading spacing tightened and text resized down to 0.82rem */}
          <p style={{ ...s.subheading, fontSize: "0.82rem", margin: "2px 0 0" }}>
            Place orders. Approval required from the Dashboard.
          </p>
        </div>

        <div style={s.row2}>
          <div style={s.card}>
            <h3 style={s.cardTitle}>🛒 Place an Order</h3>
            <label style={s.label}>Search Product</label>
            <div style={s.searchWrapper}>
              <span style={s.searchIcon}>🔍</span>
              <input type="text" placeholder="Filter products..." value={search} onChange={(e) => setSearch(e.target.value)} style={s.searchInput} />
            </div>

            <select value={product?.db_product_id || ""} onChange={(e) => setProduct(products.find(p => p.db_product_id === parseInt(e.target.value)))} style={s.select}>
              {filteredProducts.map(p => <option key={p.db_product_id} value={p.db_product_id}>{p.product_name}</option>)}
            </select>

            <label style={s.label}>Quantity</label>
            <input type="number" value={quantity} min="1" onChange={(e) => setQuantity(e.target.value)} style={s.input} />

            <button onClick={handleOrder} style={s.orderBtn} disabled={loading}>{loading ? "Processing..." : "Place Order"}</button>

            {result && (
              <div style={s.resultCard}>
                <div style={s.resultTitle}>⏰ Order Pending</div>
                <div style={s.resultSub}>{result.message}</div>
              </div>
            )}
          </div>

          <div style={s.card}>
            <h3 style={s.cardTitle}>📦 My Orders</h3>
            {orders.length === 0 ? <p style={s.emptyText}>No orders placed yet</p> : (
              <table style={s.table}>
                <thead>
                  <tr>{["ORDER","PRODUCT","QTY","WAREHOUSE","STATUS","INFO"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={i}>
                      <td style={s.td}>#{o.id}</td>
                      <td style={{ ...s.td, fontWeight: "600" }}>{o.product}</td>
                      <td style={s.td}>{o.qty}</td>
                      <td style={s.td}>{o.warehouse}</td>
                      <td style={s.td}><span style={s.badgeYellow}>⏰ pending</span></td>
                      <td style={{ ...s.td, color: "var(--text-muted)", fontSize: "12px" }}>{o.info}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:         { fontFamily: "Inter, sans-serif", backgroundColor: "var(--bg-app)", minHeight: "100vh", transition: "all 0.3s ease" },
  navbar:       { backgroundColor: "#8B0000", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px" },
  navLeft:      { display: "flex", alignItems: "center", gap: "12px" },
  navLogo:      { width: "48px", height: "48px", objectFit: "contain", borderRadius: "6px" },
  navTitle:     { color: "#fff", fontWeight: "700", fontSize: "16px" },
  navSub:       { color: "#ffcccc", fontSize: "11px" },
  navLinks:     { display: "flex", alignItems: "center", gap: "24px" },
  navLink:      { color: "#ffcccc", textDecoration: "none", fontSize: "14px" },
  navActive:    { color: "#fff", fontWeight: "700", fontSize: "14px", backgroundColor: "#C0392B", padding: "8px 16px", borderRadius: "8px" },
  navRight:     { display: "flex", alignItems: "center", gap: "12px" },
  navUser:      { color: "#fff", fontWeight: "600", fontSize: "14px", textAlign: "right" },
  adminBadge:   { backgroundColor: "#C0392B", color: "#fff", fontSize: "11px", padding: "2px 8px", borderRadius: "4px", textAlign: "center" },
  logoutBtn:    { backgroundColor: "transparent", color: "#fff", border: "1px solid #fff", borderRadius: "6px", padding: "6px 14px", cursor: "pointer", fontSize: "13px" },
  body:         { padding: "28px 32px" },
  heading:      { margin: 0, fontSize: "24px", fontWeight: "700", color: "var(--text-main)" },
  subheading:   { margin: "4px 0 24px", color: "var(--text-muted)", fontSize: "13px" },
  row2:         { display: "flex", gap: "20px" },
  card:         { flex: 1, backgroundColor: "var(--bg-card)", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 4px var(--shadow-ui)", transition: "all 0.3s ease" },
  cardTitle:    { margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "var(--text-main)" },
  label:        { fontSize: "13px", fontWeight: "600", color: "var(--text-label)", marginBottom: "6px", display: "block" },
  searchWrapper:{ position: "relative", marginBottom: "10px" },
  searchIcon:   { position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "var(--text-muted)" },
  searchInput:  { width: "100%", padding: "10px 10px 10px 32px", borderRadius: "8px", border: "1px solid var(--border-ui)", backgroundColor: "var(--bg-app)", color: "var(--text-main)", fontSize: "13px", boxSizing: "border-box" },
  select:       { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-ui)", backgroundColor: "var(--bg-app)", color: "var(--text-main)", fontSize: "13px", marginBottom: "16px", boxSizing: "border-box" },
  input:        { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-ui)", backgroundColor: "var(--bg-app)", color: "var(--text-main)", fontSize: "13px", marginBottom: "16px", boxSizing: "border-box" },
  orderBtn:     { width: "100%", padding: "13px", backgroundColor: "#2E86C1", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" },
  resultCard:   { marginTop: "16px", backgroundColor: "var(--bg-app)", border: "1px solid var(--border-ui)", borderRadius: "10px", padding: "16px" },
  resultTitle:  { fontWeight: "700", fontSize: "15px", color: "var(--text-main)", marginBottom: "4px" },
  resultSub:    { fontSize: "13px", color: "var(--text-muted)", marginBottom: "10px" },
  table:        { width: "100%", borderCollapse: "collapse" },
  th:           { textAlign: "left", fontSize: "11px", color: "var(--text-muted)", fontWeight: "600", padding: "6px 8px", borderBottom: "1px solid var(--border-table)", backgroundColor: "var(--bg-app)" },
  td:           { fontSize: "13px", padding: "10px 8px", borderBottom: "1px solid var(--border-table)", color: "var(--text-main)" },
  emptyText:    { color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" },
  badgeYellow:  { backgroundColor: "#fef9e7", color: "#F39C12", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  themeBtn:     { padding: "6px 14px", backgroundColor: "rgba(255, 255, 255, 0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600", marginLeft: "10px" },
};

export default OrderPortal;