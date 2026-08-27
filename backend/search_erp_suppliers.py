import os
import sys
import xmlrpc.client
import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Set global connection timeout
socket.setdefaulttimeout(15)

# Ensure backend directory is in path
sys.path.append(os.path.dirname(__file__))

load_dotenv(override=True)

# Email Recipients
RECIPIENTS = [
    "sathinath.padhi@petabytz.com",
    "sathinath.padhi@softstandard.com",
    "ashok.kumar@petabytz.com"
]

# SMTP Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

# Odoo ERP Configuration
ODOO_URL = os.getenv("ODOO_URL")
ODOO_DB = os.getenv("ODOO_DB")
ODOO_USERNAME = os.getenv("ODOO_USERNAME")
ODOO_PASSWORD = os.getenv("ODOO_PASSWORD")

def search_odoo_suppliers():
    """Connect to Odoo ERP and fetch contacts/suppliers."""
    if not ODOO_URL or not ODOO_DB or not ODOO_USERNAME or not ODOO_PASSWORD:
        print("[WARNING] Odoo credentials not fully configured in env.")
        return get_local_database_suppliers()
        
    url = ODOO_URL.strip().rstrip("/")
    db_name = ODOO_DB.strip()
    username = ODOO_USERNAME.strip()
    password = ODOO_PASSWORD.strip()
    
    print(f"Connecting to Odoo ERP at {url}...")
    try:
        common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
        uid = common.authenticate(db_name, username, password, {})
        
        if not uid:
            print("[WARNING] Authentication failed on Odoo ERP. Using local database fallback...")
            return get_local_database_suppliers()
            
        print(f"Authenticated successfully! User ID: {uid}")
        models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")
        
        # Search for partners with non-empty emails.
        # We try to search for suppliers if ranking is available, otherwise fetch active partners with email
        try:
            # Check for partners with non-empty email
            partners = models.execute_kw(
                db_name, uid, password, 'res.partner', 'search_read',
                [[['email', '!=', False]]],
                {'fields': ['name', 'email', 'phone', 'supplier_rank'], 'limit': 50}
            )
        except Exception:
            # Fallback if supplier_rank is not a field in this Odoo version
            partners = models.execute_kw(
                db_name, uid, password, 'res.partner', 'search_read',
                [[['email', '!=', False]]],
                {'fields': ['name', 'email', 'phone'], 'limit': 50}
            )
            
        suppliers_list = []
        for p in partners:
            suppliers_list.append({
                "name": p.get("name", "Unknown Name"),
                "email": p.get("email", ""),
                "phone": p.get("phone") or "N/A",
                "source": "Odoo ERP"
            })
            
        print(f"Successfully retrieved {len(suppliers_list)} suppliers/contacts from Odoo ERP.")
        return suppliers_list, "Odoo ERP Live Search"
        
    except Exception as e:
        print(f"[WARNING] Error connecting to Odoo ERP: {e}. Falling back to local database...")
        return get_local_database_suppliers()

def get_local_database_suppliers():
    """Retrieve suppliers from local database if Odoo ERP is unavailable."""
    from database import SessionLocal
    import models
    
    db = SessionLocal()
    try:
        db_suppliers = db.query(models.Supplier).all()
        suppliers_list = []
        for s in db_suppliers:
            suppliers_list.append({
                "name": s.name,
                "email": s.email,
                "phone": s.phone or "N/A",
                "source": "Local Procurement DB"
            })
        print(f"Successfully retrieved {len(suppliers_list)} suppliers from Local Database.")
        return suppliers_list, "Local Database (ERP Connection Offline)"
    except Exception as e:
        print(f"Error fetching from local database: {e}")
        return [], "None"
    finally:
        db.close()

def send_suppliers_email(suppliers, source_name):
    """Format the supplier list and send it to all recipients."""
    if not suppliers:
        print("No suppliers found to send.")
        return False
        
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("Error: SMTP credentials are not configured in your .env file!")
        return False

    # Format the table in HTML for premium aesthetics
    table_rows = ""
    for i, s in enumerate(suppliers, 1):
        bg_color = "#f9f9f9" if i % 2 == 0 else "#ffffff"
        table_rows += f"""
        <tr style="background-color: {bg_color};">
            <td style="padding: 12px; border: 1px solid #ddd; text-align: left; font-weight: bold; color: #333;">{s['name']}</td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align: left; color: #0066cc;"><a href="mailto:{s['email']}">{s['email']}</a></td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align: left; color: #555;">{s['phone']}</td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align: center;"><span style="background-color: #e6f7ff; color: #1890ff; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">{s['source']}</span></td>
        </tr>
        """

    html_content = f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f6f9;">
        <div style="max-width: 800px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-top: 4px solid #1890ff;">
            <h2 style="color: #111; margin-top: 0; font-size: 24px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">ERP Supplier Search Results</h2>
            <p style="font-size: 16px; color: #555;">
                Hello,
            </p>
            <p style="font-size: 16px; color: #555;">
                Below is the list of active suppliers retrieved automatically via the **ProcureX** integration pipeline.
            </p>
            <p style="font-size: 14px; color: #888;">
                <strong>Source:</strong> {source_name}
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; font-size: 14px;">
                <thead>
                    <tr style="background-color: #1890ff; color: #ffffff;">
                        <th style="padding: 12px; border: 1px solid #1890ff; text-align: left;">Supplier Name</th>
                        <th style="padding: 12px; border: 1px solid #1890ff; text-align: left;">Email Address</th>
                        <th style="padding: 12px; border: 1px solid #1890ff; text-align: left;">Phone Number</th>
                        <th style="padding: 12px; border: 1px solid #1890ff; text-align: center;">Source</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows}
                </tbody>
            </table>
            
            <p style="font-size: 15px; color: #555; margin-top: 30px;">
                If you have any questions or require additional details, please reply directly.
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
                ProcureX &bull; Autonomous Integration Lab
            </p>
        </div>
    </body>
    </html>
    """

    # Send email
    subject = f"ERP Sync Alert: Automated Supplier List - {source_name}"
    
    try:
        print(f"Connecting to SMTP Server to send email to {', '.join(RECIPIENTS)}...")
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        
        for recipient in RECIPIENTS:
            msg = MIMEMultipart()
            msg['From'] = f"\"ProcureX ERP Copilot\" <{SMTP_USERNAME}>"
            msg['To'] = recipient
            msg['Subject'] = subject
            msg.attach(MIMEText(html_content, 'html'))
            
            server.sendmail(SMTP_USERNAME, recipient, msg.as_string())
            print(f"[OK] Email sent to {recipient}")
            
        server.close()
        print("[OK] All emails dispatched successfully!")
        return True
    except Exception as e:
        print(f"[FAIL] SMTP Transmission failed: {e}")
        return False

if __name__ == "__main__":
    print("=================================================================")
    print("      AUTOMATED ERP SUPPLIER SEARCH & NOTIFICATION PIPELINE     ")
    print("=================================================================")
    
    suppliers, source_name = search_odoo_suppliers()
    if suppliers:
        success = send_suppliers_email(suppliers, source_name)
        if success:
            print("\nWorkflow completed successfully.")
            sys.exit(0)
        else:
            print("\nWorkflow completed with errors during email sending.")
            sys.exit(1)
    else:
        print("\nNo suppliers found.")
        sys.exit(1)
