import os
import sys
import re
import time
import smtplib
import imaplib
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Ensure backend directory is in path
sys.path.append(os.path.dirname(__file__))

load_dotenv()

# SMTP & IMAP details
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = os.getenv("SMTP_PORT", "587")
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

IMAP_SERVER = os.getenv("IMAP_SERVER", "imap.gmail.com")
IMAP_PORT = os.getenv("IMAP_PORT", "993")
IMAP_USERNAME = os.getenv("IMAP_USERNAME")
IMAP_PASSWORD = os.getenv("IMAP_PASSWORD")

def test_smtp_connection():
    print("\n--- [1] Checking SMTP Connection Settings ---")
    if not SMTP_USERNAME or not SMTP_PASSWORD or "YOUR_" in SMTP_USERNAME:
        print("[FAIL] SMTP credentials are not configured in your .env file!")
        return False
    try:
        print(f"Connecting to SMTP Server: {SMTP_SERVER}:{SMTP_PORT}...")
        server = smtplib.SMTP(SMTP_SERVER, int(SMTP_PORT), timeout=10)
        server.starttls()
        print(f"Logging in as {SMTP_USERNAME}...")
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.close()
        print("[OK] SMTP connection and login successful!")
        return True
    except Exception as e:
        print(f"[FAIL] SMTP Connection failed: {e}")
        return False

def test_imap_connection():
    print("\n--- [2] Checking IMAP Connection Settings ---")
    if not IMAP_USERNAME or not IMAP_PASSWORD or "YOUR_" in IMAP_USERNAME:
        print("[FAIL] IMAP credentials are not configured in your .env file!")
        return False
    try:
        print(f"Connecting to IMAP Server: {IMAP_SERVER}:{IMAP_PORT}...")
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, int(IMAP_PORT), timeout=10)
        print(f"Logging in as {IMAP_USERNAME}...")
        mail.login(IMAP_USERNAME, IMAP_PASSWORD)
        mail.logout()
        print("[OK] IMAP connection and login successful!")
        return True
    except Exception as e:
        print(f"[FAIL] IMAP Connection failed: {e}")
        return False

def setup_test_data(tester_email):
    print("\n--- [3] Setting up Test Suppliers and RFQ ---")
    from database import SessionLocal
    import models
    db = SessionLocal()
    
    rfq_num = "RFQ-2026-TEST-AUTO"
    
    try:
        # Create/retrieve 4 distinct suppliers for complete category coverage
        
        # 1. Preferred Supplier (Linked to tester_email for self-negotiation capability)
        supplier_pref = db.query(models.Supplier).filter(models.Supplier.name == "Auto-Negotiator Preferred Lab").first()
        if not supplier_pref:
            print("Creating 'Auto-Negotiator Preferred Lab' (Preferred)...")
            supplier_pref = models.Supplier(
                name="Auto-Negotiator Preferred Lab",
                country="Saudi Arabia",
                email=tester_email,
                phone="+966 50 111 2222",
                rating=4.8,
                lead_time_days=9,
                preferred=True,
                quality_score=98.0,
                delivery_score=95.0,
                price_competitiveness=85.0,
                risk_level="Low",
                products="PVC Resin K-67",
                categories="Raw Polymers",
                synced_to_erp=True,
                erp_vendor_id="ERP-PREF-VERIFY"
            )
            db.add(supplier_pref)
            db.flush()
        else:
            supplier_pref.email = tester_email
            supplier_pref.preferred = True
            supplier_pref.synced_to_erp = True
            db.flush()
            
        # 2. Previously Used Supplier
        supplier_prev = db.query(models.Supplier).filter(models.Supplier.name == "Auto-Negotiator Historical Lab").first()
        if not supplier_prev:
            print("Creating 'Auto-Negotiator Historical Lab' (Previously Used)...")
            supplier_prev = models.Supplier(
                name="Auto-Negotiator Historical Lab",
                country="Oman",
                email="historical.supplier@procurex.com",
                phone="+968 24 333 4444",
                rating=4.5,
                lead_time_days=11,
                preferred=False,
                quality_score=92.0,
                delivery_score=90.0,
                price_competitiveness=80.0,
                risk_level="Low",
                products="PVC Resin K-67",
                categories="Raw Polymers",
                synced_to_erp=True,
                erp_vendor_id="ERP-HIST-VERIFY"
            )
            db.add(supplier_prev)
            db.flush()
        else:
            supplier_prev.preferred = False
            supplier_prev.synced_to_erp = True
            db.flush()
            
        # 3. Other Approved Supplier
        supplier_app = db.query(models.Supplier).filter(models.Supplier.name == "Auto-Negotiator Approved Lab").first()
        if not supplier_app:
            print("Creating 'Auto-Negotiator Approved Lab' (Other Approved)...")
            supplier_app = models.Supplier(
                name="Auto-Negotiator Approved Lab",
                country="United Arab Emirates",
                email="approved.supplier@procurex.com",
                phone="+971 4 555 6666",
                rating=4.4,
                lead_time_days=12,
                preferred=False,
                quality_score=90.0,
                delivery_score=88.0,
                price_competitiveness=82.0,
                risk_level="Low",
                products="PVC Resin K-67",
                categories="Raw Polymers",
                synced_to_erp=True,
                erp_vendor_id="ERP-APP-VERIFY"
            )
            db.add(supplier_app)
            db.flush()
        else:
            supplier_app.preferred = False
            supplier_app.synced_to_erp = True
            db.flush()
            
        # 4. New Supplier Candidate
        supplier_cand = db.query(models.Supplier).filter(models.Supplier.name == "Auto-Negotiator Candidate Lab").first()
        if not supplier_cand:
            print("Creating 'Auto-Negotiator Candidate Lab' (New Candidate)...")
            supplier_cand = models.Supplier(
                name="Auto-Negotiator Candidate Lab",
                country="India",
                email="candidate.supplier@procurex.com",
                phone="+91 22 7777 8888",
                rating=4.2,
                lead_time_days=15,
                preferred=False,
                quality_score=85.0,
                delivery_score=85.0,
                price_competitiveness=90.0,
                risk_level="Medium",
                products="PVC Resin K-67",
                categories="Raw Polymers",
                synced_to_erp=False,
                erp_vendor_id=None
            )
            db.add(supplier_cand)
            db.flush()
        else:
            supplier_cand.preferred = False
            supplier_cand.synced_to_erp = False
            supplier_cand.erp_vendor_id = None
            db.flush()
            
        # Clean any old test records for this RFQ including dependents
        db.query(models.NegotiationLog).filter(models.NegotiationLog.rfq_number == rfq_num).delete(synchronize_session=False)
        db.query(models.WorkflowNotification).filter(models.WorkflowNotification.rfq_number == rfq_num).delete(synchronize_session=False)
        db.query(models.QuoteResponse).filter(models.QuoteResponse.rfq_number == rfq_num).delete(synchronize_session=False)
        db.query(models.RFQTimeline).filter(models.RFQTimeline.rfq_number == rfq_num).delete(synchronize_session=False)
        db.query(models.EmailHistory).filter(models.EmailHistory.rfq_number == rfq_num).delete(synchronize_session=False)
        
        # Cascading delete of POs and invoices/receipts referencing them
        pos = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.rfq_number == rfq_num).all()
        po_numbers = [p.po_number for p in pos]
        if po_numbers:
            invoices = db.query(models.InvoiceMatch).filter(models.InvoiceMatch.po_number.in_(po_numbers)).all()
            invoice_numbers = [inv.invoice_number for inv in invoices]
            if invoice_numbers:
                db.query(models.PaymentVoucher).filter(models.PaymentVoucher.invoice_number.in_(invoice_numbers)).delete(synchronize_session=False)
            db.query(models.InvoiceMatch).filter(models.InvoiceMatch.po_number.in_(po_numbers)).delete(synchronize_session=False)
            db.query(models.GoodsReceiptNote).filter(models.GoodsReceiptNote.po_number.in_(po_numbers)).delete(synchronize_session=False)
            db.query(models.PurchaseOrder).filter(models.PurchaseOrder.rfq_number == rfq_num).delete(synchronize_session=False)
            
        db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_num).delete(synchronize_session=False)
        db.commit()
        
        # Insert historical PO for Previously Used Supplier
        hist_rfq_num = "RFQ-HIST-DUMMY"
        db.query(models.PurchaseOrder).filter(models.PurchaseOrder.rfq_number == hist_rfq_num).delete()
        db.query(models.RFQ).filter(models.RFQ.rfq_number == hist_rfq_num).delete()
        db.commit()
        
        hist_rfq = models.RFQ(
            rfq_number=hist_rfq_num,
            project_name="Historical Project",
            department="Procurement",
            required_date=(datetime.now() - timedelta(days=60)).date(),
            item_name="PVC Resin K-67",
            item_code="ITM-RAW-PVC-K67",
            quantity=50.0,
            unit="MT",
            status="Completed"
        )
        db.add(hist_rfq)
        db.flush()
        
        hist_po = models.PurchaseOrder(
            po_number="PO-HIST-DUMMY",
            rfq_number=hist_rfq_num,
            supplier_id=supplier_prev.id,
            item_name="PVC Resin K-67",
            quantity=50.0,
            unit_price=1350.00,
            total_amount=67500.00,
            status="Completed"
        )
        db.add(hist_po)
        db.flush()
        
        # Create fresh RFQ
        print(f"Creating fresh test RFQ '{rfq_num}' for PVC Resin K-67...")
        rfq = models.RFQ(
            rfq_number=rfq_num,
            project_name="Auto-Negotiation Test Project",
            department="Procurement",
            required_date=(datetime.now() + timedelta(days=30)).date(),
            item_name="PVC Resin K-67",
            item_code="ITM-RAW-9999",
            description="Premium PVC Resin K-67 for ProcureX Copilot Automation validation.",
            quantity=100.0,
            unit="MT",
            specifications="K-Value 67, Apparent Density 0.55 g/ml",
            priority="High",
            delivery_location="Jeddah Plant",
            expected_delivery_date=(datetime.now() + timedelta(days=25)).date(),
            status="Created",
            created_at=datetime.utcnow()
        )
        db.add(rfq)
        
        # Add initial timeline
        db.add(models.RFQTimeline(
            rfq_number=rfq_num,
            stage="Created",
            timestamp=datetime.utcnow(),
            details="RFQ created specifically for automated negotiation testing."
        ))
        
        db.commit()
        print("[OK] Database test records set up successfully.")
        return rfq_num, {
            "preferred": supplier_pref.id,
            "previously_used": supplier_prev.id,
            "other_approved": supplier_app.id,
            "new_candidate": supplier_cand.id
        }
    except Exception as e:
        db.rollback()
        print(f"[FAIL] Failed to set up database test records: {e}")
        raise e
    finally:
        db.close()

def run_real_test(rfq_num, suppliers_dict, tester_email):
    print("\n--- [4] Running Interactive Real Email Test ---")
    from database import SessionLocal
    import models
    from automation_engine import send_real_email_direct, check_and_process_emails
    
    db = SessionLocal()
    try:
        preferred_supplier_id = suppliers_dict["preferred"]
        supplier = db.query(models.Supplier).filter(models.Supplier.id == preferred_supplier_id).first()
        rfq = db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_num).first()
        
        subject = f"Inquiry: RFQ for PVC Resin K-67 - {rfq_num}"
        body = (
            f"Dear {supplier.name} Sales Team,\n\n"
            f"We are pleased to invite you to submit your quotation for {rfq.item_name} under RFQ reference {rfq.rfq_number}.\n\n"
            f"Details:\n"
            f"- Item: {rfq.item_name}\n"
            f"- Quantity: {rfq.quantity} {rfq.unit}\n"
            f"- Delivery Location: {rfq.delivery_location}\n"
            f"- Required Delivery Date: {rfq.expected_delivery_date}\n\n"
            f"Best regards,\n"
            f"ProcureX Agent\n"
            f"ProcureX Co."
        )
        
        print(f"Sending real RFQ invitation to '{tester_email}' from '{SMTP_USERNAME}'...")
        sent = send_real_email_direct(tester_email, subject, body)
        
        if not sent:
            print("[FAIL] Failed to send initial outreach email! Check your SMTP credentials.")
            return
        
        # Log invitation
        db.add(models.EmailHistory(
            rfq_number=rfq_num,
            supplier_id=preferred_supplier_id,
            subject=subject,
            body=body,
            type="RFQ Invitation",
            sent_at=datetime.utcnow(),
            response_received=False
        ))
        rfq.status = "RFQ Sent"
        db.add(models.RFQTimeline(
            rfq_number=rfq_num,
            stage="RFQ Sent",
            timestamp=datetime.utcnow(),
            details=f"RFQ invitation emailed to {supplier.name} ({tester_email})."
        ))
        db.commit()
        print("[OK] Initial RFQ Invitation email sent successfully!")
        
        print("\n" + "="*70)
        print("--> ACTION REQUIRED FOR TESTER:")
        print(f"1. Check your inbox at: {tester_email}")
        print(f"2. Open the email with subject: '{subject}'")
        print(f"3. Click REPLY and send an email containing a price proposal.")
        print("   Example reply body:")
        print("   \"Hello, we can supply this at USD 1350 per MT with 8 days lead time. Net 30 terms.\"")
        print(f"4. Send the reply to the Agent address: {IMAP_USERNAME}")
        print("="*70)
        
        input("\nPress Enter once you have sent your reply email from your client...")
        print("\nWaiting 10 seconds for the email to land in your inbox...")
        time.sleep(10)
        
        print("Triggering IMAP check to read and process your reply...")
        check_and_process_emails(db)
        
        # Seed the other three suppliers' quotes so they all show up in comparison!
        print("Seeding other category suppliers for comparison...")
        prices = {"previously_used": 1300.00, "other_approved": 1280.00, "new_candidate": 1200.00}
        lead_times = {"previously_used": 9, "other_approved": 10, "new_candidate": 13}
        for category, s_id in [("previously_used", suppliers_dict["previously_used"]), 
                               ("other_approved", suppliers_dict["other_approved"]), 
                               ("new_candidate", suppliers_dict["new_candidate"])]:
            quote_other = models.QuoteResponse(
                rfq_number=rfq_num,
                supplier_id=s_id,
                price=prices[category],
                currency="USD",
                moq=10.0,
                lead_time_days=lead_times[category],
                payment_terms="Net 45 Days",
                incoterms="CIF",
                responded_at=datetime.utcnow(),
                status="Quotation Received"
            )
            db.add(quote_other)
        db.commit()
        
        # Check logs
        print("\n--- Verifying Database Changes ---")
        logs = db.query(models.NegotiationLog).filter(models.NegotiationLog.rfq_number == rfq_num).all()
        print(f"Found {len(logs)} negotiation log entries for {rfq_num}:")
        for l in logs:
            print(f"- Round {l.round_number} | {l.direction.upper()} | Price: {l.extracted_currency} {l.extracted_price} | Subject: {l.subject}")
            
        # Re-run comparison to build final card
        from automation_engine import run_comparison_and_notify
        run_comparison_and_notify(db, rfq_num)
        
        notifications = db.query(models.WorkflowNotification).filter(models.WorkflowNotification.rfq_number == rfq_num).all()
        if notifications:
            print(f"\n[OK] ProcureX Agent successfully completed negotiation cycles and generated a dashboard comparison approval request!")
        else:
            print(f"\n[INFO] IMAP check completed. Keep checking / replying to advance through negotiation rounds (current rounds: {len(logs)//2})")
            
    except Exception as e:
        print(f"[FAIL] Error during real test execution: {e}")
    finally:
        db.close()

def run_simulation_test(rfq_num, suppliers_dict, tester_email):
    print("\n--- [4] Running Programmatic Simulation (No real emails) ---")
    print("No real emails will be sent. Running pure database/LLM transitions for ALL 4 categories.")
    from database import SessionLocal
    import models
    from automation_engine import generate_ai_counter_offer, run_comparison_and_notify
    
    db = SessionLocal()
    try:
        rfq = db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_num).first()
        
        prices = {
            "preferred": 1450.00,
            "previously_used": 1400.00,
            "other_approved": 1380.00,
            "new_candidate": 1300.00
        }
        
        final_prices = {
            "preferred": 1350.00,
            "previously_used": 1300.00,
            "other_approved": 1280.00,
            "new_candidate": 1200.00
        }
        
        lead_times = {
            "preferred": 8,
            "previously_used": 10,
            "other_approved": 11,
            "new_candidate": 14
        }
        
        for category, s_id in suppliers_dict.items():
            supplier = db.query(models.Supplier).filter(models.Supplier.id == s_id).first()
            print(f"\nSimulating negotiation for {supplier.name} ({category})...")
            
            # 1. Outreach
            db.add(models.EmailHistory(
                rfq_number=rfq_num,
                supplier_id=s_id,
                subject=f"Inquiry: RFQ for PVC Resin K-67 - {rfq_num}",
                body=f"Simulated outreach invitation to {supplier.name}",
                type="RFQ Invitation",
                sent_at=datetime.utcnow() - timedelta(hours=5),
                response_received=True
            ))
            
            # 2. Round 1 Supplier Response
            inbound_1 = models.NegotiationLog(
                rfq_number=rfq_num,
                supplier_id=s_id,
                supplier_email=supplier.email,
                round_number=1,
                direction="inbound",
                subject=f"Re: Inquiry: RFQ for PVC Resin K-67 - {rfq_num}",
                body=f"We can supply at USD {prices[category]}/MT, lead time {lead_times[category]} days.",
                extracted_price=prices[category],
                extracted_currency="USD",
                extracted_lead_time=lead_times[category],
                sent_at=datetime.utcnow() - timedelta(hours=4),
                reply_received=True
            )
            db.add(inbound_1)
            db.commit()
            
            # 3. AI Counter-Offer
            offer = generate_ai_counter_offer(rfq.item_name, supplier.name, prices[category], "USD", 1)
            print(f"   Target Price generated by AI: USD {offer['target_price']}")
            
            outbound_1 = models.NegotiationLog(
                rfq_number=rfq_num,
                supplier_id=s_id,
                supplier_email=supplier.email,
                round_number=1,
                direction="outbound",
                subject=f"RE: Inquiry: RFQ for PVC Resin K-67 - {rfq_num}",
                body=offer["body"],
                extracted_price=offer["target_price"],
                extracted_currency="USD",
                extracted_lead_time=lead_times[category],
                sent_at=datetime.utcnow() - timedelta(hours=3),
                reply_received=True
            )
            db.add(outbound_1)
            db.commit()
            
            # 4. Round 2 Supplier Response (Final)
            inbound_2 = models.NegotiationLog(
                rfq_number=rfq_num,
                supplier_id=s_id,
                supplier_email=supplier.email,
                round_number=2,
                direction="inbound",
                subject=f"Re: Inquiry: RFQ for PVC Resin K-67 - {rfq_num}",
                body=f"We accept the counter offer but our final best offer is USD {final_prices[category]}/MT.",
                extracted_price=final_prices[category],
                extracted_currency="USD",
                extracted_lead_time=lead_times[category] - 1,
                sent_at=datetime.utcnow() - timedelta(hours=2),
                reply_received=True,
                is_final=True
            )
            db.add(inbound_2)
            
            # Save QuoteResponse
            quote = models.QuoteResponse(
                rfq_number=rfq_num,
                supplier_id=s_id,
                price=final_prices[category],
                currency="USD",
                moq=10.0,
                lead_time_days=lead_times[category] - 1,
                payment_terms="Net 30 Days",
                incoterms="CIF",
                responded_at=datetime.utcnow(),
                status="Quotation Received"
            )
            db.add(quote)
            db.commit()
            
        print("5. Triggering AI Comparison Analysis & Management Summary Notification...")
        run_comparison_and_notify(db, rfq_num)
        
        # Verify
        notification = db.query(models.WorkflowNotification).filter(models.WorkflowNotification.rfq_number == rfq_num).first()
        if notification:
            print("\n[OK] Simulation Completed Successfully!")
            print("Summary of ProcureX Recommendation:")
            print(f"- Recommended Vendor: {notification.recommended_supplier}")
            print(f"- Negotiated Price: {notification.recommended_currency} {notification.recommended_price}")
            print(f"- Message: {notification.summary_message}")
        else:
            print("[FAIL] Simulation failed to generate a notification card.")
            
    except Exception as e:
        db.rollback()
        print(f"[FAIL] Error during simulation: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("=================================================================")
    print("      PROCUREX COPILOT: AUTOMATION AGENT WORKFLOW TESTER     ")
    print("=================================================================")
    
    smtp_ok = test_smtp_connection()
    imap_ok = test_imap_connection()
    
    print("\n--- Test Mode Selection ---")
    print("1. Real Interactive Email Mode (Send real email, wait for reply, poll and negotiate)")
    print("2. Programmatic Simulation Mode (Run entire negotiation logic locally without sending mail)")
    choice = input("Select mode (1 or 2): ").strip()
    
    tester_email = os.getenv("ODOO_USERNAME", "sathinath.padhi@petabytz.com")
    custom_email = input(f"Enter tester email address to receive RFQs [default: {tester_email}]: ").strip()
    if custom_email:
        tester_email = custom_email
        
    try:
        rfq_num, suppliers_dict = setup_test_data(tester_email)
        
        if choice == "1":
            if not smtp_ok or not imap_ok:
                print("\n[WARNING] SMTP/IMAP check failed. Real email mode requires valid credentials.")
                proceed = input("Do you still want to try sending? (y/n): ").strip().lower()
                if proceed != 'y':
                    sys.exit(1)
            run_real_test(rfq_num, suppliers_dict, tester_email)
        else:
            run_simulation_test(rfq_num, suppliers_dict, tester_email)
            
    except KeyboardInterrupt:
        print("\nTest cancelled by user.")
    except Exception as err:
        print(f"\nExecution error: {err}")
