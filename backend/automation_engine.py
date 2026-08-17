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
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv(override=True)

logger = logging.getLogger(__name__)

def strip_html_tags(text: str) -> str:
    if not text:
        return ""
    # Remove script and style elements
    text = re.sub(r'<(script|style)\b[^>]*>([\s\S]*?)<\/\1>', '', text, flags=re.IGNORECASE)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Unescape common XML/HTML entities
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'").replace("&#39;", "'").replace("&#34;", '"')
    # Collapse multiple whitespaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

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


def send_real_email_direct(to_email: str, subject: str, body: str, attachment_path: str = None) -> bool:
    """Send real emails with optional attachments using Resend API if configured, otherwise fallback to SMTP."""
    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key and "YOUR_" not in resend_key and resend_key.strip():
        try:
            import requests
            import base64
            
            resend_from = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
            if not resend_from or not resend_from.strip():
                resend_from = "onboarding@resend.dev"
                
            # If using Resend sandbox (onboarding@resend.dev), Resend restricts recipients to the registered developer email.
            # Reroute outbound emails to sathinath.padhi@petabytz.com and tag the subject for seamless testing.
            if resend_from == "onboarding@resend.dev" and to_email.strip().lower() != "sathinath.padhi@petabytz.com":
                logger.info(f"[Resend] Rerouting email from {to_email} to registered account owner sathinath.padhi@petabytz.com due to sandbox restrictions.")
                subject = f"[Rerouted from {to_email}] {subject}"
                to_email = "sathinath.padhi@petabytz.com"

            from_display = "AI Procurement Copilot"
            from_header = f'"{from_display}" <{resend_from}>'
            
            payload = {
                "from": from_header,
                "to": [to_email],
                "subject": subject,
                "text": body,
            }
            
            if attachment_path and os.path.exists(attachment_path):
                filename = os.path.basename(attachment_path)
                with open(attachment_path, "rb") as f:
                    content_base64 = base64.b64encode(f.read()).decode("utf-8")
                payload["attachments"] = [{
                    "filename": filename,
                    "content": content_base64
                }]
                
            headers = {
                "Authorization": f"Bearer {resend_key.strip()}",
                "Content-Type": "application/json"
            }
            
            logger.info(f"[Resend] Attempting to send email to {to_email} via Resend API")
            response = requests.post("https://api.resend.com/emails", json=payload, headers=headers)
            if response.status_code in [200, 201]:
                logger.info(f"[Resend] Email successfully sent to {to_email}")
                return True
            else:
                logger.error(f"[Resend] Failed to send email via API: {response.text}")
                # Fallback to SMTP
        except Exception as e:
            logger.error(f"[Resend] Exception sending email via API: {e}")
            # Fallback to SMTP

    # SMTP Fallback
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    try:
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError:
        smtp_port = 587
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_username or not smtp_password or "YOUR_EMAIL" in smtp_username or "YOUR_APP" in smtp_password:
        logger.info(f"[SMTP Direct] Credentials not configured. Mocking email to {to_email} (attachment: {attachment_path})")
        return False

    try:
        msg = MIMEMultipart()
        from_display = "AI Procurement Copilot"
        msg['From'] = f'"{from_display}" <{smtp_username}>'
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Standard headers
        msg['MIME-Version'] = '1.0'
        import email.utils
        msg['Message-ID'] = email.utils.make_msgid(domain='gmail.com')
        msg['Date'] = email.utils.formatdate(localtime=True)
        
        msg.attach(MIMEText(body, 'plain'))

        # Attach file if provided and exists
        if attachment_path and os.path.exists(attachment_path):
            from email.mime.base import MIMEBase
            from email import encoders
            filename = os.path.basename(attachment_path)
            try:
                with open(attachment_path, "rb") as f:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename={filename}",
                )
                msg.attach(part)
                logger.info(f"[SMTP Direct] Successfully attached file {filename} to email.")
            except Exception as attach_err:
                logger.error(f"[SMTP Direct] Error attaching file {filename}: {attach_err}")

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
        "rejected": False,
        "agreed": False
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
            "- agreed: (bool, true if the supplier accepts or agrees to the counter-offer price, proposed price, target price, or previous offer from the agent; otherwise false)\n"
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


def generate_ai_counter_offer(rfq_item: str, supplier_name: str, supplier_price: float, currency: str, round_num: int, target_price_override: float = None) -> dict:
    """Generate a counter offer email draft and price using OpenAI."""
    openai_key = os.getenv("OPENAI_API_KEY")
    
    # Propose 10% lower target price or use override
    if target_price_override is not None:
        target_price = round(float(target_price_override), 2)
    else:
        target_price = round(supplier_price * 0.90, 2)
    
    default_body = (
        f"Dear {supplier_name} Sales Team,\n\n"
        f"Thank you for your revised quotation of {currency} {supplier_price:.2f}/unit for {rfq_item} (Round {round_num}).\n"
        f"We appreciate your response, however, our target price for this requirement is {currency} {target_price:.2f}/unit "
        f"with standard Net 60 Days payment terms.\n\n"
        f"Please let us know if you can accommodate this so we can submit your offer for management review and final shortlist.\n\n"
        f"Best regards,\n"
        f"AI Procurement Agent\n"
        f"AI Co."
    )

    if not openai_key or "YOUR_" in openai_key or not openai_key.strip():
        return {"body": default_body, "target_price": target_price}

    try:
        client = OpenAI(api_key=openai_key.strip())
        system_prompt = (
            "You are an expert AI Procurement Negotiator. Generate a polite, formal email from AI's Agent "
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


def run_comparison_and_notify(db: Session, rfq_number: str, winner_supplier_id: int = None):
    """Compile quotes for an RFQ, determine the winner, automatically release PO, and send PO email with attachment."""
    rfq = db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_number).first()
    if not rfq:
        return
        
    quotes = db.query(models.QuoteResponse).filter(models.QuoteResponse.rfq_number == rfq_number).all()
    if not quotes:
        logger.info(f"No quotes available for comparison on RFQ {rfq_number}")
        return
        
    # Filter out cancelled or invalid quotes for determining the winner
    valid_quotes = [q for q in quotes if q.status != "Cancelled" and q.price > 0.0]
    if not valid_quotes:
        valid_quotes = [q for q in quotes if q.status != "Cancelled"]
    if not valid_quotes:
        valid_quotes = quotes

    # Ranks: Find/Sort valid quotes to determine the winner
    if winner_supplier_id is not None:
        winner_quotes = [q for q in valid_quotes if q.supplier_id == winner_supplier_id]
        if winner_quotes:
            winner_quote = winner_quotes[0]
        else:
            sorted_valid_quotes = sorted(valid_quotes, key=lambda q: q.price)
            winner_quote = sorted_valid_quotes[0]
    else:
        sorted_valid_quotes = sorted(valid_quotes, key=lambda q: q.price)
        winner_quote = sorted_valid_quotes[0]
        
    winner_supplier = winner_quote.supplier
    
    # Sort all quotes by price ascending to display in comparison chart/table
    sorted_all_quotes = sorted(quotes, key=lambda q: q.price)
    
    # Create comparison JSON blob
    comparison_data = []
    for q in sorted_all_quotes:
        comparison_data.append({
            "supplier_id": q.supplier.id,
            "supplier_name": q.supplier.name,
            "price": q.price,
            "currency": q.currency,
            "lead_time_days": q.lead_time_days,
            "payment_terms": q.payment_terms,
            "rating": q.supplier.rating,
            "delivery_score": q.supplier.delivery_score,
            "risk_level": q.supplier.risk_level,
            "status": q.status
        })
        
    settings = get_agent_settings()
    recipient = settings.get("recipient_email", "sathinath.padhi@petabytz.com")
    
    # Automatically Generate PO Number
    po_idx = 1
    existing_pos = db.query(models.PurchaseOrder.po_number).all()
    if existing_pos:
        existing_indices = []
        for p in existing_pos:
            try:
                parts = p.po_number.split("-")
                if len(parts) >= 3:
                    existing_indices.append(int(parts[-1]))
            except (ValueError, IndexError):
                pass
        if existing_indices:
            po_idx = max(existing_indices) + 1
        else:
            po_idx = len(existing_pos) + 1
    else:
        po_idx = 1
        
    po_number = f"PO-2026-{po_idx:04d}"
    while db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number).first() is not None:
        po_idx += 1
        po_number = f"PO-2026-{po_idx:04d}"
        
    po_qty = rfq.quantity if rfq.quantity is not None else 1.0
    po_price = winner_quote.price if winner_quote.price is not None else 0.0
    new_po = models.PurchaseOrder(
        po_number=po_number,
        rfq_number=rfq_number,
        supplier_id=winner_supplier.id,
        item_name=rfq.item_name or "Unknown Item",
        quantity=po_qty,
        unit_price=po_price,
        total_amount=round(po_qty * po_price, 2),
        status="Sent",
        created_at=datetime.utcnow()
    )
    db.add(new_po)
    
    rfq.status = "PO Generated"
    
    summary_message = (
        f"AI Procurement Agent has completed all negotiations.\n"
        f"Purchase Order {po_number} has been automatically generated and sent to {winner_supplier.name} "
        f"with a final negotiated price of {winner_quote.currency} {winner_quote.price}/unit "
        f"and lead time {winner_quote.lead_time_days} days."
    )
    
    # Write to WorkflowNotification (Mark as approved immediately)
    notification = models.WorkflowNotification(
        rfq_number=rfq_number,
        rfq_item=rfq.item_name,
        type="approval_required",
        status="approved",
        po_number=po_number,
        reviewed_at=datetime.utcnow(),
        recommended_supplier=winner_supplier.name,
        recommended_price=winner_quote.price,
        recommended_currency=winner_quote.currency,
        comparison_json=json.dumps(comparison_data),
        summary_message=summary_message,
        notification_email_sent=True
    )
    db.add(notification)
    
    # Update timeline to indicate auto PO generation
    db.add(models.RFQTimeline(
        rfq_number=rfq_number,
        stage="PO Generated",
        timestamp=datetime.utcnow(),
        details=f"Purchase Order {po_number} successfully generated autonomously and issued to {winner_supplier.name}."
    ))
    db.commit()
    # Refresh new_po so SQLAlchemy loads its relationships (supplier, rfq)
    db.refresh(new_po)

    # Sync Vendor and PO to Odoo ERP (silently)
    try:
        from main import sync_to_odoo_erp
        if not winner_supplier.synced_to_erp or not winner_supplier.erp_vendor_id:
            sync_to_odoo_erp("vendor", str(winner_supplier.id), db)
        
        sync_to_odoo_erp("po", po_number, db)
        logger.info(f"[ERP Sync] Silent Odoo ERP sync succeeded for PO {po_number}")
    except Exception as erp_err:
        logger.error(f"[ERP Sync] Silent Odoo ERP sync failed: {erp_err}")

    # ---------------------------------------------------------------
    # Generate PO PDF and send to SUPPLIER with attachment
    # ---------------------------------------------------------------
    pdf_path = None
    try:
        from pdf_generator import generate_po_pdf_file
        lead_time = f"{winner_quote.lead_time_days} days" if winner_quote.lead_time_days else "As negotiated"
        payment_terms = winner_quote.payment_terms if winner_quote.payment_terms else "Net 45 Days"
        incoterms = winner_quote.incoterms if winner_quote.incoterms else "CIF"

        po_subject = f"Purchase Order Confirmation: {po_number} for {rfq.item_name}"
        po_body = (
            f"Dear {winner_supplier.name} Sales Team,\n\n"
            f"We are pleased to issue Purchase Order {po_number} based on our recent negotiations for {rfq.item_name}.\n\n"
            f"Please find the official Purchase Order document attached as a PDF file to this email.\n\n"
            f"Order Details & Specifications:\n"
            f"- PO Reference: {po_number}\n"
            f"- RFQ Reference: {rfq_number}\n"
            f"- Item: {rfq.item_name}\n"
            f"- Quantity: {rfq.quantity} {rfq.unit}\n"
            f"- Unit Price: {winner_quote.price} USD\n"
            f"- Total Amount: {new_po.total_amount} USD\n"
            f"- Delivery Location: {rfq.delivery_location or 'Yanbu Site'}\n"
            f"- Lead Time: {lead_time}\n"
            f"- Payment Terms: {payment_terms}\n"
            f"- Incoterms: {incoterms}\n\n"
            f"Please review the attached PDF document and reply to confirm order acceptance.\n\n"
            f"Best regards,\n"
            f"AI Procurement Copilot"
        )
        # Route to custom email override if it was used in initial invitation
        winner_email = winner_supplier.email
        custom_invitation = db.query(models.EmailHistory).filter(
            models.EmailHistory.rfq_number == rfq_number,
            models.EmailHistory.supplier_id == winner_supplier.id,
            models.EmailHistory.supplier_email != None
        ).first()
        if custom_invitation:
            winner_email = custom_invitation.supplier_email

        pdf_path = generate_po_pdf_file(new_po, db)
        send_real_email_direct(winner_email, po_subject, po_body, attachment_path=pdf_path)
        logger.info(f"[PO Email] Dispatched PO confirmation email with PDF attachment to {winner_supplier.name} at {winner_email}")
    except Exception as po_mail_err:
        logger.error(f"[PO Email] Failed to dispatch PO email to supplier: {po_mail_err}")

    # ---------------------------------------------------------------
    # Send management summary email to Sathinath (also with PO PDF)
    # ---------------------------------------------------------------
    subject = f"Auto-Released: PO {po_number} for RFQ {rfq_number} - {rfq.item_name}"
    email_body = (
        f"Dear Sathinath,\n\n"
        f"The AI Procurement Agent has completed the negotiation cycles for RFQ {rfq_number} ({rfq.item_name}) and auto-released the Purchase Order.\n\n"
        f"Details:\n"
        f"- PO Reference: {po_number}\n"
        f"- Awarded Vendor: {winner_supplier.name}\n"
        f"- Negotiated Price: {winner_quote.currency} {winner_quote.price}/unit\n"
        f"- Lead Time: {winner_quote.lead_time_days} days\n"
        f"- Total Value: USD {new_po.total_amount}\n\n"
        f"The PO PDF has been generated and is attached to this email for your records.\n"
        f"A copy has also been emailed directly to the supplier ({winner_supplier.email}).\n\n"
        f"Best regards,\n"
        f"AI Procurement Agent"
    )
    send_real_email_direct(recipient, subject, email_body, attachment_path=pdf_path)


def check_and_process_emails(db: Session, raise_on_error: bool = False):
    """Connect to IMAP, find unread emails, extract details, negotiate or compare."""
    imap_server = os.getenv("IMAP_SERVER", "imap.gmail.com")
    try:
        imap_port = int(os.getenv("IMAP_PORT", "993"))
    except ValueError:
        imap_port = 993
    imap_username = os.getenv("IMAP_USERNAME")
    imap_password = os.getenv("IMAP_PASSWORD")

    if not imap_username or not imap_password or "YOUR_EMAIL" in imap_username or "YOUR_APP" in imap_password:
        if raise_on_error:
            raise ValueError("IMAP configuration credentials are not set in .env")
        return

    try:
        # Establish IMAP connection with a 10 second timeout for consistency and reliability
        mail = imaplib.IMAP4_SSL(imap_server, imap_port, timeout=10)
        mail.login(imap_username, imap_password)
        mail.select("inbox")

        # Fetch UNSEEN emails as well as the last 15 messages so emails opened in Gmail Web UI are not missed
        status_unseen, msgs_unseen = mail.search(None, 'UNSEEN')
        unseen_ids = msgs_unseen[0].split() if (status_unseen == "OK" and msgs_unseen[0]) else []

        status_all, msgs_all = mail.search(None, 'ALL')
        all_ids = msgs_all[0].split()[-15:] if (status_all == "OK" and msgs_all[0]) else []

        message_ids = []
        for m_id in unseen_ids + all_ids:
            if m_id not in message_ids:
                message_ids.append(m_id)

        if not message_ids:
            mail.logout()
            return

        logger.info(f"[Automation Engine] Inspecting {len(message_ids)} recent/unread emails...")

        for msg_id in message_ids:
            try:
                res, msg_data = mail.fetch(msg_id, "(RFC822)")
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        # Sender Email
                        from_ = msg.get("From", "")
                        from_email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', from_)
                        if not from_email_match:
                            # Not a valid email header, mark seen and skip
                            mail.store(msg_id, '+FLAGS', '\\Seen')
                            continue
                        sender_email = from_email_match.group(0).strip().lower()

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
                            if not body:
                                # Fallback to HTML if no plain text part is found
                                for part in msg.walk():
                                    content_type = part.get_content_type()
                                    if content_type == "text/html":
                                        payload = part.get_payload(decode=True)
                                        if payload:
                                            body = payload.decode(errors="ignore")
                                            break
                        else:
                            payload = msg.get_payload(decode=True)
                            if payload:
                                body = payload.decode(errors="ignore")

                        body_clean = strip_html_tags(body)

                        # Skip if the email is sent from the agent's own email address to prevent infinite loops
                        if imap_username and sender_email == imap_username.strip().lower():
                            logger.info(f"[Automation Engine] Email is from our own address {sender_email}. Skipping & marking read.")
                            mail.store(msg_id, '+FLAGS', '\\Seen')
                            continue

                        # Match RFQ reference
                        rfq_match = re.search(r'RFQ-[\w-]+', subject, re.IGNORECASE)
                        if not rfq_match:
                            rfq_match = re.search(r'RFQ-[\w-]+', body_clean, re.IGNORECASE)
                        
                        if not rfq_match:
                            # Customer drop-in RFQ (No RFQ-XXXX reference yet)
                            # Check for attachments or RFQ request content
                            attachment_found_rfq = False
                            file_bytes_rfq = None
                            file_name_rfq = ""
                            if msg.is_multipart():
                                for part in msg.walk():
                                    content_disposition = str(part.get("Content-Disposition", ""))
                                    if "attachment" in content_disposition:
                                        fn = part.get_filename()
                                        if fn:
                                            ext = fn.split(".")[-1].lower()
                                            if ext in ["pdf", "docx", "doc", "xlsx", "xls", "txt"]:
                                                file_bytes_rfq = part.get_payload(decode=True)
                                                file_name_rfq = fn
                                                attachment_found_rfq = True
                                                break

                            body_lowered = body_clean.lower()
                            rfq_keywords = ["rfq", "quote", "quotation", "supply", "purchase", "requirement", "need", "price", "order"]
                            is_rfq_inquiry = attachment_found_rfq or any(
                                re.search(rf'\b{k}\b', body_lowered) or re.search(rf'\b{k}\b', subject.lower())
                                for k in rfq_keywords
                            )

                            if is_rfq_inquiry:
                                # Deduplication check: verify if this customer RFQ email was already processed
                                existing_timeline = db.query(models.RFQTimeline).filter(
                                    models.RFQTimeline.details.ilike(f"%{sender_email}%")
                                ).first()
                                if existing_timeline:
                                    logger.info(f"[Automation Engine] RFQ email from {sender_email} already ingested previously. Skipping duplicate.")
                                    mail.store(msg_id, '+FLAGS', '\\Seen')
                                    continue

                                logger.info(f"[Automation Engine] Inbound Customer RFQ detected from {sender_email} (Subject: {subject}, Attachment: {file_name_rfq or 'None'})")
                                
                                extracted_text = ""
                                if attachment_found_rfq and file_bytes_rfq:
                                    from parsers import extract_text_from_file
                                    extracted_text = extract_text_from_file(file_bytes_rfq, file_name_rfq)
                                else:
                                    extracted_text = body_clean

                                from parsers import ai_extract_rfq
                                extracted = ai_extract_rfq(extracted_text, openai_key=os.getenv("OPENAI_API_KEY"))

                                # Generate unique RFQ Number
                                po_idx = 1
                                existing_rfqs = db.query(models.RFQ.rfq_number).all()
                                if existing_rfqs:
                                    existing_indices = []
                                    for r in existing_rfqs:
                                        try:
                                            parts = r.rfq_number.split("-")
                                            if len(parts) >= 3:
                                                existing_indices.append(int(parts[-1]))
                                        except (ValueError, IndexError):
                                            pass
                                    po_idx = (max(existing_indices) + 1) if existing_indices else (len(existing_rfqs) + 1)
                                
                                rfq_number = f"RFQ-2026-{po_idx:04d}"
                                while db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_number).first() is not None:
                                    po_idx += 1
                                    rfq_number = f"RFQ-2026-{po_idx:04d}"

                                item_name = extracted.get("item_name") or "Extracted Procurement Material"
                                quantity = float(extracted.get("quantity") or 100.0)
                                unit = extracted.get("unit") or "Units"

                                new_rfq = models.RFQ(
                                    rfq_number=rfq_number,
                                    project_name=extracted.get("project_name") or f"Customer RFQ - {item_name}",
                                    department=extracted.get("department") or "Procurement",
                                    item_name=item_name,
                                    item_code=extracted.get("item_code"),
                                    description=extracted.get("description") or body_clean,
                                    quantity=quantity,
                                    unit=unit,
                                    specifications=extracted.get("specifications"),
                                    priority=extracted.get("priority") or "Medium",
                                    delivery_location=extracted.get("delivery_location") or "Yanbu Site",
                                    status="Pending Confirmation",
                                    created_at=datetime.utcnow()
                                )
                                db.add(new_rfq)

                                # Match top suppliers
                                all_suppliers = db.query(models.Supplier).all()
                                matched = [
                                    s for s in all_suppliers
                                    if item_name.lower() in (s.products or "").lower() or item_name.lower() in (s.categories or "").lower()
                                ]
                                if len(matched) < 3 and all_suppliers:
                                    sorted_by_rating = sorted(all_suppliers, key=lambda s: s.rating, reverse=True)
                                    for s in sorted_by_rating:
                                        if s not in matched:
                                            matched.append(s)
                                        if len(matched) >= 3:
                                            break

                                # Save timeline event
                                db.add(models.RFQTimeline(
                                    rfq_number=rfq_number,
                                    stage="Created",
                                    timestamp=datetime.utcnow(),
                                    details=f"Inbound customer RFQ received from {sender_email}. Attachment: {file_name_rfq or 'None'}. Matched {len(matched)} suppliers."
                                ))
                                db.commit()

                                # Send 1st Confirmation Email to Customer
                                supplier_lines = "\n".join([
                                    f"- {s.name} (Rating: {s.rating}/5.0, Country: {s.country}, Lead Time: {s.lead_time_days} days)"
                                    for s in matched
                                ])

                                confirm_subject = f"RFQ Ingested: {item_name} ({rfq_number}) - Confirmation Required"
                                confirm_body = (
                                    f"Dear Customer,\n\n"
                                    f"Thank you for reaching out! We have received your RFQ request for '{item_name}' (Quantity: {quantity} {unit}).\n\n"
                                    f"System RFQ Reference: {rfq_number}\n\n"
                                    f"Our AI Procurement Engine has identified the following potential suppliers for your request:\n"
                                    f"{supplier_lines}\n\n"
                                    f"Do you want to start automated procurement & negotiations with these suppliers?\n"
                                    f"Please reply 'YES' to this email to confirm and launch the automated negotiation process.\n\n"
                                    f"Best regards,\n"
                                    f"AI Procurement Agent"
                                )
                                send_real_email_direct(sender_email, confirm_subject, confirm_body)
                                logger.info(f"[Automation Engine] Sent initial RFQ confirmation email to customer {sender_email} for {rfq_number}")

                                mail.store(msg_id, '+FLAGS', '\\Seen')
                                continue
                            else:
                                logger.info(f"[Automation Engine] Email from {sender_email} has no RFQ reference. Skipping & marking read.")
                                mail.store(msg_id, '+FLAGS', '\\Seen')
                                continue

                        rfq_number = rfq_match.group(0).upper()
                        rfq = db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_number).first()
                        if not rfq:
                            # Unknown RFQ, mark seen and skip
                            logger.info(f"[Automation Engine] RFQ {rfq_number} from {sender_email} not found in DB. Skipping & marking read.")
                            mail.store(msg_id, '+FLAGS', '\\Seen')
                            continue

                        # Check if RFQ is awaiting customer confirmation (1st Email reply branch)
                        if rfq.status == "Pending Confirmation":
                            body_lowered = body.lower()
                            positive_keywords = ["yes", "start", "continue", "proceed", "confirm", "ok", "go ahead", "do it", "sure", "please proceed", "yep", "yeah"]
                            negative_keywords = ["no", "cancel", "stop", "don't", "dont", "abort", "reject"]

                            if any(k in body_lowered for k in positive_keywords):
                                logger.info(f"[Automation Engine] Customer {sender_email} confirmed automation start for {rfq_number}")
                                
                                all_suppliers = db.query(models.Supplier).all()
                                matched = [
                                    s for s in all_suppliers
                                    if rfq.item_name.lower() in (s.products or "").lower() or rfq.item_name.lower() in (s.categories or "").lower()
                                ]
                                if len(matched) < 3 and all_suppliers:
                                    sorted_by_rating = sorted(all_suppliers, key=lambda s: s.rating, reverse=True)
                                    for s in sorted_by_rating:
                                        if s not in matched:
                                            matched.append(s)
                                        if len(matched) >= 3:
                                            break

                                rfq.status = "RFQ Sent"

                                for s in matched:
                                    subj = f"RFQ Invitation: {rfq.item_name} ({rfq_number})"
                                    b_msg = (
                                        f"Dear {s.name} Sales Team,\n\n"
                                        f"AI is requesting a quotation for {rfq.quantity} {rfq.unit} of {rfq.item_name}.\n"
                                        f"Required Delivery Location: {rfq.delivery_location or 'Yanbu Site'}\n\n"
                                        f"Please reply directly to this email with your quote (unit price, currency, lead time, and payment terms).\n\n"
                                        f"Best regards,\n"
                                        f"AI Procurement Agent"
                                    )
                                    db.add(models.EmailHistory(
                                        rfq_number=rfq_number,
                                        supplier_id=s.id,
                                        supplier_email=s.email,
                                        subject=subj,
                                        body=b_msg,
                                        type="RFQ Invitation",
                                        sent_at=datetime.utcnow()
                                    ))
                                    try:
                                        send_real_email_direct(s.email, subj, b_msg)
                                    except Exception as e_err:
                                        logger.error(f"[Automation Engine] Error sending outreach to supplier {s.name}: {e_err}")

                                db.add(models.RFQTimeline(
                                    rfq_number=rfq_number,
                                    stage="RFQ Sent",
                                    timestamp=datetime.utcnow(),
                                    details=f"Customer confirmed RFQ via email. Automated procurement campaign launched to {len(matched)} suppliers."
                                ))
                                db.commit()

                                cust_reply_subj = f"RE: {subject}" if not subject.lower().startswith("re:") else subject
                                cust_reply_body = (
                                    f"Dear Customer,\n\n"
                                    f"Thank you for your confirmation!\n\n"
                                    f"Automated procurement negotiations have been initiated for {rfq_number} ({rfq.item_name}).\n"
                                    f"Our AI Agent has dispatched RFQ requests to {len(matched)} matched suppliers:\n"
                                    + "\n".join([f"- {s.name}" for s in matched]) +
                                    f"\n\nWe will negotiate the best prices and terms automatically and notify you once final offers are ready.\n\n"
                                    f"Best regards,\n"
                                    f"AI Procurement Agent"
                                )
                                send_real_email_direct(sender_email, cust_reply_subj, cust_reply_body)
                                mail.store(msg_id, '+FLAGS', '\\Seen')
                                continue

                            elif any(k in body_lowered for k in negative_keywords):
                                logger.info(f"[Automation Engine] Customer {sender_email} cancelled RFQ {rfq_number}")
                                rfq.status = "Cancelled"
                                db.add(models.RFQTimeline(
                                    rfq_number=rfq_number,
                                    stage="Created",
                                    timestamp=datetime.utcnow(),
                                    details=f"Customer cancelled RFQ automation via email."
                                ))
                                db.commit()

                                cust_reply_subj = f"RE: {subject}" if not subject.lower().startswith("re:") else subject
                                cust_reply_body = (
                                    f"Dear Customer,\n\n"
                                    f"Understood. The automated procurement process for {rfq_number} ({rfq.item_name}) has been cancelled.\n\n"
                                    f"Best regards,\n"
                                    f"AI Procurement Agent"
                                )
                                send_real_email_direct(sender_email, cust_reply_subj, cust_reply_body)
                                mail.store(msg_id, '+FLAGS', '\\Seen')
                                continue

                        if rfq.status in ["Under Comparison", "Closed", "Approved", "PO Generated"]:
                            logger.info(f"[Automation Engine] RFQ {rfq_number} is already completed/closed (status: {rfq.status}). Skipping reply from {sender_email}.")
                            mail.store(msg_id, '+FLAGS', '\\Seen')
                            continue

                        # Find Supplier matching this email address that was invited for this RFQ
                        supplier = None
                        invited_record = db.query(models.EmailHistory).filter(
                            models.EmailHistory.rfq_number == rfq_number,
                            models.EmailHistory.supplier_email.ilike(sender_email)
                        ).first()
                        if invited_record:
                            supplier = db.query(models.Supplier).filter(models.Supplier.id == invited_record.supplier_id).first()
                            
                        if not supplier:
                            suppliers = db.query(models.Supplier).filter(models.Supplier.email.ilike(sender_email)).all()
                            for s in suppliers:
                                invited = db.query(models.EmailHistory).filter_by(
                                    rfq_number=rfq_number,
                                    supplier_id=s.id,
                                    type="RFQ Invitation"
                                ).first()
                                if invited:
                                    supplier = s
                                    break
                            if not supplier and suppliers:
                                supplier = suppliers[0]

                        if not supplier:
                            # Not a supplier we know, mark seen and skip
                            logger.info(f"[Automation Engine] Email from {sender_email} is not a known supplier. Skipping & marking read.")
                            mail.store(msg_id, '+FLAGS', '\\Seen')
                            continue

                        logger.info(f"[Automation Engine] Processing incoming reply from {supplier.name} for RFQ {rfq_number}")

                        # Deduplication check: check if this exact email body has already been logged as inbound for this rfq & supplier
                        existing_log = db.query(models.NegotiationLog).filter_by(
                            rfq_number=rfq_number,
                            supplier_id=supplier.id,
                            direction="inbound",
                            body=body
                        ).first()
                        if existing_log:
                            logger.info(f"[Automation Engine] Supplier reply from {sender_email} on {rfq_number} already ingested. Skipping.")
                            mail.store(msg_id, '+FLAGS', '\\Seen')
                            continue

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
                        is_agreed = quote_data.get("agreed", False)

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

                        elif is_agreed:
                            inbound_log.is_final = True
                            
                            # Save/Update the final QuoteResponse status as Quotation Received
                            existing_quote = db.query(models.QuoteResponse).filter_by(
                                rfq_number=rfq_number,
                                supplier_id=supplier.id
                            ).first()
                            if existing_quote:
                                existing_quote.price = price
                                existing_quote.currency = currency
                                existing_quote.lead_time_days = lead_time
                                existing_quote.status = "Quotation Received"
                                existing_quote.responded_at = datetime.utcnow()
                            else:
                                new_quote = models.QuoteResponse(
                                    rfq_number=rfq_number,
                                    supplier_id=supplier.id,
                                    price=price or 0.0,
                                    currency=currency,
                                    lead_time_days=lead_time,
                                    moq=1.0,
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
                                details=f"{supplier.name} agreed to target price. Final bid: {currency} {price}/unit."
                            ))
                            db.commit()
                            logger.info(f"Supplier {supplier.name} agreed to target price on RFQ {rfq_number}.")
                            
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
                            
                            # Route to custom email override if it was used in initial invitation
                            recipient_email = supplier.email
                            custom_invitation = db.query(models.EmailHistory).filter(
                                models.EmailHistory.rfq_number == rfq_number,
                                models.EmailHistory.supplier_id == supplier.id,
                                models.EmailHistory.supplier_email != None
                            ).first()
                            if custom_invitation:
                                recipient_email = custom_invitation.supplier_email

                            # Send counter-offer email
                            sent_ok = send_real_email_direct(recipient_email, outbound_subject, outbound_body)
                            
                            # Save Outbound Negotiation Log
                            outbound_log = models.NegotiationLog(
                                rfq_number=rfq_number,
                                supplier_id=supplier.id,
                                supplier_email=recipient_email,
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
            except Exception as msg_err:
                db.rollback()
                logger.error(f"[Automation Engine] Error processing email ID {msg_id}: {msg_err}")
                # We do NOT mark seen, so it can be retried on next poll

        mail.close()
        mail.logout()
    except Exception as e:
        logger.error(f"[Automation Engine] Error during IMAP loop check: {e}")
        if raise_on_error:
            raise e


def process_inbound_supplier_reply(db: Session, rfq_number: str, supplier_id: int, price: float, lead_time: int, payment_terms: str = "Net 45 Days", rejected: bool = False, agreed: bool = False, to_email_override: str = None) -> dict:
    """Reusable logic for processing an inbound supplier quotation email/reply."""
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    rfq = db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_number).first()
    if not supplier or not rfq:
        return {"success": False, "error": "Supplier or RFQ not found"}
        
    if rfq.status in ["Under Comparison", "Closed", "Approved"]:
        return {"success": False, "error": f"RFQ {rfq_number} is already completed/closed (status: {rfq.status})"}
        
    current_round = db.query(models.NegotiationLog).filter_by(
        rfq_number=rfq_number,
        supplier_id=supplier.id,
        direction="inbound"
    ).count() + 1
    
    # Save Inbound Log
    inbound_log = models.NegotiationLog(
        rfq_number=rfq_number,
        supplier_id=supplier.id,
        supplier_email=supplier.email,
        round_number=current_round,
        direction="inbound",
        subject=f"RE: RFQ Invitation: {rfq.item_name} ({rfq_number})",
        body=f"Dear team, we quote {price} USD/unit. Delivery in {lead_time} days. Terms: {payment_terms}." if not rejected else "Sorry, we cannot match this target price. Cancel our bid.",
        extracted_price=price,
        extracted_currency="USD",
        extracted_lead_time=lead_time,
        sent_at=datetime.utcnow(),
        reply_received=True,
        is_final=False
    )
    db.add(inbound_log)
    db.commit()
    
    settings = get_agent_settings()
    max_rounds = int(settings.get("max_negotiation_rounds", 3))
    
    if rejected:
        inbound_log.is_final = True
        existing_quote = db.query(models.QuoteResponse).filter_by(
            rfq_number=rfq_number,
            supplier_id=supplier.id
        ).first()
        if existing_quote:
            existing_quote.status = "Cancelled"
            existing_quote.price = price
        else:
            db.add(models.QuoteResponse(
                rfq_number=rfq_number,
                supplier_id=supplier.id,
                price=price,
                currency="USD",
                lead_time_days=lead_time,
                moq=1.0,
                payment_terms="Cancelled",
                incoterms="Cancelled",
                responded_at=datetime.utcnow(),
                status="Cancelled"
            ))
        db.add(models.RFQTimeline(
            rfq_number=rfq_number,
            stage="Supplier Responded",
            timestamp=datetime.utcnow(),
            details=f"{supplier.name} rejected target price or cancelled negotiation. Final: USD {price}."
        ))
        db.commit()
    elif agreed:
        inbound_log.is_final = True
        existing_quote = db.query(models.QuoteResponse).filter_by(
            rfq_number=rfq_number,
            supplier_id=supplier.id
        ).first()
        if existing_quote:
            existing_quote.price = price
            existing_quote.lead_time_days = lead_time
            existing_quote.payment_terms = payment_terms
            existing_quote.status = "Quotation Received"
        else:
            db.add(models.QuoteResponse(
                rfq_number=rfq_number,
                supplier_id=supplier.id,
                price=price,
                currency="USD",
                lead_time_days=lead_time,
                moq=1.0,
                payment_terms=payment_terms,
                incoterms="CIF",
                responded_at=datetime.utcnow(),
                status="Quotation Received"
            ))
        db.add(models.RFQTimeline(
            rfq_number=rfq_number,
            stage="Supplier Responded",
            timestamp=datetime.utcnow(),
            details=f"{supplier.name} agreed to target price. Final bid: USD {price}/unit."
        ))
        db.commit()
    elif current_round < max_rounds:
        negotiation_res = generate_ai_counter_offer(rfq.item_name, supplier.name, price, "USD", current_round)
        outbound_body = negotiation_res.get("body")
        target_price = negotiation_res.get("target_price")
        outbound_subject = f"RE: RFQ Invitation: {rfq.item_name} ({rfq_number})"
        
        dispatch_email = to_email_override or supplier.email
        sent_ok = send_real_email_direct(dispatch_email, outbound_subject, outbound_body)
        logger.info(f"Counter-offer dispatched to {dispatch_email} for {supplier.name} — sent_ok={sent_ok}")
        
        db.add(models.NegotiationLog(
            rfq_number=rfq_number,
            supplier_id=supplier.id,
            supplier_email=supplier.email,
            round_number=current_round,
            direction="outbound",
            subject=outbound_subject,
            body=outbound_body,
            extracted_price=target_price,
            extracted_currency="USD",
            extracted_lead_time=lead_time,
            sent_at=datetime.utcnow(),
            reply_received=False,
            is_final=False
        ))
        db.add(models.RFQTimeline(
            rfq_number=rfq_number,
            stage="RFQ Sent",
            timestamp=datetime.utcnow(),
            details=f"AI Agent Counter-Offer (Round {current_round}) sent to {supplier.name}. Proposing USD {target_price}/unit."
        ))
        db.commit()
    else:
        inbound_log.is_final = True
        existing_quote = db.query(models.QuoteResponse).filter_by(
            rfq_number=rfq_number,
            supplier_id=supplier.id
        ).first()
        if existing_quote:
            existing_quote.price = price
            existing_quote.lead_time_days = lead_time
            existing_quote.payment_terms = payment_terms
            existing_quote.status = "Quotation Received"
        else:
            db.add(models.QuoteResponse(
                rfq_number=rfq_number,
                supplier_id=supplier.id,
                price=price,
                currency="USD",
                lead_time_days=lead_time,
                moq=1.0,
                payment_terms=payment_terms,
                incoterms="CIF",
                responded_at=datetime.utcnow(),
                status="Quotation Received"
            ))
        db.add(models.RFQTimeline(
            rfq_number=rfq_number,
            stage="Supplier Responded",
            timestamp=datetime.utcnow(),
            details=f"Negotiation with {supplier.name} completed. Final bid: USD {price}/unit."
        ))
        db.commit()
        
    # Check if all invited suppliers have responded to all rounds
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
        run_comparison_and_notify(db, rfq_number)
        
    return {"success": True}


def trigger_auto_supplier_reply(db: Session, rfq: models.RFQ, supplier_id: int, round_num: int):
    """Automatically decide supplier pricing and inject a mock reply."""
    import random
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        return
        
    # Get standard price calculation
    base_price = 100.0
    item_name_lower = rfq.item_name.lower()
    if "pvc resin" in item_name_lower:
        base_price = 1000.0
    elif "hdpe" in item_name_lower:
        base_price = 1150.0
    elif "ldpe" in item_name_lower:
        base_price = 1300.0
    elif "calcium" in item_name_lower:
        base_price = 150.0
    elif "titanium" in item_name_lower:
        base_price = 2800.0
    elif "plasticizer" in item_name_lower:
        base_price = 1400.0
    else:
        base_price = 250.0
        
    # Competitiveness
    comp = supplier.price_competitiveness if supplier.price_competitiveness else 85
    price_factor = 1.0 - (comp - 80) / 400.0
    
    # Check if there is a previous negotiation log to base price on
    last_outbound = db.query(models.NegotiationLog).filter_by(
        rfq_number=rfq.rfq_number,
        supplier_id=supplier_id,
        direction="outbound"
    ).order_by(models.NegotiationLog.sent_at.desc()).first()
    
    last_inbound = db.query(models.NegotiationLog).filter_by(
        rfq_number=rfq.rfq_number,
        supplier_id=supplier_id,
        direction="inbound"
    ).order_by(models.NegotiationLog.sent_at.desc()).first()
    
    settings = get_agent_settings()
    max_rounds = int(settings.get("max_negotiation_rounds", 3))
    
    price = 0.0
    lead_time = int(supplier.lead_time_days) if supplier.lead_time_days else 8
    agreed = False
    rejected = False
    
    if round_num == 1:
        # Supplier first quote
        price = round(base_price * price_factor * random.uniform(0.97, 1.04), 2)
    else:
        if last_outbound:
            target_price = last_outbound.extracted_price
            last_supplier_price = last_inbound.extracted_price if last_inbound else price
            
            # Decide to agree, reject, or counter
            if round_num >= max_rounds:
                # On final round, high chance of agreeing or slightly adjusting to target
                if random.random() < 0.85:
                    price = target_price
                    agreed = True
                else:
                    price = round(target_price * random.uniform(1.01, 1.03), 2)
            else:
                # Intermediate round
                if random.random() < 0.4:
                    price = target_price
                    agreed = True
                elif random.random() < 0.1:
                    price = last_supplier_price
                    rejected = True
                else:
                    price = round((last_supplier_price + target_price) / 2.0, 2)
        else:
            price = round(base_price * price_factor * random.uniform(0.95, 1.02), 2)
            
    logger.info(f"[Auto-Simulator] Decided bid for {supplier.name} - Price: {price}, Agreed: {agreed}, Rejected: {rejected}")
    process_inbound_supplier_reply(
        db=db,
        rfq_number=rfq.rfq_number,
        supplier_id=supplier_id,
        price=price,
        lead_time=lead_time,
        payment_terms="Net 45 Days",
        rejected=rejected,
        agreed=agreed
    )


def auto_simulate_campaigns(db: Session):
    """Automatically simulate supplier replies for active campaigns if auto-simulation is enabled."""
    settings = get_agent_settings()
    if not settings.get("auto_simulate_suppliers", True):
        return
        
    delay = int(settings.get("simulation_delay_seconds", 40))
    
    # Find all RFQs that are in "Outreach Sent" status
    active_rfqs = db.query(models.RFQ).filter(models.RFQ.status == "Outreach Sent").all()
    
    for rfq in active_rfqs:
        # Find all suppliers invited to this RFQ campaign
        invited = db.query(models.EmailHistory).filter(
            models.EmailHistory.rfq_number == rfq.rfq_number,
            models.EmailHistory.type == "RFQ Invitation"
        ).all()
        
        invited_supplier_ids = [e.supplier_id for e in invited]
        
        for supplier_id in invited_supplier_ids:
            # Check if this supplier has already completed negotiation (is_final in NegotiationLog)
            has_final = db.query(models.NegotiationLog).filter_by(
                rfq_number=rfq.rfq_number,
                supplier_id=supplier_id,
                is_final=True
            ).first()
            if has_final:
                continue
                
            # Get all negotiation logs for this supplier
            logs = db.query(models.NegotiationLog).filter_by(
                rfq_number=rfq.rfq_number,
                supplier_id=supplier_id
            ).order_by(models.NegotiationLog.sent_at.desc()).all()
            
            # Find the last log entry
            if not logs:
                # No logs yet, check if invitation email was sent
                invitation = db.query(models.EmailHistory).filter_by(
                    rfq_number=rfq.rfq_number,
                    supplier_id=supplier_id,
                    type="RFQ Invitation"
                ).order_by(models.EmailHistory.sent_at.desc()).first()
                
                if invitation:
                    time_passed = (datetime.utcnow() - invitation.sent_at).total_seconds()
                    if time_passed >= delay:
                        logger.info(f"[Auto-Simulator] Injecting initial reply for Supplier {supplier_id} on RFQ {rfq.rfq_number} (time passed: {time_passed}s)")
                        trigger_auto_supplier_reply(db, rfq, supplier_id, round_num=1)
            else:
                last_log = logs[0]
                if last_log.direction == "outbound":
                    # Last message was sent by the AI Agent. We are waiting for supplier reply.
                    time_passed = (datetime.utcnow() - last_log.sent_at).total_seconds()
                    if time_passed >= delay:
                        round_num = last_log.round_number
                        logger.info(f"[Auto-Simulator] Injecting round {round_num} reply for Supplier {supplier_id} on RFQ {rfq.rfq_number} (time passed: {time_passed}s)")
                        trigger_auto_supplier_reply(db, rfq, supplier_id, round_num=round_num + 1)


def worker_loop():
    """Background worker loop polling every 10 seconds."""
    logger.info("Starting background IMAP worker thread...")
    while True:
        try:
            db = SessionLocal()
            check_and_process_emails(db)
            auto_simulate_campaigns(db)
            db.close()
        except Exception as err:
            logger.error(f"Error in background worker thread: {err}")
        # Poll every 10 seconds to avoid Gmail connection limits and rate-limiting
        time.sleep(10)


def start_background_worker():
    """Spawn background thread if not already running."""
    worker_thread = threading.Thread(target=worker_loop, daemon=True, name="IMAPAutomationWorker")
    worker_thread.start()
    logger.info("Background IMAP worker thread started successfully.")

