import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import OrderPortal from "./pages/OrderPortal";
import VipPortal from "./pages/VipPortal";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orders" element={<OrderPortal />} />
        <Route path="/vip" element={<VipPortal />} />
      </Routes>
    </Router>
  );
}

export default App;