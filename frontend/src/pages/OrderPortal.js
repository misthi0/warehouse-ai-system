import React, { useState, useEffect } from "react";
import API_BASE_URL from "../config";

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

  // Fetch products from backend on load
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

      // Step 1: Create order
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

      // Step 2: Dispatch order
      const dispatchRes = await fetch(`${API_BASE_URL}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_name: username,
          product_id: product.db_product_id,
          quantity: parseInt(quantity),
          is_vip: false
        }),
      });
      const dispatchData = await dispatchRes.json();

      setResult(dispatchData);
      setOrders(prev => [{
        id: orderData.id,
        product: product.product_name,
        qty: quantity,
        warehouse: dispatchData.warehouse_name || "—",
        status: dispatchData.status === "APPROVED" ? "dispatched" : "pending",
        info: dispatchData.status === "APPROVED"
          ? dispatchData.estimated_dispatch_date
          : dispatchData.message
      }, ...prev]);

    } catch (err) {
      console.error("Order failed:", err);
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
          <span style={s.navActive}>📦 Order Portal</span>
          <a href="/vip-portal"  style={s.navLink}>⭐ VIP Portal</a>
          <a href="/dashboard"   style={s.navLink}>📊 Dashboard</a>
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
        <h2 style={s.heading}>Order Portal</h2>
        <p style={s.subheading}>Search products and place orders. The system automatically selects the best warehouse.</p>

        <div style={s.row2}>
          <div style={s.card}>
            <h3 style={s.cardTitle}>🛒 Place an Order</h3>

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
              value={product?.db_product_id || ""}
              onChange={(e) => setProduct(products.find(p => p.db_product_id === parseInt(e.target.value)))}
              style={s.select}
            >
              {filteredProducts.map(p => (
                <option key={p.db_product_id} value={p.db_product_id}>{p.product_name}</option>
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

            <button onClick={handleOrder} style={s.orderBtn} disabled={loading}>
              {loading ? "Processing..." : "Place Order"}
            </button>

            {result && (
              <div style={s.resultCard}>
                <div style={s.resultTitle}>
                  {result.status === "APPROVED" ? "✅ Order Dispatched!" : "⏰ Order Pending"}
                </div>
                <div style={s.resultSub}>
                  {result.status === "APPROVED"
                    ? `Dispatched from ${result.warehouse_name}`
                    : result.message}
                </div>
                <div style={s.resultBox}>
                  {result.status === "APPROVED"
                    ? `Estimated dispatch: ${result.estimated_dispatch_date}`
                    : `Expected after: ${result.estimated_dispatch_date}`}
                </div>
              </div>
            )}
          </div>

          <div style={s.card}>
            <h3 style={s.cardTitle}>📦 My Orders</h3>
            {orders.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: "13px" }}>No orders placed yet</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    {["ORDER","PRODUCT","QTY","WAREHOUSE","STATUS","INFO"].map(h => (
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
                          {o.status === "dispatched" ? "✅ dispatched" : "⏰ pending"}
                        </span>
                      </td>
                      <td style={{ ...s.td, color: "#888", fontSize: "12px" }}>{o.info}</td>
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
  page:         { fontFamily: "Inter, sans-serif", backgroundColor: "#f4f6f9", minHeight: "100vh" },
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
  heading:      { margin: 0, fontSize: "24px", fontWeight: "700", color: "#1a1a1a" },
  subheading:   { margin: "4px 0 24px", color: "#666", fontSize: "13px" },
  row2:         { display: "flex", gap: "20px" },
  card:         { flex: 1, backgroundColor: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardTitle:    { margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "#1a1a1a" },
  label:        { fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px", display: "block" },
  searchWrapper:{ position: "relative", marginBottom: "10px" },
  searchIcon:   { position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" },
  searchInput:  { width: "100%", padding: "10px 10px 10px 32px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" },
  select:       { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", marginBottom: "16px", boxSizing: "border-box" },
  input:        { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", marginBottom: "16px", boxSizing: "border-box" },
  orderBtn:     { width: "100%", padding: "13px", backgroundColor: "#2E86C1", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" },
  resultCard:   { marginTop: "16px", backgroundColor: "#f0fff4", border: "1px solid #b2dfdb", borderRadius: "10px", padding: "16px" },
  resultTitle:  { fontWeight: "700", fontSize: "15px", color: "#1a7a4a", marginBottom: "4px" },
  resultSub:    { fontSize: "13px", color: "#555", marginBottom: "10px" },
  resultBox:    { backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "6px", padding: "10px", fontSize: "13px" },
  table:        { width: "100%", borderCollapse: "collapse" },
  th:           { textAlign: "left", fontSize: "11px", color: "#999", fontWeight: "600", padding: "6px 8px", borderBottom: "1px solid #eee" },
  td:           { fontSize: "13px", padding: "10px 8px", borderBottom: "1px solid #f5f5f5", color: "#333" },
  badgeGreen:   { backgroundColor: "#e8f8ef", color: "#27AE60", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
  badgeYellow:  { backgroundColor: "#fef9e7", color: "#F39C12", padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" },
};

export default OrderPortal;