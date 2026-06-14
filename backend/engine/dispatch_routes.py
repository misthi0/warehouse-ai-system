from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional
from enum import Enum
import logging

from models.database import SessionLocal
from models.models import Inventory, Warehouse

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Constants ──
class DispatchStatus(str, Enum):
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
            .join(
                Warehouse,
                Inventory.warehouse_id == Warehouse.id
            )
            .filter(
                Inventory.product_id == product_id
            )
            .all()
        )

        warehouses = []

        for inv, wh in results:
            warehouses.append(
                {
                    "warehouse_id": wh.id,
                    "name": wh.name,
                    "product_id": inv.product_id,
                    "available_quantity": inv.available_quantity,
                    "dispatch_limit": inv.dispatch_limit,
                    "dispatched_today": inv.dispatched_today,
                    "restock_date": str(inv.restock_date)
                }
            )

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
    VIP customers get additional benefits like express dispatch.
    """

    eligible = [
        w for w in warehouses
        if w["available_quantity"] >= quantity
        and w["dispatched_today"] < w["dispatch_limit"]
        and (w["dispatch_limit"] - w["dispatched_today"]) >= quantity
    ]

    if not eligible:
        return None

    return max(
        eligible,
        key=lambda w: w["dispatch_limit"] - w["dispatched_today"]
    )


# ── 2. Dispatch Limit Check ──
def check_dispatch_limit(
    warehouse: dict,
    quantity: int
) -> bool:
    remaining = (
        warehouse["dispatch_limit"]
        - warehouse["dispatched_today"]
    )
    return remaining >= quantity


# ── 3. Wait Time Calculator ──
def calculate_wait_time(restock_date: str) -> int:
    try:
        restock = datetime.strptime(
            restock_date,
            "%Y-%m-%d"
        )

        today = datetime.today()

        delta = (restock - today).days

        return max(delta, 0)

    except ValueError:
        return 0


# ── 4. Restock Date Logic ──
def get_restock_info(
    warehouses: list[dict]
) -> dict | None:

    dates = [
        w["restock_date"]
        for w in warehouses
        if w.get("restock_date")
    ]

    if not dates:
        return None

    earliest = min(dates)

    wait_days = calculate_wait_time(
        earliest
    )

    return {
        "restock_date": earliest,
        "wait_days": wait_days
    }


# ── Main Dispatch Endpoint ──
@router.post(
    "/api/dispatch",
    response_model=DispatchResponse
)
def dispatch_order(
    order: OrderRequest
) -> DispatchResponse:

    warehouses = get_warehouses(
        order.product_id
    )

    if not warehouses:
        raise HTTPException(
            status_code=404,
            detail="Product not found in inventory"
        )

    best = select_warehouse(
        warehouses,
        order.quantity,
        order.is_vip
    )

    if best and not check_dispatch_limit(
        best,
        order.quantity
    ):
        best = None

    if best:

        logger.info(
            "Order approved",
            extra={
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
            estimated_dispatch_date=datetime.today().strftime(
                "%Y-%m-%d"
            )
        )

    restock = get_restock_info(
        warehouses
    )

    if not restock:
        raise HTTPException(
            status_code=503,
            detail="No warehouses available and no restock date found."
        )

    logger.warning(
        "Order pending",
        extra={
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
            f"Product unavailable. "
            f"Expected dispatch after "
            f"{restock['wait_days']} days."
        ),
        estimated_dispatch_date=restock[
            "restock_date"
        ]
    )