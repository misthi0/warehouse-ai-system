import React, { useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function Login() {
  const [activeTab, setActiveTab] = useState("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP states (only for Register tab)
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");

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
localStorage.setItem("role", data.user?.role || data.role);
localStorage.setItem("username", data.user?.username || data.username);
      redirectByRole(data.role);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = () => {
    setOtpError("");
    if (!mobile || mobile.length < 10) {
      setOtpError("Please enter a valid 10-digit mobile number");
      return;
    }
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp);
    setOtpSent(true);
    setOtpValue("");
    setOtpVerified(false);
  };

  const handleVerifyOtp = () => {
    if (otpValue === generatedOtp) {
      setOtpVerified(true);
      setOtpError("");
    } else {
      setOtpError("❌ Wrong OTP. Please try again.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }
    if (!otpVerified) {
      setError("Please verify your mobile number first");
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
      if (!response.ok) throw new Error(data.detail || data.message || "Registration failed");
      alert("✅ Registration successful! Please sign in.");
      setActiveTab("signin");
      setMobile("");
      setOtpSent(false);
      setOtpVerified(false);
      setOtpValue("");
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

const handleDemoLogin = (role) => {
    const credentials = {
      admin: { username: "admin", password: "admin123" },
      vip: { username: "vip", password: "vip123" },
      customer: { username: "customer", password: "customer123" },
    };
    const cred = credentials[role];
    setUsername(cred.username);
    setPassword(cred.password);
    setActiveTab("signin");
    setError(`Demo credentials filled for ${role}. Click Sign In to continue.`);
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

        {/* SIGN IN FORM */}
        {activeTab === "signin" && (
          <form onSubmit={handleLogin}>
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
              <span onClick={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? "Please wait..." : "Sign In"}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister}>
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
              <span onClick={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>

            {/* Mobile Number */}
            <label style={styles.label}>Mobile Number</label>
            <div style={styles.mobileRow}>
              <span style={styles.countryCode}>+91</span>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                  setOtpSent(false);
                  setOtpVerified(false);
                  setOtpError("");
                }}
                style={styles.mobileInput}
                maxLength={10}
              />
            </div>

            {/* Send OTP button */}
            {!otpSent && !otpVerified && (
              <button
                type="button"
                onClick={handleSendOtp}
                style={styles.sendOtpBtn}
              >
                Send OTP
              </button>
            )}

            {/* OTP sent — show OTP inline */}
            {otpSent && !otpVerified && (
              <div style={styles.otpBox}>
                <p style={styles.otpSuccessMsg}>
                  ✅ OTP sent successfully to +91 {mobile}
                </p>
                <div style={styles.otpDisplay}>
                  Your OTP: <strong style={styles.otpNumber}>{generatedOtp}</strong>
                </div>
                <input
                  type="text"
                  placeholder="Enter 4-digit OTP"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  style={styles.otpInput}
                  maxLength={4}
                />
                {otpError && <p style={styles.otpError}>{otpError}</p>}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={handleVerifyOtp} style={styles.verifyBtn}>
                    Verify OTP
                  </button>
                  <button type="button" onClick={handleSendOtp} style={styles.resendBtn}>
                    Resend OTP
                  </button>
                </div>
              </div>
            )}

            {/* Verified */}
            {otpVerified && (
              <p style={styles.verifiedMsg}>✅ Mobile number verified!</p>
            )}

            <button
              type="submit"
              style={{ ...styles.submitBtn, marginTop: "14px" }}
              disabled={loading}
            >
              {loading ? "Please wait..." : "Register"}
            </button>
          </form>
        )}

        {/* Quick Demo Login */}
        <p style={styles.demoLabel}>Quick demo login</p>
        <div style={styles.demoRow}>
          <button style={styles.adminBtn} onClick={() => handleDemoLogin("admin")}>Admin</button>
          <button style={styles.vipBtn} onClick={() => handleDemoLogin("vip")}>VIP</button>
          <button style={styles.customerBtn} onClick={() => handleDemoLogin("customer")}>Customer</button>
        </div>

        <p style={styles.footer}>© 2026 Aditya Birla Carbon · All rights reserved</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    paddingRight: "10%",
    paddingBottom: "8%",
    backgroundImage: "url('/imagebuilding.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },
 card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: "12px",
    padding: "24px 28px",
    width: "100%",
    maxWidth: "380px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    position: "absolute",
    right: "5%",
    top: "50%",
    transform: "translateY(-50%)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  header: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" },
  logo: { width: "52px", height: "52px", objectFit: "contain" },
  title: { margin: 0, fontSize: "18px", fontWeight: "700", color: "#8B0000" },
  subtitle: { margin: 0, fontSize: "13px", color: "#666" },
  tabRow: {
    display: "flex", marginBottom: "20px",
    borderRadius: "8px", overflow: "hidden", border: "1px solid #ddd",
  },
  tabActive: {
    flex: 1, padding: "12px", backgroundColor: "#C0392B", color: "#fff",
    border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px",
  },
  tabInactive: {
    flex: 1, padding: "12px", backgroundColor: "#fff", color: "#333",
    border: "none", cursor: "pointer", fontWeight: "500", fontSize: "14px",
  },
  error: {
    backgroundColor: "#eef2ff", color: "#3B5BDB", padding: "10px 14px",
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
  mobileRow: {
    display: "flex", alignItems: "center", gap: "8px",
    border: "1px solid #ddd", borderRadius: "8px",
    padding: "4px 12px", marginBottom: "10px", backgroundColor: "#fff",
  },
  countryCode: {
    fontSize: "14px", fontWeight: "600", color: "#333",
    borderRight: "1px solid #ddd", paddingRight: "10px",
  },
  mobileInput: {
    border: "none", outline: "none", fontSize: "14px",
    flex: 1, padding: "8px 4px", backgroundColor: "transparent",
  },
  sendOtpBtn: {
    width: "100%", padding: "12px", backgroundColor: "#C0392B",
    color: "#fff", border: "none", borderRadius: "8px",
    fontSize: "14px", fontWeight: "600", cursor: "pointer", marginBottom: "14px",
  },
  otpBox: {
    backgroundColor: "#f9f9f9", border: "1px solid #e0e0e0",
    borderRadius: "10px", padding: "14px 16px", marginBottom: "10px",
  },
  otpSuccessMsg: {
    color: "#27AE60", fontSize: "13px", fontWeight: "600", margin: "0 0 8px",
  },
  otpDisplay: {
    backgroundColor: "#fef9e7", border: "1px solid #f9e79f",
    borderRadius: "8px", padding: "10px 14px", marginBottom: "12px",
    fontSize: "13px", color: "#7d6608", textAlign: "center",
  },
  otpNumber: { fontSize: "22px", letterSpacing: "8px", color: "#8B0000" },
  otpInput: {
    width: "100%", boxSizing: "border-box", padding: "10px 12px",
    borderRadius: "8px", border: "1px solid #ddd", fontSize: "18px",
    letterSpacing: "6px", textAlign: "center", marginBottom: "10px", outline: "none",
  },
  otpError: { color: "#C0392B", fontSize: "12px", margin: "0 0 8px" },
  verifyBtn: {
    flex: 1, padding: "9px", backgroundColor: "#C0392B", color: "#fff",
    border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px",
  },
  resendBtn: {
    flex: 1, padding: "9px", backgroundColor: "#f5f5f5", color: "#333",
    border: "1px solid #ddd", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px",
  },
  verifiedMsg: {
    color: "#27AE60", fontSize: "13px", fontWeight: "600", margin: "8px 0 4px",
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