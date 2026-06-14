import React, { useState } from "react";
import { Link } from "react-router-dom";

function OrderPortal() {
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [result, setResult] = useState(null);

  const handleOrder = (e) => {
    e.preventDefault();
    setResult({ warehouse: "Warehouse 2", status: "Dispatched" });
  };

  return (
    <div className="layout">
      <div className="sidebar">
        <h2>ABC Dispatch</h2>
        <ul>
          <li>
            <Link to="/dashboard" style={{ color: "white", textDecoration: "none" }}>Dashboard</Link>
          </li>
          <li>Warehouses</li>
          <li className="active">
            <Link to="/orders" style={{ color: "white", textDecoration: "none" }}>Orders</Link>
          </li>
          <li>
            <Link to="/vip" style={{ color: "white", textDecoration: "none" }}>VIP Portal</Link>
          </li>
          <li>Reports</li>
          <li>Settings</li>
        </ul>
      </div>

      <div className="main-content">
        <h2>Order Portal</h2>

        <form onSubmit={handleOrder} className="order-form">
          <div>
            <label>Product</label>
            <select value={product} onChange={(e) => setProduct(e.target.value)} required>
              <option value="">Select Product</option>
              <option value="Product 1">Product 1</option>
              <option value="Product 2">Product 2</option>
              <option value="Product 3">Product 3</option>
            </select>
          </div>

          <div>
            <label>Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              min="1"
            />
          </div>

          <button type="submit">Place Order</button>
        </form>

        {result && (
          <div className="order-result">
            <h3>Order Result</h3>
            <p><strong>Product:</strong> {product}</p>
            <p><strong>Quantity:</strong> {quantity}</p>
            <p><strong>Recommended Warehouse:</strong> {result.warehouse}</p>
            <p><strong>Status:</strong> {result.status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderPortal;