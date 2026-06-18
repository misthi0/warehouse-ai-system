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


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "customer"
    mobile: str = ""


# ==========================
# Auth Routes
# ==========================
@router.post("/auth/login")
def auth_login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not bcrypt.checkpw(request.password.encode("utf-8"), user.hashed_password.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check approval status
    status = getattr(user, "status", "approved")
    if status == "pending":
        raise HTTPException(status_code=403, detail="Account pending admin approval")
    if status == "rejected":
        raise HTTPException(status_code=403, detail="Account has been rejected")

    token = jwt.encode(
        {
            "sub": user.username,
            "role": user.role,
            "exp": datetime.utcnow() + timedelta(hours=8)
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    return {
        "token": token,
        "user": {"username": user.username, "role": user.role}
    }


@router.post("/auth/register")
def auth_register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed = bcrypt.hashpw(
        request.password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    # Admin registers as approved, others need approval
    try:
        status = "approved" if request.role == "admin" else "pending"
        new_user = User(
            username=request.username,
            hashed_password=hashed,
            role=request.role,
            mobile=request.mobile,
            status=status
        )
    except Exception:
        # If User model doesn't have mobile/status columns yet
        new_user = User(
            username=request.username,
            hashed_password=hashed,
            role=request.role
        )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    role = getattr(new_user, "role", request.role)
    status_val = getattr(new_user, "status", "approved")

    return {
        "message": "Registration successful! Awaiting admin approval." if status_val == "pending" else "Registered!",
        "user": {"username": new_user.username, "role": role}
    }


# ==========================
# Admin Registration Routes
# ==========================
@router.get("/admin/registrations")
def get_pending_registrations(db: Session = Depends(get_db)):
    try:
        users = db.query(User).filter(
            User.status == "pending",
            User.role != "admin"
        ).all()
        return [
            {
                "id": u.id,
                "username": u.username,
                "mobile": getattr(u, "mobile", "—") or "—",
                "role": u.role,
                "status": u.status,
                "date": str(getattr(u, "created_at", ""))[:10] or "—"
            }
            for u in users
        ]
    except Exception:
        return []


@router.post("/admin/registrations/{user_id}/approved")
def approve_registration(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = "approved"
    db.commit()
    return {"message": f"✅ {user.username} approved!"}


@router.post("/admin/registrations/{user_id}/rejected")
def reject_registration(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = "rejected"
    db.commit()
    return {"message": f"❌ {user.username} rejected!"}


# ==========================
# Admin Order Routes
# ==========================
@router.get("/admin/orders")
def get_admin_orders(db: Session = Depends(get_db)):
    try:
        orders = db.query(Order).all()
        result = []
        for o in orders:
            product = db.query(Product).filter(Product.id == o.product_id).first()
            result.append({
                "id": o.id,
                "username": o.customer_name,
                "product": product.name if product else "Unknown",
                "qty": o.quantity,
                "type": "vip" if o.is_vip else "customer",
                "date": str(o.created_at)[:10] if hasattr(o, "created_at") and o.created_at else "—",
                "status": o.status
            })
        return result
    except Exception:
        return []


@router.post("/admin/orders/{order_id}/approved")
def approve_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = "approved"
    db.commit()
    return {"message": f"✅ Order #{order_id} approved!"}


@router.post("/admin/orders/{order_id}/rejected")
def reject_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = "rejected"
    db.commit()
    return {"message": f"❌ Order #{order_id} rejected!"}


# ==========================
# Warehouse Routes
# ==========================
@router.get("/warehouses")
def get_all_warehouses(db: Session = Depends(get_db)):
    return db.query(Warehouse).all()


@router.get("/warehouses/{warehouse_id}/inventory")
def get_warehouse_inventory(warehouse_id: int, db: Session = Depends(get_db)):
    inventory = db.query(Inventory).filter(
        Inventory.warehouse_id == warehouse_id
    ).all()
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
            "units_to_produce": getattr(inv, "units_to_produce", 0),
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
                    "pdf_product_id": getattr(inv, "pdf_product_id", None),
                    "available_quantity": inv.available_quantity,
                    "units_to_produce": getattr(inv, "units_to_produce", 0),
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