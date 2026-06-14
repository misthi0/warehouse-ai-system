from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, DECIMAL, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(200))
    created_at = Column(DateTime, default=func.now())
    inventory = relationship("Inventory", back_populates="warehouse")
    orders = relationship("Order", back_populates="warehouse")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    unit_price = Column(DECIMAL(10, 2))
    created_at = Column(DateTime, default=func.now())
    inventory = relationship("Inventory", back_populates="product")
    orders = relationship("Order", back_populates="product")

class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    available_quantity = Column(Integer, default=0)
    dispatch_limit = Column(Integer, default=100)
    dispatched_today = Column(Integer, default=0)
    restock_date = Column(Date)
    warehouse = relationship("Warehouse", back_populates="inventory")
    product = relationship("Product", back_populates="inventory")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(100), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, nullable=False)
    is_vip = Column(Boolean, default=False)
    status = Column(String(50), default="pending")
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"))
    estimated_dispatch_date = Column(Date)
    created_at = Column(DateTime, default=func.now())
    product = relationship("Product", back_populates="orders")
    warehouse = relationship("Warehouse", back_populates="orders")