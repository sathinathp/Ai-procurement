import sys
import os
import imaplib
import email
from email.header import decode_header
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

imap_server = os.getenv("IMAP_SERVER", "imap.gmail.com")
imap_port = int(os.getenv("IMAP_PORT", "993"))
imap_username = os.getenv("IMAP_USERNAME")
imap_password = os.getenv("IMAP_PASSWORD")

print(f"Connecting to IMAP {imap_server}:{imap_port}...")
mail = imaplib.IMAP4_SSL(imap_server, imap_port)
mail.login(imap_username, imap_password)
mail.select("inbox")

print("Fetching last 10 emails...")
status, messages = mail.search(None, "ALL")
if status == "OK" and messages[0]:
    mail_ids = messages[0].split()
    last_ids = mail_ids[-10:]
    for m_id in reversed(last_ids):
        res, msg_data = mail.fetch(m_id, "(RFC822)")
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1])
                
                # Decode subject
                subject, encoding = decode_header(msg["Subject"])[0]
                if isinstance(subject, bytes):
                    subject = subject.decode(encoding or "utf-8", errors="ignore")
                
                # Decode from
                from_header, encoding = decode_header(msg["From"])[0]
                if isinstance(from_header, bytes):
                    from_header = from_header.decode(encoding or "utf-8", errors="ignore")
                    
                date_header = msg["Date"]
                
                print(f"ID: {m_id.decode()} | Date: {date_header} | From: {from_header} | Subject: {subject}")
else:
    print("No emails found or search failed.")

mail.close()
mail.logout()
