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

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

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

def force_email_unseen(rfq_num):
    """Utility to force matching emails in inbox to UNREAD so the agent detects them."""
    if not IMAP_USERNAME or not IMAP_PASSWORD:
        return
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, int(IMAP_PORT))
        mail.login(IMAP_USERNAME, IMAP_PASSWORD)
        mail.select("inbox")
        
        status, response = mail.search(None, f'(SUBJECT "{rfq_num}")')
        if status == 'OK' and response[0]:
            email_ids = response[0].split()
            print(f"[INFO] Found {len(email_ids)} matching emails for {rfq_num}. Marking as UNSEEN...")
            for e_id in email_ids:
                mail.store(e_id, '-FLAGS', '\\Seen')
            print("[OK] Marked matching emails as UNSEEN.")
        else:
            print("[INFO] No matching emails found to mark UNREAD.")
            
        mail.close()
        mail.logout()
    except Exception as e:
        print(f"[WARNING] Failed to force email to UNREAD: {e}")

def setup_test_records(tester_email):
    print("\n--- [3] Setting up Test Suppliers and RFQ ---")
    from database import SessionLocal
    import models
    db = SessionLocal()
    
    rfq_num = "RFQ-2026-999"
    
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
            
        # Clean any old test records for this RFQ
        db.query(models.PurchaseOrder).filter(models.PurchaseOrder.rfq_number == rfq_num).delete()
        db.query(models.NegotiationLog).filter(models.NegotiationLog.rfq_number == rfq_num).delete()
        db.query(models.WorkflowNotification).filter(models.WorkflowNotification.rfq_number == rfq_num).delete()
        db.query(models.QuoteResponse).filter(models.QuoteResponse.rfq_number == rfq_num).delete()
        db.query(models.RFQTimeline).filter(models.RFQTimeline.rfq_number == rfq_num).delete()
        db.query(models.EmailHistory).filter(models.EmailHistory.rfq_number == rfq_num).delete()
        db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_num).delete()
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
            project_name="AI Workflow Verification",
            department="Procurement",
            required_date=(datetime.now() + timedelta(days=30)).date(),
            item_name="PVC Resin K-67",
            item_code="ITM-RAW-PVC-K67",
            description="PVC Resin K-67 for validation of AI outreach and negotiations.",
            quantity=100.0,
            unit="MT",
            specifications="K-Value 67",
            priority="High",
            delivery_location="Dammam Plant",
            expected_delivery_date=(datetime.now() + timedelta(days=25)).date(),
            status="Created",
            created_at=datetime.utcnow()
        )
        db.add(rfq)
        
        db.add(models.RFQTimeline(
            rfq_number=rfq_num,
            stage="Created",
            timestamp=datetime.utcnow(),
            details="RFQ created specifically for verification script."
        ))
        
        db.commit()
        print("[OK] Test RFQ and Suppliers set up in database.")
        return rfq_num, {
            "preferred": supplier_pref.id,
            "previously_used": supplier_prev.id,
            "other_approved": supplier_app.id,
            "new_candidate": supplier_cand.id
        }
    except Exception as e:
        db.rollback()
        print(f"[FAIL] Database setup failed: {e}")
        raise e
    finally:
        db.close()

def run_self_negotiation_workflow(rfq_num, suppliers_dict):
    print("\n--- [4] Starting Fully Automated Self-Negotiation Workflow ---")
    print("This mode acts as both the ProcureX Agent and the Supplier using your credentials.")
    from database import SessionLocal
    import models
    from automation_engine import send_real_email_direct, check_and_process_emails
    
    db = SessionLocal()
    try:
        preferred_supplier_id = suppliers_dict["preferred"]
        supplier = db.query(models.Supplier).filter(models.Supplier.id == preferred_supplier_id).first()
        rfq = db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_num).first()
        
        # 1. Outreach from Agent to Supplier (which is IMAP_USERNAME)
        subject = f"Inquiry: RFQ for PVC Resin K-67 - {rfq_num}"
        body = (
            f"Dear {supplier.name} Sales Team,\n\n"
            f"We are pleased to invite you to submit your quotation for {rfq.item_name} under RFQ reference {rfq.rfq_number}.\n\n"
            f"Details:\n"
            f"- Item: {rfq.item_name}\n"
            f"- Quantity: {rfq.quantity} {rfq.unit}\n"
            f"- Delivery Location: {rfq.delivery_location}\n"
            f"- Required Delivery Date: {rfq.expected_delivery_date}\n\n"
            f"Please reply directly to this email with your pricing and lead time to proceed.\n\n"
            f"Best regards,\n"
            f"ProcureX Agent\n"
            f"ProcureX Co."
        )
        
        print(f"Step 1: Sending initial outreach email from Agent to Supplier ({supplier.email})...")
        success = send_real_email_direct(supplier.email, subject, body)
        if not success:
            print("[FAIL] Could not send outreach email. Aborting self-negotiation.")
            return False
            
        db.add(models.EmailHistory(
            rfq_number=rfq_num,
            supplier_id=preferred_supplier_id,
            subject=subject,
            body=body,
            type="RFQ Invitation",
            sent_at=datetime.utcnow()
        ))
        rfq.status = "RFQ Sent"
        db.commit()
        print("[OK] Outreach email sent successfully!")
        
        # Wait for delivery
        print("Waiting 10 seconds for email delivery...")
        time.sleep(10)
        
        # 2. Simulate Supplier Bid Response
        print("Step 2: Simulating Supplier replying to outreach email...")
        reply_subject = f"Re: {subject}"
        reply_body = (
            f"Hello ProcureX Agent,\n\n"
            f"We can supply PVC Resin K-67 at USD 1450.00 per MT. Delivery time is 9 days.\n\n"
            f"Regards,\n"
            f"Sales Manager\n"
            f"{supplier.name}"
        )
        
        success = send_real_email_direct(SMTP_USERNAME, reply_subject, reply_body)
        if not success:
            print("[FAIL] Could not send supplier reply email. Aborting self-negotiation.")
            return False
            
        print("[OK] Supplier reply email sent successfully!")
        
        # Wait for delivery
        print("Waiting 15 seconds for email delivery...")
        time.sleep(15)
        
        # 3. Trigger IMAP processing (Round 1 / Agent processing)
        print("Step 3: Triggering Agent to check IMAP and negotiate...")
        force_email_unseen(rfq_num)
        check_and_process_emails(db)
        db.commit()
        
        # Verify Round 1 Inbound logged
        inbound_1 = db.query(models.NegotiationLog).filter_by(
            rfq_number=rfq_num, supplier_id=preferred_supplier_id, round_number=1, direction="inbound"
        ).first()
        
        if not inbound_1:
            print("[FAIL] ProcureX Agent did not process the supplier response email via IMAP!")
            return False
            
        print(f"[OK] ProcureX Agent logged supplier bid: USD {inbound_1.extracted_price} (Lead Time: {inbound_1.extracted_lead_time} days)")
        
        # Verify Agent Counter-Offer logged
        outbound_1 = db.query(models.NegotiationLog).filter_by(
            rfq_number=rfq_num, supplier_id=preferred_supplier_id, round_number=1, direction="outbound"
        ).first()
        
        if not outbound_1:
            print("[FAIL] ProcureX Agent did not generate and send a counter-offer!")
            return False
            
        print(f"[OK] Agent generated counter-offer: USD {outbound_1.extracted_price}")
        
        # Wait for delivery
        print("Waiting 10 seconds for counter-offer delivery...")
        time.sleep(10)
        
        # 4. Simulate Supplier accepting and submitting final bid
        print("Step 4: Simulating Supplier replying to Agent's counter-offer...")
        final_subject = f"Re: {outbound_1.subject}"
        final_body = (
            f"Hello ProcureX Agent,\n\n"
            f"We accept your payment terms. We can meet you at USD 1350.00 per MT as our final price.\n\n"
            f"Regards,\n"
            f"Sales Manager\n"
            f"{supplier.name}"
        )
        
        success = send_real_email_direct(SMTP_USERNAME, final_subject, final_body)
        if not success:
            print("[FAIL] Could not send supplier final response email.")
            return False
            
        print("[OK] Supplier final response email sent successfully!")
        
        # Wait for delivery
        print("Waiting 10 seconds for final email delivery...")
        time.sleep(10)
        
        # 5. Trigger IMAP processing (Round 2 / Finalization)
        print("Step 5: Triggering Agent to check IMAP and finalize negotiations...")
        force_email_unseen(rfq_num)
        check_and_process_emails(db)
        db.commit()
        
        # Verify Round 2 Inbound logged
        inbound_2 = db.query(models.NegotiationLog).filter_by(
            rfq_number=rfq_num, supplier_id=preferred_supplier_id, round_number=2, direction="inbound"
        ).first()
        
        if not inbound_2:
            print("[FAIL] ProcureX Agent did not process the final supplier response via IMAP!")
            return False
            
        print(f"[OK] ProcureX Agent logged final supplier quote: USD {inbound_2.extracted_price} (Lead Time: {inbound_2.extracted_lead_time} days)")
        
        # Verify QuoteResponse is updated
        quote = db.query(models.QuoteResponse).filter_by(rfq_number=rfq_num, supplier_id=preferred_supplier_id).first()
        if not quote:
            print("[FAIL] QuoteResponse was not saved in the database!")
            return False
            
        print(f"[OK] QuoteResponse saved: Price = {quote.currency} {quote.price}, Lead Time = {quote.lead_time_days} days, Terms = {quote.payment_terms}")
        
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
        
        # Run Comparison
        from automation_engine import run_comparison_and_notify
        run_comparison_and_notify(db, rfq_num)
        
        # Verify WorkflowNotification (Approval required card)
        notification = db.query(models.WorkflowNotification).filter_by(rfq_number=rfq_num).first()
        if not notification:
            print("[FAIL] WorkflowNotification was not created! Negotiation loop did not finish or notify correctly.")
            return False
            
        print(f"[OK] WorkflowNotification created successfully!")
        print(f"      - Recommended Supplier: {notification.recommended_supplier}")
        print(f"      - Recommended Price: {notification.recommended_currency} {notification.recommended_price}")
        print(f"      - Manager Email Sent: {notification.notification_email_sent}")
        print("\n=========================================================")
        print("  SUCCESS: END-TO-END AUTOMATED AGENT WORKFLOW CONFIRMED!  ")
        print("=========================================================")
        return True
        
    except Exception as e:
        print(f"[FAIL] Self-negotiation check error: {e}")
        return False
    finally:
        db.close()

def run_local_simulation(rfq_num, suppliers_dict):
    print("\n--- [4] Running Local Database & AI Negotiation Simulation ---")
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
                payment_terms="Net 45 Days",
                incoterms="CIF",
                responded_at=datetime.utcnow(),
                status="Quotation Received"
            )
            db.add(quote)
            db.commit()
            
        rfq.status = "RFQ Sent"
        db.commit()
        
        print("\n5. Running PO Comparison & Notification system...")
        run_comparison_and_notify(db, rfq_num)
        
        # Verify Simulation results
        notification = db.query(models.WorkflowNotification).filter_by(rfq_number=rfq_num).first()
        if notification:
            print("\n=========================================================")
            print("  SUCCESS: SIMULATED WORKFLOW VERIFICATION COMPLETED!   ")
            print("=========================================================")
            print(f"- Recommended Supplier: {notification.recommended_supplier}")
            print(f"- Negotiated Price: {notification.recommended_currency} {notification.recommended_price}")
            print(f"- Message: {notification.summary_message}")
            return True
        else:
            print("[FAIL] Simulation failed to generate notification report.")
            return False
            
    except Exception as e:
        print(f"[FAIL] Local simulation failed: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=================================================================")
    print("    PROCUREX COPILOT: INTEGRATION & WORKFLOW VALIDATOR      ")
    print("=================================================================")
    
    print("\nRunning Environment & Credentials Check...")
    print(f"OpenAI API Key status: {'Configured' if OPENAI_API_KEY else 'Missing (using local fallbacks)'}")
    
    smtp_ok = test_smtp_connection()
    imap_ok = test_imap_connection()
    
    print("\n--- Validation Modes ---")
    print("1. Real Self-Negotiation Mode (Agent sends real emails to itself to verify SMTP/IMAP)")
    print("2. Local Simulation Mode (Verifies DB state changes and LLM generation locally)")
    
    choice = input("Select verification mode (1 or 2): ").strip()
    
    tester_email = IMAP_USERNAME if (imap_ok and IMAP_USERNAME) else "sathinath.padhi@petabytz.com"
    
    try:
        rfq_num, suppliers_dict = setup_test_records(tester_email)
        
        if choice == "1":
            if not smtp_ok or not imap_ok:
                print("\n[WARNING] SMTP/IMAP check failed. Self-negotiation requires valid mail configurations.")
                proceed = input("Do you want to proceed anyway? (y/n): ").strip().lower()
                if proceed == 'y':
                    run_self_negotiation_workflow(rfq_num, suppliers_dict)
                else:
                    print("Falling back to local simulation...")
                    run_local_simulation(rfq_num, suppliers_dict)
            else:
                run_self_negotiation_workflow(rfq_num, suppliers_dict)
        else:
            run_local_simulation(rfq_num, suppliers_dict)
            
    except KeyboardInterrupt:
        print("\nWorkflow verification cancelled.")
    except Exception as err:
        print(f"\nExecution error: {err}")
