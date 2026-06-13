from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from pydantic import BaseModel
from ..models.database import get_db
from ..models.models import Warehouse, Product, Inventory, Order

router = APIRouter()

# ─── SCHEMAS (what data looks like) ───────────────────────

class OrderCreate(BaseModel):
    customer_name: str
    product_id: int
    quantity: int
    is_vip: bool = False

class OrderResponse(BaseModel):
    id: int
    customer_name: str
    product_id: int
    quantity: int
    is_vip: bool
    status: str
    warehouse_id: int | None
    estimated_dispatch_date: date | None

    class Config:
        from_attributes = True

# ─── WAREHOUSE ROUTES ──────────────────────────────────────

@router.get("/warehouses")
def get_all_warehouses(db: Session = Depends(get_db)):
    warehouses = db.query(Warehouse).all()
    return warehouses

@router.get("/warehouses/{warehouse_id}/inventory")
def get_warehouse_inventory(warehouse_id: int, db: Session = Depends(get_db)):
    inventory = db.query(Inventory).filter(
        Inventory.warehouse_id == warehouse_id
    ).all()
    if not inventory:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return inventory

# ─── PRODUCT ROUTES ────────────────────────────────────────

@router.get("/products")
def get_all_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    return products

# ─── ORDER ROUTES ──────────────────────────────────────────

@router.post("/orders", response_model=OrderResponse)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    new_order = Order(
        customer_name=order.customer_name,
        product_id=order.product_id,
        quantity=order.quantity,
        is_vip=order.is_vip,
        status="pending"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order

@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# ─── DASHBOARD ROUTE ───────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    total_orders = db.query(Order).count()
    pending_orders = db.query(Order).filter(
        Order.status == "pending"
    ).count()
    vip_orders = db.query(Order).filter(
        Order.is_vip == True
    ).count()
    warehouses = db.query(Warehouse).count()
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "vip_orders": vip_orders,
        "total_warehouses": warehouses
    }