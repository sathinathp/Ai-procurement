import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models

db = SessionLocal()
print("=== RFQs ===")
rfqs = db.query(models.RFQ).order_by(models.RFQ.created_at.desc()).limit(15).all()
for r in rfqs:
    print(f"RFQ: {r.rfq_number} | Item: {r.item_name} | Qty: {r.quantity} | Status: {r.status} | CreatedAt: {r.created_at}")

db.close()
