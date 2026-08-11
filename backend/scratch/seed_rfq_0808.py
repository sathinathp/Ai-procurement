import sys
import os
from datetime import datetime

# Adjust path to import database/models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
import models

def seed_rfq():
    db = next(database.get_db())
    
    rfq_number = "RFQ-0808"
    
    # Check if RFQ exists, delete it if it does to start fresh
    existing = db.query(models.RFQ).filter_by(rfq_number=rfq_number).first()
    if existing:
        db.delete(existing)
        db.commit()
        print("Deleted existing RFQ-0808")
        
    # Re-create RFQ
    new_rfq = models.RFQ(
        rfq_number=rfq_number,
        project_name="HDPE Pipes 110mm Procurement",
        department="Procurement",
        item_name="HDPE Pipes 110mm",
        quantity=250.0,
        unit="MT",
        description="High-Density Polyethylene Pipes 110mm for Yanbu site",
        priority="High",
        delivery_location="Yanbu Site",
        status="Negotiation",
        created_at=datetime.utcnow()
    )
    db.add(new_rfq)
    db.commit()
    print("Created RFQ-0808")
    
    # Add Suppliers (Bahrain Chemical Corp ID=10, Jubail Polymers ID=24, SABIC Polymers ID=71)
    # Let's verify their email addresses in the database
    suppliers = db.query(models.Supplier).filter(models.Supplier.id.in_([10, 24, 71])).all()
    for s in suppliers:
        print(f"Supplier ID: {s.id}, Name: {s.name}, Email: {s.email}")
        
        # Add RFQ Invitation record to EmailHistory so they are associated with this RFQ
        existing_history = db.query(models.EmailHistory).filter_by(rfq_number=rfq_number, supplier_id=s.id).first()
        if not existing_history:
            history = models.EmailHistory(
                rfq_number=rfq_number,
                supplier_id=s.id,
                supplier_email=s.email,
                subject=f"RFQ Invitation: HDPE Pipes 110mm ({rfq_number})",
                body=f"RFQ Invitation for {s.name}",
                type="RFQ Invitation",
                sent_at=datetime.utcnow()
            )
            db.add(history)
            
    db.commit()
    print("Seeded EmailHistory for RFQ-0808 suppliers.")

if __name__ == "__main__":
    seed_rfq()
