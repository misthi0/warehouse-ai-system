from models.database import SessionLocal
from models.models import Warehouse, Product, Inventory
from datetime import date

def seed_database():
    db = SessionLocal()
    
    try:
        # Check if already seeded
        if db.query(Warehouse).count() > 0:
            print("Database already has data!")
            return

        # Add warehouses
        warehouses = [
            Warehouse(name="Warehouse 1", location="Mumbai"),
            Warehouse(name="Warehouse 2", location="Delhi"),
            Warehouse(name="Warehouse 3", location="Bangalore"),
        ]
        db.add_all(warehouses)
        db.commit()

        # Add products
        products = [
            Product(name="Product A", description="Item A", unit_price=100.00),
            Product(name="Product B", description="Item B", unit_price=200.00),
            Product(name="Product C", description="Item C", unit_price=300.00),
        ]
        db.add_all(products)
        db.commit()

        # Add inventory
        inventory = [
            Inventory(warehouse_id=1, product_id=1, available_quantity=500, dispatch_limit=100, restock_date=date(2026,7,1)),
            Inventory(warehouse_id=1, product_id=2, available_quantity=300, dispatch_limit=80, restock_date=date(2026,7,5)),
            Inventory(warehouse_id=2, product_id=1, available_quantity=200, dispatch_limit=100, restock_date=date(2026,7,3)),
            Inventory(warehouse_id=2, product_id=3, available_quantity=400, dispatch_limit=90, restock_date=date(2026,7,8)),
            Inventory(warehouse_id=3, product_id=2, available_quantity=150, dispatch_limit=80, restock_date=date(2026,7,2)),
            Inventory(warehouse_id=3, product_id=3, available_quantity=600, dispatch_limit=120, restock_date=date(2026,7,10)),
        ]
        db.add_all(inventory)
        db.commit()
        print("✅ Database seeded successfully!")

    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()