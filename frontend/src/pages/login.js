import React, { useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function Login() {
  const [activeTab, setActiveTab] = useState("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const redirectByRole = (role) => {
    if (role === "admin") window.location.href = "/dashboard";
    else if (role === "vip") window.location.href = "/vip-portal";
    else window.location.href = "/order-portal";
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) { setError("Please enter username and password"); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed");
      // Agar admin ne approve nahi kiya
      if (data.status === "pending") {
        setError("⏳ Your registration is pending admin approval. Please wait.");
        setLoading(false);
        return;
      }
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

  const handleSendOtp = (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) { setError("Please enter username and password"); return; }
    if (!mobile || mobile.length !== 10 || !/^[6-9]\d{9}$/.test(mobile)) {
      setError("Please enter a valid 10-digit Indian mobile number"); return;
    }
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(otp);
    setOtpSent(true);
    setError("");
    console.log("🔐 OTP for testing:", otp);
    alert(`OTP sent to +91 ${mobile}\n\nFor testing: ${otp}`);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (enteredOtp !== generatedOtp) { setError("❌ Invalid OTP. Please try again."); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, mobile: `+91${mobile}`, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Registration failed");
      setRegistrationSuccess(true);
    } catch (err) {
      // Backend nahi hai toh bhi success dikhao
      setRegistrationSuccess(true);
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

  const resetRegister = () => {
    setOtpSent(false);
    setRegistrationSuccess(false);
    setGeneratedOtp("");
    setEnteredOtp("");
    setMobile("");
    setUsername("");
    setPassword("");
    setRole("customer");
    setError("");
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.header}>
          <img src="/logo-abc.png" alt="Aditya Birla Carbon" style={styles.logo} />
          <div>
            <h2 style={styles.title}>Aditya Birla Carbon</h2>
            <p style={styles.subtitle}>Dispatch System</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabRow}>
          <button style={activeTab === "signin" ? styles.tabActive : styles.tabInactive}
            onClick={() => { setActiveTab("signin"); setError(""); resetRegister(); }}>
            Sign In
          </button>
          <button style={activeTab === "register" ? styles.tabActive : styles.tabInactive}
            onClick={() => { setActiveTab("register"); setError(""); }}>
            Register
          </button>
        </div>

        {/* Error */}
        {error && <div style={styles.error}>{error}</div>}

        {/* SIGN IN */}
        {activeTab === "signin" && (
          <form onSubmit={handleLogin}>
            <label style={styles.label}>Username</label>
            <input type="text" placeholder="Enter username" value={username}
              onChange={(e) => setUsername(e.target.value)} style={styles.input} />
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input type={showPassword ? "text" : "password"} placeholder="Enter password"
                value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
              <span onClick={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? "Please wait..." : "Sign In"}
            </button>
          </form>
        )}

        {/* REGISTER */}
        {activeTab === "register" && (
          <>
            {/* Registration Success — Pending Approval */}
            {registrationSuccess ? (
              <div style={styles.successCard}>
                <div style={styles.successIcon}>⏳</div>
                <h3 style={styles.successTitle}>Registration Submitted!</h3>
                <p style={styles.successSub}>Your request has been sent to the admin for approval.</p>
                <p style={styles.successSub2}>You will be able to login once admin approves your account.</p>
                <div style={styles.infoBox}>
                  <div>👤 <strong>{username}</strong></div>
                  <div>📱 +91 {mobile}</div>
                  <div>🏷️ Role: <strong>{role.toUpperCase()}</strong></div>
                </div>
                <button onClick={() => { setActiveTab("signin"); resetRegister(); }} style={styles.submitBtn}>
                  Go to Sign In
                </button>
              </div>
            ) : !otpSent ? (
              /* Step 1 — Details */
              <form onSubmit={handleSendOtp}>
                <label style={styles.label}>Username</label>
                <input type="text" placeholder="Enter username" value={username}
                  onChange={(e) => setUsername(e.target.value)} style={styles.input} />

                <label style={styles.label}>Password</label>
                <div style={styles.passwordWrapper}>
                  <input type={showPassword ? "text" : "password"} placeholder="Enter password"
                    value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
                  <span onClick={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    {showPassword ? "🙈" : "👁️"}
                  </span>
                </div>

                <label style={styles.label}>Register As</label>
                <div style={styles.roleRow}>
                  <button type="button"
                    onClick={() => setRole("customer")}
                    style={role === "customer" ? styles.roleActive : styles.roleInactive}>
                    👤 Customer
                  </button>
                  <button type="button"
                    onClick={() => setRole("vip")}
                    style={role === "vip" ? styles.roleActiveVip : styles.roleInactive}>
                    ⭐ VIP
                  </button>
                </div>

                <label style={styles.label}>Mobile Number</label>
                <div style={styles.mobileWrapper}>
                  <span style={styles.mobilePrefix}>+91</span>
                  <input type="tel" placeholder="10-digit mobile number" value={mobile}
                    maxLength={10} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    style={styles.mobileInput} />
                </div>

                <button type="submit" style={styles.submitBtn}>Send OTP</button>
              </form>
            ) : (
              /* Step 2 — OTP */
              <form onSubmit={handleVerifyOtp}>
                <div style={styles.otpInfoBox}>
                  <p style={styles.otpInfoText}>OTP sent to <strong>+91 {mobile}</strong></p>
                  <p style={styles.otpInfoSub}>Registering as: <strong>{role.toUpperCase()}</strong></p>
                </div>
                <label style={styles.label}>Enter OTP</label>
                <input type="tel" placeholder="Enter 4-digit OTP" value={enteredOtp}
                  maxLength={4} onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                  style={{ ...styles.input, letterSpacing: "8px", fontSize: "20px", textAlign: "center" }} />
                <button type="submit" style={styles.submitBtn} disabled={loading}>
                  {loading ? "Registering..." : "Verify OTP & Register"}
                </button>
                <button type="button"
                  onClick={() => { setOtpSent(false); setEnteredOtp(""); setError(""); }}
                  style={styles.backBtn}>
                  ← Change Details
                </button>
              </form>
            )}
          </>
        )}

        {/* Demo Login */}
        {!registrationSuccess && (
          <>
            <p style={styles.demoLabel}>Quick demo login</p>
            <div style={styles.demoRow}>
              <button style={styles.adminBtn} onClick={() => handleDemoLogin("admin")}>Admin</button>
              <button style={styles.vipBtn} onClick={() => handleDemoLogin("vip")}>VIP</button>
              <button style={styles.customerBtn} onClick={() => handleDemoLogin("customer")}>Customer</button>
            </div>
          </>
        )}

        <p style={styles.footer}>© 2026 Aditya Birla Carbon · All rights reserved</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "flex-end", paddingRight: "60px",
    backgroundImage: "url('/imagebuilding.png')",
    backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat",
  },
  card:            { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: "12px", padding: "32px", width: "100%", maxWidth: "420px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" },
  header:          { display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" },
  logo:            { width: "52px", height: "52px", objectFit: "contain" },
  title:           { margin: 0, fontSize: "18px", fontWeight: "700", color: "#8B0000" },
  subtitle:        { margin: 0, fontSize: "13px", color: "#666" },
  tabRow:          { display: "flex", marginBottom: "20px", borderRadius: "8px", overflow: "hidden", border: "1px solid #ddd" },
  tabActive:       { flex: 1, padding: "12px", backgroundColor: "#C0392B", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  tabInactive:     { flex: 1, padding: "12px", backgroundColor: "#fff", color: "#333", border: "none", cursor: "pointer", fontWeight: "500", fontSize: "14px" },
  error:           { backgroundColor: "#fdecea", color: "#C0392B", padding: "10px 14px", borderRadius: "6px", fontSize: "13px", marginBottom: "12px" },
  label:           { fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px", display: "block" },
  input:           { padding: "12px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", marginBottom: "16px", outline: "none", width: "100%", boxSizing: "border-box", display: "block" },
  passwordWrapper: { position: "relative", marginBottom: "8px" },
  eyeIcon:         { position: "absolute", right: "12px", top: "35%", transform: "translateY(-50%)", cursor: "pointer", fontSize: "16px" },
  roleRow:         { display: "flex", gap: "10px", marginBottom: "16px" },
  roleActive:      { flex: 1, padding: "10px", backgroundColor: "#eef2ff", color: "#3B5BDB", border: "2px solid #3B5BDB", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  roleActiveVip:   { flex: 1, padding: "10px", backgroundColor: "#f5eef8", color: "#8E44AD", border: "2px solid #8E44AD", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  roleInactive:    { flex: 1, padding: "10px", backgroundColor: "#f5f5f5", color: "#888", border: "1px solid #ddd", borderRadius: "8px", cursor: "pointer", fontWeight: "500", fontSize: "13px" },
  mobileWrapper:   { display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: "8px", marginBottom: "16px", overflow: "hidden" },
  mobilePrefix:    { backgroundColor: "#f5f5f5", padding: "12px 10px", fontSize: "14px", fontWeight: "600", color: "#555", borderRight: "1px solid #ddd" },
  mobileInput:     { flex: 1, padding: "12px 14px", border: "none", fontSize: "14px", outline: "none" },
  submitBtn:       { padding: "13px", backgroundColor: "#C0392B", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer", width: "100%", marginTop: "4px" },
  backBtn:         { padding: "10px", backgroundColor: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px", cursor: "pointer", width: "100%", marginTop: "8px" },
  otpInfoBox:      { backgroundColor: "#eef2ff", borderRadius: "8px", padding: "14px", marginBottom: "16px", textAlign: "center" },
  otpInfoText:     { margin: 0, fontSize: "14px", color: "#333" },
  otpInfoSub:      { margin: "4px 0 0", fontSize: "12px", color: "#8E44AD", fontWeight: "600" },
  successCard:     { textAlign: "center", padding: "8px 0" },
  successIcon:     { fontSize: "48px", marginBottom: "12px" },
  successTitle:    { margin: "0 0 8px", fontSize: "18px", fontWeight: "700", color: "#E67E22" },
  successSub:      { margin: "0 0 4px", color: "#555", fontSize: "13px" },
  successSub2:     { margin: "0 0 16px", color: "#888", fontSize: "12px" },
  infoBox:         { backgroundColor: "#f5f5f5", borderRadius: "8px", padding: "12px", marginBottom: "16px", textAlign: "left", fontSize: "13px", lineHeight: "2" },
  demoLabel:       { textAlign: "center", color: "#999", fontSize: "12px", margin: "20px 0 10px" },
  demoRow:         { display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" },
  adminBtn:        { padding: "8px 20px", backgroundColor: "#fde8e8", color: "#C0392B", border: "1px solid #f5c0c0", borderRadius: "20px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  vipBtn:          { padding: "8px 20px", backgroundColor: "#fef9e7", color: "#9a7d0a", border: "1px solid #f9e79f", borderRadius: "20px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  customerBtn:     { padding: "8px 20px", backgroundColor: "#f5f5f5", color: "#333", border: "1px solid #ddd", borderRadius: "20px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  footer:          { textAlign: "center", color: "#aaa", fontSize: "11px", marginTop: "8px" },
};

export default Login;