import os
import sys
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
sys.path.append(os.path.dirname(__file__))

import models
from database import engine, SessionLocal

def seed_veolia_demo():
    print("Initializing Database Seeding for Veolia Procurement Demo...")
    db = SessionLocal()
    
    # Drop and recreate tables to ensure clean slate
    print("Dropping and recreating all tables...")
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    
    # 1. Define the 12 specific Dosing Pump Suppliers for the Veolia Demo
    dosing_pump_suppliers = [
        # Preferred
        {
            "id": 1, "name": "Houston Pump Solutions", "country": "USA", "email": "sales@houstonpump.com", "phone": "+1 713 555 0190",
            "rating": 4.8, "lead_time_days": 14, "preferred": True, "quality_score": 98.0, "delivery_score": 96.5, "price_competitiveness": 85.0,
            "risk_level": "Low", "products": "Industrial Chemical Dosing Pump,Centrifugal Pumps", "categories": "Industrial Pumps,Mechanical Parts", "average_response_time_hours": 6.0, "synced_to_erp": True, "erp_vendor_id": "ERP-VEND-1001"
        },
        {
            "id": 2, "name": "Gulf Flow Control", "country": "United Arab Emirates", "email": "sales@gulfflow.com", "phone": "+971 4 333 4455",
            "rating": 4.6, "lead_time_days": 12, "preferred": True, "quality_score": 95.0, "delivery_score": 94.0, "price_competitiveness": 82.0,
            "risk_level": "Low", "products": "Industrial Chemical Dosing Pump,Diaphragm Valves", "categories": "Industrial Pumps,Piping Accessories", "average_response_time_hours": 8.0, "synced_to_erp": True, "erp_vendor_id": "ERP-VEND-1002"
        },
        {
            "id": 3, "name": "Apex Fluids Corp", "country": "USA", "email": "sales@apexfluids.com", "phone": "+1 800 555 0143",
            "rating": 4.7, "lead_time_days": 15, "preferred": True, "quality_score": 96.0, "delivery_score": 95.0, "price_competitiveness": 84.0,
            "risk_level": "Low", "products": "Industrial Chemical Dosing Pump,Metering Pumps", "categories": "Industrial Pumps,Mechanical Parts", "average_response_time_hours": 7.0, "synced_to_erp": True, "erp_vendor_id": "ERP-VEND-1003"
        },
        # Approved
        {
            "id": 4, "name": "Standard Dosing Systems", "country": "USA", "email": "sales@standarddosing.com", "phone": "+1 212 555 0188",
            "rating": 4.1, "lead_time_days": 18, "preferred": False, "quality_score": 90.0, "delivery_score": 88.0, "price_competitiveness": 80.0,
            "risk_level": "Medium", "products": "Industrial Chemical Dosing Pump,Chemical Feeder Systems", "categories": "Industrial Pumps,Mechanical Parts", "average_response_time_hours": 12.0, "synced_to_erp": True, "erp_vendor_id": "ERP-VEND-1004"
        },
        {
            "id": 5, "name": "Texas Pump Depot", "country": "USA", "email": "sales@texaspump.com", "phone": "+1 512 555 0122",
            "rating": 4.2, "lead_time_days": 16, "preferred": False, "quality_score": 91.0, "delivery_score": 89.0, "price_competitiveness": 83.0,
            "risk_level": "Low", "products": "Industrial Chemical Dosing Pump,Water Pumps", "categories": "Industrial Pumps,Mechanical Parts", "average_response_time_hours": 10.0, "synced_to_erp": True, "erp_vendor_id": "ERP-VEND-1005"
        },
        {
            "id": 6, "name": "Vector Fluidics", "country": "USA", "email": "sales@vectorfluidics.com", "phone": "+1 415 555 0167",
            "rating": 4.0, "lead_time_days": 17, "preferred": False, "quality_score": 89.0, "delivery_score": 87.0, "price_competitiveness": 79.0,
            "risk_level": "Medium", "products": "Industrial Chemical Dosing Pump,Flow Meters", "categories": "Industrial Pumps,Mechanical Parts", "average_response_time_hours": 15.0, "synced_to_erp": True, "erp_vendor_id": "ERP-VEND-1006"
        },
        # New/Discovered
        {
            "id": 7, "name": "Innovate Flow Tech", "country": "USA", "email": "sales@innovateflow.com", "phone": "+1 617 555 0109",
            "rating": 3.8, "lead_time_days": 20, "preferred": False, "quality_score": 85.0, "delivery_score": 82.0, "price_competitiveness": 88.0,
            "risk_level": "Medium", "products": "Industrial Chemical Dosing Pump,Metering Systems", "categories": "Industrial Pumps,Mechanical Parts", "average_response_time_hours": 24.0, "synced_to_erp": False, "erp_vendor_id": None
        },
        {
            "id": 8, "name": "Precision Metering Co", "country": "Germany", "email": "sales@precisionmetering.de", "phone": "+49 89 555 4321",
            "rating": 3.9, "lead_time_days": 18, "preferred": False, "quality_score": 86.0, "delivery_score": 84.0, "price_competitiveness": 87.0,
            "risk_level": "Medium", "products": "Industrial Chemical Dosing Pump,High Precision Pumps", "categories": "Industrial Pumps,Mechanical Parts", "average_response_time_hours": 18.0, "synced_to_erp": False, "erp_vendor_id": None
        },
        {
            "id": 9, "name": "Alpha Pumps & Valves", "country": "USA", "email": "sales@alphapumps.com", "phone": "+1 206 555 0155",
            "rating": 3.7, "lead_time_days": 19, "preferred": False, "quality_score": 83.0, "delivery_score": 81.0, "price_competitiveness": 86.0,
            "risk_level": "Medium", "products": "Industrial Chemical Dosing Pump,Solenoid Valves", "categories": "Industrial Pumps,Mechanical Parts", "average_response_time_hours": 20.0, "synced_to_erp": False, "erp_vendor_id": None
        },
        # Poor delivery
        {
            "id": 10, "name": "Budget Pumps Inc", "country": "China", "email": "sales@budgetpumps.com", "phone": "+86 21 5555 9999",
            "rating": 3.4, "lead_time_days": 30, "preferred": False, "quality_score": 80.0, "delivery_score": 62.0, "price_competitiveness": 98.0,
            "risk_level": "High", "products": "Industrial Chemical Dosing Pump,Low Cost Pumps", "categories": "Industrial Pumps,Mechanical Parts", "average_response_time_hours": 36.0, "synced_to_erp": True, "erp_vendor_id": "ERP-VEND-1010"
        },
        # Oppora-discovered
        {
            "id": 11, "name": "Munich Dosing Systems", "country": "Germany", "email": "sales@munichdosing.de", "phone": "+49 89 222 8888",
            "rating": 4.7, "lead_time_days": 12, "preferred": False, "quality_score": 96.0, "delivery_score": 95.0, "price_competitiveness": 91.0,
            "risk_level": "Low", "products": "Industrial Chemical Dosing Pump,Industrial Dosing Systems", "categories": "Industrial Pumps,Mechanical Parts", "average_response_time_hours": 10.0, "synced_to_erp": False, "erp_vendor_id": None
        },
        {
            "id": 12, "name": "Tokyo Precision Flow", "country": "Japan", "email": "sales@tokyoprecision.jp", "phone": "+81 3 5555 6666",
            "rating": 4.5, "lead_time_days": 13, "preferred": False, "quality_score": 94.0, "delivery_score": 93.0, "price_competitiveness": 89.0,
            "risk_level": "Low", "products": "Industrial Chemical Dosing Pump,Precision Flow Controllers", "categories": "Industrial Pumps,Mechanical Parts", "average_response_time_hours": 12.0, "synced_to_erp": False, "erp_vendor_id": None
        }
    ]
    
    for s_dict in dosing_pump_suppliers:
        s = models.Supplier(**s_dict)
        db.add(s)
    db.commit()
    print("Seeded 12 Veolia dosing pump suppliers.")
    
    # 2. Seed another ~88 general polymer and chemical suppliers to keep database density rich
    categories_list = [
        "Raw Polymers", "Additives & Stabilizers", "Packaging Materials",
        "Piping Accessories", "Industrial Chemicals", "Lab Equipment",
        "MRO", "Electrical Supplies", "Mechanical Parts", "Safety Gear"
    ]
    
    products_by_category = {
        "Raw Polymers": ["PVC Resin", "HDPE Granules", "LDPE Film", "PP Homopolymer", "LLDPE", "PS Granules", "PET Resin"],
        "Additives & Stabilizers": ["Calcium Carbonate", "Titanium Dioxide", "Stearic Acid", "Zinc Oxide", "Lubricant G-60", "PVC Stabilizer", "Impact Modifier"],
        "Packaging Materials": ["Wooden Pallets", "PP Woven Bags", "Stretch Film", "Cardboard Boxes", "Steel Strapping"],
        "Piping Accessories": ["PVC Elbow 90 Degree", "PVC Tee", "Solvent Cement", "Rubber Gaskets", "PVC Coupler", "Flanges"],
        "Industrial Chemicals": ["Plasticizer DOP", "DINP", "Adipic Acid", "Phthalic Anhydride", "Paraffin Wax", "Maleic Anhydride"],
        "Lab Equipment": ["Melt Flow Indexer", "Tensile Tester", "Spectrophotometer", "Glass Beakers", "Digital Scales"],
        "MRO": ["Hydraulic Oil", "Ball Bearings", "V-Belts", "Gasket Sheet", "Industrial Wipes", "Grease Gun"],
        "Electrical Supplies": ["Conduit Pipe", "Copper Wires", "Circuit Breakers", "LED Highbay", "Electrical Tape"],
        "Mechanical Parts": ["Pneumatic Valves", "Pressure Gauges", "Water Pumps", "Air Compressor Filter", "Couplings"],
        "Safety Gear": ["Safety Boots", "Reflective Vests", "Safety Helmets", "Nitrile Gloves", "Safety Goggles"]
    }
    
    countries = ["Saudi Arabia", "United Arab Emirates", "Oman", "Bahrain", "Kuwait", "Germany", "Japan", "China", "India", "USA"]
    
    supplier_names_pool = [
        ("SABIC Polymers", "Saudi Arabia"),
        ("Borouge", "United Arab Emirates"),
        ("Tasnee", "Saudi Arabia"),
        ("Oman Resin Co.", "Oman"),
        ("Jubail Polymers", "Saudi Arabia"),
        ("Riyadh Chemical Corp", "Saudi Arabia"),
        ("Gulf Plasticizer Factory", "United Arab Emirates"),
        ("Yanbu Petrochemical", "Saudi Arabia"),
        ("Al-Khobar Plastics", "Saudi Arabia"),
        ("National Petrochemical Co. (Natpet)", "Saudi Arabia"),
        ("Petro Rabigh", "Saudi Arabia"),
        ("Qamar Polymer", "Oman"),
        ("Bayan Chemical", "Bahrain"),
        ("Kuwait Catalyst Company", "Kuwait"),
        ("BASF Middle East", "United Arab Emirates"),
        ("Clariant Saudi Arabia", "Saudi Arabia"),
        ("Shin-Etsu Chemicals", "Japan"),
        ("Formosa Plastics", "Taiwan"),
        ("Reliance Industries", "India"),
        ("Sinopec China", "China"),
        ("Wacker Chemie", "Germany"),
        ("Songwon Industrial", "Germany"),
        ("Baerlocher Middle East", "United Arab Emirates"),
        ("Kaneka Corp", "Japan"),
        ("DuPont Specialties", "USA"),
        ("Dow Chemical Gulf", "United Arab Emirates"),
        ("Evonik Gulf", "Saudi Arabia"),
        ("ExxonMobil Chemical", "USA"),
        ("Lanxess Deutschland", "Germany"),
        ("Arkema Additives", "Germany")
    ]
    
    # Expand names
    for i in range(1, 90):
        country = random.choice(countries)
        if country == "Saudi Arabia":
            name = f"Al-{random.choice(['Jazirah', 'Rajhi', 'Fahad', 'Nahdi', 'Sharq', 'Watan'])} {random.choice(['Polymers', 'Chemicals', 'Industries', 'Trading'])}"
        elif country == "United Arab Emirates":
            name = f"Emirates {random.choice(['Resin', 'Petrochemical', 'Supply', 'Global', 'Logistics'])}"
        else:
            name = f"{country} {random.choice(['Polymer Group', 'Chemical Corp', 'Material Solutions', 'Alloys'])}"
        supplier_names_pool.append((name, country))
        
    supplier_names_pool = list(set(supplier_names_pool))[:88]
    
    general_suppliers = []
    for idx, (name, country) in enumerate(supplier_names_pool):
        num_cats = random.randint(1, 3)
        selected_cats = random.sample(categories_list, num_cats)
        supplied_items = []
        for cat in selected_cats:
            supplied_items.extend(products_by_category[cat])
            
        email_local = name.lower().replace(" ", "").replace(".", "").replace("-", "").replace("(", "").replace(")", "")
        rating = round(random.uniform(3.5, 4.8), 1)
        delivery_score = round(random.uniform(70, 96), 1)
        quality_score = round(random.uniform(75, 98), 1)
        price_comp = round(random.uniform(65, 95), 1)
        preferred = random.choice([True, False]) if rating > 4.2 else False
        
        risk = "Low"
        if delivery_score < 75 or rating < 3.6:
            risk = "High"
        elif delivery_score < 85 or rating < 4.0:
            risk = "Medium"
            
        is_erp = (idx % 4 != 0) or preferred
        
        s = models.Supplier(
            id=13 + idx,
            name=name,
            country=country,
            email=f"sales@{email_local}.com",
            phone=f"+{random.randint(966, 971)} {random.randint(10, 99)} {random.randint(1000000, 9999999)}",
            rating=rating,
            lead_time_days=random.choice([7, 10, 14, 21, 30]),
            preferred=preferred,
            quality_score=quality_score,
            delivery_score=delivery_score,
            price_competitiveness=price_comp,
            risk_level=risk,
            products=",".join(list(set(supplied_items))),
            categories=",".join(selected_cats),
            average_response_time_hours=round(random.uniform(6, 48), 1),
            synced_to_erp=is_erp,
            erp_vendor_id=f"ERP-VEND-{2000 + idx}" if is_erp else None
        )
        general_suppliers.append(s)
        db.add(s)
        
    db.commit()
    print(f"Seeded {len(general_suppliers)} general suppliers. Total: 100 suppliers.")
    
    # 3. Seed Inventory Levels with a Deficit in Pumps
    inventory_items = [
        {"item_name": "Industrial Chemical Dosing Pump", "stock_level": 0.0, "min_safety_stock": 2.0, "unit": "Units"},
        {"item_name": "PVC Resin", "stock_level": 85.0, "min_safety_stock": 50.0, "unit": "MT"},
        {"item_name": "HDPE Granules", "stock_level": 35.0, "min_safety_stock": 60.0, "unit": "MT"},
        {"item_name": "LDPE Film", "stock_level": 72.0, "min_safety_stock": 40.0, "unit": "MT"},
        {"item_name": "Stabilizers", "stock_level": 18.0, "min_safety_stock": 30.0, "unit": "MT"},
        {"item_name": "Solvent Cement", "stock_level": 90.0, "min_safety_stock": 30.0, "unit": "Liters"}
    ]
    for item in inventory_items:
        db.add(models.InventoryItem(**item))
        
    # 4. Seed Quality Defects
    quality_defects = [
        {"defect_type": "Surface Scratch", "location": "Extruder Line 2", "confidence": 94.2, "timestamp": datetime.utcnow() - timedelta(minutes=15), "status": "Active"},
        {"defect_type": "Diameter Deviation", "location": "Extruder Line 1", "confidence": 97.8, "timestamp": datetime.utcnow() - timedelta(hours=3), "status": "Resolved"}
    ]
    for defect in quality_defects:
        db.add(models.QualityDefect(**defect))
        
    # 5. Seed ERP configuration
    erp_config = models.ERPConfig(
        erp_system="Odoo",
        base_url=os.getenv("ODOO_URL", "http://odoo-simulated-rpc:8069/xmlrpc/2/object"),
        tenant_id="veolia-tenant",
        client_id="veolia-client",
        client_secret="••••••••••••••••••••••••••••",
        environment="Demo",
        sync_mode="Simulated",
        auto_sync_on_po=True,
        last_connected_at=datetime.utcnow(),
        status="Connected"
    )
    db.add(erp_config)
    
    # 6. Reset sequences if using postgres
    if "postgresql" in str(engine.url):
        try:
            from sqlalchemy import text
            for table_name in ["suppliers", "inventory_items", "quality_defects"]:
                db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), coalesce(max(id), 1)) FROM {table_name};"))
            db.commit()
        except Exception as seq_err:
            print(f"Warning sequence reset: {seq_err}")
            
    db.commit()
    print("Database Seeding Completed Successfully.")
    db.close()

if __name__ == "__main__":
    seed_veolia_demo()
