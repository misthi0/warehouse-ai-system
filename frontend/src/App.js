import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import OrderPortal from "./pages/OrderPortal";
import VipPortal from "./pages/VipPortal";
import "./App.css";

// Route protection
function ProtectedRoute({ element, allowedRoles }) {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" />;
  if (!allowedRoles.includes(role)) return <Navigate to="/unauthorized" />;
  return element;
}

function Unauthorized() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚫</div>
      <h2 style={{ color: "#C0392B" }}>Access Denied</h2>
      <p style={{ color: "#666" }}>You don't have permission to view this page.</p>
      <button onClick={() => { localStorage.clear(); window.location.href = "/"; }}
        style={{ marginTop: "20px", padding: "10px 24px", backgroundColor: "#C0392B", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>
        Back to Login
      </button>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/dashboard"   element={<ProtectedRoute element={<Dashboard />}   allowedRoles={["admin"]} />} />
        <Route path="/vip-portal"  element={<ProtectedRoute element={<VipPortal />}   allowedRoles={["admin", "vip"]} />} />
        <Route path="/vip"         element={<ProtectedRoute element={<VipPortal />}   allowedRoles={["admin", "vip"]} />} />
        <Route path="/order-portal" element={<ProtectedRoute element={<OrderPortal />} allowedRoles={["admin", "customer"]} />} />
        <Route path="/orders"      element={<ProtectedRoute element={<OrderPortal />} allowedRoles={["admin", "customer"]} />} />
      </Routes>
    </Router>
  );
}

export default App;