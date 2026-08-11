import sys
import os
from dotenv import load_dotenv
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()
from automation_engine import send_real_email_direct

recipient = "sathinath.padhi@petabytz.com"
subject = "Test Email from AI Agent"
body = "Hello! This is a test email sent from the AI Procurement Agent scratch script to verify email delivery."

print(f"Sending email to {recipient}...")
result = send_real_email_direct(recipient, subject, body)
print(f"Result: {result}")
