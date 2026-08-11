import sys
import os
import imaplib
import email
from email.header import decode_header
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

imap_server = os.getenv("IMAP_SERVER", "imap.gmail.com")
imap_username = os.getenv("IMAP_USERNAME")
imap_password = os.getenv("IMAP_PASSWORD")

mail = imaplib.IMAP4_SSL(imap_server)
mail.login(imap_username, imap_password)
mail.select("inbox")

# Fetch ID 109, 108, 105, 101 which are failures
for m_id in ["110", "109", "108", "105", "101"]:
    status, msg_data = mail.fetch(m_id, "(RFC822)")
    for response_part in msg_data:
        if isinstance(response_part, tuple):
            msg = email.message_from_bytes(response_part[1])
            subject, _ = decode_header(msg["Subject"])[0]
            if isinstance(subject, bytes):
                subject = subject.decode(errors="ignore")
            
            # Print body of failure notification
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    content_type = part.get_content_type()
                    content_disposition = str(part.get("Content-Disposition"))
                    if content_type == "text/plain" and "attachment" not in content_disposition:
                        body = part.get_payload(decode=True).decode(errors="ignore")
                        break
            else:
                body = msg.get_payload(decode=True).decode(errors="ignore")
                
            print(f"\n======================================")
            print(f"ID: {m_id} | Subject: {subject}")
            print(f"--------------------------------------")
            # Print first 10 lines of body
            lines = body.split("\n")
            print("\n".join(lines[:15]))
            print(f"======================================")

mail.close()
mail.logout()
