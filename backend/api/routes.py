from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from pydantic import BaseModel
import bcrypt
from jose import jwt

from models.database import get_db
from models.models import Warehouse, Product, Inventory, Order, User

router = APIRouter()

SECRET_KEY = "warehouse-secret-key"
ALGORITHM = "HS256"


# ==========================
# Pydantic Schemas
# ==========================
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
    warehouse_id: int | None = None
    estimated_dispatch_date: date | None = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


# ==========================
# Auth Routes
# ==========================
@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not bcrypt.checkpw(data.password.encode("utf-8"), user.hashed_password.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode(
        {
            "sub": user.username,
            "role": user.role,
            "exp": datetime.utcnow() + timedelta(hours=8)
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    return {"access_token": token, "token_type": "bearer", "role": user.role}


# ==========================
# Warehouse Routes
# ==========================
@router.get("/warehouses")
def get_all_warehouses(db: Session = Depends(get_db)):
    return db.query(Warehouse).all()


@router.get("/warehouses/{warehouse_id}/inventory")
def get_warehouse_inventory(warehouse_id: int, db: Session = Depends(get_db)):
    inventory = (
        db.query(Inventory)
        .filter(Inventory.warehouse_id == warehouse_id)
        .all()
    )
    if not inventory:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    result = []
    for inv in inventory:
        product = db.query(Product).filter(Product.id == inv.product_id).first()
        result.append({
            "inventory_id": inv.id,
            "product_id": inv.pdf_product_id or str(inv.product_id),
            "db_product_id": inv.product_id,
            "product_name": product.name if product else None,
            "category": product.description if product else None,
            "available_quantity": inv.available_quantity,
            "units_to_produce": inv.units_to_produce,
            "dispatch_limit": inv.dispatch_limit,
            "dispatched_today": inv.dispatched_today,
            "restock_date": str(inv.restock_date) if inv.restock_date else None,
            "warehouse_id": inv.warehouse_id
        })
    return result


# ==========================
# Product Routes
# ==========================
@router.get("/products")
def get_all_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    result = []
    for product in products:
        # Find all inventory records for this product
        inventory_records = db.query(Inventory).filter(
            Inventory.product_id == product.id
        ).all()
        
        warehouses = []
        for inv in inventory_records:
            warehouse = db.query(Warehouse).filter(
                Warehouse.id == inv.warehouse_id
            ).first()
            if warehouse:
                warehouses.append({
                    "warehouse_id": warehouse.id,
                    "warehouse_name": warehouse.name,
                    "location": warehouse.location,
                    "pdf_product_id": inv.pdf_product_id,
                    "available_quantity": inv.available_quantity,
                    "units_to_produce": inv.units_to_produce,
                    "dispatch_limit": inv.dispatch_limit,
                    "dispatched_today": inv.dispatched_today,
                    "restock_date": str(inv.restock_date) if inv.restock_date else None
                })
        
        result.append({
            "db_product_id": product.id,
            "product_name": product.name,
            "category": product.description,
            "unit_price": float(product.unit_price) if product.unit_price else 0,
            "warehouses": warehouses
        })
    return result


# ==========================
# Order Routes
# ==========================
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


# ==========================
# Dashboard Route
# ==========================
@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    total_orders = db.query(Order).count()
    pending_orders = db.query(Order).filter(Order.status == "pending").count()
    vip_orders = db.query(Order).filter(Order.is_vip == True).count()
    warehouses = db.query(Warehouse).count()
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "vip_orders": vip_orders,
        "total_warehouses": warehouses
    }
class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/auth/login")
def login(request: LoginRequest):
    if request.username == "admin" and request.password == "admin123":
        return {"token": "admin-token-2024", "user": {"username": "admin", "role": "admin"}}
    elif request.username == "vip" and request.password == "vip123":
        return {"token": "vip-token-2024", "user": {"username": "vip", "role": "vip"}}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/auth/register")
def register(request: LoginRequest):
    return {"message": "Registered!", "user": {"username": request.username}}