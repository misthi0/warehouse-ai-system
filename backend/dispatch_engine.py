from datetime import datetime, timedelta


# ─────────────────────────────────────────
# 1. WAREHOUSE SELECTOR
# ─────────────────────────────────────────

def select_warehouse(order):
    """Select the best warehouse based on stock, distance and capacity."""
    warehouses = order.get("available_warehouses", [])
    if not warehouses:
        return {"error": "No warehouses available"}

    stocked = [w for w in warehouses if w.get("has_stock", False)]
    if not stocked:
        return {"error": "Item out of stock in all warehouses"}

    best = min(
        stocked,
        key=lambda w: (
            w.get("distance", float("inf")),
            -(w.get("daily_limit", 0) - w.get("dispatched_today", 0))
        )
    )
    return {
        "warehouse_id": best["id"],
        "warehouse_name": best["name"],
        "distance_km": best.get("distance", 0),
        "estimated_dispatch": "Within 2 hours"
    }


# ─────────────────────────────────────────
# 2. DISPATCH LIMIT CHECK
# ─────────────────────────────────────────

def check_dispatch_limit(warehouse):
    """Check if warehouse has not exceeded its daily dispatch limit."""
    dispatched = warehouse.get("dispatched_today", 0)
    limit = warehouse.get("daily_limit", 100)
    remaining = limit - dispatched

    if dispatched >= limit:
        return {
            "allowed": False,
            "reason": "Daily dispatch limit reached",
            "dispatched_today": dispatched,
            "daily_limit": limit,
            "remaining_capacity": 0
        }
    return {
        "allowed": True,
        "dispatched_today": dispatched,
        "daily_limit": limit,
        "remaining_capacity": remaining
    }


# ─────────────────────────────────────────
# 3. VIP PRIORITY LOGIC
# ─────────────────────────────────────────

VIP_TIERS = {
    "VIP": {"priority": 1, "discount": 20, "express": True},
    "PREMIUM": {"priority": 2, "discount": 10, "express": True},
    "REGULAR": {"priority": 5, "discount": 0, "express": False},
}

def is_vip(customer):
    return customer.get("tier") == "VIP"

def get_priority(customer):
    tier = customer.get("tier", "REGULAR")
    return VIP_TIERS.get(tier, VIP_TIERS["REGULAR"])

def apply_vip_benefits(order):
    """Apply VIP benefits to an order."""
    customer = order.get("customer", {})
    tier = customer.get("tier", "REGULAR")
    benefits = VIP_TIERS.get(tier, VIP_TIERS["REGULAR"])
    original_price = order.get("total_price", 0)
    discount_amount = (benefits["discount"] / 100) * original_price

    return {
        "customer_tier": tier,
        "priority_level": benefits["priority"],
        "express_shipping": benefits["express"],
        "discount_percent": benefits["discount"],
        "discount_amount": round(discount_amount, 2),
        "final_price": round(original_price - discount_amount, 2)
    }


# ─────────────────────────────────────────
# 4. WAIT TIME CALCULATOR
# ─────────────────────────────────────────

def calculate_wait_time(order):
    """Calculate estimated wait time based on priority, distance and time of day."""
    customer = order.get("customer", {})
    tier = customer.get("tier", "REGULAR")
    distance = order.get("distance_km", 10)
    current_hour = datetime.now().hour

    base_time = 30
    if tier == "VIP":
        base_time = 15
    elif tier == "PREMIUM":
        base_time = 20

    travel_time = distance * 2

    peak_surcharge = 0
    if 9 <= current_hour <= 12 or 17 <= current_hour <= 20:
        peak_surcharge = 15

    total_time = base_time + travel_time + peak_surcharge
    eta = datetime.now() + timedelta(minutes=total_time)

    return {
        "base_time_minutes": base_time,
        "travel_time_minutes": travel_time,
        "peak_hour_surcharge": peak_surcharge,
        "total_wait_minutes": total_time,
        "estimated_arrival": eta.strftime("%Y-%m-%d %H:%M"),
        "is_peak_hour": peak_surcharge > 0
    }


# ─────────────────────────────────────────
# 5. RESTOCK DATE LOGIC
# ─────────────────────────────────────────

RESTOCK_SCHEDULE = {
    "electronics": 3,
    "clothing": 5,
    "food": 1,
    "furniture": 14,
    "default": 7
}

def get_restock_date(item):
    """Calculate restock date based on item category and stock level."""
    if item.get("in_stock"):
        return {
            "status": "In Stock",
            "available": True,
            "restock_date": None,
            "stock_level": item.get("stock_level", "Unknown")
        }

    category = item.get("category", "default").lower()
    days = item.get("restock_days") or RESTOCK_SCHEDULE.get(category, RESTOCK_SCHEDULE["default"])
    restock_date = datetime.today() + timedelta(days=days)

    return {
        "status": "Out of Stock",
        "available": False,
        "restock_date": restock_date.strftime("%Y-%m-%d"),
        "days_until_restock": days,
        "category": category
    }


# ─────────────────────────────────────────
# MAIN DISPATCH HANDLER
# ─────────────────────────────────────────

def process_dispatch(order):
    """Main function that processes a full dispatch request."""

    # Reject negative price
    if order.get("total_price", 0) < 0:
        return {"status": "REJECTED", "reason": "Invalid order price"}

    # Step 1: Select warehouse
    warehouse_result = select_warehouse(order)

    if "error" in warehouse_result:
        return {"status": "REJECTED", "reason": warehouse_result["error"]}

    # Step 2: Check limit on the SELECTED warehouse
    selected_id = warehouse_result["warehouse_id"]
    selected_warehouse = next(
        w for w in order["available_warehouses"]
        if w["id"] == selected_id
    )
    limit_result = check_dispatch_limit(selected_warehouse)

    if not limit_result["allowed"]:
        return {"status": "REJECTED", "reason": limit_result["reason"]}

    # Step 3: Apply VIP benefits
    vip_result = apply_vip_benefits(order)

    # Step 4: Use selected warehouse distance for accurate ETA
    wait_result = calculate_wait_time({
        **order,
        "distance_km": warehouse_result["distance_km"]
    })

    # Step 5: Check restock
    item = order.get("item", {})
    restock_result = get_restock_date(item)

    return {
        "status": "APPROVED",
        "warehouse": warehouse_result,
        "dispatch_limit": limit_result,
        "vip_info": vip_result,
        "wait_time": wait_result,
        "restock_info": restock_result
    }


# ─────────────────────────────────────────
# TEST
# ─────────────────────────────────────────

if __name__ == "__main__":
    sample_order = {
        "order_id": "ORD-1001",
        "total_price": 500,
        "distance_km": 8,
        "customer": {
            "name": "Kushal Tiwari",
            "tier": "VIP"
        },
        "item": {
            "name": "Laptop",
            "category": "electronics",
            "in_stock": False,
            "stock_level": 0
        },
        "available_warehouses": [
            {"id": "WH1", "name": "Delhi North", "distance": 8, "has_stock": True, "dispatched_today": 45, "daily_limit": 100},
            {"id": "WH2", "name": "Delhi South", "distance": 15, "has_stock": True, "dispatched_today": 98, "daily_limit": 100},
        ]
    }

    result = process_dispatch(sample_order)
    print("\n===== FINAL RESULT =====")
    print(result)

    