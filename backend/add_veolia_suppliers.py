"""
add_veolia_suppliers.py
------------------------
Directly inserts the 4 Veolia demo suppliers into the database
so they appear in the Quote Comparison dropdown.

Run:
  cd backend
  python add_veolia_suppliers.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from models import Supplier

VEOLIA_SUPPLIERS = [
    {
        "name":                       "Gulf Process Systems",
        "country":                    "USA",
        "email":                      "sales@gulfprocesssystems.com",
        "phone":                      "+1 (713) 555-0141",
        "rating":                     4.2,
        "lead_time_days":             34,
        "preferred":                  False,
        "quality_score":              84.0,
        "delivery_score":             72.0,
        "price_competitiveness":      88.0,
        "risk_level":                 "Medium",
        "products":                   "Chemical Dosing Pump,Metering Pump,Sodium Hypochlorite Pump",
        "categories":                 "Chemical Dosing Equipment,Industrial Pumps",
        "average_response_time_hours": 12.0,
        "synced_to_erp":              True,
        "erp_vendor_id":              "ERP-VEND-VEO-001",
    },
    {
        "name":                       "AquaFlow Controls",
        "country":                    "USA",
        "email":                      "procurement@aquaflowcontrols.com",
        "phone":                      "+1 (832) 555-0289",
        "rating":                     4.8,
        "lead_time_days":             19,
        "preferred":                  True,
        "quality_score":              96.0,
        "delivery_score":             97.0,
        "price_competitiveness":      91.0,
        "risk_level":                 "Low",
        "products":                   "Chemical Dosing Pump,Metering Pump,Water Treatment Pump",
        "categories":                 "Chemical Dosing Equipment,Industrial Pumps",
        "average_response_time_hours": 6.0,
        "synced_to_erp":              True,
        "erp_vendor_id":              "ERP-VEND-VEO-002",
    },
    {
        "name":                       "Houston Pump Solutions",
        "country":                    "USA",
        "email":                      "quotes@houstonpumpsolutions.com",
        "phone":                      "+1 (281) 555-0374",
        "rating":                     4.5,
        "lead_time_days":             22,
        "preferred":                  False,
        "quality_score":              93.0,
        "delivery_score":             94.0,
        "price_competitiveness":      85.0,
        "risk_level":                 "Low",
        "products":                   "Chemical Dosing Pump,PTFE Pump,Wastewater Pump",
        "categories":                 "Chemical Dosing Equipment,Industrial Pumps",
        "average_response_time_hours": 18.0,
        "synced_to_erp":              True,
        "erp_vendor_id":              "ERP-VEND-VEO-003",
    },
    {
        "name":                       "FlowTech USA",
        "country":                    "USA",
        "email":                      "rfq@flowtechusa.com",
        "phone":                      "+1 (210) 555-0412",
        "rating":                     3.9,
        "lead_time_days":             28,
        "preferred":                  False,
        "quality_score":              80.0,
        "delivery_score":             78.0,
        "price_competitiveness":      92.0,
        "risk_level":                 "Medium",
        "products":                   "Chemical Dosing Pump,Industrial Pump",
        "categories":                 "Chemical Dosing Equipment,Industrial Pumps",
        "average_response_time_hours": 24.0,
        "synced_to_erp":              True,
        "erp_vendor_id":              "ERP-VEND-VEO-004",
    },
    {
        "name":                       "MetroChem Systems",
        "country":                    "USA",
        "email":                      "sales@metrochemsystems.com",
        "phone":                      "+1 (800) 555-0374",
        "rating":                     4.5,
        "lead_time_days":             22,
        "preferred":                  False,
        "quality_score":              93.0,
        "delivery_score":             94.0,
        "price_competitiveness":      85.0,
        "risk_level":                 "Low",
        "products":                   "Chemical Dosing Pump,PTFE Pump,Wastewater Pump",
        "categories":                 "Chemical Dosing Equipment,Industrial Pumps",
        "average_response_time_hours": 18.0,
        "synced_to_erp":              True,
        "erp_vendor_id":              "ERP-VEND-VEO-005",
    },
    {
        "name":                       "Precision Dosing Systems",
        "country":                    "USA",
        "email":                      "quotes@precisiondosing.com",
        "phone":                      "+1 (210) 555-0412",
        "rating":                     3.9,
        "lead_time_days":             28,
        "preferred":                  False,
        "quality_score":              80.0,
        "delivery_score":             78.0,
        "price_competitiveness":      92.0,
        "risk_level":                 "Medium",
        "products":                   "Chemical Dosing Pump,Industrial Pump",
        "categories":                 "Chemical Dosing Equipment,Industrial Pumps",
        "average_response_time_hours": 24.0,
        "synced_to_erp":              False,
        "erp_vendor_id":              None,
    },
]

def main():
    db = SessionLocal()
    added = 0
    skipped = 0

    for data in VEOLIA_SUPPLIERS:
        exists = db.query(Supplier).filter(Supplier.name == data["name"]).first()
        if exists:
            print(f"  [SKIP] Already exists: {data['name']}")
            skipped += 1
            continue

        supplier = Supplier(**data)
        db.add(supplier)
        print(f"  [ADD]  {data['name']} ({data['country']}) — {data['email']}")
        added += 1

    db.commit()
    db.close()
    print(f"\nDone. Added: {added}  |  Skipped (already exist): {skipped}")
    print("\nYou can now select these suppliers in the Quote Comparison dropdown:")
    for s in VEOLIA_SUPPLIERS:
        print(f"  - {s['name']}")

if __name__ == "__main__":
    print("\n[Veolia Demo] Adding 4 suppliers to database...\n")
    main()
