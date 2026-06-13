from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Constants ──
APPROVED = "APPROVED"
PENDING = "PENDING"

# ── Input Models ──
class OrderRequest(BaseModel):
    customer_name: str
    product_id: int
    quantity: int
    is_vip: bool = False

    @validator("quantity")
    def quantity_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v

    @validator("customer_name")
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Customer name cannot be empty")
        return v


# ── Response Model ──
class DispatchResponse(BaseModel):
    status: str
    customer_name: str
    product_id: int
    quantity: int
    is_vip: bool
    warehouse_id: Optional[int] = None
    warehouse_name: Optional[str] = None
    estimated_dispatch_date: Optional[str] = None
    message: Optional[str] = None


# ── Mock Data (will be replaced by Misthi's DB) ──
def get_warehouses(product_id: int) -> list[dict]:
    return [
        {
            "warehouse_id": 1,
            "name": "Warehouse 1",
            "product_id": product_id,
            "available_quantity": 100,
            "dispatch_limit": 50,
            "dispatched_today": 20,
            "restock_date": "2026-06-20"
        },
        {
            "warehouse_id": 2,
            "name": "Warehouse 2",
            "product_id": product_id,
            "available_quantity": 200,
            "dispatch_limit": 80,
            "dispatched_today": 79,
            "restock_date": "2026-06-18"
        },
        {
            "warehouse_id": 3,
            "name": "Warehouse 3",
            "product_id": product_id,
            "available_quantity": 0,
            "dispatch_limit": 60,
            "dispatched_today": 10,
            "restock_date": "2026-06-22"
        },
    ]


# ── 1. Warehouse Selector ──
def select_warehouse(
    warehouses: list[dict],
    quantity: int
) -> dict | None:
    """Select warehouse with enough stock and most remaining dispatch capacity."""
    eligible = [
        w for w in warehouses
        if w["available_quantity"] >= quantity
        and w["dispatched_today"] < w["dispatch_limit"]
        and (w["dispatch_limit"] - w["dispatched_today"]) >= quantity
    ]
    if not eligible:
        return None
    return max(eligible, key=lambda w: w["dispatch_limit"] - w["dispatched_today"])


# ── 2. Dispatch Limit Check ──
def check_dispatch_limit(
    warehouse: dict,
    quantity: int
) -> bool:
    """Check if warehouse can handle the requested quantity."""
    remaining = warehouse["dispatch_limit"] - warehouse["dispatched_today"]
    return remaining >= quantity


# ── 3. VIP Priority ──
def apply_vip_priority(
    warehouses: list[dict],
    is_vip: bool
) -> list[dict]:
    """VIP orders get warehouses sorted by most available capacity first."""
    if is_vip:
        return sorted(
            warehouses,
            key=lambda w: w["dispatch_limit"] - w["dispatched_today"],
            reverse=True
        )
    return warehouses


# ── 4. Wait Time Calculator ──
def calculate_wait_time(restock_date: str) -> int:
    """Calculate days until restock."""
    try:
        restock = datetime.strptime(restock_date, "%Y-%m-%d")
        today = datetime.today()
        delta = (restock - today).days
        return max(delta, 0)
    except ValueError:
        return 0


# ── 5. Restock Date Logic ──
def get_restock_info(warehouses: list[dict]) -> dict | None:
    """Get earliest restock date across all warehouses."""
    dates = [w["restock_date"] for w in warehouses if w.get("restock_date")]
    if not dates:
        return None
    earliest = min(dates)
    wait_days = calculate_wait_time(earliest)
    return {"restock_date": earliest, "wait_days": wait_days}


# ── Main Dispatch Endpoint ──
@router.post("/api/dispatch", response_model=DispatchResponse)
def dispatch_order(order: OrderRequest) -> DispatchResponse:
    """
    Main dispatch endpoint.
    Selects best warehouse based on stock, dispatch limit and VIP priority.
    """
    warehouses = get_warehouses(order.product_id)

    sorted_warehouses = apply_vip_priority(warehouses, order.is_vip)
    best = select_warehouse(sorted_warehouses, order.quantity)

    if best and check_dispatch_limit(best, order.quantity):
        logger.info(f"Order APPROVED for product {order.product_id} → Warehouse {best['warehouse_id']}")
        return DispatchResponse(
            status=APPROVED,
            customer_name=order.customer_name,
            product_id=order.product_id,
            quantity=order.quantity,
            is_vip=order.is_vip,
            warehouse_id=best["warehouse_id"],
            warehouse_name=best["name"],
            estimated_dispatch_date=datetime.today().strftime("%Y-%m-%d")
        )
    else:
        restock = get_restock_info(warehouses)
        if not restock:
            raise HTTPException(
                status_code=503,
                detail="No warehouses available and no restock date found."
            )
        logger.warning(f"Order PENDING for product {order.product_id}. Restock in {restock['wait_days']} days.")
        return DispatchResponse(
            status=PENDING,
            customer_name=order.customer_name,
            product_id=order.product_id,
            quantity=order.quantity,
            is_vip=order.is_vip,
            warehouse_id=None,
            message=f"Product unavailable. Expected dispatch after {restock['wait_days']} days.",
            estimated_dispatch_date=restock["restock_date"]
        )