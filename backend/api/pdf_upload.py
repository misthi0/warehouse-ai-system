from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import openpyxl
from datetime import datetime, date
import tempfile
import os
import re
from models.database import get_db
from models.models import Warehouse, Product, Inventory

router = APIRouter()

# ── HELPER FUNCTIONS ──────────────────────────────────────────

COLUMN_ALIASES = {
    "product id": "product_id",
    "id": "product_id",
    "product name": "product_name",
    "name": "product_name",
    "category": "category",
    "stock": "stock",
    "current stock": "stock",
    "available quantity": "stock",
    "units to produce": "units_to_produce",
    "restock date": "restock_date",
    "expected restock date": "restock_date",
    "dispatch limit": "dispatch_limit",
    "dispatch limit/day": "dispatch_limit",
    "dispatch limit per day": "dispatch_limit",
    "warehouse": "warehouse",
}


def normalize_header(cell_value):
    if cell_value is None:
        return None
    text = str(cell_value).strip().lower()
    text = re.sub(r"\s+", " ", text)
    return COLUMN_ALIASES.get(text)


def parse_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    match = re.search(r"\d{4}-\d{2}-\d{2}", text)
    if match:
        try:
            return datetime.strptime(match.group(), "%Y-%m-%d").date()
        except ValueError:
            return None
    match = re.search(r"\d{2}/\d{2}/\d{4}", text)
    if match:
        try:
            return datetime.strptime(match.group(), "%d/%m/%Y").date()
        except ValueError:
            return None
    return None


def parse_number(value, default=0):
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return int(value)
    match = re.search(r"\d+", str(value))
    return int(match.group()) if match else default


def extract_warehouse_name(sheet_name):
    match = re.search(r"warehouse\s*\d+", sheet_name, re.IGNORECASE)
    if match:
        name = re.sub(r"\s+", " ", match.group()).strip()
        return name[0].upper() + name[1:]
    return None


def build_header_map(header_row):
    header_map = {}
    for idx, cell in enumerate(header_row):
        key = normalize_header(cell)
        if key:
            header_map[idx] = key
    return header_map


def row_to_record(row, header_map):
    record = {}
    for idx, key in header_map.items():
        if idx < len(row):
            record[key] = row[idx]
    return record


# ── ADD is_latest COLUMN IF NOT EXISTS ───────────────────────

def ensure_is_latest_column(db):
    try:
        db.execute(text("ALTER TABLE warehouses ADD COLUMN is_latest INTEGER DEFAULT 0"))
        db.commit()
    except Exception:
        pass  # Column already exists


# ── MAIN ENDPOINT ─────────────────────────────────────────────

@router.post("/upload-excel")
async def upload_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not (file.filename.endswith(".xlsx") or file.filename.endswith(".xlsm")):
        raise HTTPException(status_code=400, detail="Only .xlsx or .xlsm files allowed!")

    # Ensure column exists
    ensure_is_latest_column(db)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
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
        latest_warehouse_ids = []  # track warehouses from this upload

        try:
            workbook = openpyxl.load_workbook(tmp_path, data_only=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read Excel file: {str(e)}")

        if not workbook.sheetnames:
            raise HTTPException(status_code=400, detail="No sheets found in Excel file!")

        warehouse_cache = {}

        def get_or_create_warehouse(wh_name):
            nonlocal warehouses_added, warehouses_updated
            if wh_name in warehouse_cache:
                return warehouse_cache[wh_name]
            existing = db.query(Warehouse).filter(Warehouse.name == wh_name).first()
            if not existing:
                wh = Warehouse(name=wh_name, location=wh_name)
                db.add(wh)
                db.commit()
                db.refresh(wh)
                warehouse_cache[wh_name] = wh.id
                warehouses_added += 1
                return wh.id
            else:
                warehouse_cache[wh_name] = existing.id
                warehouses_updated += 1
                return existing.id

        any_rows_processed = False

        for sheet_name in workbook.sheetnames:
            sheet = workbook[sheet_name]
            rows = list(sheet.iter_rows(values_only=True))
            if not rows:
                continue

            header_row_idx = None
            header_map = {}
            for r_idx, row in enumerate(rows):
                candidate_map = build_header_map(row)
                if len(candidate_map) >= 2:
                    header_row_idx = r_idx
                    header_map = candidate_map
                    break

            if header_row_idx is None:
                errors.append(f"Sheet '{sheet_name}': no recognizable header row found, skipped")
                continue

            sheet_warehouse_name = extract_warehouse_name(sheet_name)

            for row in rows[header_row_idx + 1:]:
                if row is None or all(c is None for c in row):
                    continue

                record = row_to_record(row, header_map)

                wh_name = sheet_warehouse_name
                if not wh_name and record.get("warehouse"):
                    raw_wh = str(record["warehouse"]).strip()
                    wh_name = extract_warehouse_name(raw_wh) or raw_wh

                if not wh_name:
                    errors.append(f"Sheet '{sheet_name}': row has no identifiable warehouse, skipped")
                    continue

                product_id_raw = str(record.get("product_id")).strip() if record.get("product_id") is not None else ""
                product_name = str(record.get("product_name")).strip() if record.get("product_name") is not None else ""

                if not product_name or product_name.lower() in ["none", "null", ""]:
                    continue
                if not product_id_raw or product_id_raw.lower() in ["none", "null", ""]:
                    continue

                category = str(record.get("category")).strip() if record.get("category") else "General"
                current_stock = parse_number(record.get("stock"), default=0)
                units_to_produce = parse_number(record.get("units_to_produce"), default=0)
                restock_date = parse_date(record.get("restock_date"))
                dispatch_limit = parse_number(record.get("dispatch_limit"), default=50)

                try:
                    warehouse_id = get_or_create_warehouse(wh_name)

                    # Track this warehouse as part of latest upload
                    if warehouse_id not in latest_warehouse_ids:
                        latest_warehouse_ids.append(warehouse_id)

                    existing_product = db.query(Product).filter(Product.name == product_name).first()
                    if not existing_product:
                        product = Product(name=product_name, description=category, unit_price=0.00)
                        db.add(product)
                        db.commit()
                        db.refresh(product)
                        actual_product_id = product.id
                        products_added += 1
                    else:
                        existing_product.description = category
                        db.commit()
                        actual_product_id = existing_product.id

                    existing_inv = db.query(Inventory).filter(
                        Inventory.warehouse_id == warehouse_id,
                        Inventory.product_id == actual_product_id
                    ).first()

                    if not existing_inv:
                        inv = Inventory(
                            warehouse_id=warehouse_id,
                            product_id=actual_product_id,
                            pdf_product_id=product_id_raw,
                            available_quantity=current_stock,
                            dispatch_limit=dispatch_limit,
                            dispatched_today=0,
                            units_to_produce=units_to_produce,
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
                        existing_inv.units_to_produce = units_to_produce
                        existing_inv.pdf_product_id = product_id_raw
                        db.commit()
                        inventory_updated += 1
                        inventory_record_id = existing_inv.id

                    any_rows_processed = True

                    extracted_data.append({
                        "inventory_id": inventory_record_id,
                        "product_id": product_id_raw,
                        "db_product_id": actual_product_id,
                        "product_name": product_name,
                        "category": category,
                        "current_stock": current_stock,
                        "units_to_produce": units_to_produce,
                        "restock_date": str(restock_date) if restock_date else None,
                        "dispatch_limit_per_day": dispatch_limit,
                        "warehouse_id": warehouse_id,
                        "warehouse_name": wh_name
                    })

                except Exception as row_error:
                    errors.append(f"Sheet '{sheet_name}' row error: {str(row_error)}")
                    continue

        if not any_rows_processed:
            raise HTTPException(
                status_code=400,
                detail="No valid product rows found in Excel file! Check columns: "
                       "Product ID, Product Name, Category, Stock, Restock Date, Dispatch Limit. "
                       "Each sheet name must contain 'Warehouse 1', 'Warehouse 2' etc."
            )

        # Mark only latest uploaded warehouses as is_latest = 1
        # Old warehouses stay in DB but is_latest = 0
        db.execute(text("UPDATE warehouses SET is_latest = 0"))
        for wid in latest_warehouse_ids:
            db.execute(text(f"UPDATE warehouses SET is_latest = 1 WHERE id = {wid}"))
        db.commit()

        return {
            "message": "✅ Excel file processed successfully!",
            "warehouses_added": warehouses_added,
            "warehouses_updated": warehouses_updated,
            "warehouses_total": len(warehouse_cache),
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
            detail=f"Error processing Excel file: {str(e)}"
        )
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ── VIEW DATA ENDPOINTS ───────────────────────────────────────

@router.get("/inventory/all")
def get_all_inventory(db: Session = Depends(get_db)):
    ensure_is_latest_column(db)

    # Show only latest uploaded warehouses on dashboard
    # If no latest flagged, show all
    latest_count = db.execute(text("SELECT COUNT(*) FROM warehouses WHERE is_latest = 1")).scalar()
    if latest_count > 0:
        warehouses = db.execute(
            text("SELECT * FROM warehouses WHERE is_latest = 1")
        ).fetchall()
        warehouse_ids = [row[0] for row in warehouses]
        warehouse_objs = db.query(Warehouse).filter(Warehouse.id.in_(warehouse_ids)).all()
    else:
        warehouse_objs = db.query(Warehouse).all()

    result = []
    for wh in warehouse_objs:
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
                    "product_id": inv.pdf_product_id or str(product.id),
                    "db_product_id": product.id,
                    "product_name": product.name,
                    "category": product.description,
                    "available_quantity": inv.available_quantity,
                    "units_to_produce": inv.units_to_produce,
                    "dispatch_limit": inv.dispatch_limit,
                    "dispatched_today": inv.dispatched_today,
                    "restock_date": str(inv.restock_date) if inv.restock_date else None,
                    "warehouse_id": inv.warehouse_id
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
    inv_count = db.query(Inventory).count()
    prod_count = db.query(Product).count()
    wh_count = db.query(Warehouse).count()
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
async def upload_inventory_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Frontend endpoint — same as upload-excel"""
    return await upload_excel(file=file, db=db)