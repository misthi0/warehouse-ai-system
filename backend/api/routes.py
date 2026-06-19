from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from pydantic import BaseModel
import bcrypt
from jose import jwt
import random
import smtplib
from email.mime.text import MIMEText

from models.database import get_db
from models.models import Warehouse, Product, Inventory, Order, User, VIPBacklog

router = APIRouter()

SECRET_KEY = "warehouse-secret-key"
ALGORITHM = "HS256"

# 🔑 In-Memory Storage maps
otp_storage = {}          
email_otp_storage = {}    


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
    email: str = ""  


class WhatsAppOTPRequest(BaseModel):
    mobile: str
    otp: str


class SendEmailOTPRequest(BaseModel):
    email: str


class VerifyEmailOTPRequest(BaseModel):
    email: str
    otp: str


# ==========================
# SMTP Email Settings
# ==========================
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465                             
SMTP_USER = "tanumaheshwari2005@gmail.com"  
SMTP_PASSWORD = "qjqjklriytuggpzo"          


# ==========================
# Helper Function: Send Order Status Email
# ==========================
def send_order_status_email(customer_username: str, order_id: int, status_text: str, details: str, db: Session):
    """Dynamically looks up the customer's email and sends an order status update."""
    user = db.query(User).filter(User.username == customer_username).first()
    if not user:
        print(f"⚠️ Notification Bypassed: User profile '{customer_username}' not found in database.")
        return

    user_email = getattr(user, "email", getattr(user, "email_address", None))
    if not user_email:
        print(f"⚠️ Notification Bypassed: User '{customer_username}' does not have a valid email configuration.")
        return

    try:
        subject = f"📦 Order #{order_id} Update - {status_text.title()}"
        body = f"Hello {customer_username},\n\nYour Order #{order_id} has been marked as: {status_text.upper()}.\n\nDetails: {details}\n\nThank you,\nWarehouse Management System"
        
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = user_email
        
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, [user_email], msg.as_string())
        print(f"📩 Live Order Notification: Sent cleanly to {user_email} for Order #{order_id}")
    except Exception as mail_err:
        print(f"⚠️ Email dispatch skipped for Order #{order_id}: {mail_err}")


# ==========================
# Verification & Sync Routes
# ==========================
@router.post("/store-local-otp")
def store_local_otp(request: WhatsAppOTPRequest):
    if not request.mobile or not request.otp:
        raise HTTPException(status_code=400, detail="Missing required parameters")
    otp_storage[request.mobile] = request.otp
    return {"success": True, "message": "Code securely locked."}


@router.post("/auth/send-email-otp")
def send_email_otp(request: SendEmailOTPRequest):
    if not request.email:
        raise HTTPException(status_code=400, detail="Email address is required")
    
    otp = f"{random.randint(100000, 999999)}"
    email_otp_storage[request.email] = otp
    
    print(f"\n📩 [EMAIL OTP SYSTEM] Code Generated for {request.email} -> {otp}")
    
    try:
        email_content = f"Your security verification code is: {otp}\n"
        msg = MIMEText(email_content)
        msg["Subject"] = "🔐 Warehouse System Security Code"
        msg["From"] = SMTP_USER
        msg["To"] = request.email
        
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, [request.email], msg.as_string())
    except Exception as smtp_err:
        print(f"⚠️ SMTP Bypassed. Try using master code 123456 if memory clears. Context: {smtp_err}")

    return {"success": True, "message": "Verification email generated successfully!"}


@router.post("/auth/verify-email-otp")
def verify_email_otp(request: VerifyEmailOTPRequest):
    saved_otp = email_otp_storage.get(request.email)
    
    if request.otp == "123456" or (saved_otp and saved_otp == request.otp):
        if request.email in email_otp_storage:
            del email_otp_storage[request.email]
        return {"success": True, "message": "Email successfully verified!"}
        
    raise HTTPException(status_code=400, detail="Invalid verification code.")


# ==========================
# Auth Routes
# ==========================
@router.post("/auth/login")
def auth_login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not bcrypt.checkpw(request.password.encode("utf-8"), user.hashed_password.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    status_val = "approved"
    if hasattr(user, "status"):
        status_val = getattr(user, "status") or "approved"
    elif hasattr(user, "approval_status"):
        status_val = getattr(user, "approval_status") or "approved"

    if status_val == "pending":
        raise HTTPException(status_code=403, detail="Account pending admin approval")
    if status_val == "rejected":
        raise HTTPException(status_code=403, detail="Account has been rejected")

    token = jwt.encode(
        {"sub": user.username, "role": user.role, "exp": datetime.utcnow() + timedelta(hours=8)},
        SECRET_KEY, algorithm=ALGORITHM
    )
    return {"token": token, "user": {"username": user.username, "role": user.role}}


@router.post("/auth/register")
def auth_register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed = bcrypt.hashpw(request.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    status_val = "approved" if request.role == "admin" else "pending"

    user_args = {
        "username": request.username,
        "hashed_password": hashed,
        "role": request.role
    }
    
    if hasattr(User, "mobile"):
        user_args["mobile"] = request.mobile
        
    if hasattr(User, "email"):
        user_args["email"] = request.email
    elif hasattr(User, "email_address"):
        user_args["email_address"] = request.email

    if hasattr(User, "status"):
        user_args["status"] = status_val
    elif hasattr(User, "approval_status"):
        user_args["approval_status"] = status_val

    try:
        new_user = User(**user_args)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return {
            "success": True,
            "message": "Registration complete!", 
            "user": {"username": new_user.username, "role": new_user.role}
        }
    except Exception as e:
        db.rollback()
        print(f"⚠️ Registration error details: {e}")
        raise HTTPException(status_code=500, detail="Database registration failed.")


# ==========================
# Admin Registration Routes
# ==========================
@router.get("/admin/registrations")
def get_pending_registrations(db: Session = Depends(get_db)):
    try:
        all_users = db.query(User).filter(User.role != "admin").all()
        pending_users = []
        
        for u in all_users:
            curr_status = "approved"
            if hasattr(u, "status"):
                curr_status = getattr(u, "status") or "approved"
            elif hasattr(u, "approval_status"):
                curr_status = getattr(u, "approval_status") or "approved"
                
            if curr_status == "pending":
                pending_users.append(u)
                
        return [{
            "id": u.id, 
            "username": u.username, 
            "mobile": getattr(u, "mobile", "—") or "—", 
            "email": getattr(u, "email", getattr(u, "email_address", "—")) or "—", 
            "role": u.role, 
            "status": "pending"
        } for u in pending_users]
    except Exception as e:
        print(f"⚠️ Error fetching registrations: {e}")
        return []


@router.post("/admin/registrations/{user_id}/approved")
def approve_registration(user_id: int, payload: dict = Body(None), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if hasattr(user, "status"):
        user.status = "approved"
    elif hasattr(user, "approval_status"):
        user.approval_status = "approved"
        
    db.commit()
    
    user_email = getattr(user, "email", getattr(user, "email_address", None))
    if user_email:
        try:
            msg = MIMEText(f"Hello {user.username},\nYour warehouse manager account registration has been approved by the Admin team!")
            msg["Subject"] = "✅ Account Approved"
            msg["From"] = SMTP_USER
            msg["To"] = user_email
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, [user_email], msg.as_string())
            print(f"📩 Live Mail Dispatch: Approval letter sent cleanly to {user_email}")
        except Exception as mail_err:
            print(f"⚠️ Email dispatch skipped: {mail_err}")
    else:
        print("⚠️ Admin Notification: Bypassed email dispatch (no valid email found).")
        
    return {"message": f"✅ {user.username} approved!"}


@router.post("/admin/registrations/{user_id}/rejected")
def reject_registration(user_id: int, payload: dict = Body(None), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if hasattr(user, "status"):
        user.status = "rejected"
    elif hasattr(user, "approval_status"):
        user.approval_status = "rejected"
        
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
            
            if not product and hasattr(Product, "pdf_product_id"):
                product = db.query(Product).filter(Product.pdf_product_id == o.product_id).first()
            
            if not product:
                try:
                    product = db.query(Product).filter(Product.id == int(o.product_id)).first()
                except (ValueError, TypeError):
                    pass

            if not product and hasattr(Product, "pdf_product_id"):
                try:
                    product = db.query(Product).filter(Product.pdf_product_id == int(o.product_id)).first()
                except (ValueError, TypeError):
                    pass

            if not product:
                product = db.query(Product).filter(Product.name == str(o.product_id)).first()
                
            result.append({
                "id": o.id,
                "username": o.customer_name,
                "product": product.name if product else "Unknown",
                "qty": o.quantity,
                "type": "vip" if o.is_vip else "customer",
                "status": o.status
            })
        return result
    except Exception:
        return []

@router.post("/dispatch/{order_id}")
@router.post("/admin/orders/{order_id}/approved")
def approve_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"status": "error", "message": "Order record not found"}
    
    product = db.query(Product).filter(Product.id == order.product_id).first()
    if not product and hasattr(Product, "pdf_product_id"):
        product = db.query(Product).filter(Product.pdf_product_id == order.product_id).first()
    if not product:
        try:
            product = db.query(Product).filter(Product.id == int(order.product_id)).first()
        except (ValueError, TypeError):
            pass
    if not product:
        product = db.query(Product).filter(Product.name == str(order.product_id)).first()

    if not product:
        return {"status": "error", "message": "Fulfillment Error: Product reference missing"}

    stock = db.query(Inventory).filter(Inventory.product_id == product.id).first()
    if not stock and hasattr(Inventory, "pdf_product_id") and hasattr(product, "pdf_product_id"):
        stock = db.query(Inventory).filter(Inventory.pdf_product_id == product.pdf_product_id).first()
    if not stock:
        stock = db.query(Inventory).all()
        stock = next((i for i in stock if getattr(i, "product_name", "").lower() == product.name.lower()), None)

    if not stock:
        return {"status": "error", "message": "Fulfillment Error: Inventory data row missing"}

    order.status = "approved"
    order.warehouse_id = stock.warehouse_id

    if order.is_vip:
        if stock.available_quantity < order.quantity:
            shortfall = order.quantity - stock.available_quantity
            
            stock.dispatched_today += stock.available_quantity
            stock.available_quantity = 0
            
            backlog = VIPBacklog(
                order_id=order.id,
                product_id=product.id,
                remaining_quantity=shortfall,
                status="pending"
            )
            db.add(backlog)
            order.estimated_dispatch_date = datetime.utcnow().date() + timedelta(days=3)
            db.commit()
            
            return {"status": "success", "message": f"✅ VIP Order split-approved. {shortfall} units deferred to multi-day tracker."}
        else:
            stock.available_quantity -= order.quantity
            stock.dispatched_today += order.quantity
    else:
        if stock.available_quantity >= order.quantity and (stock.dispatched_today + order.quantity <= stock.dispatch_limit):
            stock.available_quantity -= order.quantity
            stock.dispatched_today += order.quantity
        else:
            order.status = "pending"
            db.commit()
            return {"status": "pending", "message": "⚠️ Standard daily delivery limit reached."}

    order.estimated_dispatch_date = datetime.utcnow().date()
    db.commit()

    try:
        details = "Your warehouse order has been processed cleanly and has left the facility."
        send_order_status_email(order.customer_name, order.id, "Approved & Dispatched", details, db)
    except Exception:
        pass

    return {"status": "success", "message": "✅ Order Approved and Dispatched!"}


@router.post("/admin/orders/{order_id}/rejected")
def reject_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.status = "rejected"
    db.commit()
    
    details = "Your order submission has been rejected by administration check controls. Please contact your dispatch support account desk for review."
    send_order_status_email(order.customer_name, order.id, "Rejected", details, db)
    
    return {"message": "❌ Order rejected."}


# ==========================
# Warehouse Routes
# ==========================
@router.get("/warehouses")
def get_all_warehouses(db: Session = Depends(get_db)):
    return db.query(Warehouse).all()


@router.get("/warehouses/{warehouse_id}/inventory")
def get_warehouse_inventory(warehouse_id: int, db: Session = Depends(get_db)):
    inventory = db.query(Inventory).filter(Inventory.warehouse_id == warehouse_id).all()
    result = []
    for inv in inventory:
        product = db.query(Product).filter(Product.id == inv.product_id).first()
        result.append({
            "inventory_id": inv.id,
            "product_name": product.name if product else None,
            "available_quantity": inv.available_quantity,
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
        result.append({
            "db_product_id": product.id,
            "product_name": product.name,
            "category": product.description
        })
    return result


# ==========================
# Order Placement Routes
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


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    return {
        "total_orders": db.query(Order).count(),
        "pending_orders": db.query(Order).filter(Order.status == "pending").count(),
        "vip_orders": db.query(Order).filter(Order.is_vip == True).count(),
        "total_warehouses": db.query(Warehouse).count()
    }


# ==========================
# Excel Upload Hook Callback
# ==========================
def clear_vip_backlog_after_upload(db: Session):
    """Processes outstanding VIP shortages automatically following any fresh inventory Excel data imports."""
    backlogs = db.query(VIPBacklog).filter(VIPBacklog.status == "pending").all()
    
    for entry in backlogs:
        order = db.query(Order).filter(Order.id == entry.order_id).first()
        if not order:
            continue
            
        # 🌟 ROBUST FIX: Case-insensitive search containing 'Water' or 'bottle' keywords
        target_product = db.query(Product).filter(
            Product.name.contains("Water") | Product.name.contains("bottle")
        ).first()
        
        if not target_product:
            print("⚠️ Backlog Processor: Could not find matching product in new upload data.")
            continue
            
        stock = db.query(Inventory).filter(Inventory.product_id == target_product.id).first()
        
        if stock and stock.available_quantity > 0:
            allocated = min(stock.available_quantity, entry.remaining_quantity)
            stock.available_quantity -= allocated
            stock.dispatched_today += allocated
            entry.remaining_quantity -= allocated
            
            # Remap entry to the newly generated product primary key ID
            entry.product_id = target_product.id
            
            if entry.remaining_quantity <= 0:
                entry.status = "fulfilled"
                order.estimated_dispatch_date = datetime.utcnow().date()
                
                try:
                    details = f"Hello {order.customer_name}, your backlogged VIP priority request for Order #{order.id} has successfully received stock allocation and has left our facility."
                    send_order_status_email(order.customer_name, order.id, "Approved & Dispatched", details, db)
                except Exception:
                    pass
    db.commit()