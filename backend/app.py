from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from models.database import engine
from models import models

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

# Create DB Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Warehouse AI System",
    description="Smart Multi-Warehouse Dispatch and Inventory Management System",
    version="1.0.0"
)

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