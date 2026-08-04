import os
import re
import json
import logging
import time
import imaplib
import email
from email.header import decode_header
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import threading
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from parsers import ai_extract_quote
from openai import OpenAI

logger = logging.getLogger(__name__)

# Settings file path
SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "workflow_settings.json")

def get_agent_settings():
    """Read the workflow settings from JSON file. Default is 3 rounds."""
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading settings: {e}")
    # Default settings
    return {
        "max_negotiation_rounds": 3,
        "recipient_email": "sathinath.padhi@petabytz.com"
    }

def save_agent_settings(settings):
    """Save workflow settings to JSON file."""
    try:
        with open(SETTINGS_FILE, "w") as f:
            json.dump(settings, f, indent=4)
        return True
    except Exception as e:
        logger.error(f"Error saving settings: {e}")
        return False


def send_real_email_direct(to_email: str, subject: str, body: str) -> bool:
    """SMTP Helper to send real emails using SMTP credentials in env."""
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    try:
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError:
        smtp_port = 587
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_username or not smtp_password or "YOUR_EMAIL" in smtp_username or "YOUR_APP" in smtp_password:
        logger.info(f"[SMTP Direct] Credentials not configured. Mocking email to {to_email}")
        return False

    try:
        msg = MIMEMultipart()
        from_display = "Neproplast Procurement Copilot"
        msg['From'] = f'"{from_display}" <{smtp_username}>'
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Standard headers
        msg['MIME-Version'] = '1.0'
        import email.utils
        msg['Message-ID'] = email.utils.make_msgid(domain='gmail.com')
        msg['Date'] = email.utils.formatdate(localtime=True)
        
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_username, to_email, msg.as_string())
        server.close()
        logger.info(f"[SMTP Direct] Email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"[SMTP Direct] Failed to send email to {to_email}: {e}")
        return False


def ai_extract_from_body(body_text: str) -> dict:
    """Use OpenAI to extract quote details from email text body."""
    openai_key = os.getenv("OPENAI_API_KEY")
    default_vals = {
        "price": 0.0,
        "currency": "USD",
        "lead_time_days": 14,
        "payment_terms": "Net 30 Days",
        "incoterms": "CIF",
        "warranty": "12 Months",
        "rejected": False
    }
    
    if not openai_key or "YOUR_" in openai_key or not openai_key.strip():
        logger.info("OpenAI Key not available for email parsing. Using fallbacks.")
        # Try a quick regex as fallback
        price_match = re.search(r'(?:USD|SAR|\$)\s*([\d\.,]+)', body_text)
        if price_match:
            try:
                default_vals["price"] = float(price_match.group(1).replace(",", ""))
            except:
                pass
        return default_vals

    try:
        client = OpenAI(api_key=openai_key.strip())
        system_prompt = (
            "You are an expert procurement quote extractor. Parse the supplier email text and extract the quote metrics.\n"
            "Return a JSON object with these exact keys:\n"
            "- price: (float or null, unit price offered)\n"
            "- currency: (str or null, e.g., 'USD', 'SAR')\n"
            "- lead_time_days: (int or null, delivery lead time in days)\n"
            "- payment_terms: (str or null, e.g., 'Net 30 Days')\n"
            "- incoterms: (str or null, e.g., 'CIF', 'FOB', 'EXW')\n"
            "- warranty: (str or null, e.g., '12 Months')\n"
            "- rejected: (bool, true if the supplier explicitly rejects/refuses to bargain, declines to submit a quote, or cancels/withdraws their quote, otherwise false)\n"
            "Ensure you output ONLY the raw JSON string. Do not wrap it in markdown code blocks."
        )
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Supplier Email text:\n---\n{body_text}\n---"}
            ],
            temperature=0.0
        )
        res_text = response.choices[0].message.content.strip()
        if res_text.startswith("```"):
            res_text = res_text.split("\n", 1)[1]
            if res_text.endswith("```"):
                res_text = res_text.rsplit("\n", 1)[0]
        data = json.loads(res_text.strip())
        
        # Merge with defaults
        for k, v in default_vals.items():
            if data.get(k) is None:
                data[k] = v
        return data
    except Exception as e:
        logger.error(f"Error parsing email body with AI: {e}")
        return default_vals


def generate_ai_counter_offer(rfq_item: str, supplier_name: str, supplier_price: float, currency: str, round_num: int) -> dict:
    """Generate a counter offer email draft and price using OpenAI."""
    openai_key = os.getenv("OPENAI_API_KEY")
    
    # Propose 10% lower target price
    target_price = round(supplier_price * 0.90, 2)
    
    default_body = (
        f"Dear {supplier_name} Sales Team,\n\n"
        f"Thank you for your revised quotation of {currency} {supplier_price:.2f}/unit for {rfq_item} (Round {round_num}).\n"
        f"We appreciate your response, however, our target price for this requirement is {currency} {target_price:.2f}/unit "
        f"with standard Net 60 Days payment terms.\n\n"
        f"Please let us know if you can accommodate this so we can submit your offer for management review and final shortlist.\n\n"
        f"Best regards,\n"
        f"AI Procurement Agent\n"
        f"Neproplast Co."
    )

    if not openai_key or "YOUR_" in openai_key or not openai_key.strip():
        return {"body": default_body, "target_price": target_price}

    try:
        client = OpenAI(api_key=openai_key.strip())
        system_prompt = (
            "You are an expert AI Procurement Negotiator. Generate a polite, formal email from Neproplast's AI Agent "
            "to a supplier. The email should acknowledge their current offer, present a counter-offer target price "
            "(which is 10% lower than their quoted price), request Net 60 Days terms, and ask them to confirm if they can accept.\n"
            "Generate a JSON object with two keys:\n"
            "- body: The email body text (no subject line or headers)\n"
            "- target_price: The exact counter-offer price (float)\n"
            "Output ONLY raw JSON."
        )
        user_prompt = (
            f"RFQ Item: {rfq_item}\n"
            f"Supplier Name: {supplier_name}\n"
            f"Supplier Price Quoted: {currency} {supplier_price:.2f}\n"
            f"Target Price (10% lower): {currency} {target_price:.2f}\n"
            f"Negotiation Round: {round_num}"
        )
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )
        res_text = response.choices[0].message.content.strip()
        if res_text.startswith("```"):
            res_text = res_text.split("\n", 1)[1]
            if res_text.endswith("```"):
                res_text = res_text.rsplit("\n", 1)[0]
        data = json.loads(res_text.strip())
        return {
            "body": data.get("body", default_body),
            "target_price": float(data.get("target_price", target_price))
        }
    except Exception as e:
        logger.error(f"Error generating AI counter offer: {e}")
        return {"body": default_body, "target_price": target_price}


def run_comparison_and_notify(db: Session, rfq_number: str):
    """Compile quotes for an RFQ, determine the winner, create a notification, and send a summary email."""
    rfq = db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_number).first()
    if not rfq:
        return
        
    quotes = db.query(models.QuoteResponse).filter(models.QuoteResponse.rfq_number == rfq_number).all()
    if not quotes:
        logger.info(f"No quotes available for comparison on RFQ {rfq_number}")
        return
        
    # Ranks: Sort by price ascending
    sorted_quotes = sorted(quotes, key=lambda q: q.price)
    winner_quote = sorted_quotes[0]
    winner_supplier = winner_quote.supplier
    
    # Create comparison JSON blob
    comparison_data = []
    for q in sorted_quotes:
        comparison_data.append({
            "supplier_id": q.supplier.id,
            "supplier_name": q.supplier.name,
            "price": q.price,
            "currency": q.currency,
            "lead_time_days": q.lead_time_days,
            "payment_terms": q.payment_terms,
            "rating": q.supplier.rating,
            "delivery_score": q.supplier.delivery_score,
            "risk_level": q.supplier.risk_level
        })
        
    settings = get_agent_settings()
    recipient = settings.get("recipient_email", "sathinath.padhi@petabytz.com")
    
    summary_message = (
        f"AI Procurement Agent has completed all {settings.get('max_negotiation_rounds')} rounds of negotiations.\n"
        f"Winner Recommendation: {winner_supplier.name} with price {winner_quote.currency} {winner_quote.price}/unit "
        f"and lead time {winner_quote.lead_time_days} days.\n"
        f"Please approve this selection on your dashboard."
    )
    
    # Write to WorkflowNotification
    notification = models.WorkflowNotification(
        rfq_number=rfq_number,
        rfq_item=rfq.item_name,
        type="approval_required",
        status="pending",
        recommended_supplier=winner_supplier.name,
        recommended_price=winner_quote.price,
        recommended_currency=winner_quote.currency,
        comparison_json=json.dumps(comparison_data),
        summary_message=summary_message,
        notification_email_sent=False
    )
    db.add(notification)
    
    # Update RFQ Status
    rfq.status = "Under Comparison"
    
    # Update timeline
    db.add(models.RFQTimeline(
        rfq_number=rfq_number,
        stage="Comparison Generated",
        timestamp=datetime.utcnow(),
        details=f"AI compiled final comparison report. Best bid: {winner_supplier.name} at {winner_quote.currency} {winner_quote.price}/unit."
    ))
    db.commit()
    
    # Send email notification
    subject = f"Review Ready: RFQ {rfq_number} - {rfq.item_name} Comparison Summary"
    email_body = (
        f"Dear Sathinath,\n\n"
        f"The AI Procurement Agent has completed the negotiation cycles for RFQ {rfq_number} ({rfq.item_name}).\n\n"
        f"Here is a summary of the best offers:\n"
        + "\n".join([f"- {item['supplier_name']}: {item['currency']} {item['price']} (Lead time: {item['lead_time_days']} days, Risk: {item['risk_level']})" for item in comparison_data]) +
        f"\n\nRecommended Vendor: {winner_supplier.name}\n"
        f"Reasoning: Lowest negotiated price of {winner_quote.currency} {winner_quote.price}/unit with a reliability score of {winner_supplier.delivery_score}%.\n\n"
        f"Please log in to your dashboard to review and APPROVE the purchase order.\n\n"
        f"Best regards,\n"
        f"AI Procurement Agent"
    )
    
    sent = send_real_email_direct(recipient, subject, email_body)
    if sent:
        notification.notification_email_sent = True
        db.commit()
        logger.info(f"Review notification email successfully sent to {recipient} for RFQ {rfq_number}")


def check_and_process_emails(db: Session):
    """Connect to IMAP, find unread emails, extract details, negotiate or compare."""
    imap_server = os.getenv("IMAP_SERVER", "imap.gmail.com")
    try:
        imap_port = int(os.getenv("IMAP_PORT", "993"))
    except ValueError:
        imap_port = 993
    imap_username = os.getenv("IMAP_USERNAME")
    imap_password = os.getenv("IMAP_PASSWORD")

    if not imap_username or not imap_password or "YOUR_EMAIL" in imap_username or "YOUR_APP" in imap_password:
        return

    try:
        mail = imaplib.IMAP4_SSL(imap_server, imap_port)
        mail.login(imap_username, imap_password)
        mail.select("inbox")

        # Find unseen/unread emails
        status, messages = mail.search(None, 'UNSEEN')
        if status != "OK" or not messages[0]:
            mail.logout()
            return

        message_ids = messages[0].split()
        logger.info(f"[Automation Engine] Found {len(message_ids)} unread emails. Processing...")

        for msg_id in message_ids:
            res, msg_data = mail.fetch(msg_id, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    
                    # Sender Email
                    from_ = msg.get("From", "")
                    from_email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', from_)
                    if not from_email_match:
                        continue
                    sender_email = from_email_match.group(0).strip().lower()

                    # Find Supplier
                    supplier = db.query(models.Supplier).filter(models.Supplier.email.ilike(sender_email)).first()
                    if not supplier:
                        continue

                    # Subject
                    subject_header = msg.get("Subject", "")
                    subject = ""
                    if subject_header:
                        decoded_parts = decode_header(subject_header)
                        for part, encoding in decoded_parts:
                            if isinstance(part, bytes):
                                subject += part.decode(encoding or "utf-8", errors="ignore")
                            else:
                                subject += part

                    # Get Email Body
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            if content_type == "text/plain":
                                payload = part.get_payload(decode=True)
                                if payload:
                                    body = payload.decode(errors="ignore")
                                    break
                    else:
                        payload = msg.get_payload(decode=True)
                        if payload:
                            body = payload.decode(errors="ignore")

                    # Match RFQ
                    rfq_match = re.search(r'RFQ-\d{4}-(?:GEN-)?\d+', subject, re.IGNORECASE)
                    if not rfq_match:
                        rfq_match = re.search(r'RFQ-\d{4}-(?:GEN-)?\d+', body, re.IGNORECASE)
                    
                    if not rfq_match:
                        continue
                        
                    rfq_number = rfq_match.group(0).upper()
                    rfq = db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_number).first()
                    if not rfq:
                        continue

                    logger.info(f"[Automation Engine] Processing incoming reply from {supplier.name} for RFQ {rfq_number}")

                    # Check for attachment first
                    attachment_found = False
                    file_bytes = None
                    file_name = ""
                    for part in msg.walk():
                        content_disposition = str(part.get("Content-Disposition", ""))
                        if "attachment" in content_disposition:
                            filename = part.get_filename()
                            if filename:
                                ext = filename.split(".")[-1].lower()
                                if ext in ["pdf", "docx", "doc", "xlsx", "xls", "txt"]:
                                    file_bytes = part.get_payload(decode=True)
                                    file_name = filename
                                    attachment_found = True
                                    break

                    # Extract price/quote metrics
                    quote_data = None
                    if attachment_found and file_bytes:
                        from parsers import extract_text_from_file
                        extracted_text = extract_text_from_file(file_bytes, file_name)
                        quote_data = ai_extract_quote(extracted_text, openai_key=os.getenv("OPENAI_API_KEY"))
                    else:
                        quote_data = ai_extract_from_body(body)

                    price = float(quote_data.get("price", 0.0))
                    currency = quote_data.get("currency", "USD")
                    lead_time = int(quote_data.get("lead_time_days", 14))
                    
                    # Update Email history
                    sent_emails = db.query(models.EmailHistory).filter(
                        models.EmailHistory.rfq_number == rfq_number,
                        models.EmailHistory.supplier_id == supplier.id
                    ).all()
                    for se in sent_emails:
                        se.response_received = True

                    # Find out how many inbound rounds we have processed for this supplier
                    inbound_logs = db.query(models.NegotiationLog).filter_by(
                        rfq_number=rfq_number,
                        supplier_id=supplier.id,
                        direction="inbound"
                    ).all()
                    
                    current_round = len(inbound_logs) + 1
                    
                    # Log this Inbound message
                    inbound_log = models.NegotiationLog(
                        rfq_number=rfq_number,
                        supplier_id=supplier.id,
                        supplier_email=sender_email,
                        round_number=current_round,
                        direction="inbound",
                        subject=subject,
                        body=body,
                        extracted_price=price,
                        extracted_currency=currency,
                        extracted_lead_time=lead_time,
                        sent_at=datetime.utcnow(),
                        reply_received=True,
                        is_final=False
                    )
                    db.add(inbound_log)
                    db.commit()

                    settings = get_agent_settings()
                    max_rounds = settings.get("max_negotiation_rounds", 3)
                    is_rejected = quote_data.get("rejected", False)

                    if is_rejected:
                        inbound_log.is_final = True
                        
                        # Save/Update the final QuoteResponse status as Cancelled
                        existing_quote = db.query(models.QuoteResponse).filter_by(
                            rfq_number=rfq_number,
                            supplier_id=supplier.id
                        ).first()
                        if existing_quote:
                            existing_quote.status = "Cancelled"
                            existing_quote.price = price or existing_quote.price
                        else:
                            new_quote = models.QuoteResponse(
                                rfq_number=rfq_number,
                                supplier_id=supplier.id,
                                price=price or 0.0,
                                currency=currency,
                                lead_time_days=lead_time,
                                moq=1.0,
                                payment_terms="Cancelled",
                                incoterms="Cancelled",
                                responded_at=datetime.utcnow(),
                                status="Cancelled"
                            )
                            db.add(new_quote)
                            
                        # Add timeline event
                        db.add(models.RFQTimeline(
                            rfq_number=rfq_number,
                            stage="Supplier Responded",
                            timestamp=datetime.utcnow(),
                            details=f"{supplier.name} rejected target price or cancelled the negotiation. Final offer: {currency} {price or 'N/A'}."
                        ))
                        db.commit()
                        logger.info(f"Supplier {supplier.name} cancelled/rejected negotiation on RFQ {rfq_number}.")
                        
                        # Check if ALL invited suppliers have completed negotiations
                        invited_emails = db.query(models.EmailHistory).filter_by(
                            rfq_number=rfq_number,
                            type="RFQ Invitation"
                        ).all()
                        invited_supplier_ids = set([e.supplier_id for e in invited_emails])
                        
                        completed_supplier_ids = set()
                        for s_id in invited_supplier_ids:
                            has_final = db.query(models.NegotiationLog).filter_by(
                                rfq_number=rfq_number,
                                supplier_id=s_id,
                                is_final=True
                            ).first()
                            s_inbound_count = db.query(models.NegotiationLog).filter_by(
                                rfq_number=rfq_number,
                                supplier_id=s_id,
                                direction="inbound"
                            ).count()
                            if has_final or s_inbound_count >= max_rounds:
                                completed_supplier_ids.add(s_id)
                                
                        if invited_supplier_ids and invited_supplier_ids.issubset(completed_supplier_ids):
                            logger.info(f"All invited suppliers have completed negotiations for RFQ {rfq_number}. Running comparison...")
                            run_comparison_and_notify(db, rfq_number)

                    elif current_round < max_rounds:
                        # Generate Counter-Offer!
                        negotiation_res = generate_ai_counter_offer(rfq.item_name, supplier.name, price, currency, current_round)
                        outbound_body = negotiation_res.get("body")
                        target_price = negotiation_res.get("target_price")
                        
                        outbound_subject = f"RE: {subject}" if not subject.lower().startswith("re:") else subject
                        
                        # Send counter-offer email
                        sent_ok = send_real_email_direct(supplier.email, outbound_subject, outbound_body)
                        
                        # Save Outbound Negotiation Log
                        outbound_log = models.NegotiationLog(
                            rfq_number=rfq_number,
                            supplier_id=supplier.id,
                            supplier_email=supplier.email,
                            round_number=current_round,
                            direction="outbound",
                            subject=outbound_subject,
                            body=outbound_body,
                            extracted_price=target_price,
                            extracted_currency=currency,
                            extracted_lead_time=lead_time,
                            sent_at=datetime.utcnow(),
                            reply_received=False,
                            is_final=False
                        )
                        db.add(outbound_log)
                        
                        # Add timeline event
                        db.add(models.RFQTimeline(
                            rfq_number=rfq_number,
                            stage="RFQ Sent",
                            timestamp=datetime.utcnow(),
                            details=f"AI Agent Counter-Offer (Round {current_round}) sent to {supplier.name}. Proposing {currency} {target_price}/unit."
                        ))
                        db.commit()
                        logger.info(f"Counter-offer (Round {current_round}) sent to {supplier.name} for RFQ {rfq_number}")

                    else:
                        # Max rounds reached! This is the final accepted quote
                        inbound_log.is_final = True
                        
                        # Save/Update the final QuoteResponse
                        existing_quote = db.query(models.QuoteResponse).filter_by(
                            rfq_number=rfq_number,
                            supplier_id=supplier.id
                        ).first()
                        
                        if existing_quote:
                            existing_quote.price = price
                            existing_quote.currency = currency
                            existing_quote.lead_time_days = lead_time
                            existing_quote.moq = float(quote_data.get("moq", existing_quote.moq))
                            existing_quote.payment_terms = quote_data.get("payment_terms", existing_quote.payment_terms)
                            existing_quote.incoterms = quote_data.get("incoterms", existing_quote.incoterms)
                            existing_quote.responded_at = datetime.utcnow()
                            existing_quote.status = "Quotation Received"
                        else:
                            new_quote = models.QuoteResponse(
                                rfq_number=rfq_number,
                                supplier_id=supplier.id,
                                price=price,
                                currency=currency,
                                lead_time_days=lead_time,
                                moq=float(quote_data.get("moq", 1.0)),
                                payment_terms=quote_data.get("payment_terms", "Net 30 Days"),
                                incoterms=quote_data.get("incoterms", "CIF"),
                                responded_at=datetime.utcnow(),
                                status="Quotation Received"
                            )
                            db.add(new_quote)
                            
                        # Add timeline event
                        db.add(models.RFQTimeline(
                            rfq_number=rfq_number,
                            stage="Supplier Responded",
                            timestamp=datetime.utcnow(),
                            details=f"Negotiation with {supplier.name} completed after {max_rounds} rounds. Final bid: {currency} {price}/unit."
                        ))
                        db.commit()
                        logger.info(f"Negotiation completed for {supplier.name} on RFQ {rfq_number}. Final: {currency} {price}")

                        # Check if ALL invited suppliers have completed negotiations
                        invited_emails = db.query(models.EmailHistory).filter_by(
                            rfq_number=rfq_number,
                            type="RFQ Invitation"
                        ).all()
                        invited_supplier_ids = set([e.supplier_id for e in invited_emails])
                        
                        # Find which of these suppliers have completed (i.e. has an inbound log marked final or has completed N rounds)
                        completed_supplier_ids = set()
                        for s_id in invited_supplier_ids:
                            # has a final log or at least N logs
                            has_final = db.query(models.NegotiationLog).filter_by(
                                rfq_number=rfq_number,
                                supplier_id=s_id,
                                is_final=True
                            ).first()
                            
                            s_inbound_count = db.query(models.NegotiationLog).filter_by(
                                rfq_number=rfq_number,
                                supplier_id=s_id,
                                direction="inbound"
                            ).count()
                            
                            if has_final or s_inbound_count >= max_rounds:
                                completed_supplier_ids.add(s_id)
                                
                        if invited_supplier_ids and invited_supplier_ids.issubset(completed_supplier_ids):
                            # All supplier negotiations are done! Generate comparison and send review notification email
                            logger.info(f"All invited suppliers have completed negotiations for RFQ {rfq_number}. Running comparison...")
                            run_comparison_and_notify(db, rfq_number)

                    # Mark email as read/seen on the server
                    mail.store(msg_id, '+FLAGS', '\\Seen')
                    db.commit()

        mail.close()
        mail.logout()
    except Exception as e:
        logger.error(f"[Automation Engine] Error during IMAP loop check: {e}")


def worker_loop():
    """Background worker loop polling every minute."""
    logger.info("Starting background IMAP worker thread...")
    while True:
        try:
            db = SessionLocal()
            check_and_process_emails(db)
            db.close()
        except Exception as err:
            logger.error(f"Error in background worker thread: {err}")
        # Poll every 60 seconds (1 minute)
        time.sleep(60)

def start_background_worker():
    """Spawn background thread if not already running."""
    worker_thread = threading.Thread(target=worker_loop, daemon=True, name="IMAPAutomationWorker")
    worker_thread.start()
    logger.info("Background IMAP worker thread started successfully.")
