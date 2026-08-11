import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models

db = SessionLocal()
print("=== EmailHistory ===")
emails = db.query(models.EmailHistory).order_by(models.EmailHistory.sent_at.desc()).limit(15).all()
for e in emails:
    print(f"ID: {e.id} | RFQ: {e.rfq_number} | To: {e.supplier_email} | Subject: {e.subject} | SentAt: {e.sent_at} | Type: {e.type}")

print("\n=== NegotiationLog ===")
negs = db.query(models.NegotiationLog).order_by(models.NegotiationLog.sent_at.desc()).limit(15).all()
for n in negs:
    print(f"ID: {n.id} | RFQ: {n.rfq_number} | To/From: {n.supplier_email} | Dir: {n.direction} | Subject: {n.subject} | SentAt: {n.sent_at}")

db.close()
