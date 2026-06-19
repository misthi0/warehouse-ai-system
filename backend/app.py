from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from models.database import engine, SessionLocal  # 🔑 Imported SessionLocal to clear tables safely
from models import models
# Inside backend/app.py
# Inside backend/app.py
from models.database import engine
from models.models import Base

# This forces SQLAlchemy to verify and create tables every single time the server boots up!
Base.metadata.create_all(bind=engine)


# Dispatch Engine
try:
    from engine.dispatch_routes import router as dispatch_router
    dispatch_available = True
except ImportError as e:
    print(f"⚠️ Dispatch engine not found: {e}")
    dispatch_available = False

# PDF Upload
try:
    from api.pdf_upload import router as pdf_router
    pdf_available = True
except ImportError as e:
    print(f"⚠️ PDF upload not found: {e}")
    pdf_available = False

# Ensure database tables exist safely
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Warehouse AI System",
    description="Smart Multi-Warehouse Dispatch and Inventory Management System",
    version="1.0.0"
)

# 🧹 TARGETED STARTUP RESET
# This wipes out ONLY the inventory data whenever the server starts, keeping users safe!
@app.on_event("startup")
def clean_inventory_on_startup():
    print("\n🧹 [STARTUP] Wiping old inventory tables for a clean slate...")
    db = SessionLocal()
    try:
        # Delete data from stock/warehouse tables only
        db.query(models.Inventory).delete()
        db.query(models.Product).delete()
        db.query(models.Warehouse).delete()
        
        # If your project uses the Order table and you want it cleared on restart, uncomment the line below:
        # db.query(models.Order).delete()
        
        db.commit()
        print("✅ Stock data cleared! Registered users have been safely preserved.\n")
    except Exception as e:
        db.rollback()
        print(f"⚠️ Notice during startup clear sequence: {e}\n")
    finally:
        db.close()


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Main Routes
app.include_router(router, prefix="/api")

# Dispatch Routes
if dispatch_available:
    app.include_router(dispatch_router)
    print("✅ Dispatch engine connected!")

# PDF Routes
if pdf_available:
    app.include_router(pdf_router, prefix="/api")
    print("✅ PDF upload connected!")

@app.get("/")
def home():
    return {
        "message": "Warehouse AI System is running!",
        "docs": "/docs",
        "dispatch_engine": dispatch_available,
        "pdf_upload": pdf_available
    }