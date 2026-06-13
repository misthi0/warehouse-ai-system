from datetime import datetime, timedelta

# 1. Warehouse Selector
def select_warehouse(order):
    warehouses = order.get("available_warehouses", [])
    if not warehouses:
        return None
    return min(warehouses, key=lambda w: w["distance"])

# 2. Dispatch Limit Check
def check_dispatch_limit(warehouse):
    return warehouse["dispatched_today"] < warehouse["daily_limit"]

# 3. VIP Priority Logic
def is_vip(customer):
    return customer.get("tier") == "VIP"

def get_priority(customer):
    return 1 if is_vip(customer) else 5

# 4. Wait Time Calculator
def calculate_wait_time(order):
    base_time = 30  # minutes
    if is_vip(order.get("customer", {})):
        return base_time // 2
    return base_time

# 5. Restock Date Logic
def get_restock_date(item):
    if item.get("in_stock"):
        return "Available now"
    days = item.get("restock_days", 7)
    restock = datetime.today() + timedelta(days=days)
    return restock.strftime("%Y-%m-%d")

    