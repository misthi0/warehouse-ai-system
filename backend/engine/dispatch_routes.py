from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timedelta

router = APIRouter()

# ── Input Models (matching Misthi's DB schema) ──
class OrderRequest(BaseModel):
    customer_name: str
    product_id: int
    quantity: int
    is_vip: bool = False

class WarehouseInventory(BaseModel):
    warehouse_id: int
    product_id: int
    available_quantity: int
    dispatch_limit: int
    dispatched_today: int
    restock_date: str

# ── 1. Warehouse Selector ──
def select_warehouse(warehouses, quantity):
    eligible = [
        w for w in warehouses
        if w["available_quantity"] >= quantity
        and w["dispatched_today"] < w["dispatch_limit"]
    ]
    if not eligible:
        return None
    return min(eligible, key=lambda w: w["dispatched_today"])

# ── 2. Dispatch Limit Check ──
def check_dispatch_limit(warehouse, quantity):
    remaining = warehouse["dispatch_limit"] - warehouse["dispatched_today"]
    return remaining >= quantity

# ── 3. VIP Priority ──
def apply_vip_priority(warehouses, is_vip):
    if is_vip:
        return sorted(warehouses, key=lambda w: w["dispatched_today"])
    return warehouses

# ── 4. Wait Time Calculator ──
def calculate_wait_time(restock_date: str):
    restock = datetime.strptime(restock_date, "%Y-%m-%d")
    today = datetime.today()
    delta = (restock - today).days
    return max(delta, 0)

# ── 5. Restock Date Logic ──
def get_restock_info(warehouses):
    dates = [w["restock_date"] for w in warehouses if w["restock_date"]]
    if not dates:
        return None
    earliest = min(dates)
    wait_days = calculate_wait_time(earliest)
    return {"restock_date": earliest, "wait_days": wait_days}

# ── Main Dispatch Endpoint ──
@router.post("/api/dispatch")
def dispatch_order(order: OrderRequest):
    # Simulated warehouse data (will come from Misthi's DB)
    warehouses = [
        {"warehouse_id": 1, "name": "Warehouse 1", "product_id": order.product_id,
         "available_quantity": 100, "dispatch_limit": 50, "dispatched_today": 20, "restock_date": "2026-06-20"},
        {"warehouse_id": 2, "name": "Warehouse 2", "product_id": order.product_id,
         "available_quantity": 200, "dispatch_limit": 80, "dispatched_today": 79, "restock_date": "2026-06-18"},
        {"warehouse_id": 3, "name": "Warehouse 3", "product_id": order.product_id,
         "available_quantity": 0, "dispatch_limit": 60, "dispatched_today": 10, "restock_date": "2026-06-22"},
    ]

    # Apply VIP priority sorting
    sorted_warehouses = apply_vip_priority(warehouses, order.is_vip)

    # Select best warehouse
    best = select_warehouse(sorted_warehouses, order.quantity)

    if best:
        return {
            "status": "APPROVED",
            "customer_name": order.customer_name,
            "product_id": order.product_id,
            "quantity": order.quantity,
            "is_vip": order.is_vip,
            "warehouse_id": best["warehouse_id"],
            "warehouse_name": best["name"],
            "estimated_dispatch_date": datetime.today().strftime("%Y-%m-%d")
        }
    else:
        restock = get_restock_info(warehouses)
        return {
            "status": "PENDING",
            "customer_name": order.customer_name,
            "product_id": order.product_id,
            "quantity": order.quantity,
            "is_vip": order.is_vip,
            "warehouse_id": None,
            "message": f"Product unavailable. Expected dispatch after {restock['wait_days']} days.",
            "estimated_dispatch_date": restock["restock_date"]
        }