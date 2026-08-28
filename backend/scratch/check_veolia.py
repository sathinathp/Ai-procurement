import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from database import SessionLocal
from models import RFQ, Supplier

db = SessionLocal()

for rfq_num in ['RFQ-2026-1003', 'RFQ-WWT-2026-0847', 'RFQ-6247']:
    rfq = db.query(RFQ).filter(RFQ.rfq_number == rfq_num).first()
    print(f"RFQ {rfq_num}: {'EXISTS - item='+rfq.item_name if rfq else 'NOT FOUND'}")

print()
for name in ['Gulf Process Systems','AquaFlow Controls','Houston Pump Solutions','FlowTech USA']:
    s = db.query(Supplier).filter(Supplier.name == name).first()
    print(f"Supplier '{name}': {'id='+str(s.id)+' erp='+str(s.synced_to_erp) if s else 'NOT FOUND'}")

db.close()
