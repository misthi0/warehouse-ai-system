from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import router
from backend.models.database import engine
from backend.models import models

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

# Connect all routes
app.include_router(router, prefix="/api")

@app.get("/")
def home():
    return {
        "message": "Warehouse AI System is running!",
        "docs": "Visit /docs to see all APIs"
    }