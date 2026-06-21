from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
from enum import Enum
import logging

from models.database import SessionLocal, get_db
from sqlalchemy.orm import Session
from models.models import Inventory, Warehouse, Order, VipPendingDispatch

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Constants ──
class DispatchStatus(str, Enum):
    APPROVED = "APPROVED"
    PENDING = "PENDING"


# ── Response Model ──
class DispatchResponse(BaseModel):
    status: DispatchStatus
    customer_name: str
    product_id: int
    quantity: int
    is_vip: bool
    warehouse_id: Optional[int] = None
    warehouse_name: Optional[str] = None
    estimated_dispatch_date: Optional[str] = None
    message: Optional[str] = None


# ── Database Warehouse Loader ──
def get_warehouses(product_id: int) -> list[dict]:
    db = SessionLocal()
    try:
        results = (
            db.query(Inventory, Warehouse)
            .join(Warehouse, Inventory.warehouse_id == Warehouse.id)
            .filter(Inventory.product_id == product_id)
            .all()
        )
        warehouses = []
        for inv, wh in results:
            warehouses.append({
                "warehouse_id": wh.id,
                "name": wh.name,
                "product_id": inv.product_id,
                "available_quantity": inv.available_quantity,
                "dispatch_limit": inv.dispatch_limit,
                "dispatched_today": inv.dispatched_today,
                "restock_date": str(inv.restock_date)
            })
        return warehouses
    finally:
        db.close()


# ── 1. Warehouse Selector ──
def select_warehouse(
    warehouses: list[dict],
    quantity: int,
    is_vip: bool = False
) -> dict | None:
    """
    Select warehouse based on stock and dispatch capacity.
    Both VIP and regular get warehouse with most remaining capacity.
    VIP customers get additional benefits like express dispatch prioritization.
    """
    eligible = [
        w for w in warehouses
        if w["available_quantity"] >= quantity
        and w["dispatched_today"] < w["dispatch_limit"]
        and (w["dispatch_limit"] - w["dispatched_today"]) >= quantity
    ]
    if not eligible:
        return None
    
    # Priority sorting layer: If VIP order, prioritize warehouses with higher availability margins
    if is_vip:
        return max(eligible, key=lambda w: w["available_quantity"])
        
    return max(
        eligible,
        key=lambda w: w["dispatch_limit"] - w["dispatched_today"]
    )


# ── 2. Dispatch Limit Check ──
def check_dispatch_limit(warehouse: dict, quantity: int) -> bool:
    remaining = warehouse["dispatch_limit"] - warehouse["dispatched_today"]
    return remaining >= quantity


# ── 3. Wait Time Calculator ──
def calculate_wait_time(restock_date: str) -> int:
    try:
        restock = datetime.strptime(restock_date, "%Y-%m-%d")
        today = datetime.today()
        delta = (restock - today).days
        return max(delta, 0)
    except ValueError:
        return 0


# ── 4. Restock Date Logic ──
def get_restock_info(warehouses: list[dict]) -> dict | None:
    dates = [w["restock_date"] for w in warehouses if w.get("restock_date")]
    if not dates:
        return None
    earliest = min(dates)
    wait_days = calculate_wait_time(earliest)
    return {
        "restock_date": earliest,
        "wait_days": wait_days
    }


# ── 5. Update Inventory After Dispatch ──
def update_inventory_after_dispatch(
    warehouse_id: int,
    product_id: int,
    quantity: int
):
    """Deduct dispatched quantity from available stock and update dispatched_today"""
    db = SessionLocal()
    try:
        inv = db.query(Inventory).filter(
            Inventory.warehouse_id == warehouse_id,
            Inventory.product_id == product_id
        ).first()
        if inv:
            inv.available_quantity -= quantity
            inv.dispatched_today += quantity
            db.commit()
    finally:
        db.close()


# ========================================================
# ── Main Manual Dispatch Endpoint (UPDATED FOR ADMIN) ──
# ========================================================
@router.post("/api/dispatch/{order_id}", response_model=DispatchResponse)
def dispatch_order(order_id: int, db: Session = Depends(get_db)) -> DispatchResponse:
    """
    MODIFIED: Invoked explicitly from the admin panel dashboard.
    Fetches the existing pending database order row by ID, executes
    the allocation routing framework, and locks inventory records.
    """
    # 1. Fetch the exact targets order from the active row instance database
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=404,
            detail=f"Target order context code record #{order_id} not found"
        )

    if order.status == "approved":
        raise HTTPException(
            status_code=400,
            detail=f"Order #{order_id} is already processed and dispatched"
        )

    # 2. Extract operational parameters from the found order
    warehouses = get_warehouses(order.product_id)
    if not warehouses:
        raise HTTPException(
            status_code=404,
            detail="Requested product not found in active cluster inventories"
        )

    # 3. Locate the ideal matching warehouse block
    best = select_warehouse(warehouses, order.quantity, order.is_vip)

    if best and not check_dispatch_limit(best, order.quantity):
        best = None

    if best:
        # Update active inventory counters
        update_inventory_after_dispatch(
            warehouse_id=best["warehouse_id"],
            product_id=order.product_id,
            quantity=order.quantity
        )

        # Update order tracker status values to approved state
        order.status = "approved"
        order.warehouse_id = best["warehouse_id"]
        order.estimated_dispatch_date = date.today()
        db.commit()

        logger.info(
            "Admin Order Approved Manual Execution Complete",
            extra={
                "order_id": order.id,
                "product_id": order.product_id,
                "warehouse_id": best["warehouse_id"],
                "customer": order.customer_name,
                "is_vip": order.is_vip
            }
        )

        return DispatchResponse(
            status=DispatchStatus.APPROVED,
            customer_name=order.customer_name,
            product_id=order.product_id,
            quantity=order.quantity,
            is_vip=order.is_vip,
            warehouse_id=best["warehouse_id"],
            warehouse_name=best["name"],
            estimated_dispatch_date=datetime.today().strftime("%Y-%m-%d")
        )

    # Fallback backorder scheduling logic if limits or stock thresholds are hit
   # ── VIP Multi-Day Partial Dispatch Logic ──
    if order.is_vip:
        # Find the warehouse with the most stock for this product, regardless of dispatch limit
        candidates = [w for w in warehouses if w["available_quantity"] > 0]
        if candidates:
            target = max(candidates, key=lambda w: w["available_quantity"])
            remaining_capacity = max(target["dispatch_limit"] - target["dispatched_today"], 0)
            dispatch_now = min(remaining_capacity, order.quantity, target["available_quantity"])

            if dispatch_now > 0:
                update_inventory_after_dispatch(
                    warehouse_id=target["warehouse_id"],
                    product_id=order.product_id,
                    quantity=dispatch_now
                )

            remaining_after = order.quantity - dispatch_now

            if remaining_after <= 0:
                order.status = "approved"
                order.warehouse_id = target["warehouse_id"]
                order.estimated_dispatch_date = date.today()
                db.commit()
                return DispatchResponse(
                    status=DispatchStatus.APPROVED,
                    customer_name=order.customer_name,
                    product_id=order.product_id,
                    quantity=order.quantity,
                    is_vip=order.is_vip,
                    warehouse_id=target["warehouse_id"],
                    warehouse_name=target["name"],
                    estimated_dispatch_date=datetime.today().strftime("%Y-%m-%d")
                )

            # Partially dispatched — create tracking record for remaining quantity
            existing_pending = db.query(VipPendingDispatch).filter(
                VipPendingDispatch.order_id == order.id,
                VipPendingDispatch.status == "in_progress"
            ).first()

            if existing_pending:
                existing_pending.remaining_quantity = remaining_after
            else:
                pending = VipPendingDispatch(
                    order_id=order.id,
                    product_id=order.product_id,
                    customer_name=order.customer_name,
                    total_quantity=order.quantity,
                    remaining_quantity=remaining_after,
                    status="in_progress"
                )
                db.add(pending)

            order.status = "pending"
            order.warehouse_id = target["warehouse_id"]
            db.commit()

            return DispatchResponse(
                status=DispatchStatus.PENDING,
                customer_name=order.customer_name,
                product_id=order.product_id,
                quantity=order.quantity,
                is_vip=order.is_vip,
                warehouse_id=target["warehouse_id"],
                message=(
                    f"Partially dispatched {dispatch_now} units today. "
                    f"{remaining_after} units remain — will continue on next stock update."
                ),
                estimated_dispatch_date=None
            )

    # Fallback backorder scheduling logic if limits or stock thresholds are hit
    restock = get_restock_info(warehouses)
    if not restock:
        raise HTTPException(
            status_code=503,
            detail="No local warehouses available and no future restock date tracks found."
        )

    order.status = "pending"
    order.estimated_dispatch_date = datetime.strptime(restock["restock_date"], "%Y-%m-%d").date()
    db.commit()

    logger.warning(
        "Manual allocation backordered due to resource capacity limitations",
        extra={
            "order_id": order.id,
            "product_id": order.product_id,
            "customer": order.customer_name,
            "wait_days": restock["wait_days"]
        }
    )

    return DispatchResponse(
        status=DispatchStatus.PENDING,
        customer_name=order.customer_name,
        product_id=order.product_id,
        quantity=order.quantity,
        is_vip=order.is_vip,
        warehouse_id=None,
        message=(
            f"Insufficient available capacity inside operational units. "
            f"Expected dispatch delayed, scheduled after {restock['wait_days']} days."
        ),
        estimated_dispatch_date=restock["restock_date"]
    )
