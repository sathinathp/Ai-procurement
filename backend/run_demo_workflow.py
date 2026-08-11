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
    print_banner("NEPROPLAST AI PROCUREMENT: END-TO-END WORKFLOW SIMULATOR")
    print_info("This script will guide you step-by-step through the live demo.")
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
        print_info("A new procurement request has been uploaded to the AI Agent.")
        print_info("Item: PVC Resin K-67 | Quantity: 150.0 MT | Site: Jeddah Plant")
        
        new_rfq = models.RFQ(
            rfq_number=rfq_num,
            project_name="PVC Resin Urgent Supply Campaign",
            department="Procurement",
            required_date=(datetime.now() + timedelta(days=20)).date(),
            item_name="PVC Resin K-67",
            item_code="ITM-RAW-PVC-K67",
            description="Premium PVC Resin K-67 for extruding operations. High viscosity requested.",
            quantity=150.0,
            unit="MT",
            specifications="K-Value: 67, Apparent Density: 0.55 g/ml, Volatiles < 0.3%",
            priority="High",
            delivery_location="Jeddah Plant",
            expected_delivery_date=(datetime.now() + timedelta(days=18)).date(),
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
        print_info("Checking warehouse stock levels for PVC Resin...")
        
        # Get or seed PVC Resin inventory stock
        pvc_inv = db.query(models.InventoryItem).filter(models.InventoryItem.item_name == "PVC Resin").first()
        if not pvc_inv:
            pvc_inv = models.InventoryItem(item_name="PVC Resin", stock_level=85.0, min_safety_stock=50.0, unit="MT")
            db.add(pvc_inv)
            db.commit()
            
        print_info(f"Warehouse Inventory State: Stock = {pvc_inv.stock_level} MT | Min Safety Stock = {pvc_inv.min_safety_stock} MT")
        stock_deficit = 150.0 - (pvc_inv.stock_level - pvc_inv.min_safety_stock)
        print_warning(f"Calculated Deficit: {stock_deficit} MT. Sourcing check PASSED (deficit confirmed).")
        
        # Matching suppliers
        suppliers = db.query(models.Supplier).filter(models.Supplier.name.in_(["SABIC Polymers", "Tasnee", "Oman Resin Co."])).all()
        if not suppliers or len(suppliers) < 3:
            # Re-seed if needed
            print_warning("Required suppliers not found, seeding standard supplier dataset...")
            from seed import seed_database
            seed_database()
            suppliers = db.query(models.Supplier).filter(models.Supplier.name.in_(["SABIC Polymers", "Tasnee", "Oman Resin Co."])).all()
            
        print_info("Sourcing algorithm matched the following eligible vendors:")
        for s in suppliers:
            print_info(f" - {s.name} (Rating: {s.rating}/5, Country: {s.country}, Risk: {s.risk_level})")
            
        db.add(models.RFQTimeline(
            rfq_number=rfq_num,
            stage="Created",
            timestamp=datetime.utcnow() + timedelta(seconds=2),
            details=f"Warehouse inventory checked. Deficit confirmed. Matched {len(suppliers)} suppliers: " + ", ".join([s.name for s in suppliers])
        ))
        db.commit()
        
        print_success("Inventory audit complete & suppliers successfully mapped.")
        print(f"{BOLD}[INFO] FRONTEND VIEW:{RESET} Go to {BOLD}Autonomous AI Agent{RESET} tab, select this RFQ. The milestones stepper will display Step 1 (Parsing), Step 2 (Inventory Audit), and Step 3 (Supplier Matching) as completed.")
        
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
            details="RFQ outreach emails dispatched via API to SABIC, Tasnee, and Oman Resin."
        ))
        
        # Log outreach in email history
        for s in suppliers:
            db.add(models.EmailHistory(
                rfq_number=rfq_num,
                supplier_id=s.id,
                subject=f"RFQ Invitation: PVC Resin K-67 - {rfq_num}",
                body=f"Dear {s.name} Sales Team, we invite you to quote for 150 MT of PVC Resin K-67...",
                type="RFQ Invitation",
                sent_at=datetime.utcnow(),
                response_received=False
            ))
        db.commit()
        
        print_success("Outreach emails logged and campaign transitioned to 'RFQ Sent'.")
        print(f"{BOLD}[INFO] FRONTEND VIEW:{RESET} Look at the {BOLD}Autonomous AI Agent{RESET} page logs console. The campaign is now marked active and emails are shown in dispatch log.")
        
        wait_for_user()
        
        # ----------------------------------------------------
        # STEP 4: Live Multi-Round Negotiation Simulation
        # ----------------------------------------------------
        print_step(4, "LIVE NEGOTIATION LOOP SIMULATION")
        print_info("Simulating incoming vendor responses and autonomous AI counter-offers...")
        
        sabic = [s for s in suppliers if s.name == "SABIC Polymers"][0]
        tasnee = [s for s in suppliers if s.name == "Tasnee"][0]
        oman = [s for s in suppliers if s.name == "Oman Resin Co."][0]
        
        # --- ROUND 1 ---
        print(f"\n{BOLD}--- Round 1 ---{RESET}")
        print_info("SABIC quotes $1,050/MT, lead time 12 days.")
        print_info("Tasnee quotes $1,080/MT, lead time 10 days.")
        print_info("Oman Resin quotes $1,110/MT, lead time 9 days.")
        
        now = datetime.utcnow()
        r1_logs = [
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=sabic.id, supplier_email=sabic.email, round_number=1, direction="inbound", subject="Re: RFQ Invitation", body="We quote $1050/MT, 12 days lead time.", extracted_price=1050.0, extracted_currency="USD", extracted_lead_time=12, sent_at=now, reply_received=True),
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=tasnee.id, supplier_email=tasnee.email, round_number=1, direction="inbound", subject="Re: RFQ Invitation", body="We can offer $1080/MT, 10 days delivery.", extracted_price=1080.0, extracted_currency="USD", extracted_lead_time=10, sent_at=now, reply_received=True),
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=oman.id, supplier_email=oman.email, round_number=1, direction="inbound", subject="Re: RFQ Invitation", body="Our price is $1110/MT, 9 days lead time.", extracted_price=1110.0, extracted_currency="USD", extracted_lead_time=9, sent_at=now, reply_received=True),
        ]
        for l in r1_logs:
            db.add(l)
        db.commit()
        
        print_info("AI dispatches Counter-Offers targeting 10% discount:")
        print_info(" -> SABIC Target: $945/MT | Tasnee Target: $972/MT | Oman Resin Target: $999/MT")
        
        r1_outbounds = [
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=sabic.id, supplier_email=sabic.email, round_number=1, direction="outbound", subject="RE: RFQ Response", body="Thank you. We are targeting $945/MT for this quantity. Can you match?", extracted_price=945.0, extracted_currency="USD", sent_at=now + timedelta(seconds=1)),
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=tasnee.id, supplier_email=tasnee.email, round_number=1, direction="outbound", subject="RE: RFQ Response", body="Thank you. We are targeting $972/MT. Please let us know if possible.", extracted_price=972.0, extracted_currency="USD", sent_at=now + timedelta(seconds=1)),
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=oman.id, supplier_email=oman.email, round_number=1, direction="outbound", subject="RE: RFQ Response", body="Thank you. We are targeting $999/MT. Can you adjust price?", extracted_price=999.0, extracted_currency="USD", sent_at=now + timedelta(seconds=1)),
        ]
        for l in r1_outbounds:
            db.add(l)
        db.commit()
        
        # --- ROUND 2 ---
        print(f"\n{BOLD}--- Round 2 ---{RESET}")
        print_info("SABIC offers revised $980/MT, lead time 10 days (Best & Final Offer).")
        print_info("Tasnee offers revised $1,010/MT, lead time 8 days.")
        print_info("Oman Resin declines discount and stays at $1,110/MT.")
        
        r2_logs = [
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=sabic.id, supplier_email=sabic.email, round_number=2, direction="inbound", subject="Re: RFQ Target Price", body="We accept $980/MT as our final best offer, Net 45 Days, 10 days delivery.", extracted_price=980.0, extracted_currency="USD", extracted_lead_time=10, sent_at=now + timedelta(seconds=2), reply_received=True, is_final=True),
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=tasnee.id, supplier_email=tasnee.email, round_number=2, direction="inbound", subject="Re: RFQ Target Price", body="We can go down to $1010/MT with 8 days lead time.", extracted_price=1010.0, extracted_currency="USD", extracted_lead_time=8, sent_at=now + timedelta(seconds=2), reply_received=True),
            models.NegotiationLog(rfq_number=rfq_num, supplier_id=oman.id, supplier_email=oman.email, round_number=2, direction="inbound", subject="Re: RFQ Target Price", body="We cannot offer any further discount. Price is firm.", extracted_price=1110.0, extracted_currency="USD", extracted_lead_time=9, sent_at=now + timedelta(seconds=2), reply_received=True, is_final=True),
        ]
        for l in r2_logs:
            db.add(l)
        db.commit()
        
        # Save Quote Responses
        db.add(models.QuoteResponse(rfq_number=rfq_num, supplier_id=sabic.id, price=980.0, currency="USD", lead_time_days=10, payment_terms="Net 45 Days", incoterms="CIF", responded_at=datetime.utcnow(), status="Quotation Received"))
        db.add(models.QuoteResponse(rfq_number=rfq_num, supplier_id=tasnee.id, price=1010.0, currency="USD", lead_time_days=8, payment_terms="Net 30 Days", incoterms="FOB", responded_at=datetime.utcnow(), status="Quotation Received"))
        db.add(models.QuoteResponse(rfq_number=rfq_num, supplier_id=oman.id, price=1110.0, currency="USD", lead_time_days=9, payment_terms="Net 45 Days", incoterms="CIF", responded_at=datetime.utcnow(), status="Quotation Received"))
        
        # Update RFQ status to Under Comparison
        new_rfq.status = "Under Comparison"
        
        # Add Timeline event
        db.add(models.RFQTimeline(
            rfq_number=rfq_num,
            stage="Supplier Responded",
            timestamp=datetime.utcnow() + timedelta(seconds=10),
            details="All quotes received and negotiated. Final offers locked for comparison."
        ))
        
        # Generate the WorkflowNotification card (Pending Approval)
        comparison_data = [
            {"supplier_id": sabic.id, "supplier_name": sabic.name, "price": 980.0, "currency": "USD", "lead_time_days": 10, "payment_terms": "Net 45 Days", "rating": sabic.rating, "delivery_score": sabic.delivery_score, "risk_level": sabic.risk_level, "status": "Best Offer"},
            {"supplier_id": tasnee.id, "supplier_name": tasnee.name, "price": 1010.0, "currency": "USD", "lead_time_days": 8, "payment_terms": "Net 30 Days", "rating": tasnee.rating, "delivery_score": tasnee.delivery_score, "risk_level": tasnee.risk_level, "status": "Matched"},
            {"supplier_id": oman.id, "supplier_name": oman.name, "price": 1110.0, "currency": "USD", "lead_time_days": 9, "payment_terms": "Net 45 Days", "rating": oman.rating, "delivery_score": oman.delivery_score, "risk_level": oman.risk_level, "status": "High Price"}
        ]
        
        summary_msg = (
            "AI has successfully completed 2 negotiation rounds. "
            "SABIC Polymers is recommended for award, offering the lowest final negotiated price of $980/MT "
            "(6.7% savings from original $1050 quote). This out-performs Tasnee ($1010/MT) and Oman Resin ($1110/MT). "
            "SABIC maintains low risk levels and conforms to plant delivery constraints. "
            "Action Required: Approve this proposal to generate the Purchase Order and sync to Odoo ERP."
        )
        
        notification = models.WorkflowNotification(
            rfq_number=rfq_num,
            rfq_item="PVC Resin K-67",
            type="approval_required",
            status="pending",
            recommended_supplier=sabic.name,
            recommended_price=980.0,
            recommended_currency="USD",
            comparison_json=json.dumps(comparison_data),
            summary_message=summary_msg,
            notification_email_sent=True,
            created_at=datetime.utcnow()
        )
        db.add(notification)
        db.commit()
        
        print_success("Negotiations logged & Comparison Table populated with AI recommendation.")
        print(f"{BOLD}[INFO] FRONTEND VIEW:{RESET} Go to {BOLD}Operations Dashboard{RESET}. You will see a 'Pending Approval' card for PVC Resin K-67.")
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
            supplier_id=sabic.id,
            item_name="PVC Resin K-67",
            quantity=150.0,
            unit_price=980.0,
            total_amount=150.0 * 980.0,
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
            details=f"Purchase Order {po_num} approved and released to SABIC Polymers."
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
                    partner_ids = models_rpc.execute_kw(db_name, uid, password, 'res.partner', 'search', [[['name', '=', 'SABIC Polymers']]])
                    partner_id = partner_ids[0] if partner_ids else None
                    product_ids = models_rpc.execute_kw(db_name, uid, password, 'product.product', 'search', [[['name', '=', 'PVC Resin K-67']]])
                    product_id = product_ids[0] if product_ids else None
                    
                    if partner_id and product_id:
                        po_data = {
                            'partner_id': partner_id,
                            'origin': rfq_num,
                            'order_line': [
                                (0, 0, {
                                    'name': 'PVC Resin K-67',
                                    'product_id': product_id,
                                    'product_qty': 150.0,
                                    'price_unit': 980.0,
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
            request_payload=json.dumps({"partner": "SABIC Polymers", "item": "PVC Resin K-67", "qty": 150.0, "price": 980.0}),
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
