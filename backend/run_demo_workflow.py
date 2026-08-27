import os
import sys
import json
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Ensure backend directory is in path
sys.path.append(os.path.dirname(__file__))

load_dotenv()

from database import SessionLocal, engine
import models
from pdf_generator import generate_po_pdf_file

# Color codes for terminal beauty
GREEN = "\033[92m"
BLUE = "\033[94m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

def print_banner(text):
    print(f"\n{BOLD}{BLUE}{'='*70}{RESET}")
    print(f"{BOLD}{BLUE}  {text}{RESET}")
    print(f"{BOLD}{BLUE}{'='*70}{RESET}\n")

def print_step(step_num, title):
    print(f"{BOLD}{CYAN}>>> [STEP {step_num}] {title}{RESET}")

def print_info(text):
    print(f"{GREEN}[i] {text}{RESET}")

def print_warning(text):
    print(f"{YELLOW}[!] {text}{RESET}")

def print_success(text):
    print(f"{BOLD}{GREEN}[OK] {text}{RESET}")

def wait_for_user(prompt_msg="Press Enter to advance to the next step..."):
    input(f"\n{BOLD}{YELLOW}>> {prompt_msg}{RESET}")

def run_demo():
    print_banner("PROCUREX: END-TO-END WORKFLOW SIMULATOR (VEOLIA DEMO)")
    print_info("This script will guide you step-by-step through the live Veolia dosing pump demo.")
    print_info("Open your browser dashboard at http://localhost:5173 (or your local frontend URL).")
    
    db = SessionLocal()
    
    try:
        # 0. Clean old demo records
        rfq_num = "RFQ-2026-DEMO"
        po_num = "PO-2026-DEMO"
        
        print_info("Cleaning up any existing demo records for RFQ-2026-DEMO...")
        db.query(models.PurchaseOrder).filter(models.PurchaseOrder.rfq_number == rfq_num).delete()
        db.query(models.NegotiationLog).filter(models.NegotiationLog.rfq_number == rfq_num).delete()
        db.query(models.WorkflowNotification).filter(models.WorkflowNotification.rfq_number == rfq_num).delete()
        db.query(models.QuoteResponse).filter(models.QuoteResponse.rfq_number == rfq_num).delete()
        db.query(models.RFQTimeline).filter(models.RFQTimeline.rfq_number == rfq_num).delete()
        db.query(models.EmailHistory).filter(models.EmailHistory.rfq_number == rfq_num).delete()
        db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_num).delete()
        db.commit()
        
        # ----------------------------------------------------
        # STEP 1: RFQ Creation & Ingestion
        # ----------------------------------------------------
        print_step(1, "RFQ INGESTION & DOCUMENT PARSING")
        print_info("A new procurement request has been uploaded to the ProcureX Agent.")
        print_info("Item: Industrial Chemical Dosing Pump | Quantity: 12.0 Units | Site: Houston Site")
        
        new_rfq = models.RFQ(
            rfq_number=rfq_num,
            project_name="Veolia Houston Site Pump Refill",
            department="Procurement",
            required_date=(datetime.now() + timedelta(days=21)).date(),
            item_name="Industrial Chemical Dosing Pump",
            item_code="ITM-PMP-120",
            description="Industrial Chemical Dosing Pump, heavy duty, diaphragm type, chemical resistant for Houston site.",
            quantity=12.0,
            unit="Units",
            specifications="Capacity: 120 L/h, Pressure: 10 bar, 4-20mA control.",
            priority="High",
            delivery_location="Houston Site",
            expected_delivery_date=(datetime.now() + timedelta(days=21)).date(),
            status="Created",
            created_at=datetime.utcnow()
        )
        db.add(new_rfq)
        
        db.add(models.RFQTimeline(
            rfq_number=rfq_num,
            stage="Created",
            timestamp=datetime.utcnow(),
            details="RFQ document received and structured by AI Copilot."
        ))
        db.commit()
        
        print_success(f"RFQ {rfq_num} created in database with 'Created' status.")
        print(f"{BOLD}[INFO] FRONTEND VIEW:{RESET} Go to {BOLD}RFQs & Assistant{RESET} tab. You will see '{rfq_num}' in the list.")
        
        wait_for_user()
        
        # ----------------------------------------------------
        # STEP 2: Stock Check & Supplier Matching
        # ----------------------------------------------------
        print_step(2, "INVENTORY VERIFICATION & SUPPLIER MATCHING")
        print_info("Checking warehouse stock levels for Dosing Pumps...")
        
        pvc_inv = db.query(models.InventoryItem).filter(models.InventoryItem.item_name == "Industrial Chemical Dosing Pump").first()
        if not pvc_inv:
            pvc_inv = models.InventoryItem(item_name="Industrial Chemical Dosing Pump", stock_level=0.0, min_safety_stock=2.0, unit="Units")
            db.add(pvc_inv)
            db.commit()
            
        print_info(f"Warehouse Inventory State: Stock = {pvc_inv.stock_level} Units | Min Safety Stock = {pvc_inv.min_safety_stock} Units")
        stock_deficit = 12.0
        print_warning(f"Calculated Deficit: {stock_deficit} Units. Sourcing check PASSED (deficit confirmed).")
        
        # Matching suppliers
        target_names = [
            "Houston Pump Solutions", "Gulf Flow Control", "Apex Fluids Corp", 
            "Standard Dosing Systems", "Texas Pump Depot", "Vector Fluidics",
            "Innovate Flow Tech", "Precision Metering Co", "Alpha Pumps & Valves",
            "Budget Pumps Inc", "Munich Dosing Systems", "Tokyo Precision Flow"
        ]
        suppliers = db.query(models.Supplier).filter(models.Supplier.name.in_(target_names)).all()
        if not suppliers or len(suppliers) < 12:
            print_warning("Required dosing pump suppliers not found in database. Running seed script...")
            from seed_veolia_demo import seed_veolia_demo
            seed_veolia_demo()
            suppliers = db.query(models.Supplier).filter(models.Supplier.name.in_(target_names)).all()
            
        print_info("Sourcing algorithm matched the following eligible vendors:")
        for s in suppliers[:6]:
            print_info(f" - {s.name} (Rating: {s.rating}/5, Country: {s.country}, Risk: {s.risk_level})")
        print_info(f"...and {len(suppliers) - 6} other suppliers, including Oppora-discovered vendors.")
            
        db.add(models.RFQTimeline(
            rfq_number=rfq_num,
            stage="Created",
            timestamp=datetime.utcnow() + timedelta(seconds=2),
            details=f"Warehouse inventory checked. Deficit confirmed. Matched {len(suppliers)} suppliers: " + ", ".join([s.name for s in suppliers[:5]]) + "..."
        ))
        db.commit()
        
        print_success("Inventory audit complete & suppliers successfully mapped.")
        print(f"{BOLD}[INFO] FRONTEND VIEW:{RESET} Go to {BOLD}Autonomous ProcureX{RESET} tab, select this RFQ. The milestones stepper will display Step 1 (Parsing), Step 2 (Inventory Audit), and Step 3 (Supplier Matching) as completed.")
        
        wait_for_user()
        
        # ----------------------------------------------------
        # STEP 3: Campaign Launch & Outreach
        # ----------------------------------------------------
        print_step(3, "RFQ DISPATCH & OUTREACH LAUNCH")
        print_info("Sending RFQ invitation emails to suppliers...")
        
        new_rfq.status = "RFQ Sent"
        db.add(models.RFQTimeline(
            rfq_number=rfq_num,
            stage="RFQ Sent",
            timestamp=datetime.utcnow() + timedelta(seconds=5),
            details="RFQ outreach emails dispatched via API to all matched suppliers."
        ))
        
        # Log outreach in email history
        for s in suppliers:
            db.add(models.EmailHistory(
                rfq_number=rfq_num,
                supplier_id=s.id,
                subject=f"RFQ Invitation: Industrial Chemical Dosing Pump - {rfq_num}",
                body=f"Dear {s.name} Sales Team, we invite you to quote for 12 Units of Industrial Chemical Dosing Pump...",
                type="RFQ Invitation",
                sent_at=datetime.utcnow(),
                response_received=False
            ))
        db.commit()
        
        print_success("Outreach emails logged and campaign transitioned to 'RFQ Sent'.")
        print(f"{BOLD}[INFO] FRONTEND VIEW:{RESET} Look at the {BOLD}Autonomous ProcureX{RESET} page logs console. The campaign is now marked active and emails are shown in dispatch log.")
        
        wait_for_user()
        
        # ----------------------------------------------------
        # STEP 4: Live Multi-Round Negotiation Simulation
        # ----------------------------------------------------
        print_step(4, "LIVE NEGOTIATION LOOP SIMULATION")
        print_info("Simulating incoming vendor responses and autonomous AI counter-offers...")
        
        houston = [s for s in suppliers if s.name == "Houston Pump Solutions"][0]
        munich = [s for s in suppliers if s.name == "Munich Dosing Systems"][0]
        budget = [s for s in suppliers if s.name == "Budget Pumps Inc"][0]
        
        # --- ROUND 1 ---
        print(f"\n{BOLD}--- Round 1 ---{RESET}")
        print_info("Houston Pump Solutions quotes $2,500/unit, lead time 15 days.")
        print_info("Munich Dosing Systems (Oppora-discovered) quotes $2,300/unit, lead time 12 days.")
        print_info("Budget Pumps Inc quotes $1,900/unit, lead time 30 days.")
        
        now = datetime.utcnow()
        r1_logs = [
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=houston.id, supplier_email=houston.email, round_number=1, direction="inbound", subject="Re: RFQ Invitation", body="We quote $2500/unit, 15 days lead time.", extracted_price=2500.0, extracted_currency="USD", extracted_lead_time=15, sent_at=now, reply_received=True),
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=munich.id, supplier_email=munich.email, round_number=1, direction="inbound", subject="Re: RFQ Invitation", body="We can offer $2300/unit, 12 days delivery.", extracted_price=2300.0, extracted_currency="USD", extracted_lead_time=12, sent_at=now, reply_received=True),
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=budget.id, supplier_email=budget.email, round_number=1, direction="inbound", subject="Re: RFQ Invitation", body="Our price is $1900/unit, 30 days lead time.", extracted_price=1900.0, extracted_currency="USD", extracted_lead_time=30, sent_at=now, reply_received=True),
        ]
        for l in r1_logs:
            db.add(l)
        db.commit()
        
        print_info("AI dispatches Counter-Offers targeting discount:")
        print_info(" -> Houston Target: $2,300/unit | Munich Target: $2,100/unit | Budget Target: $1,800/unit")
        
        r1_outbounds = [
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=houston.id, supplier_email=houston.email, round_number=1, direction="outbound", subject="RE: RFQ Response", body="Thank you. We are targeting $2300/unit. Can you match?", extracted_price=2300.0, extracted_currency="USD", sent_at=now + timedelta(seconds=1)),
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=munich.id, supplier_email=munich.email, round_number=1, direction="outbound", subject="RE: RFQ Response", body="Thank you. We are targeting $2100/unit. Please let us know if possible.", extracted_price=2100.0, extracted_currency="USD", sent_at=now + timedelta(seconds=1)),
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=budget.id, supplier_email=budget.email, round_number=1, direction="outbound", subject="RE: RFQ Response", body="Thank you. We are targeting $1800/unit. Can you adjust price?", extracted_price=1800.0, extracted_currency="USD", sent_at=now + timedelta(seconds=1)),
        ]
        for l in r1_outbounds:
            db.add(l)
        db.commit()
        
        # --- ROUND 2 ---
        print(f"\n{BOLD}--- Round 2 ---{RESET}")
        print_info("Houston Pump Solutions offers revised $2,350/unit, lead time 14 days.")
        print_info("Munich Dosing Systems offers revised $2,150/unit, lead time 12 days (Best & Final Offer).")
        print_info("Budget Pumps Inc declines discount and stays at $1,900/unit, 30 days lead time.")
        
        r2_logs = [
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=houston.id, supplier_email=houston.email, round_number=2, direction="inbound", subject="Re: RFQ Target Price", body="We accept $2350/unit, Net 45 Days, 14 days delivery.", extracted_price=2350.0, extracted_currency="USD", extracted_lead_time=14, sent_at=now + timedelta(seconds=2), reply_received=True),
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=munich.id, supplier_email=munich.email, round_number=2, direction="inbound", subject="Re: RFQ Target Price", body="We accept $2150/unit as our final best offer, Net 45 Days, 12 days delivery.", extracted_price=2150.0, extracted_currency="USD", extracted_lead_time=12, sent_at=now + timedelta(seconds=2), reply_received=True, is_final=True),
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=budget.id, supplier_email=budget.email, round_number=2, direction="inbound", subject="Re: RFQ Target Price", body="We cannot offer any further discount. Price is firm.", extracted_price=1900.0, extracted_currency="USD", extracted_lead_time=30, sent_at=now + timedelta(seconds=2), reply_received=True, is_final=True),
        ]
        for l in r2_logs:
            db.add(l)
        db.commit()
        
        # Seed Quote Responses for all 12 suppliers to show side by side comparison
        quotes_to_add = [
            models.QuoteResponse(rfq_number=rfq_num, supplier_id=houston.id, price=2350.0, currency="USD", lead_time_days=14, payment_terms="Net 45 Days", incoterms="CIF", responded_at=datetime.utcnow(), status="Quotation Received"),
            models.QuoteResponse(rfq_number=rfq_num, supplier_id=munich.id, price=2150.0, currency="USD", lead_time_days=12, payment_terms="Net 45 Days", incoterms="CIF", responded_at=datetime.utcnow(), status="Quotation Received"),
            models.QuoteResponse(rfq_number=rfq_num, supplier_id=budget.id, price=1900.0, currency="USD", lead_time_days=30, payment_terms="Net 30 Days", incoterms="FOB", responded_at=datetime.utcnow(), status="Quotation Received"),
        ]
        
        # Add remaining suppliers with default quotes
        for s in suppliers:
            if s.id not in [houston.id, munich.id, budget.id]:
                quotes_to_add.append(
                    models.QuoteResponse(
                        rfq_number=rfq_num, supplier_id=s.id, price=2400.0 + (s.id * 15), currency="USD",
                        lead_time_days=s.lead_time_days or 15, payment_terms="Net 30 Days", incoterms="FOB",
                        responded_at=datetime.utcnow(), status="Quotation Received"
                    )
                )
                
        for q in quotes_to_add:
            db.add(q)
        
        # Update RFQ status to Under Comparison
        new_rfq.status = "Under Comparison"
        
        # Add Timeline event
        db.add(models.RFQTimeline(
            rfq_number=rfq_num,
            stage="Supplier Responded",
            timestamp=datetime.utcnow() + timedelta(seconds=10),
            details="All quotes received and negotiated. Final offers locked for comparison."
        ))
        db.commit()
        
        # Generate the WorkflowNotification card (Pending Approval)
        comparison_data = [
            {"supplier_id": munich.id, "supplier_name": munich.name, "price": 2150.0, "currency": "USD", "lead_time_days": 12, "payment_terms": "Net 45 Days", "rating": munich.rating, "delivery_score": munich.delivery_score, "risk_level": munich.risk_level, "status": "Best Offer"},
            {"supplier_id": houston.id, "supplier_name": houston.name, "price": 2350.0, "currency": "USD", "lead_time_days": 14, "payment_terms": "Net 45 Days", "rating": houston.rating, "delivery_score": houston.delivery_score, "risk_level": houston.risk_level, "status": "Matched"},
            {"supplier_id": budget.id, "supplier_name": budget.name, "price": 1900.0, "currency": "USD", "lead_time_days": 30, "payment_terms": "Net 30 Days", "rating": budget.rating, "delivery_score": budget.delivery_score, "risk_level": budget.risk_level, "status": "High Delivery Risk"}
        ]
        
        summary_msg = (
            "AI has successfully completed 2 negotiation rounds. "
            "Munich Dosing Systems (Oppora-discovered) is recommended for award, offering the lowest conforming negotiated price of $2,150/unit "
            "(6.5% savings from original $2,300 quote). Houston Pump Solutions is the premium alternative ($2,350/unit). "
            "Budget Pumps Inc offered $1,900/unit but was REJECTED because their 30-day lead time violates the 21-day Houston site deadline and carries high delivery risk (62% compliance score). "
            "Action Required: Approve this proposal to generate the Purchase Order and sync to Odoo ERP."
        )
        
        notification = models.WorkflowNotification(
            rfq_number=rfq_num,
            rfq_item="Industrial Chemical Dosing Pump",
            type="approval_required",
            status="pending",
            recommended_supplier=munich.name,
            recommended_price=2150.0,
            recommended_currency="USD",
            comparison_json=json.dumps(comparison_data),
            summary_message=summary_msg,
            notification_email_sent=True,
            created_at=datetime.utcnow()
        )
        db.add(notification)
        db.commit()
        
        print_success("Negotiations logged & Comparison Table populated with AI recommendation.")
        print(f"{BOLD}[INFO] FRONTEND VIEW:{RESET} Go to {BOLD}Operations Dashboard{RESET}. You will see a 'Pending Approval' card for Industrial Chemical Dosing Pump.")
        print(f"You can also click {BOLD}Quote Comparison{RESET} in the sidebar to review the side-by-side matrices and charts.")
        
        wait_for_user("Press Enter to approve proposal and release the Purchase Order...")
        
        # ----------------------------------------------------
        # STEP 5: Approval, PO Release, and Odoo ERP Sync
        # ----------------------------------------------------
        print_step(5, "PURCHASE ORDER RELEASE & ERP SYNCHRONIZATION")
        print_info("Processing management approval...")
        
        # Update notification status
        notification.status = "approved"
        notification.reviewed_at = datetime.utcnow()
        notification.po_number = po_num
        
        # Create Purchase Order
        po = models.PurchaseOrder(
            po_number=po_num,
            rfq_number=rfq_num,
            supplier_id=munich.id,
            item_name="Industrial Chemical Dosing Pump",
            quantity=12.0,
            unit_price=2150.0,
            total_amount=12.0 * 2150.0,
            status="Sent",
            created_at=datetime.utcnow()
        )
        db.add(po)
        
        # Update RFQ status
        new_rfq.status = "PO Generated"
        
        # Update timeline
        db.add(models.RFQTimeline(
            rfq_number=rfq_num,
            stage="PO Generated",
            timestamp=datetime.utcnow(),
            details=f"Purchase Order {po_num} approved and released to Munich Dosing Systems."
        ))
        db.commit()
        
        # Refresh PO and generate PDF
        db.refresh(po)
        pdf_path = generate_po_pdf_file(po, db)
        print_info(f"Generated official PO PDF document at: {pdf_path}")
        
        # Syncing to ERP (Odoo Simulation or real connection if configured)
        print_info("Syncing Purchase Order with Odoo ERP...")
        
        url = os.getenv("ODOO_URL")
        db_name = os.getenv("ODOO_DB")
        username = os.getenv("ODOO_USERNAME")
        password = os.getenv("ODOO_PASSWORD")
        
        erp_success = False
        odoo_po_id = "MOCK-PO-98441"
        
        if url and db_name and username and password:
            try:
                import xmlrpc.client
                print_info(f"Connecting to live Odoo ERP instance at {url}...")
                common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
                uid = common.authenticate(db_name, username, password, {})
                if uid:
                    models_rpc = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")
                    partner_ids = models_rpc.execute_kw(db_name, uid, password, 'res.partner', 'search', [[['name', '=', 'Munich Dosing Systems']]])
                    partner_id = partner_ids[0] if partner_ids else None
                    product_ids = models_rpc.execute_kw(db_name, uid, password, 'product.product', 'search', [[['name', '=', 'Industrial Chemical Dosing Pump']]])
                    product_id = product_ids[0] if product_ids else None
                    
                    if partner_id and product_id:
                        po_data = {
                            'partner_id': partner_id,
                            'origin': rfq_num,
                            'order_line': [
                                (0, 0, {
                                    'name': 'Industrial Chemical Dosing Pump',
                                    'product_id': product_id,
                                    'product_qty': 12.0,
                                    'price_unit': 2150.0,
                                    'date_planned': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
                                })
                            ]
                        }
                        po_created_id = models_rpc.execute_kw(db_name, uid, password, 'purchase.order', 'create', [po_data])
                        models_rpc.execute_kw(db_name, uid, password, 'purchase.order', 'button_confirm', [[po_created_id]])
                        
                        odoo_po_id = f"Odoo PO #{po_created_id}"
                        erp_success = True
                        print_success(f"Synced PO successfully with live Odoo! Created {odoo_po_id}")
            except Exception as e:
                print_warning(f"Live Odoo sync failed: {e}. Falling back to simulation.")
                
        if not erp_success:
            print_info("Simulating Odoo ERP XML-RPC synchronization...")
            time.sleep(1)
            erp_success = True
            
        po.synced_to_erp = True
        po.erp_sync_date = datetime.utcnow()
        po.erp_po_number = odoo_po_id
        
        # Log ERP Sync
        db.add(models.ErpSyncLog(
            object_type="PurchaseOrder",
            object_id=po_num,
            direction="Outbound",
            url=url or "http://odoo-simulated-rpc:8069/xmlrpc/2/object",
            method="execute_kw",
            request_payload=json.dumps({"partner": "Munich Dosing Systems", "item": "Industrial Chemical Dosing Pump", "qty": 12.0, "price": 2150.0}),
            response_payload=json.dumps({"success": True, "odoo_id": odoo_po_id}),
            status_code=200,
            timestamp=datetime.utcnow()
        ))
        db.commit()
        
        print_success("Purchase Order synced with ERP and finalized.")
        print(f"{BOLD}[INFO] FRONTEND VIEW:{RESET} Refresh the dashboard. The approval card is cleared. Go to the {BOLD}Purchase Orders{RESET} tab, you will see '{po_num}' marked as 'Sent' and successfully synced to Odoo ERP.")
        
        wait_for_user("Press Enter to complete the demo guide...")
        
        print_banner("DEMO COMPLETED SUCCESSFULLY!")
        print_success("You have successfully shown the entire procurement cycle from ingestion to ERP sync!")
        
    except Exception as e:
        db.rollback()
        print(f"{RED}Error executing demo simulation: {e}{RESET}")
    finally:
        db.close()

if __name__ == "__main__":
    run_demo()
