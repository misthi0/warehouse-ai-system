import React, { useState, useRef, useEffect } from "react";
import API_BASE_URL from "../config";

const ADMIN_COMPLAINT_EMAIL = "khushaltiwari777776@gmail.com";

const TOPICS = [
  {
    id: "about",
    icon: "🏭",
    question: "What is Aditya Birla Carbon / Birla Carbon?",
    answer:
      "Birla Carbon is one of the world's leading manufacturers and suppliers of high-quality carbon black additives. As a flagship business of the Aditya Birla Group, we provide innovative, sustainable carbon black solutions used in tires, rubber, plastics, coatings, inks, and more."
  },
  {
    id: "history",
    icon: "📜",
    question: "When was the company founded?",
    answer:
      "Birla Carbon traces its roots to 1988, and grew significantly when the Aditya Birla Group acquired Columbian Chemicals Co. in 2011, becoming the largest carbon black company globally under the Birla Carbon brand."
  },
  {
    id: "footprint",
    icon: "🌍",
    question: "Where does Birla Carbon operate?",
    answer:
      "Birla Carbon operates across 14 countries with 17-19 manufacturing facilities worldwide, with a combined annual capacity of around 2 million tonnes. Our headquarters is in Mumbai, India."
  },
  {
    id: "products",
    icon: "🧪",
    question: "What products does Birla Carbon offer?",
    answer:
      "We offer a complete portfolio of carbon black products across ASTM grades and specialty blacks, serving Rubber, Plastics, Coatings, Inks, and niche industries. Key brands include Birla Carbon, Raven®, and Conductex®."
  },
  {
    id: "sustainability",
    icon: "♻️",
    question: "What is Continua™?",
    answer:
      "Continua™ is our Sustainable Carbonaceous Material (SCM) — a first-of-its-kind range of circular carbon black solutions that enable large, quantifiable carbon footprint reductions for a greener value chain."
  },
  {
    id: "tech",
    icon: "🔬",
    question: "What about R&D and innovation?",
    answer:
      "Birla Carbon has state-of-the-art technology centers in Marietta (USA), Taloja (India), and Sambreville (Belgium). We're also a global leader in Multi-Walled Carbon Nanotubes through our Nanocyl range."
  },
  {
    id: "plants",
    icon: "🏗️",
    question: "Tell me about the plants used in this dispatch system.",
    answer:
      "This system dispatches from three key plants: Gummidipoondi, Chennai (ING1); Renukoot, Varanasi (INR1); and Patalganga, Mumbai (INP1). Patalganga also hosts Asia's first Post Treatment plant, inaugurated in October 2024."
  },
  {
    id: "leadership",
    icon: "👔",
    question: "Who leads Birla Carbon?",
    answer:
      "Mr. John Loudermilk is the President and Chief Executive Officer of Birla Carbon."
  },
  {
    id: "order",
    icon: "📦",
    question: "How do I place an order?",
    answer:
      "Go to the Order Portal (or VIP Portal if you're a VIP customer), search for your product, choose a quantity, select your preferred plant, and click Place Order. Our admin team will review and approve it."
  },
  {
    id: "track",
    icon: "🔍",
    question: "How do I track my order status?",
    answer:
      "Your order status updates automatically in the 'My Orders' table on this page — Pending, Approved, or Dispatched. You'll also receive email updates at each stage."
  },
];

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hello! Welcome to the CarbonIQ. How can we help you today?" }
  ]);
  const [showTopics, setShowTopics] = useState(false);
  const [view, setView] = useState("chat"); // "chat" | "complaint"
  const [complaintText, setComplaintText] = useState("");
  const [complaintEmail, setComplaintEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const bodyRef = useRef(null);

  const username = localStorage.getItem("username") || "Customer";

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, showTopics, view]);

  const handleTopicClick = (topic) => {
    setMessages(prev => [
      ...prev,
      { from: "user", text: topic.question },
      { from: "bot", text: topic.answer }
    ]);
    setShowTopics(false);
  };

  const handleOpenComplaint = () => {
    setView("complaint");
    setShowTopics(false);
    setSubmitMsg("");
  };

  const handleBackToChat = () => {
    setView("chat");
    setSubmitMsg("");
  };

  const handleSubmitComplaint = async () => {
    if (!complaintText.trim()) {
      setSubmitMsg("⚠️ Please describe your complaint before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/complaint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          contact_email: complaintEmail,
          message: complaintText,
        }),
      });
      if (res.ok) {
        setSubmitMsg("✅ Your complaint has been submitted. Our team will get back to you soon.");
        setComplaintText("");
        setComplaintEmail("");
        setMessages(prev => [
          ...prev,
          { from: "user", text: "🚩 Submitted a complaint" },
          { from: "bot", text: "Thank you. Your complaint has been forwarded to our support team and they will reach out to you shortly." }
        ]);
        setTimeout(() => setView("chat"), 1500);
      } else {
        setSubmitMsg("❌ Could not submit complaint. Please try again.");
      }
    } catch {
      setSubmitMsg("⚠️ Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      {!isOpen && (
        <button style={styles.fab} onClick={() => setIsOpen(true)}>
          <span style={styles.fabPulse} />
          💬
        </button>
      )}

      {isOpen && (
        <div style={styles.panel}>
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <div style={styles.avatar}>AB</div>
              <div>
                <div style={styles.headerTitle}>CarbonIQ</div>
                <div style={styles.headerStatus}>
                  <span style={styles.dot} /> Online
                </div>
              </div>
            </div>
            <button style={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div style={styles.body} ref={bodyRef}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  ...styles.bubbleRow,
                  justifyContent: m.from === "user" ? "flex-end" : "flex-start",
                }}
              >
                {m.from === "bot" && <div style={styles.bubbleAvatar}>AB</div>}
                <div
                  style={{
                    ...styles.bubble,
                    ...(m.from === "user" ? styles.bubbleUser : styles.bubbleBot),
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {view === "complaint" && (
              <div style={styles.complaintForm}>
                <button style={styles.backLink} onClick={handleBackToChat}>← Back to chat</button>
                <label style={styles.formLabel}>Your Email (optional, for follow-up)</label>
                <input
                  type="email"
                  value={complaintEmail}
                  onChange={(e) => setComplaintEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={styles.formInput}
                />
                <label style={styles.formLabel}>Describe your complaint</label>
                <textarea
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder="Tell us what went wrong..."
                  style={styles.formTextarea}
                  rows={4}
                />
                {submitMsg && <div style={styles.submitMsg}>{submitMsg}</div>}
                <button style={styles.submitBtn} onClick={handleSubmitComplaint} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Complaint"}
                </button>
              </div>
            )}

            {view === "chat" && showTopics && (
              <div style={styles.topicDropdown}>
                <div style={styles.topicDropdownLabel}>Choose a question</div>
                {TOPICS.map((t) => (
                  <button key={t.id} style={styles.topicItem} onClick={() => handleTopicClick(t)}>
                    <span style={styles.topicIcon}>{t.icon}</span>
                    <span style={styles.topicText}>{t.question}</span>
                  </button>
                ))}
                <button style={styles.complaintItem} onClick={handleOpenComplaint}>
                  <span style={styles.topicIcon}>🚩</span>
                  <span style={styles.topicText}>Raise a Complaint</span>
                </button>
              </div>
            )}
          </div>

          {view === "chat" && (
            <div style={styles.inputRow}>
              <button
                style={{ ...styles.typeInput, ...styles.typeInputClickable }}
                onClick={() => setShowTopics((prev) => !prev)}
              >
                {showTopics ? "Hide questions ▲" : "Type your message... ▼"}
              </button>
              <button style={styles.sendBtn} onClick={() => setShowTopics(true)}>➤</button>
            </div>
          )}

          <div style={styles.disclaimer}>
            <strong>Disclaimer:</strong> This CarbonIQ provides general information based on predefined data. For specific concerns, please use Raise a Complaint above. Birla Carbon is not responsible for and assumes no liability for actions taken or damages incurred from use of or reliance on information from this Assistant.
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { position: "fixed", top: "100px", right: "32px", zIndex: 999 },
  fab: {
    position: "relative",
    width: "60px", height: "60px", borderRadius: "50%",
    background: "linear-gradient(135deg, #C0392B, #8B0000)",
    color: "#fff", border: "none",
    fontSize: "26px", cursor: "pointer",
    boxShadow: "0 8px 24px rgba(139,0,0,0.45)",
  },
  fabPulse: {
    position: "absolute", top: -4, right: -4, width: "14px", height: "14px",
    borderRadius: "50%", backgroundColor: "#27AE60", border: "2px solid #fff",
  },
  panel: {
    width: "360px", maxHeight: "600px", backgroundColor: "var(--bg-card, #fff)",
    borderRadius: "18px", boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    display: "flex", flexDirection: "column", overflow: "hidden",
    border: "1px solid rgba(0,0,0,0.06)",
  },
  header: {
    background: "linear-gradient(135deg, #8B0000, #C0392B)",
    padding: "16px 18px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  avatar: {
    width: "40px", height: "40px", borderRadius: "10px",
    background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: "700",
    fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px solid rgba(255,255,255,0.3)",
  },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: "15px" },
  headerStatus: { color: "#dffce3", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" },
  dot: { width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#27AE60", display: "inline-block" },
  closeBtn: {
    background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
    fontSize: "14px", cursor: "pointer", width: "28px", height: "28px", borderRadius: "8px",
  },
  body: {
    flex: 1, padding: "16px", overflowY: "auto",
    display: "flex", flexDirection: "column", gap: "10px",
    backgroundColor: "var(--bg-app, #f4f6f9)", maxHeight: "420px",
  },
  bubbleRow: { display: "flex", alignItems: "flex-end", gap: "6px" },
  bubbleAvatar: {
    width: "22px", height: "22px", borderRadius: "6px",
    backgroundColor: "#C0392B", color: "#fff", fontSize: "9px", fontWeight: "700",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  bubble: {
    maxWidth: "78%", padding: "11px 14px", borderRadius: "14px",
    fontSize: "13px", lineHeight: "1.45",
  },
  bubbleBot: {
    backgroundColor: "var(--bg-card, #fff)", color: "var(--text-main, #1a1a1a)",
    border: "1px solid var(--border-ui, #eee)",
    borderBottomLeftRadius: "4px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  bubbleUser: {
    background: "linear-gradient(135deg, #C0392B, #8B0000)", color: "#fff",
    borderBottomRightRadius: "4px",
  },
  topicDropdown: {
    backgroundColor: "var(--bg-card, #fff)", borderRadius: "12px",
    border: "1px solid var(--border-ui, #eee)", padding: "10px",
    display: "flex", flexDirection: "column", gap: "6px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  },
  topicDropdownLabel: {
    fontSize: "11px", fontWeight: "700", color: "var(--text-muted, #999)",
    textTransform: "uppercase", letterSpacing: "0.4px", padding: "2px 4px 4px",
  },
  topicItem: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 10px", borderRadius: "9px",
    backgroundColor: "var(--bg-app, #f8f8f8)", border: "1px solid transparent",
    cursor: "pointer", textAlign: "left", fontSize: "12.5px", color: "var(--text-main, #1a1a1a)",
    transition: "background-color 0.15s",
  },
  complaintItem: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 10px", borderRadius: "9px",
    backgroundColor: "#fdecea", border: "1px solid #f3c6c1",
    cursor: "pointer", textAlign: "left", fontSize: "12.5px", color: "#C0392B", fontWeight: "700",
    marginTop: "2px",
  },
  topicIcon: { fontSize: "16px" },
  topicText: { flex: 1 },
  complaintForm: { display: "flex", flexDirection: "column", gap: "8px" },
  backLink: {
    background: "none", border: "none", color: "#3B5BDB",
    fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0, marginBottom: "4px",
  },
  formLabel: { fontSize: "12px", fontWeight: "600", color: "var(--text-main, #333)" },
  formInput: {
    padding: "9px 11px", borderRadius: "9px", border: "1px solid var(--border-ui, #ddd)",
    fontSize: "13px", backgroundColor: "var(--bg-card, #fff)", color: "var(--text-main, #000)",
  },
  formTextarea: {
    padding: "9px 11px", borderRadius: "9px", border: "1px solid var(--border-ui, #ddd)",
    fontSize: "13px", resize: "vertical", backgroundColor: "var(--bg-card, #fff)", color: "var(--text-main, #000)",
  },
  submitMsg: { fontSize: "12px", color: "#C0392B" },
  submitBtn: {
    padding: "11px", borderRadius: "9px",
    background: "linear-gradient(135deg, #C0392B, #8B0000)",
    color: "#fff", border: "none", fontWeight: "700", cursor: "pointer", fontSize: "13px",
  },
  inputRow: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "12px 14px", borderTop: "1px solid var(--border-ui, #eee)",
    backgroundColor: "var(--bg-card, #fff)",
  },
  typeInput: {
    flex: 1, padding: "11px 14px", borderRadius: "999px",
    border: "1px solid var(--border-ui, #ddd)", fontSize: "13px",
    backgroundColor: "var(--bg-app, #f4f6f9)", color: "var(--text-muted, #999)",
    textAlign: "left",
  },
  typeInputClickable: { cursor: "pointer" },
  sendBtn: {
    width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
    background: "linear-gradient(135deg, #C0392B, #8B0000)",
    color: "#fff", border: "none", fontSize: "15px", cursor: "pointer",
  },
  disclaimer: {
    padding: "10px 14px", fontSize: "10px", lineHeight: "1.5", color: "var(--text-muted, #999)",
    borderTop: "1px solid var(--border-ui, #eee)", backgroundColor: "var(--bg-app, #f9f9f9)",
  },
};

export default Chatbot;
