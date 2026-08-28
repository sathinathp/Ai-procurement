"""
create_veolia_rfq.py
---------------------
Creates the Veolia RFQ (RFQ-WWT-2026-0847) in the database
so it appears in Quote Comparison and suppliers can be linked to it.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime, date, timedelta
from database import SessionLocal
from models import RFQ, RFQTimeline

RFQ_NUM = "RFQ-WWT-2026-0847"

db = SessionLocal()

# Check if already exists
existing = db.query(RFQ).filter(RFQ.rfq_number == RFQ_NUM).first()
if existing:
    print(f"RFQ {RFQ_NUM} already exists — skipping creation.")
else:
    rfq = RFQ(
        rfq_number          = RFQ_NUM,
        project_name        = "Wastewater Treatment Plant Chemical Dosing System Upgrade",
        department          = "Operations / Procurement",
        required_date       = date(2026, 9, 5),
        item_name           = "Chemical Dosing Pump Assembly",
        item_code           = "ITM-WWT-PUMP-0847",
        description         = (
            "Supply 12 industrial chemical dosing pump assemblies for sodium hypochlorite "
            "and water-treatment chemical dosing at Veolia wastewater treatment facility, Houston TX. "
            "Motor-driven metering pump, 0-120 L/hr adjustable, min 7 bar discharge pressure, "
            "PVDF/PTFE wetted materials, 460V/3Ph/60Hz, NEMA 4X, 4-20mA control input."
        ),
        quantity            = 12,
        unit                = "Units",
        specifications      = (
            "Flow Range: 0-120 L/hr | Discharge Pressure: min 7 bar | "
            "Wetted Materials: PVDF/PTFE | Power: 460V/3Ph/60Hz | "
            "Enclosure: NEMA 4X minimum | Control: 4-20mA + manual/local | "
            "Accuracy: ±2% or better | Warranty: 24 months preferred"
        ),
        priority            = "High",
        delivery_location   = "Houston, Texas, USA",
        expected_delivery_date = date(2026, 9, 5) + timedelta(days=21),
        remarks             = "Critical — project schedule impact if delivery exceeds 21 days.",
        warranty_requirement = "24 months",
        delivery_tolerance  = "21 days maximum",
        status              = "RFQ Sent",
        created_at          = datetime(2026, 8, 15, 9, 0, 0),
    )
    db.add(rfq)

    # Add timeline events
    db.add(RFQTimeline(
        rfq_number = RFQ_NUM,
        stage      = "Created",
        timestamp  = datetime(2026, 8, 15, 9, 0, 0),
        details    = "RFQ initialized by Operations / Procurement Department for Veolia WWT Facility."
    ))
    db.add(RFQTimeline(
        rfq_number = RFQ_NUM,
        stage      = "RFQ Sent",
        timestamp  = datetime(2026, 8, 15, 12, 0, 0),
        details    = "RFQ emailed to 5 shortlisted suppliers via ProcureX."
    ))

    db.commit()
    print(f"[DONE] Created RFQ: {RFQ_NUM}")
    print(f"       Item: Chemical Dosing Pump Assembly")
    print(f"       Qty: 12 Units | Priority: High | Status: RFQ Sent")

db.close()
print()
print("Now set this as active RFQ in the UI — paste this in browser console:")
print(f"  localStorage.setItem('activeRfqNum', '{RFQ_NUM}')")
print("Then refresh the page.")
