from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import router
from backend.models.database import engine
from backend.models import models

# Import Khushal's dispatch engine
try:
    from backend.engine.dispatch_routes import router as dispatch_router
    dispatch_available = True
except ImportError as e:
    print(f"⚠️ Dispatch engine not found: {e}")
    dispatch_available = False

# Import PDF upload router
try:
    from backend.api.pdf_upload import router as pdf_router
    pdf_available = True
except ImportError as e:
    print(f"⚠️ PDF upload not found: {e}")
    pdf_available = False

# Create all tables automatically
models.Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Warehouse AI System",
    description="Smart Multi-Warehouse Dispatch and Inventory Management System",
    version="1.0.0"
)

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect your routes
app.include_router(router, prefix="/api")

# Connect Khushal's dispatch engine
if dispatch_available:
    app.include_router(dispatch_router)
    print("✅ Dispatch engine connected!")

# Connect PDF upload
if pdf_available:
    app.include_router(pdf_router, prefix="/api")
    print("✅ PDF upload connected!")

@app.get("/")
def home():
    return {
        "message": "Warehouse AI System is running!",
        "docs": "Visit /docs to see all APIs",
        "dispatch_engine": dispatch_available,
        "pdf_upload": pdf_available
    }