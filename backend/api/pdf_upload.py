from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from fastapi import Depends
import pdfplumber
import re
from datetime import datetime
import tempfile
import os
from models.database import get_db
from models.models import Warehouse, Product, Inventory

router = APIRouter()

# ── HELPER FUNCTIONS ──────────────────────────────────────────

def extract_date(text):
    """Extract date in YYYY-MM-DD format from any text"""
    if not text:
        return None
    match = re.search(r'\d{4}-\d{2}-\d{2}', str(text))
    if match:
        try:
            return datetime.strptime(match.group(), "%Y-%m-%d").date()
        except:
            return None
    return None

def extract_number(text):
    """Extract first number from any text"""
    if not text:
        return 0
    match = re.search(r'\d+', str(text))
    return int(match.group()) if match else 0

def is_header_row(row):
    """Check if a table row is a header row"""
    if not row:
        return False
    header_keywords = ['product', 'name', 'category', 'stock',
                       'id', 'restock', 'dispatch', 'produce', 'limit']
    row_text = ' '.join([str(c).lower() for c in row if c])
    matches = sum(1 for kw in header_keywords if kw in row_text)
    return matches >= 2

def find_warehouses_in_text(full_text):
    """
    Find ALL warehouse names from PDF text.
    Works for simple 'Warehouse 1' or 'Warehouse 1 — Delhi North' formats.
    """
    warehouses = []
    seen_names = set()
    lines = full_text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Match "Warehouse 1", "Warehouse 2", etc. anywhere in line
        match = re.search(r'(Warehouse\s*\d+)', line, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            name = re.sub(r'\s+', ' ', name)
            if name not in seen_names:
                seen_names.add(name)
                # Extract location after separator if present, else use name
                location = name
                for sep in ['—', ' - ', ':']:
                    if sep in line:
                        location = line.split(sep, 1)[1].strip()
                        break
                warehouses.append((name, location))
    return warehouses

def is_product_table(table):
    """Check if a table contains product/inventory data"""
    if not table or len(table) < 2:
        return False
    first_row = [str(c).lower().strip() if c else '' for c in table[0]]
    row_text = ' '.join(first_row)
    required = ['product', 'stock']
    matches = sum(1 for kw in required if kw in row_text)
    return matches >= 1

# ── MAIN ENDPOINTS ────────────────────────────────────────────

@router.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload ANY warehouse PDF.
    Automatically detects warehouses, products, and inventory.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files allowed!")

    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        warehouses_added = 0
        warehouses_updated = 0
        products_added = 0
        inventory_added = 0
        inventory_updated = 0
        errors = []
        extracted_data = []

        with pdfplumber.open(tmp_path) as pdf:

            # Step 1: Extract ALL text and ALL product tables
            full_text = ""
            all_product_tables = []

            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"

                tables = page.extract_tables()
                for table in tables:
                    if is_product_table(table):
                        all_product_tables.append(table)

            # Step 2: Find all warehouses
            warehouse_list = find_warehouses_in_text(full_text)

            if not warehouse_list:
                raise HTTPException(
                    status_code=400,
                    detail="No warehouses found in PDF! Make sure PDF contains 'Warehouse 1', 'Warehouse 2' etc."
                )

            # Step 3: Create/update warehouses in DB
            warehouse_db_ids = []
            for (wh_name, wh_location) in warehouse_list:
                existing = db.query(Warehouse).filter(
                    Warehouse.name == wh_name
                ).first()

                if not existing:
                    wh = Warehouse(name=wh_name, location=wh_location)
                    db.add(wh)
                    db.commit()
                    db.refresh(wh)
                    warehouse_db_ids.append(wh.id)
                    warehouses_added += 1
                else:
                    existing.location = wh_location
                    db.commit()
                    warehouse_db_ids.append(existing.id)
                    warehouses_updated += 1

            # Step 4: Process each table and match to warehouse
            for idx, table in enumerate(all_product_tables):
                if idx >= len(warehouse_db_ids):
                    errors.append(f"Table {idx+1} has no matching warehouse")
                    break

                warehouse_id = warehouse_db_ids[idx]
                warehouse_name = warehouse_list[idx][0]

                for row_idx, row in enumerate(table):
                    # Skip header rows
                    if row_idx == 0 or is_header_row(row):
                        continue

                    if not row or len(row) < 4:
                        continue

                    try:
                        # Extract fields — handles P001, 001, or 1 style IDs
                        product_id_raw = str(row[0]).strip() if row[0] else ''
                        product_name   = str(row[1]).strip() if row[1] else ''
                        category       = str(row[2]).strip() if row[2] else 'General'
                        current_stock  = extract_number(row[3]) if len(row) > 3 else 0
                        restock_date   = extract_date(row[4]) if len(row) > 4 else None
                        dispatch_limit = extract_number(row[5]) if len(row) > 5 else 50

                        # Skip only truly empty rows, allow P001 style IDs
                        if not product_name or product_name.lower() in ['none', 'null', '']:
                            continue
                        if not product_id_raw or product_id_raw.lower() in ['none', 'null', '']:
                            continue

                        # Get or create product
                        existing_product = db.query(Product).filter(
                            Product.name == product_name
                        ).first()

                        if not existing_product:
                            product = Product(
                                name=product_name,
                                description=category,
                                unit_price=0.00
                            )
                            db.add(product)
                            db.commit()
                            db.refresh(product)
                            actual_product_id = product.id
                            products_added += 1
                        else:
                            existing_product.description = category
                            db.commit()
                            actual_product_id = existing_product.id

                        # Add or update inventory
                        existing_inv = db.query(Inventory).filter(
                            Inventory.warehouse_id == warehouse_id,
                            Inventory.product_id == actual_product_id
                        ).first()

                        if not existing_inv:
                            inv = Inventory(
                                warehouse_id=warehouse_id,
                                product_id=actual_product_id,
                                available_quantity=current_stock,
                                dispatch_limit=dispatch_limit,
                                dispatched_today=0,
                                restock_date=restock_date
                            )
                            db.add(inv)
                            db.commit()
                            db.refresh(inv)
                            inventory_added += 1
                            inventory_record_id = inv.id
                        else:
                            existing_inv.available_quantity = current_stock
                            existing_inv.dispatch_limit = dispatch_limit
                            existing_inv.restock_date = restock_date
                            db.commit()
                            inventory_updated += 1
                            inventory_record_id = existing_inv.id

                        extracted_data.append({
                            "inventory_id": inventory_record_id,
                            "product_id_raw": product_id_raw,
                            "db_product_id": actual_product_id,
                            "product_name": product_name,
                            "category": category,
                            "current_stock": current_stock,
                            "restock_date": str(restock_date) if restock_date else None,
                            "dispatch_limit_per_day": dispatch_limit,
                            "warehouse_id": warehouse_id,
                            "warehouse_name": warehouse_name
                        })

                    except Exception as row_error:
                        errors.append(f"Row {row_idx}: {str(row_error)}")
                        continue

        return {
            "message": "✅ PDF processed successfully!",
            "warehouses_added": warehouses_added,
            "warehouses_updated": warehouses_updated,
            "warehouses_total": len(warehouse_db_ids),
            "products_added": products_added,
            "inventory_added": inventory_added,
            "inventory_updated": inventory_updated,
            "filename": file.filename,
            "errors": errors[:5] if errors else None,
            "extracted_data": extracted_data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing PDF: {str(e)}"
        )
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ── VIEW DATA ENDPOINTS ───────────────────────────────────────

@router.get("/inventory/all")
def get_all_inventory(db: Session = Depends(get_db)):
    """View ALL data stored in database"""
    warehouses = db.query(Warehouse).all()
    result = []
    for wh in warehouses:
        inventory = db.query(Inventory).filter(
            Inventory.warehouse_id == wh.id
        ).all()
        products = []
        for inv in inventory:
            product = db.query(Product).filter(
                Product.id == inv.product_id
            ).first()
            if product:
                products.append({
                    "inventory_id": inv.id,
                    "product_id": product.id,
                    "product_name": product.name,
                    "category": product.description,
                    "available_quantity": inv.available_quantity,
                    "dispatch_limit": inv.dispatch_limit,
                    "dispatched_today": inv.dispatched_today,
                    "restock_date": str(inv.restock_date) if inv.restock_date else None
                })
        result.append({
            "warehouse_id": wh.id,
            "warehouse_name": wh.name,
            "location": wh.location,
            "total_products": len(products),
            "products": products
        })
    return result


# ── DELETE ENDPOINTS ──────────────────────────────────────────

@router.delete("/warehouse/{warehouse_id}")
def delete_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    wh = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    db.query(Inventory).filter(Inventory.warehouse_id == warehouse_id).delete()
    db.delete(wh)
    db.commit()
    return {"message": f"✅ Warehouse '{wh.name}' deleted!"}


@router.delete("/product/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.query(Inventory).filter(Inventory.product_id == product_id).delete()
    db.delete(product)
    db.commit()
    return {"message": f"✅ Product '{product.name}' deleted!"}


@router.delete("/inventory/{inventory_id}")
def delete_inventory(inventory_id: int, db: Session = Depends(get_db)):
    inv = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory not found")
    db.delete(inv)
    db.commit()
    return {"message": f"✅ Inventory record #{inventory_id} deleted!"}


@router.delete("/clear/all")
def clear_all_data(db: Session = Depends(get_db)):
    inv_count  = db.query(Inventory).count()
    prod_count = db.query(Product).count()
    wh_count   = db.query(Warehouse).count()
    db.query(Inventory).delete()
    db.query(Product).delete()
    db.query(Warehouse).delete()
    db.commit()
    return {
        "message": "✅ All data cleared!",
        "deleted": {
            "warehouses": wh_count,
            "products": prod_count,
            "inventory_records": inv_count
        }
    }


@router.post("/inventory/upload")
async def upload_inventory_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Param's frontend endpoint — same as upload-pdf"""
    return await upload_pdf(file=file, db=db)