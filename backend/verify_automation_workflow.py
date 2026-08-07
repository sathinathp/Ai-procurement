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
    print("\n--- [3] Setting up Test Supplier and RFQ ---")
    from database import SessionLocal
    import models
    db = SessionLocal()
    
    rfq_num = "RFQ-2026-TEST-AUTO"
    
    try:
        # Find or create a test supplier with the tester's email
        supplier = db.query(models.Supplier).filter(models.Supplier.email.ilike(tester_email)).first()
        if not supplier:
            print(f"Creating a new test supplier with email '{tester_email}'...")
            supplier = models.Supplier(
                name="Test Automation Lab",
                country="Saudi Arabia",
                email=tester_email,
                phone="+966 50 123 4567",
                rating=4.5,
                lead_time_days=10,
                preferred=True,
                quality_score=95.0,
                delivery_score=90.0,
                price_competitiveness=85.0,
                risk_level="Low",
                products="PVC Resin K-67",
                categories="Raw Polymers",
                synced_to_erp=True,
                erp_vendor_id="ODOO-VEND-TEST-AUTO"
            )
            db.add(supplier)
            db.flush()
        else:
            print(f"Found existing supplier '{supplier.name}' with email '{tester_email}'.")
            # Ensure details are updated
            supplier.email = tester_email
            supplier.synced_to_erp = True
            supplier.erp_vendor_id = "ODOO-VEND-TEST-AUTO"
            db.flush()
            
        # Clean any old test records for this RFQ
        db.query(models.NegotiationLog).filter(models.NegotiationLog.rfq_number == rfq_num).delete()
        db.query(models.WorkflowNotification).filter(models.WorkflowNotification.rfq_number == rfq_num).delete()
        db.query(models.QuoteResponse).filter(models.QuoteResponse.rfq_number == rfq_num).delete()
        db.query(models.RFQTimeline).filter(models.RFQTimeline.rfq_number == rfq_num).delete()
        db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_num).delete()
        db.commit()
        
        # Create fresh RFQ
        print(f"Creating fresh test RFQ '{rfq_num}' for PVC Resin K-67...")
        rfq = models.RFQ(
            rfq_number=rfq_num,
            project_name="Auto-Negotiation Test Project",
            department="Procurement",
            required_date=(datetime.now() + timedelta(days=30)).date(),
            item_name="PVC Resin K-67",
            item_code="ITM-RAW-9999",
            description="Premium PVC Resin K-67 for AI Copilot Automation validation.",
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
        return rfq_num, supplier.id
    except Exception as e:
        db.rollback()
        print(f"[FAIL] Failed to set up database test records: {e}")
        raise e
    finally:
        db.close()

def run_real_test(rfq_num, supplier_id, tester_email):
    print("\n--- [4] Running Interactive Real Email Test ---")
    from database import SessionLocal
    import models
    from automation_engine import send_real_email_direct, check_and_process_emails
    
    db = SessionLocal()
    try:
        supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
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
            f"Please reply directly to this email with your pricing and lead time to proceed.\n\n"
            f"Best regards,\n"
            f"AI Procurement Agent\n"
            f"Neproplast Co."
        )
        
        print(f"Sending real RFQ invitation to '{tester_email}' from '{SMTP_USERNAME}'...")
        sent = send_real_email_direct(tester_email, subject, body)
        
        if not sent:
            print("[FAIL] Failed to send initial outreach email! Check your SMTP credentials.")
            return
        
        # Log invitation
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
        
        # Check logs
        print("\n--- Verifying Database Changes ---")
        logs = db.query(models.NegotiationLog).filter(models.NegotiationLog.rfq_number == rfq_num).all()
        print(f"Found {len(logs)} negotiation log entries for {rfq_num}:")
        for l in logs:
            print(f"- Round {l.round_number} | {l.direction.upper()} | Price: {l.extracted_currency} {l.extracted_price} | Subject: {l.subject}")
            
        notifications = db.query(models.WorkflowNotification).filter(models.WorkflowNotification.rfq_number == rfq_num).all()
        if notifications:
            print(f"\n[OK] AI Agent successfully completed negotiation cycles and generated a dashboard comparison approval request!")
        else:
            print(f"\n[INFO] IMAP check completed. Keep checking / replying to advance through negotiation rounds (current rounds: {len(logs)//2})")
            
    except Exception as e:
        print(f"[FAIL] Error during real test execution: {e}")
    finally:
        db.close()

def run_simulation_test(rfq_num, supplier_id, tester_email):
    print("\n--- [4] Running Programmatic Simulation (No real emails) ---")
    from database import SessionLocal
    import models
    from automation_engine import generate_ai_counter_offer, run_comparison_and_notify
    
    db = SessionLocal()
    try:
        supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
        rfq = db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_num).first()
        
        print("1. Simulating Round 1 Outreach...")
        db.add(models.EmailHistory(
            rfq_number=rfq_num,
            supplier_id=supplier_id,
            subject=f"Inquiry: RFQ for PVC Resin K-67 - {rfq_num}",
            body="Simulated outreach",
            type="RFQ Invitation",
            sent_at=datetime.utcnow() - timedelta(hours=5),
            response_received=True
        ))
        
        print("2. Simulating Round 1 Supplier Response (Price: USD 1400/MT, Lead time: 10 days)...")
        inbound_1 = models.NegotiationLog(
            rfq_number=rfq_num,
            supplier_id=supplier_id,
            supplier_email=tester_email,
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
        
        print("3. Generating and Simulating Round 1 AI Agent Counter-Offer (10% target)...")
        offer_res = generate_ai_counter_offer(rfq.item_name, supplier.name, 1400.00, "USD", 1)
        outbound_1 = models.NegotiationLog(
            rfq_number=rfq_num,
            supplier_id=supplier_id,
            supplier_email=tester_email,
            round_number=1,
            direction="outbound",
            subject=f"RE: Inquiry: RFQ for PVC Resin K-67 - {rfq_num}",
            body=offer_res["body"],
            extracted_price=offer_res["target_price"],
            extracted_currency="USD",
            extracted_lead_time=10,
            sent_at=datetime.utcnow() - timedelta(hours=3),
            reply_received=True
        )
        db.add(outbound_1)
        print(f"   Target Price generated by AI: USD {offer_res['target_price']}")
        
        print("4. Simulating Round 2 Supplier Revised Bid (Price: USD 1300/MT)...")
        inbound_2 = models.NegotiationLog(
            rfq_number=rfq_num,
            supplier_id=supplier_id,
            supplier_email=tester_email,
            round_number=2,
            direction="inbound",
            subject=f"Re: Inquiry: RFQ for PVC Resin K-67 - {rfq_num}",
            body="We can offer a revised price of USD 1300/MT as our final best offer.",
            extracted_price=1300.00,
            extracted_currency="USD",
            extracted_lead_time=8,
            sent_at=datetime.utcnow() - timedelta(hours=2),
            reply_received=True,
            is_final=True
        )
        db.add(inbound_2)
        
        # Save Quote Response
        quote = models.QuoteResponse(
            rfq_number=rfq_num,
            supplier_id=supplier_id,
            price=1300.00,
            currency="USD",
            moq=10.0,
            lead_time_days=8,
            payment_terms="Net 30 Days",
            incoterms="CIF",
            responded_at=datetime.utcnow(),
            status="Quotation Received"
        )
        db.add(quote)
        
        print("5. Triggering AI Comparison Analysis & Management Summary Notification...")
        run_comparison_and_notify(db, rfq_num)
        
        # Verify
        notification = db.query(models.WorkflowNotification).filter(models.WorkflowNotification.rfq_number == rfq_num).first()
        if notification:
            print("\n[OK] Simulation Completed Successfully!")
            print("Summary of AI Recommendation:")
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
    print("      NEPROPLAST AI COPILOT: AUTOMATION AGENT WORKFLOW TESTER     ")
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
        rfq_num, supplier_id = setup_test_data(tester_email)
        
        if choice == "1":
            if not smtp_ok or not imap_ok:
                print("\n[WARNING] SMTP/IMAP check failed. Real email mode requires valid credentials.")
                proceed = input("Do you still want to try sending? (y/n): ").strip().lower()
                if proceed != 'y':
                    sys.exit(1)
            run_real_test(rfq_num, supplier_id, tester_email)
        else:
            run_simulation_test(rfq_num, supplier_id, tester_email)
            
    except KeyboardInterrupt:
        print("\nTest cancelled by user.")
    except Exception as err:
        print(f"\nExecution error: {err}")
