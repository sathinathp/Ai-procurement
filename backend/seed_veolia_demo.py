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
    
    print("Cleaning database records...")
    # Delete from all tables to avoid dropping schema and locks
    for table in reversed(models.Base.metadata.sorted_tables):
        db.execute(table.delete())
        
    # Reset SQLite autoincrement sequences
    if str(engine.url).startswith("sqlite"):
        from sqlalchemy import text
        try:
            db.execute(text("DELETE FROM sqlite_sequence;"))
        except Exception as e:
            print(f"Sequence reset warning: {e}")
            
    db.commit()
    
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
    
    # Automatically add Veolia suppliers to database early so they can be queried for old POs
    try:
        from add_veolia_suppliers import main as add_veolia_suppliers_main
        print("Registering Veolia demo suppliers...")
        add_veolia_suppliers_main()
    except Exception as e:
        print(f"Warning: could not register Veolia suppliers: {e}")
        
    # Re-fetch session state to ensure they are visible
    db.commit()
    
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
    
    # 6. Seed RFQs and Workflow Notifications for the Dashboard
    print("Seeding RFQs and notifications...")
    import json
    
    # Clean existing RFQs and notifications to prevent duplicates
    db.query(models.WorkflowNotification).filter(models.WorkflowNotification.rfq_number.in_(["RFQ-2026-1001", "RFQ-2026-1003"])).delete()
    db.query(models.QuoteResponse).filter(models.QuoteResponse.rfq_number.in_(["RFQ-2026-1001", "RFQ-2026-1003"])).delete()
    db.query(models.RFQ).filter(models.RFQ.rfq_number.in_(["RFQ-2026-1001", "RFQ-2026-1003"])).delete()
    db.commit()

    # Align supplier attributes for test grouping:
    # Resin Suppliers
    sabic = db.query(models.Supplier).filter(models.Supplier.name == "SABIC Polymers").first()
    if sabic:
        sabic.synced_to_erp = True
        sabic.preferred = False
    
    basf = db.query(models.Supplier).filter(models.Supplier.name == "BASF Middle East").first()
    if basf:
        basf.synced_to_erp = True
        basf.preferred = False
        
    alkhobar = db.query(models.Supplier).filter(models.Supplier.name == "Al-Khobar Plastics").first()
    if alkhobar:
        alkhobar.synced_to_erp = False
        alkhobar.preferred = False
        alkhobar.erp_vendor_id = None
        
    borouge = db.query(models.Supplier).filter(models.Supplier.name == "Borouge").first()
    if borouge:
        borouge.synced_to_erp = True
        borouge.preferred = True
        
    # Pump Suppliers
    houston = db.query(models.Supplier).filter(models.Supplier.name == "Houston Pump Solutions").first()
    if houston:
        houston.synced_to_erp = True
        houston.preferred = True
        
    munich = db.query(models.Supplier).filter(models.Supplier.name == "Munich Dosing Systems").first()
    if munich:
        munich.synced_to_erp = False
        munich.preferred = False
        munich.erp_vendor_id = None
        
    budget = db.query(models.Supplier).filter(models.Supplier.name == "Budget Pumps Inc").first()
    if budget:
        budget.synced_to_erp = True
        budget.preferred = False
        
    tokyo = db.query(models.Supplier).filter(models.Supplier.name == "Tokyo Precision Flow").first()
    if tokyo:
        tokyo.synced_to_erp = False
        tokyo.preferred = False
        tokyo.erp_vendor_id = None
        
    db.commit()

    # Seed mock RFQs for the purchase orders to respect foreign key constraint
    old_rfq_1 = models.RFQ(
        rfq_number="RFQ-2026-OLD-1",
        project_name="Veolia Dosing Pumps Project",
        item_name="Industrial Chemical Dosing Pump",
        quantity=10.0,
        unit="Units",
        status="Completed",
        created_at=datetime.utcnow() - timedelta(days=25)
    )
    old_rfq_2 = models.RFQ(
        rfq_number="RFQ-2026-OLD-2",
        project_name="Veolia Polymers Project",
        item_name="PVC Resin",
        quantity=30.0,
        unit="MT",
        status="Completed",
        created_at=datetime.utcnow() - timedelta(days=25)
    )
    db.add(old_rfq_1)
    db.add(old_rfq_2)
    db.commit()

    # Query preferred/approved suppliers to seed history
    houston = db.query(models.Supplier).filter(models.Supplier.name == "Houston Pump Solutions").first()
    aquaflow = db.query(models.Supplier).filter(models.Supplier.name == "AquaFlow Controls").first()
    gulfflow = db.query(models.Supplier).filter(models.Supplier.name == "Gulf Flow Control").first()
    apex = db.query(models.Supplier).filter(models.Supplier.name == "Apex Fluids Corp").first()

    # Seed mock purchase orders to trigger "Previously Used" logic:
    # 1. Munich Dosing Systems (Pump category)
    if munich:
        db.add(models.PurchaseOrder(
            po_number="PO-2026-OLD-001",
            rfq_number="RFQ-2026-OLD-1",
            supplier_id=munich.id,
            item_name="Industrial Chemical Dosing Pump",
            quantity=10.0,
            unit_price=1500.0,
            total_amount=15000.0,
            status="Completed",
            created_at=datetime.utcnow() - timedelta(days=20)
        ))
    # 2. SABIC Polymers (Resin category)
    if sabic:
        db.add(models.PurchaseOrder(
            po_number="PO-2026-OLD-002",
            rfq_number="RFQ-2026-OLD-2",
            supplier_id=sabic.id,
            item_name="PVC Resin",
            quantity=30.0,
            unit_price=1500.0,
            total_amount=45000.0,
            status="Completed",
            created_at=datetime.utcnow() - timedelta(days=20)
        ))
        
    # 3. Houston Pump Solutions (Preferred Dosing Pumps - 10 prior orders)
    if houston:
        for idx in range(10):
            days_ago = 30 + idx * 25
            price = 2200.0 + (idx * 15) % 150  # variations in price
            qty = float(4 + (idx * 2) % 10)
            db.add(models.PurchaseOrder(
                po_number=f"PO-2026-OLD-HP-{idx+1:03d}",
                rfq_number="RFQ-2026-OLD-1",
                supplier_id=houston.id,
                item_name="Industrial Chemical Dosing Pump",
                quantity=qty,
                unit_price=price,
                total_amount=qty * price,
                status="Completed",
                created_at=datetime.utcnow() - timedelta(days=days_ago)
            ))
        
    # 4. AquaFlow Controls (Preferred Dosing Pumps - 5 prior orders)
    if aquaflow:
        for idx in range(5):
            days_ago = 45 + idx * 30
            price = 2050.0 + (idx * 25) % 120
            qty = float(5 + (idx * 3) % 8)
            db.add(models.PurchaseOrder(
                po_number=f"PO-2026-OLD-AF-{idx+1:03d}",
                rfq_number="RFQ-2026-OLD-1",
                supplier_id=aquaflow.id,
                item_name="Industrial Chemical Dosing Pump",
                quantity=qty,
                unit_price=price,
                total_amount=qty * price,
                status="Completed",
                created_at=datetime.utcnow() - timedelta(days=days_ago)
            ))
        
    # 5. Gulf Flow Control (Preferred Dosing Pumps - 4 prior orders)
    if gulfflow:
        for idx in range(4):
            days_ago = 60 + idx * 40
            price = 2300.0 + (idx * 30) % 100
            qty = float(3 + (idx * 2) % 6)
            db.add(models.PurchaseOrder(
                po_number=f"PO-2026-OLD-GF-{idx+1:03d}",
                rfq_number="RFQ-2026-OLD-1",
                supplier_id=gulfflow.id,
                item_name="Industrial Chemical Dosing Pump",
                quantity=qty,
                unit_price=price,
                total_amount=qty * price,
                status="Completed",
                created_at=datetime.utcnow() - timedelta(days=days_ago)
            ))

    # 6. Apex Fluids Corp (Preferred Dosing Pumps - 3 prior orders)
    if apex:
        for idx in range(3):
            days_ago = 75 + idx * 45
            price = 2250.0 + (idx * 40) % 110
            qty = float(6 + idx % 4)
            db.add(models.PurchaseOrder(
                po_number=f"PO-2026-OLD-AP-{idx+1:03d}",
                rfq_number="RFQ-2026-OLD-1",
                supplier_id=apex.id,
                item_name="Industrial Chemical Dosing Pump",
                quantity=qty,
                unit_price=price,
                total_amount=qty * price,
                status="Completed",
                created_at=datetime.utcnow() - timedelta(days=days_ago)
            ))

    db.commit()

    # Seed RFQ-2026-1001 (Pumps)
    rfq_1 = models.RFQ(
        rfq_number="RFQ-2026-1001",
        project_name="Veolia Dosing Pumps Project",
        item_name="Industrial Chemical Dosing Pump",
        quantity=100.0,
        unit="Units",
        status="Under Comparison",
        created_at=datetime.utcnow() - timedelta(days=2)
    )
    db.add(rfq_1)
    
    # Seed RFQ-2026-1003 (Resin)
    rfq_2 = models.RFQ(
        rfq_number="RFQ-2026-1003",
        project_name="Veolia Polymers Project",
        item_name="PVC Resin",
        quantity=150.0,
        unit="MT",
        status="Under Comparison",
        created_at=datetime.utcnow() - timedelta(days=1)
    )
    db.add(rfq_2)
    db.commit()

    # Create Quotes for RFQ 1
    suppliers_1 = db.query(models.Supplier).filter(models.Supplier.name.in_([
        "Munich Dosing Systems", "Houston Pump Solutions", "Budget Pumps Inc", "Tokyo Precision Flow"
    ])).all()
    
    quote_metrics_1 = {
        "Houston Pump Solutions": {"price": 2350.0, "lead_time": 14, "payment_terms": "Net 45 Days", "currency": "USD", "incoterms": "DDP Houston"},
        "Budget Pumps Inc": {"price": 1900.0, "lead_time": 30, "payment_terms": "Net 30 Days", "currency": "USD", "incoterms": "EXW Shanghai"},
        "Munich Dosing Systems": {"price": 2150.0, "lead_time": 12, "payment_terms": "Net 45 Days", "currency": "USD", "incoterms": "CIF Dammam"},
        "Tokyo Precision Flow": {"price": 2200.0, "lead_time": 13, "payment_terms": "10% Advance, 90% LC", "currency": "EUR", "incoterms": "FOB Tokyo"},
    }
    
    quotes_1 = []
    for s in suppliers_1:
        metrics = quote_metrics_1[s.name]
        q = models.QuoteResponse(
            rfq_number="RFQ-2026-1001",
            supplier_id=s.id,
            price=metrics["price"],
            currency=metrics["currency"],
            moq=1.0,
            lead_time_days=metrics["lead_time"],
            payment_terms=metrics["payment_terms"],
            incoterms=metrics["incoterms"],
            warranty="12 Months",
            validity="60 Days",
            delivery_details="FOB/CIF standard delivery.",
            status="Quotation Received"
        )
        db.add(q)
        db.flush()
        quotes_1.append(q)

    # Resolve categories dynamically for RFQ 1 using helper logic
    from main import classify_supplier_record
    comparison_data_1 = []
    for q in quotes_1:
        category = classify_supplier_record(db, q.supplier_id, q.supplier.preferred, q.supplier.synced_to_erp, q.supplier.erp_vendor_id)
        comparison_data_1.append({
            "supplier_id": q.supplier_id,
            "supplier_name": q.supplier.name,
            "price": q.price,
            "currency": q.currency,
            "lead_time_days": q.lead_time_days,
            "payment_terms": q.payment_terms,
            "rating": q.supplier.rating,
            "delivery_score": q.supplier.delivery_score,
            "risk_level": q.supplier.risk_level,
            "status": "Best Offer" if q.supplier.name == "Munich Dosing Systems" else ("Matched" if q.supplier.name == "Houston Pump Solutions" else ("High Delivery Risk" if q.supplier.name == "Budget Pumps Inc" else ("Varied Terms" if q.supplier.name == "Tokyo Precision Flow" else "Conforming"))),
            "supplier_category": category,
            "category": category
        })
        
    summary_msg_1 = (
        "AI has successfully completed 2 negotiation rounds. "
        "Munich Dosing Systems (Oppora-discovered) is recommended for award, offering the lowest conforming negotiated price of $2,150/unit "
        "(6.5% savings from original $2,300 quote). Houston Pump Solutions is the premium alternative ($2,350/unit). "
        "Budget Pumps Inc offered $1,900/unit but was REJECTED because their 30-day lead time violates the Houston site deadline. "
        "Action Required: Approve this proposal to generate the Purchase Order and sync to Odoo ERP."
    )
    
    notification_1 = models.WorkflowNotification(
        rfq_number="RFQ-2026-1001",
        rfq_item="Industrial Chemical Dosing Pump",
        type="approval_required",
        status="pending",
        recommended_supplier="Munich Dosing Systems",
        recommended_price=2150.0,
        recommended_currency="USD",
        comparison_json=json.dumps(comparison_data_1),
        summary_message=summary_msg_1,
        notification_email_sent=True,
        created_at=datetime.utcnow() - timedelta(hours=1)
    )
    db.add(notification_1)

    # Create Quotes for RFQ 2
    suppliers_2 = db.query(models.Supplier).filter(models.Supplier.name.in_([
        "SABIC Polymers", "BASF Middle East", "Al-Khobar Plastics", "Borouge"
    ])).all()
    
    quote_metrics_2 = {
        "SABIC Polymers": {"price": 1120.0, "lead_time": 7, "payment_terms": "Net 60 Days", "currency": "USD", "incoterms": "DDP Dammam"},
        "BASF Middle East": {"price": 1080.0, "lead_time": 5, "payment_terms": "Net 45 Days", "currency": "USD", "incoterms": "CIF"},
        "Al-Khobar Plastics": {"price": 950.0, "lead_time": 28, "payment_terms": "Net 30 Days", "currency": "USD", "incoterms": "CIF"},
        "Borouge": {"price": 1000.0, "lead_time": 7, "payment_terms": "LC at Sight", "currency": "EUR", "incoterms": "FOB"},
    }
    
    quotes_2 = []
    for s in suppliers_2:
        metrics = quote_metrics_2[s.name]
        q = models.QuoteResponse(
            rfq_number="RFQ-2026-1003",
            supplier_id=s.id,
            price=metrics["price"],
            currency=metrics["currency"],
            moq=1.0,
            lead_time_days=metrics["lead_time"],
            payment_terms=metrics["payment_terms"],
            incoterms=metrics["incoterms"],
            warranty="12 Months",
            validity="60 Days",
            delivery_details="FOB/CIF standard delivery.",
            status="Quotation Received"
        )
        db.add(q)
        db.flush()
        quotes_2.append(q)

    # Resolve categories dynamically for RFQ 2 using helper logic
    comparison_data_2 = []
    for q in quotes_2:
        category = classify_supplier_record(db, q.supplier_id, q.supplier.preferred, q.supplier.synced_to_erp, q.supplier.erp_vendor_id)
        comparison_data_2.append({
            "supplier_id": q.supplier_id,
            "supplier_name": q.supplier.name,
            "price": q.price,
            "currency": q.currency,
            "lead_time_days": q.lead_time_days,
            "payment_terms": q.payment_terms,
            "rating": q.supplier.rating,
            "delivery_score": q.supplier.delivery_score,
            "risk_level": q.supplier.risk_level,
            "status": "Best Offer" if q.supplier.name == "BASF Middle East" else ("Matched" if q.supplier.name == "SABIC Polymers" else ("High Delivery Risk" if q.supplier.name == "Al-Khobar Plastics" else ("Varied Terms" if q.supplier.name == "Borouge" else "Conforming"))),
            "supplier_category": category,
            "category": category
        })
        
    summary_msg_2 = (
        "AI has successfully completed 2 negotiation rounds. "
        "BASF Middle East is recommended for award, offering the lowest conforming negotiated price of $1,080/unit. "
        "SABIC Polymers is the incumbent alternative ($1,120/unit). "
        "Al-Khobar Plastics was REJECTED due to poor delivery compliance. "
        "Action Required: Approve this proposal to generate the Purchase Order and sync to Odoo ERP."
    )
    
    notification_2 = models.WorkflowNotification(
        rfq_number="RFQ-2026-1003",
        rfq_item="PVC Resin",
        type="approval_required",
        status="pending",
        recommended_supplier="BASF Middle East",
        recommended_price=1080.0,
        recommended_currency="USD",
        comparison_json=json.dumps(comparison_data_2),
        summary_message=summary_msg_2,
        notification_email_sent=True,
        created_at=datetime.utcnow()
    )
    # 8. Seed Veolia Dosing Pump RFQ (RFQ-WWT-2026-0847)
    existing_veolia = db.query(models.RFQ).filter(models.RFQ.rfq_number == "RFQ-WWT-2026-0847").first()
    if not existing_veolia:
        rfq_val = models.RFQ(
            rfq_number          = "RFQ-WWT-2026-0847",
            project_name        = "Wastewater Treatment Plant Chemical Dosing System Upgrade",
            department          = "Operations / Procurement",
            required_date       = datetime(2026, 9, 5).date(),
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
            expected_delivery_date = (datetime(2026, 9, 5) + timedelta(days=21)).date(),
            remarks             = "Critical — project schedule impact if delivery exceeds 21 days.",
            warranty_requirement = "24 months",
            delivery_tolerance  = "21 days maximum",
            status              = "RFQ Sent",
            created_at          = datetime(2026, 8, 15, 9, 0, 0),
        )
        db.add(rfq_val)

        # Add timeline events
        db.add(models.RFQTimeline(
            rfq_number = "RFQ-WWT-2026-0847",
            stage      = "Created",
            timestamp  = datetime(2026, 8, 15, 9, 0, 0),
            details    = "RFQ initialized by Operations / Procurement Department for Veolia WWT Facility."
        ))
        db.add(models.RFQTimeline(
            rfq_number = "RFQ-WWT-2026-0847",
            stage      = "RFQ Sent",
            timestamp  = datetime(2026, 8, 15, 12, 0, 0),
            details    = "RFQ emailed to 5 shortlisted suppliers via ProcureX."
        ))

    db.commit()

    # Note: Veolia suppliers are registered early in this script

    # 7. Reset sequences if using postgres
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
