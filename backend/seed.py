import os
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Supplier, RFQ, QuoteResponse, PurchaseOrder, EmailHistory, RFQTimeline, InventoryItem, QualityDefect
from database import engine, SessionLocal

# Create tables
Base.metadata.create_all(bind=engine)

def seed_database():
    db = SessionLocal()
    
    # Check if we already have data
    if db.query(Supplier).count() > 0:
        if db.query(InventoryItem).count() == 0:
            print("Seeding inventory and quality defect tables...")
            inventory_items = [
                {"item_name": "PVC Resin", "stock_level": 85.0, "min_safety_stock": 50.0, "unit": "MT"},
                {"item_name": "HDPE Granules", "stock_level": 35.0, "min_safety_stock": 60.0, "unit": "MT"},
                {"item_name": "LDPE Film", "stock_level": 72.0, "min_safety_stock": 40.0, "unit": "MT"},
                {"item_name": "Stabilizers", "stock_level": 18.0, "min_safety_stock": 30.0, "unit": "MT"},
                {"item_name": "Solvent Cement", "stock_level": 90.0, "min_safety_stock": 30.0, "unit": "Liters"}
            ]
            for item in inventory_items:
                db.add(InventoryItem(**item))

            quality_defects = [
                {"defect_type": "Surface Scratch", "location": "Extruder Line 2", "confidence": 94.2, "timestamp": datetime.utcnow() - timedelta(minutes=15), "status": "Active"},
                {"defect_type": "Diameter Deviation", "location": "Extruder Line 1", "confidence": 97.8, "timestamp": datetime.utcnow() - timedelta(hours=3), "status": "Resolved"}
            ]
            for defect in quality_defects:
                db.add(QualityDefect(**defect))
            db.commit()
            print("Inventory and defect tables seeded successfully.")
        else:
            print("Database already seeded.")
        db.close()
        return

    print("Seeding database...")
    
    # Categories and items
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
    
    # 1. Generate ~100 Suppliers
    suppliers = []
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
    
    # Supplement names to reach 100
    for i in range(1, 71):
        name_type = random.choice(["Global", "Local", "Enterprise"])
        country = random.choice(countries)
        if country == "Saudi Arabia":
            name = f"Al-{random.choice(['Jazirah', 'Rajhi', 'Fahad', 'Nahdi', 'Sharq', 'Watan'])} {random.choice(['Polymers', 'Chemicals', 'Industries', 'Trading'])}"
        elif country == "United Arab Emirates":
            name = f"Emirates {random.choice(['Resin', 'Petrochemical', 'Supply', 'Global', 'Logistics'])}"
        else:
            name = f"{country} {random.choice(['Polymer Group', 'Chemical Corp', 'Material Solutions', 'Alloys'])}"
        
        supplier_names_pool.append((name, country))
    
    # De-duplicate names
    supplier_names_pool = list(set(supplier_names_pool))[:102]
    
    for i, (name, country) in enumerate(supplier_names_pool):
        # Determine items they supply based on random category selection
        num_cats = random.randint(1, 3)
        selected_cats = random.sample(categories_list, num_cats)
        supplied_items = []
        for cat in selected_cats:
            supplied_items.extend(products_by_category[cat])
        
        # Specific overrides for prompt consistency
        if name == "SABIC Polymers":
            supplied_items.append("PVC Resin")
            supplied_items.append("HDPE Granules")
        if name == "Borouge":
            supplied_items.append("HDPE Granules")
            supplied_items.append("LDPE Film")
        if name == "Jubail Polymers":
            supplied_items.append("HDPE Granules")
            supplied_items.append("PVC Resin")
        if name == "Al-Khobar Plastics":
            supplied_items.append("PVC Resin")
            supplied_items.append("LDPE Film")
            
        email_local = name.lower().replace(" ", "").replace(".", "").replace("-", "").replace("(", "").replace(")", "")
        
        # Rating & scores
        # "Jubail Polymers" is best delivery
        if name == "Jubail Polymers":
            rating = 4.9
            delivery_score = 98.5
            quality_score = 97.0
            price_comp = 88.0
            preferred = True
        elif name == "Al-Khobar Plastics":
            rating = 3.2
            delivery_score = 65.0  # low delivery score, delayed deliveries
            quality_score = 80.0
            price_comp = 90.0
            preferred = False
        else:
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
            
        s = Supplier(
            id=i + 1,
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
            average_response_time_hours=round(random.uniform(6, 48), 1)
        )
        suppliers.append(s)
        db.add(s)
        
    db.commit()
    print(f"Seeded {len(suppliers)} suppliers.")
    
    # 2. Generate ~500 RFQs
    rfqs = []
    base_date = datetime.now() - timedelta(days=120)
    
    # Create static products list
    all_products = []
    for cat_items in products_by_category.values():
        all_products.extend(cat_items)
        
    statuses = ["Created", "RFQ Sent", "Responses Received", "Under Comparison", "Approved", "PO Generated"]
    
    # Specific departments
    depts = ["Procurement", "Engineering", "Production", "Maintenance", "QA/QC"]
    units = ["MT", "KG", "Pcs", "Meters", "Liters", "Rolls", "Boxes"]
    locations = ["Jeddah Plant", "Riyadh Warehouse", "Dammam Factory", "Yanbu Industrial Area"]
    
    for r_idx in range(1, 501):
        rfq_num = f"RFQ-2026-{r_idx:03d}"
        
        # Pick random category and item
        cat = random.choice(categories_list)
        item = random.choice(products_by_category[cat])
        
        # Date logic
        created_at = base_date + timedelta(hours=random.randint(1, 120 * 24))
        # Don't create RFQs in the future
        if created_at > datetime.now():
            created_at = datetime.now() - timedelta(hours=random.randint(1, 24))
            
        required_date = (created_at + timedelta(days=random.randint(15, 45))).date()
        expected_delivery = required_date + timedelta(days=random.randint(5, 15))

        
        # Set status distribution
        if r_idx < 300:
            status = "PO Generated"
        elif r_idx < 400:
            status = "Approved"
        elif r_idx < 450:
            status = "Under Comparison"
        elif r_idx < 480:
            status = "Responses Received"
        elif r_idx < 495:
            status = "RFQ Sent"
        else:
            status = "Created"
            
        qty = round(random.uniform(10, 1000) * 10) / 10
        unit = "Pcs"
        if cat in ["Raw Polymers", "Industrial Chemicals"]:
            unit = "MT"
            qty = random.choice([25, 50, 100, 150, 200, 500])
        elif cat == "Additives & Stabilizers":
            unit = "KG"
            qty = random.choice([500, 1000, 2500, 5000, 10000])
        elif cat == "Packaging Materials":
            unit = "Pcs" if item == "Wooden Pallets" else "Rolls"
        
        # Priority
        priority = "Medium"
        if r_idx % 10 == 0:
            priority = "High"
        elif r_idx % 15 == 0:
            priority = "Low"
            
        rfq = RFQ(
            rfq_number=rfq_num,
            project_name=f"Project {item} procurement - {created_at.strftime('%Y-%b')}",
            department=random.choice(depts),
            required_date=required_date,
            item_name=item,
            item_code=f"ITM-{cat[:3].upper()}-{r_idx:04d}",
            description=f"Standard commercial supply of {item} for factory operations. Grade: Industrial premium.",
            quantity=qty,
            unit=unit,
            specifications=f"Technical data sheet compliant, supplier must provide COA (Certificate of Analysis) with each delivery.",
            drawing_attachment=f"drawing_{rfq_num.lower()}.pdf" if random.choice([True, False]) else None,
            priority=priority,
            delivery_location=random.choice(locations),
            expected_delivery_date=expected_delivery,
            remarks="Prompt response expected. Subject to standard payment terms.",
            status=status,
            created_at=created_at
        )
        rfqs.append(rfq)
        db.add(rfq)
        
    db.commit()
    print(f"Seeded {len(rfqs)} RFQs.")
    
    # 3. Seeding Quote Responses (~300)
    # We will look at RFQs.
    # RFQs that are PO Generated, Approved, Under Comparison, Responses Received should have quotes.
    quotes = []
    quote_id = 1
    
    for rfq in rfqs:
        if rfq.status not in ["Responses Received", "Under Comparison", "Approved", "PO Generated"]:
            continue
            
        # Find category of this RFQ
        rfq_cat = None
        for category, products in products_by_category.items():
            if rfq.item_name in products:
                rfq_cat = category
                break

        # Find suppliers for this item
        eligible_suppliers = []
        for s in suppliers:
            # Check if they supply this product or category
            if (s.products and rfq.item_name in s.products) or (rfq_cat and s.categories and rfq_cat in s.categories):
                eligible_suppliers.append(s)
                
        if not eligible_suppliers:

            eligible_suppliers = random.sample(suppliers, 3)
            
        # Select 2-3 suppliers to send quote responses
        num_quotes = min(len(eligible_suppliers), random.randint(2, 3))
        selected_suppliers = random.sample(eligible_suppliers, num_quotes)
        
        # Base price calculation
        base_price = 10.0 # fallback
        if rfq.item_name == "PVC Resin":
            base_price = 1000.0  # per MT
        elif rfq.item_name == "HDPE Granules":
            base_price = 1150.0  # per MT
        elif rfq.item_name == "LDPE Film":
            base_price = 1300.0  # per MT
        elif rfq.item_name == "Calcium Carbonate":
            base_price = 150.0   # per MT
        elif rfq.item_name == "Titanium Dioxide":
            base_price = 2800.0  # per MT
        elif "Plasticizer" in rfq.item_name:
            base_price = 1400.0  # per MT
        else:
            base_price = random.uniform(5, 500)
            
        for s in selected_suppliers:
            # Adjust price by supplier competitiveness
            price_factor = 1.0 - (s.price_competitiveness - 80) / 400.0 # higher competitiveness -> lower price
            price = round(base_price * price_factor * random.uniform(0.95, 1.05), 2)
            
            # Lead time days
            lead_time = max(3, int(s.lead_time_days * random.uniform(0.8, 1.2)))
            
            quote = QuoteResponse(
                id=quote_id,
                rfq_number=rfq.rfq_number,
                supplier_id=s.id,
                price=price,
                currency="USD" if random.choice([True, False, True]) else "SAR",
                moq=max(1.0, round(rfq.quantity * random.uniform(0.2, 0.8), 1)),
                lead_time_days=lead_time,
                payment_terms=random.choice(["Net 30 Days", "Net 60 Days", "10% Advance, 90% LC", "CAD (Cash Against Documents)"]),
                incoterms=random.choice(["FOB", "CIF", "DDP", "EXW"]),
                warranty=random.choice(["12 Months", "24 Months", "Standard Manufacturer's Warranty", "None"]),
                validity="60 Days from quotation date",
                delivery_details="Delivery via sea freight to port, then road transport.",
                responded_at=rfq.created_at + timedelta(days=random.randint(2, 6)),
                status="Quotation Received"
            )
            quotes.append(quote)
            db.add(quote)
            quote_id += 1
            
    db.commit()
    print(f"Seeded {len(quotes)} quote responses.")
    
    # 4. Seeding Purchase Orders (~300)
    # RFQs that are PO Generated should have a PO.
    pos = []
    po_idx = 1
    
    for rfq in rfqs:
        if rfq.status != "PO Generated":
            continue
            
        # Get quotes for this RFQ
        rfq_quotes = [q for q in quotes if q.rfq_number == rfq.rfq_number]
        if not rfq_quotes:
            # fallback: create a quote and a PO
            s = random.choice(suppliers)
            price = random.uniform(50, 1000)
            q = QuoteResponse(
                id=quote_id,
                rfq_number=rfq.rfq_number,
                supplier_id=s.id,
                price=price,
                responded_at=rfq.created_at + timedelta(days=3),
                status="Quotation Received"
            )
            db.add(q)
            quote_id += 1
            rfq_quotes = [q]
            
        # Select winning quote (usually lowest price, but maybe random)
        winning_quote = min(rfq_quotes, key=lambda q: q.price)
        
        # Decide PO status: Completed, Acknowledged, Delayed, Sent
        po_status = "Completed"
        if rfq.created_at > datetime.now() - timedelta(days=20):
            po_status = random.choice(["Sent", "Acknowledged"])
        elif winning_quote.supplier.name == "Al-Khobar Plastics" and random.choice([True, False, True]):
            po_status = "Delayed"  # make Al-Khobar have delayed POs
        elif random.random() < 0.05:
            po_status = "Delayed"
            
        po_number = f"PO-2026-{po_idx:04d}"
        
        # Specific historical POs for prompt consistency
        # Last purchase price of PVC Resin
        if rfq.item_name == "PVC Resin" and po_idx == 42:
            # Let's override
            winning_quote.price = 1050.0
            winning_quote.currency = "USD"
            rfq.quantity = 100.0
            rfq.unit = "MT"
            po_number = "PO-2026-0428"
            po_status = "Completed"
            winning_quote.supplier_id = [s.id for s in suppliers if s.name == "SABIC Polymers"][0]
            
        # Last purchase price of HDPE Granules
        if rfq.item_name == "HDPE Granules" and po_idx == 95:
            winning_quote.price = 1200.0
            winning_quote.currency = "USD"
            rfq.quantity = 50.0
            rfq.unit = "MT"
            po_number = "PO-2026-0495"
            po_status = "Completed"
            winning_quote.supplier_id = [s.id for s in suppliers if s.name == "Borouge"][0]
            
        po = PurchaseOrder(
            po_number=po_number,
            rfq_number=rfq.rfq_number,
            supplier_id=winning_quote.supplier_id,
            item_name=rfq.item_name,
            quantity=rfq.quantity,
            unit_price=winning_quote.price,
            total_amount=round(rfq.quantity * winning_quote.price, 2),
            status=po_status,
            created_at=winning_quote.responded_at + timedelta(days=2)
        )
        pos.append(po)
        db.add(po)
        po_idx += 1
        
    db.commit()
    print(f"Seeded {len(pos)} purchase orders.")
    
    # 5. Seeding Email History (mock conversation threads)
    emails = []
    email_idx = 1
    
    for rfq in rfqs[:100]: # seed email threads for the first 100 RFQs
        rfq_quotes = [q for q in quotes if q.rfq_number == rfq.rfq_number]
        for q in rfq_quotes:
            s = q.supplier
            
            # Send RFQ Invitation
            body = (
                f"Dear {s.name} Sales Team,\n\n"
                f"We are pleased to invite you to submit your quotation for {rfq.item_name} under RFQ reference {rfq.rfq_number}.\n\n"
                f"Details:\n"
                f"- Item: {rfq.item_name}\n"
                f"- Quantity: {rfq.quantity} {rfq.unit}\n"
                f"- Delivery Location: {rfq.delivery_location}\n"
                f"- Required Delivery Date: {rfq.expected_delivery_date}\n\n"
                f"Please submit your technical and commercial proposal by email. If you have any clarifications, feel free to contact us.\n\n"
                f"Best regards,\n"
                f"Neproplast Procurement Team"
            )
            
            email_inv = EmailHistory(
                id=email_idx,
                rfq_number=rfq.rfq_number,
                supplier_id=s.id,
                subject=f"Inquiry: RFQ for {rfq.item_name} - {rfq.rfq_number}",
                body=body,
                type="RFQ Invitation",
                sent_at=rfq.created_at + timedelta(hours=2),
                response_received=True
            )
            emails.append(email_inv)
            db.add(email_inv)
            email_idx += 1
            
            # Simulated reminder for 30% of them
            if random.random() < 0.3:
                rem_body = (
                    f"Dear {s.name} Team,\n\n"
                    f"This is a gentle reminder regarding our RFQ for {rfq.item_name} ({rfq.rfq_number}).\n"
                    f"We look forward to receiving your bid at your earliest convenience.\n\n"
                    f"Regards,\n"
                    f"Neproplast Procurement"
                )
                email_rem = EmailHistory(
                    id=email_idx,
                    rfq_number=rfq.rfq_number,
                    supplier_id=s.id,
                    subject=f"REMINDER: RFQ for {rfq.item_name} - {rfq.rfq_number}",
                    body=rem_body,
                    type="Reminder",
                    sent_at=rfq.created_at + timedelta(days=3),
                    response_received=True
                )
                emails.append(email_rem)
                db.add(email_rem)
                email_idx += 1
                
    db.commit()
    print(f"Seeded {len(emails)} emails.")
    
    # 6. Seeding Timeline events for RFQs
    # For every RFQ, we create a timeline based on its status
    timeline_idx = 1
    
    for rfq in rfqs:
        # Create always starts with Created
        db.add(RFQTimeline(
            rfq_number=rfq.rfq_number,
            stage="Created",
            timestamp=rfq.created_at,
            details=f"RFQ initialized by {rfq.department} Department."
        ))
        
        if rfq.status == "Created":
            continue
            
        # RFQ Sent
        sent_time = rfq.created_at + timedelta(hours=3)
        db.add(RFQTimeline(
            rfq_number=rfq.rfq_number,
            stage="RFQ Sent",
            timestamp=sent_time,
            details="RFQ emailed to selected suppliers."
        ))
        
        if rfq.status == "RFQ Sent":
            continue
            
        # Optional Reminder Sent
        rfq_emails = [e for e in emails if e.rfq_number == rfq.rfq_number and e.type == "Reminder"]
        if rfq_emails:
            db.add(RFQTimeline(
                rfq_number=rfq.rfq_number,
                stage="Reminder Sent",
                timestamp=rfq_emails[0].sent_at,
                details="Follow-up reminder sent to pending suppliers."
            ))
            
        # Supplier Responded
        rfq_quotes = [q for q in quotes if q.rfq_number == rfq.rfq_number]
        resp_time = sent_time + timedelta(days=2)
        if rfq_quotes:
            resp_time = min(q.responded_at for q in rfq_quotes)
            db.add(RFQTimeline(
                rfq_number=rfq.rfq_number,
                stage="Supplier Responded",
                timestamp=resp_time,
                details=f"Quotation proposals received from {len(rfq_quotes)} suppliers."
            ))
            
        if rfq.status == "Responses Received":
            continue
            
        # Comparison Generated
        comp_time = resp_time + timedelta(hours=6)
        db.add(RFQTimeline(
            rfq_number=rfq.rfq_number,
            stage="Comparison Generated",
            timestamp=comp_time,
            details="AI engine extracted terms and generated side-by-side comparison table."
        ))
        
        if rfq.status == "Under Comparison":
            continue
            
        # Buyer Reviewed
        rev_time = comp_time + timedelta(days=1)
        db.add(RFQTimeline(
            rfq_number=rfq.rfq_number,
            stage="Buyer Reviewed",
            timestamp=rev_time,
            details="Procurement agent reviewed supplier proposals and AI recommendations."
        ))
        
        # Approved
        app_time = rev_time + timedelta(hours=4)
        db.add(RFQTimeline(
            rfq_number=rfq.rfq_number,
            stage="Approved",
            timestamp=app_time,
            details="Management approved the selection of the winning bid."
        ))
        
        if rfq.status == "Approved":
            continue
            
        # PO Generated
        rfq_pos = [po for po in pos if po.rfq_number == rfq.rfq_number]
        po_time = app_time + timedelta(hours=2)
        if rfq_pos:
            po_time = rfq_pos[0].created_at
            db.add(RFQTimeline(
                rfq_number=rfq.rfq_number,
                stage="PO Generated",
                timestamp=po_time,
                details=f"Purchase Order {rfq_pos[0].po_number} released to winning supplier."
            ))
            
    # Seed Inventory Items
    inventory_items = [
        {"item_name": "PVC Resin", "stock_level": 85.0, "min_safety_stock": 50.0, "unit": "MT"},
        {"item_name": "HDPE Granules", "stock_level": 35.0, "min_safety_stock": 60.0, "unit": "MT"},
        {"item_name": "LDPE Film", "stock_level": 72.0, "min_safety_stock": 40.0, "unit": "MT"},
        {"item_name": "Stabilizers", "stock_level": 18.0, "min_safety_stock": 30.0, "unit": "MT"},
        {"item_name": "Solvent Cement", "stock_level": 90.0, "min_safety_stock": 30.0, "unit": "Liters"}
    ]
    for item in inventory_items:
        db.add(InventoryItem(**item))

    # Seed Quality Defects
    quality_defects = [
        {"defect_type": "Surface Scratch", "location": "Extruder Line 2", "confidence": 94.2, "timestamp": datetime.utcnow() - timedelta(minutes=15), "status": "Active"},
        {"defect_type": "Diameter Deviation", "location": "Extruder Line 1", "confidence": 97.8, "timestamp": datetime.utcnow() - timedelta(hours=3), "status": "Resolved"}
    ]
    for defect in quality_defects:
        db.add(QualityDefect(**defect))

    db.commit()
    
    # Reset PostgreSQL sequences if using Postgres
    if "postgresql" in str(engine.url):
        try:
            from sqlalchemy import text
            print("Resetting PostgreSQL sequences...")
            for table_name in ["suppliers", "quote_responses", "email_history", "rfq_timeline"]:
                db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), coalesce(max(id), 1)) FROM {table_name};"))
            db.commit()
            print("PostgreSQL sequences successfully reset.")
        except Exception as seq_err:
            print(f"Warning: Could not reset PostgreSQL sequences: {seq_err}")

    print("Database seeding completed successfully.")
    db.close()

if __name__ == "__main__":
    seed_database()
