CREATE DATABASE IF NOT EXISTS warehouse_db;
USE warehouse_db;

CREATE TABLE IF NOT EXISTS warehouses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unit_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT NOT NULL,
    product_id INT NOT NULL,
    available_quantity INT DEFAULT 0,
    dispatch_limit INT DEFAULT 100,
    dispatched_today INT DEFAULT 0,
    restock_date DATE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    is_vip BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'pending',
    warehouse_id INT,
    estimated_dispatch_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

INSERT INTO warehouses (name, location) VALUES
('Warehouse 1', 'Mumbai'),
('Warehouse 2', 'Delhi'),
('Warehouse 3', 'Bangalore');

INSERT INTO products (name, description, unit_price) VALUES
('Product A', 'Description A', 100.00),
('Product B', 'Description B', 200.00),
('Product C', 'Description C', 300.00);

INSERT INTO inventory 
(warehouse_id, product_id, available_quantity, dispatch_limit, restock_date) 
VALUES
(1, 1, 500, 100, '2026-06-20'),
(1, 2, 300, 80, '2026-06-22'),
(2, 1, 200, 100, '2026-06-18'),
(2, 3, 400, 90, '2026-06-25'),
(3, 2, 150, 80, '2026-06-19'),
(3, 3, 600, 120, '2026-06-21');