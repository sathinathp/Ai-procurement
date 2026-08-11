import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv()

from automation_engine import send_real_email_direct

to_email = "sathinath.padhi@petabytz.com"
subject = "Test Email from AI Procurement Copilot"
body = "This is a test email to verify SMTP configuration."

print("Attempting to send email to:", to_email)
success = send_real_email_direct(to_email, subject, body)
print("SMTP send status:", success)
