import sys
import os
from datetime import datetime

# Adjust path to import database/models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
import models

def seed_rfq():
    db = next(database.get_db())
    
    # 1. Upsert/Verify Suppliers
    supplier_data = [
        {"id": 10, "name": "Bahrain Chemical Corp", "email": "sathinath.padhi@petabytz.com"},
        {"id": 24, "name": "Jubail Polymers", "email": "ashok@petabytz.com"},
        {"id": 71, "name": "SABIC Polymers", "email": "sathinath.padhi@softstandard.com"}
    ]
    
    for s_info in supplier_data:
        s_id = s_info["id"]
        existing_s = db.query(models.Supplier).filter_by(id=s_id).first()
        if existing_s:
            existing_s.name = s_info["name"]
            existing_s.email = s_info["email"]
            print(f"Updated Supplier ID {s_id} -> {s_info['name']}")
        else:
            new_s = models.Supplier(
                id=s_id,
                name=s_info["name"],
                email=s_info["email"],
                rating=4.5,
                country="Saudi Arabia",
                products="HDPE Pipes, PVC, Polymers",
                lead_time_days=10,
                quality_score=95.0,
                delivery_score=95.0,
                price_competitiveness=95.0,
                risk_level="Low"
            )
            db.add(new_s)
            print(f"Created Supplier ID {s_id} -> {s_info['name']}")
            
    db.commit()

    rfq_number = "RFQ-0808"
    
    # 2. Re-create RFQ
    existing_rfq = db.query(models.RFQ).filter_by(rfq_number=rfq_number).first()
    if existing_rfq:
        db.delete(existing_rfq)
        db.commit()
        print("Deleted old RFQ-0808")
        
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
    print("Created RFQ-0808 in database")
    
    # 3. Create EmailHistory invitations
    for s_info in supplier_data:
        s_id = s_info["id"]
        # Delete any existing email history for this RFQ/supplier
        db.query(models.EmailHistory).filter_by(rfq_number=rfq_number, supplier_id=s_id).delete()
        
        history = models.EmailHistory(
            rfq_number=rfq_number,
            supplier_id=s_id,
            supplier_email=s_info["email"],
            subject=f"RFQ Invitation: HDPE Pipes 110mm ({rfq_number})",
            body=f"Dear {s_info['name']} Sales Team,\n\nPlease reply with quote.",
            type="RFQ Invitation",
            sent_at=datetime.utcnow()
        )
        db.add(history)
        
    db.commit()
    print("Seeded EmailHistory for RFQ-0808 suppliers.")

if __name__ == "__main__":
    seed_rfq()
