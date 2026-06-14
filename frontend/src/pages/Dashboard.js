import React from "react";
import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <div className="layout">
      {/* Sidebar */}
      <div className="sidebar">
        <h2>ABC Dispatch</h2>
        <ul>
          <li className="active">
            <Link to="/dashboard" style={{ color: "white", textDecoration: "none" }}>Dashboard</Link>
          </li>
          <li>Warehouses</li>
          <li>
            <Link to="/orders" style={{ color: "white", textDecoration: "none" }}>Orders</Link>
          </li>
          <li>
            <Link to="/vip" style={{ color: "white", textDecoration: "none" }}>VIP Portal</Link>
          </li>
          <li>Reports</li>
          <li>Settings</li>
        </ul>
      </div>

      {/* Main content */}
      <div className="main-content">
        <h2>Dashboard</h2>

        <div className="cards-row">
          <div className="card">
            <h4>Total Orders Today</h4>
            <div className="value">125</div>
          </div>
          <div className="card">
            <h4>Pending Dispatches</h4>
            <div className="value">18</div>
          </div>
          <div className="card">
            <h4>Active VIP Orders</h4>
            <div className="value">7</div>
          </div>
          <div className="card">
            <h4>Low Stock Items</h4>
            <div className="value">4</div>
          </div>
        </div>

        <h3>Pending Orders</h3>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Warehouse</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>193039</td>
              <td>Product 1</td>
              <td>18</td>
              <td>WH2</td>
              <td>Pending</td>
            </tr>
            <tr>
              <td>193040</td>
              <td>Product 2</td>
              <td>10</td>
              <td>WH1</td>
              <td>Pending</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;