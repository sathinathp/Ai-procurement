import os
import sys
import re
import time
import smtplib
import imaplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Ensure backend directory is in path
sys.path.append(os.path.dirname(__file__))

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# SMTP & IMAP details from env
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = os.getenv("SMTP_PORT", "587")
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

IMAP_SERVER = os.getenv("IMAP_SERVER", "imap.gmail.com")
IMAP_PORT = os.getenv("IMAP_PORT", "993")
IMAP_USERNAME = os.getenv("IMAP_USERNAME")
IMAP_PASSWORD = os.getenv("IMAP_PASSWORD")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def validate_email_syntax(email_str: str) -> bool:
    """Validate format of an email address using regex."""
    if not email_str:
        return False
    regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(regex, email_str.strip()))

def test_smtp_connection():
    print("\n--- [1] Checking SMTP Connection Settings ---")
    if not SMTP_USERNAME or not SMTP_PASSWORD or "YOUR_" in SMTP_USERNAME:
        print("[FAIL] SMTP credentials are not configured in your .env file!")
        return False
    
    if not validate_email_syntax(SMTP_USERNAME):
        print(f"[FAIL] SMTP username '{SMTP_USERNAME}' is not a valid email address structure!")
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
        
    if not validate_email_syntax(IMAP_USERNAME):
        print(f"[FAIL] IMAP username '{IMAP_USERNAME}' is not a valid email address structure!")
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

def force_email_unseen(subject_pattern: str):
    print(f"Ensuring emails matching Subject '{subject_pattern}' are marked UNREAD (UNSEEN)...")
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, int(IMAP_PORT), timeout=10)
        mail.login(IMAP_USERNAME, IMAP_PASSWORD)
        mail.select("inbox")
        
        status, messages = mail.search(None, f'SUBJECT "{subject_pattern}"')
        if status == "OK" and messages[0]:
            message_ids = messages[0].split()
            for m_id in message_ids:
                mail.store(m_id, '-FLAGS', '\\Seen')
            print(f"[OK] Marked {len(message_ids)} matching email(s) as UNREAD.")
        else:
            print("[INFO] No matching emails found to mark UNREAD.")
            
        mail.close()
        mail.logout()
    except Exception as e:
        print(f"[WARNING] Failed to force email to UNREAD: {e}")

def setup_test_records(tester_email):
    print("\n--- [3] Setting up Test Supplier and RFQ ---")
    from database import SessionLocal
    import models
    db = SessionLocal()
    
    rfq_num = "RFQ-2026-999"
    
    try:
        # Find or create a test supplier with the tester's email
        supplier = db.query(models.Supplier).filter(models.Supplier.email.ilike(tester_email)).first()
        if not supplier:
            print(f"Creating a new test supplier with email '{tester_email}'...")
            supplier = models.Supplier(
                name="Auto-Negotiator Supplier Lab",
                country="Saudi Arabia",
                email=tester_email,
                phone="+966 50 123 4567",
                rating=4.7,
                lead_time_days=10,
                preferred=True,
                quality_score=98.0,
                delivery_score=92.0,
                price_competitiveness=88.0,
                risk_level="Low",
                products="PVC Resin K-67",
                categories="Raw Polymers",
                synced_to_erp=True,
                erp_vendor_id="ERP-VEND-AUTO-CHECK"
            )
            db.add(supplier)
            db.flush()
        else:
            print(f"Found existing supplier '{supplier.name}' with email '{tester_email}'.")
            supplier.email = tester_email
            supplier.synced_to_erp = True
            supplier.erp_vendor_id = "ERP-VEND-AUTO-CHECK"
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
        print("[OK] Test RFQ and Supplier set up in database.")
        return rfq_num, supplier.id
    except Exception as e:
        db.rollback()
        print(f"[FAIL] Database setup failed: {e}")
        raise e
    finally:
        db.close()

def run_self_negotiation_workflow(rfq_num, supplier_id):
    print("\n--- [4] Starting Fully Automated Self-Negotiation Workflow ---")
    print("This mode acts as both the ProcureX Agent and the Supplier using your credentials.")
    from database import SessionLocal
    import models
    from automation_engine import send_real_email_direct, check_and_process_emails
    
    db = SessionLocal()
    try:
        supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
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
        
        print(f"Step 1: ProcureX Agent sending outreach email to {supplier.email}...")
        sent = send_real_email_direct(supplier.email, subject, body)
        if not sent:
            print("[FAIL] Failed to send outreach email.")
            return False
            
        # Log outreach
        db.add(models.EmailHistory(
            rfq_number=rfq_num,
            supplier_id=supplier_id,
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
            details=f"RFQ outreach email sent to {supplier.name} ({supplier.email})."
        ))
        db.commit()
        print("[OK] Outreach email sent successfully!")
        
        # Wait for delivery
        print("Waiting 10 seconds for email delivery...")
        time.sleep(10)
        
        # 2. Simulate Supplier reply by sending a quote email to IMAP_USERNAME
        supplier_reply_subject = f"Re: Inquiry: RFQ for PVC Resin K-67 - {rfq_num}"
        supplier_reply_body = (
            f"Dear ProcureX team,\n\n"
            f"We can supply {rfq.item_name} at USD 1400.00 per MT with 10 days lead time.\n"
            f"Payment terms: Net 30 Days. Incoterms: CIF.\n\n"
            f"Best regards,\n"
            f"Sales Manager\n"
            f"{supplier.name}"
        )
        print(f"Step 2: Simulating Supplier sending quotation reply to agent ({IMAP_USERNAME})...")
        sent = send_real_email_direct(IMAP_USERNAME, supplier_reply_subject, supplier_reply_body)
        if not sent:
            print("[FAIL] Failed to send supplier quotation reply email.")
            return False
            
        print("[OK] Supplier reply email sent successfully!")
        
        # Wait for delivery
        print("Waiting 10 seconds for reply delivery...")
        time.sleep(10)
        
        # 3. Trigger IMAP processing (Round 1)
        print("Step 3: Triggering Agent to check IMAP and process quotation...")
        force_email_unseen(rfq_num)
        check_and_process_emails(db)
        db.commit()
        
        # Verify Round 1 Inbound logged
        inbound_1 = db.query(models.NegotiationLog).filter_by(
            rfq_number=rfq_num, supplier_id=supplier_id, round_number=1, direction="inbound"
        ).first()
        
        if not inbound_1:
            print("[FAIL] ProcureX Agent did not detect or process the supplier quote email via IMAP!")
            return False
            
        print(f"[OK] ProcureX Agent successfully read quote: USD {inbound_1.extracted_price} (Lead Time: {inbound_1.extracted_lead_time} days)")
        
        # Verify Round 1 Outbound (Counter-Offer) was generated and sent
        outbound_1 = db.query(models.NegotiationLog).filter_by(
            rfq_number=rfq_num, supplier_id=supplier_id, round_number=1, direction="outbound"
        ).first()
        
        if not outbound_1:
            print("[FAIL] ProcureX Agent failed to generate and send a counter-offer!")
            return False
            
        print(f"[OK] ProcureX Agent sent counter-offer of USD {outbound_1.extracted_price} to supplier.")
        
        # Wait for delivery of counter-offer
        print("Waiting 10 seconds for counter-offer email to deliver...")
        time.sleep(10)
        
        # 4. Simulate Supplier accepting counter-offer with final revised quote
        supplier_final_subject = f"Re: {outbound_1.subject}"
        supplier_final_body = (
            f"Dear ProcureX,\n\n"
            f"We accept your counter-offer target of USD 1260 but our absolute final price is USD 1300.00 per MT.\n"
            f"Lead time: 8 days. Payment terms: Net 45 Days.\n\n"
            f"Best regards,\n"
            f"Sales Manager"
        )
        print(f"Step 4: Simulating Supplier sending final counter-proposal to agent...")
        sent = send_real_email_direct(IMAP_USERNAME, supplier_final_subject, supplier_final_body)
        if not sent:
            print("[FAIL] Failed to send supplier final response email.")
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
            rfq_number=rfq_num, supplier_id=supplier_id, round_number=2, direction="inbound"
        ).first()
        
        if not inbound_2:
            print("[FAIL] ProcureX Agent did not process the final supplier response via IMAP!")
            return False
            
        print(f"[OK] ProcureX Agent logged final supplier quote: USD {inbound_2.extracted_price} (Lead Time: {inbound_2.extracted_lead_time} days)")
        
        # Verify QuoteResponse is updated
        quote = db.query(models.QuoteResponse).filter_by(rfq_number=rfq_num, supplier_id=supplier_id).first()
        if not quote:
            print("[FAIL] QuoteResponse was not saved in the database!")
            return False
            
        print(f"[OK] QuoteResponse saved: Price = {quote.currency} {quote.price}, Lead Time = {quote.lead_time_days} days, Terms = {quote.payment_terms}")
        
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

def run_local_simulation(rfq_num, supplier_id):
    print("\n--- [4] Running Local Database & AI Negotiation Simulation ---")
    print("No real emails will be sent. Running pure database/LLM transitions.")
    from database import SessionLocal
    import models
    from automation_engine import generate_ai_counter_offer, run_comparison_and_notify
    
    db = SessionLocal()
    try:
        supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
        rfq = db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_num).first()
        
        print("1. Logging Round 1 Outreach...")
        db.add(models.EmailHistory(
            rfq_number=rfq_num,
            supplier_id=supplier_id,
            subject=f"Inquiry: RFQ for PVC Resin K-67 - {rfq_num}",
            body="Simulated outreach invitation",
            type="RFQ Invitation",
            sent_at=datetime.utcnow() - timedelta(hours=5),
            response_received=True
        ))
        rfq.status = "RFQ Sent"
        db.commit()
        
        print("2. Simulating Round 1 Supplier Bid (Price: USD 1400.00)...")
        inbound_1 = models.NegotiationLog(
            rfq_number=rfq_num,
            supplier_id=supplier_id,
            supplier_email=supplier.email,
            round_number=1,
            direction="inbound",
            subject=f"Re: Inquiry: RFQ for PVC Resin K-67 - {rfq_num}",
            body="We can supply at USD 1400/MT, lead time 10 days.",
            extracted_price=1400.00,
            extracted_currency="USD",
            extracted_lead_time=10,
            sent_at=datetime.utcnow() - timedelta(hours=4),
            reply_received=True
        )
        db.add(inbound_1)
        db.commit()
        
        print("3. Invoking AI Model to generate Counter-Offer (10% lower)...")
        offer = generate_ai_counter_offer(rfq.item_name, supplier.name, 1400.00, "USD", 1)
        print(f"   Target Price generated by AI: USD {offer['target_price']}")
        
        outbound_1 = models.NegotiationLog(
            rfq_number=rfq_num,
            supplier_id=supplier_id,
            supplier_email=supplier.email,
            round_number=1,
            direction="outbound",
            subject=f"RE: Inquiry: RFQ for PVC Resin K-67 - {rfq_num}",
            body=offer["body"],
            extracted_price=offer["target_price"],
            extracted_currency="USD",
            extracted_lead_time=10,
            sent_at=datetime.utcnow() - timedelta(hours=3),
            reply_received=True
        )
        db.add(outbound_1)
        db.commit()
        
        print("4. Simulating Round 2 Supplier Revised Bid (Price: USD 1300.00)...")
        inbound_2 = models.NegotiationLog(
            rfq_number=rfq_num,
            supplier_id=supplier_id,
            supplier_email=supplier.email,
            round_number=2,
            direction="inbound",
            subject=f"Re: Inquiry: RFQ for PVC Resin K-67 - {rfq_num}",
            body="We accept the counter offer but our final best offer is USD 1300/MT.",
            extracted_price=1300.00,
            extracted_currency="USD",
            extracted_lead_time=8,
            sent_at=datetime.utcnow() - timedelta(hours=2),
            reply_received=True,
            is_final=True
        )
        db.add(inbound_2)
        
        quote = models.QuoteResponse(
            rfq_number=rfq_num,
            supplier_id=supplier_id,
            price=1300.00,
            currency="USD",
            moq=10.0,
            lead_time_days=8,
            payment_terms="Net 45 Days",
            incoterms="CIF",
            responded_at=datetime.utcnow(),
            status="Quotation Received"
        )
        db.add(quote)
        db.commit()
        
        print("5. Running PO Comparison & Notification system...")
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
    
    # Use IMAP Username as the tester email for self-negotiation so we can poll it
    tester_email = IMAP_USERNAME if (imap_ok and IMAP_USERNAME) else "sathinath.padhi@petabytz.com"
    
    try:
        rfq_num, supplier_id = setup_test_records(tester_email)
        
        if choice == "1":
            if not smtp_ok or not imap_ok:
                print("\n[WARNING] SMTP/IMAP check failed. Self-negotiation requires valid mail configurations.")
                proceed = input("Do you want to proceed anyway? (y/n): ").strip().lower()
                if proceed == 'y':
                    run_self_negotiation_workflow(rfq_num, supplier_id)
                else:
                    print("Falling back to local simulation...")
                    run_local_simulation(rfq_num, supplier_id)
            else:
                run_self_negotiation_workflow(rfq_num, supplier_id)
        else:
            run_local_simulation(rfq_num, supplier_id)
            
    except KeyboardInterrupt:
        print("\nWorkflow verification cancelled.")
    except Exception as err:
        print(f"\nExecution error: {err}")
