import React, { useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function Login() {
  const [activeTab, setActiveTab] = useState("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
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
      if (!response.ok) throw new Error(data.detail || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("username", data.user.username);
      redirectByRole(data.user.role);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) { setError("Please fill in username and password fields."); return; }
    if (!email || !email.includes("@")) { setError("Please enter a valid email address."); return; }
    if (!mobile || mobile.length !== 10) { setError("Please enter a valid 10-digit mobile number."); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to trigger security code.");

      setOtpSent(true);
      alert(`📩 Security verification code triggered for ${email}!\nCheck your mailbox or look at your backend command terminal logs.`);
    } catch (err) {
      setError(err.message || "Could not issue OTP token request.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (enteredOtp.length !== 6) { setError("❌ Please enter the full 6-digit security code."); return; }

    setLoading(true);
    try {
      const verifyResponse = await fetch(`${API_BASE_URL}/api/auth/verify-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: enteredOtp }),
      });
      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verifyData.detail || "Invalid code verification failure.");

      const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          mobile: `+91${mobile}`,
          role,
          email: email.trim()
        }),
      });
      const registerData = await registerResponse.json();
      if (!registerResponse.ok) throw new Error(registerData.detail || "Registration failed");

      setRegistrationSuccess(true);
    } catch (err) {
      setError(err.message || "Verification procedure failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetRegister = () => {
    setOtpSent(false);
    setRegistrationSuccess(false);
    setEnteredOtp("");
    setMobile("");
    setEmail("");
    setUsername("");
    setPassword("");
    setRole("customer");
    setError("");
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img src="/logo-abc.png" alt="Aditya Birla Carbon" style={styles.logo} />
          <div>
            <h2 style={styles.title}>Aditya Birla Carbon</h2>
            <p style={styles.subtitle}>Dispatch System</p>
          </div>
        </div>

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

        {error && <div style={styles.error}>{error}</div>}

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

        {activeTab === "register" && (
          <>
            {registrationSuccess ? (
              <div style={styles.successCard}>
                <div style={styles.successIcon}>⏳</div>
                <h3 style={styles.successTitle}>Registration Submitted!</h3>
                <p style={styles.successSub}>Your request has been sent to the admin for approval.</p>
                <p style={styles.successSub2}>You will be able to login once admin approves your account.</p>
                <div style={styles.infoBox}>
                  <div>👤 <strong>{username}</strong></div>
                  <div>📧 {email}</div>
                  <div>📱 +91 {mobile}</div>
                  <div>🏷️ Role: <strong>{role.toUpperCase()}</strong></div>
                </div>
                <button onClick={() => { setActiveTab("signin"); resetRegister(); }} style={styles.submitBtn}>
                  Go to Sign In
                </button>
              </div>
            ) : !otpSent ? (
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

                <label style={styles.label}>Email Address (For Secure OTP)</label>
                <input type="email" placeholder="name@company.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} style={styles.input} />

                <label style={styles.label}>Mobile Number</label>
                <div style={styles.mobileWrapper}>
                  <span style={styles.mobilePrefix}>+91</span>
                  <input type="tel" placeholder="10-digit mobile number" value={mobile}
                    maxLength={10} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    style={styles.mobileInput} />
                </div>

                <button type="submit" style={styles.submitBtn} disabled={loading}>
                  {loading ? "Sending Code..." : "Send Email OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={styles.otpInfoBox}>
                  <p style={styles.otpInfoText}>Verification code sent to <strong>{email}</strong></p>
                  <p style={styles.otpInfoSub}>Registering account status: <strong>{role.toUpperCase()}</strong></p>
                </div>
                <label style={styles.label}>Enter 6-Digit Code</label>
                <input type="tel" placeholder="000000" value={enteredOtp}
                  maxLength={6} onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                  style={{ ...styles.input, letterSpacing: "8px", fontSize: "20px", textAlign: "center" }} />

                <button type="submit" style={styles.submitBtn} disabled={loading}>
                  {loading ? "Verifying Token..." : "Verify Code & Register"}
                </button>

                <button type="button"
                  onClick={() => { setOtpSent(false); setEnteredOtp(""); setError(""); }}
                  style={styles.backBtn}>
                  ← Back to Details
                </button>
              </form>
            )}
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
  footer:          { textAlign: "center", color: "#aaa", fontSize: "11px", marginTop: "8px" },
};

export default Login;
