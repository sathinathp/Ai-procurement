import os
import sys
from dotenv import load_dotenv

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

load_dotenv()

from database import SessionLocal
import models
from main import classify_supplier_record, generate_supplier_explanation

db = SessionLocal()

try:
    print("Testing supplier search logic...")
    # Search for dosing pump suppliers
    q = "chemical dosing pump"
    db_suppliers = db.query(models.Supplier).filter(
        models.Supplier.products.ilike(f"%{q}%") |
        models.Supplier.categories.ilike(f"%{q}%") |
        models.Supplier.name.ilike(f"%{q}%")
    ).all()
    
    print(f"Found {len(db_suppliers)} suppliers matching '{q}':")
    for s in db_suppliers:
        # Calculate Previous Orders and Last Purchase Price
        pos_for_supplier = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.supplier_id == s.id).order_by(models.PurchaseOrder.created_at.desc()).all()
        prev_orders_count = len(pos_for_supplier)
        last_purchase_price = pos_for_supplier[0].unit_price if prev_orders_count > 0 else None
        
        category = classify_supplier_record(db, s.id, s.preferred, s.synced_to_erp, s.erp_vendor_id)
        
        print(f"  Name: {s.name}")
        print(f"    Preferred: {s.preferred} | Category: {category}")
        print(f"    Prior Orders: {prev_orders_count}")
        print(f"    Last Purchase Price: {last_purchase_price}")
        print(f"    Explanation: {generate_supplier_explanation(s.name, s.country, s.rating, s.quality_score, s.delivery_score, s.risk_level, s.average_response_time_hours, category, prev_orders_count, last_purchase_price, q)[:100]}...")
        print("-" * 50)
finally:
    db.close()
