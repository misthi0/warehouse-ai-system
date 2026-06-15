import React, { useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function Login() {
  const [activeTab, setActiveTab] = useState("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectByRole = (role) => {
    if (role === "admin") window.location.href = "/dashboard";
    else if (role === "vip") window.location.href = "/vip-portal";
    else window.location.href = "/order-portal";
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);
      redirectByRole(data.role);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: "customer" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Registration failed");
      alert("Registered! Please sign in.");
      setActiveTab("signin");
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role) => {
    localStorage.setItem("role", role);
    localStorage.setItem("username", role);
    localStorage.setItem("token", "demo-token");
    redirectByRole(role);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo + Title */}
        <div style={styles.header}>
          <img src="/logo-abc.png" alt="Aditya Birla Carbon" style={styles.logo} />
          <div>
            <h2 style={styles.title}>Aditya Birla Carbon</h2>
            <p style={styles.subtitle}>Dispatch System</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabRow}>
          <button
            style={activeTab === "signin" ? styles.tabActive : styles.tabInactive}
            onClick={() => { setActiveTab("signin"); setError(""); }}
          >
            Sign In
          </button>
          <button
            style={activeTab === "register" ? styles.tabActive : styles.tabInactive}
            onClick={() => { setActiveTab("register"); setError(""); }}
          >
            Register
          </button>
        </div>

        {/* Error */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Form */}
        <form onSubmit={activeTab === "signin" ? handleLogin : handleRegister}>
          <label style={styles.label}>Username</label>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Password</label>
          <div style={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? "Please wait..." : activeTab === "signin" ? "Sign In" : "Register"}
          </button>
        </form>

        {/* Quick Demo Login */}
        <p style={styles.demoLabel}>Quick demo login</p>
        <div style={styles.demoRow}>
          <button style={styles.adminBtn} onClick={() => handleDemoLogin("admin")}>Admin</button>
          <button style={styles.vipBtn} onClick={() => handleDemoLogin("vip")}>VIP</button>
          <button style={styles.customerBtn} onClick={() => handleDemoLogin("customer")}>Customer</button>
        </div>

        <p style={styles.footer}>© 2024 Aditya Birla Carbon · All rights reserved</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center",
   backgroundImage: "url('/imagebuilding.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: "12px", padding: "32px",
    width: "100%", maxWidth: "420px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
  header: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" },
  logo: { width: "52px", height: "52px", objectFit: "contain" },
  title: { margin: 0, fontSize: "18px", fontWeight: "700", color: "#8B0000" },
  subtitle: { margin: 0, fontSize: "13px", color: "#666" },
  tabRow: { display: "flex", marginBottom: "20px", borderRadius: "8px", overflow: "hidden", border: "1px solid #ddd" },
  tabActive: {
    flex: 1, padding: "12px", backgroundColor: "#C0392B", color: "#fff",
    border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px",
  },
  tabInactive: {
    flex: 1, padding: "12px", backgroundColor: "#fff", color: "#333",
    border: "none", cursor: "pointer", fontWeight: "500", fontSize: "14px",
  },
  error: {
    backgroundColor: "#fdecea", color: "#C0392B", padding: "10px 14px",
    borderRadius: "6px", fontSize: "13px", marginBottom: "12px",
  },
  label: { fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px", display: "block" },
  input: {
    padding: "12px 14px", borderRadius: "8px", border: "1px solid #ddd",
    fontSize: "14px", marginBottom: "16px", outline: "none",
    width: "100%", boxSizing: "border-box", display: "block",
  },
  passwordWrapper: { position: "relative", marginBottom: "8px" },
  eyeIcon: {
    position: "absolute", right: "12px", top: "35%",
    transform: "translateY(-50%)", cursor: "pointer", fontSize: "16px",
  },
  submitBtn: {
    padding: "13px", backgroundColor: "#C0392B", color: "#fff",
    border: "none", borderRadius: "8px", fontSize: "15px",
    fontWeight: "600", cursor: "pointer", width: "100%", marginTop: "4px",
  },
  demoLabel: { textAlign: "center", color: "#999", fontSize: "12px", margin: "20px 0 10px" },
  demoRow: { display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" },
  adminBtn: {
    padding: "8px 20px", backgroundColor: "#fde8e8", color: "#C0392B",
    border: "1px solid #f5c0c0", borderRadius: "20px", cursor: "pointer", fontWeight: "600", fontSize: "13px",
  },
  vipBtn: {
    padding: "8px 20px", backgroundColor: "#fef9e7", color: "#9a7d0a",
    border: "1px solid #f9e79f", borderRadius: "20px", cursor: "pointer", fontWeight: "600", fontSize: "13px",
  },
  customerBtn: {
    padding: "8px 20px", backgroundColor: "#f5f5f5", color: "#333",
    border: "1px solid #ddd", borderRadius: "20px", cursor: "pointer", fontWeight: "600", fontSize: "13px",
  },
  footer: { textAlign: "center", color: "#aaa", fontSize: "11px", marginTop: "8px" },
};

export default Login;