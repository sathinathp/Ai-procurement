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
try:
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
except (ValueError, TypeError):
    SMTP_PORT = 587
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
        models_server = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")
        
        # Search for partners with non-empty emails.
        try:
            partners = models_server.execute_kw(
                db_name, uid, password, 'res.partner', 'search_read',
                [[['email', '!=', False]]],
                {'fields': ['name', 'email', 'phone', 'supplier_rank'], 'limit': 50}
            )
        except Exception:
            partners = models_server.execute_kw(
                db_name, uid, password, 'res.partner', 'search_read',
                [[['email', '!=', False]]],
                {'fields': ['name', 'email', 'phone'], 'limit': 50}
            )
            
        suppliers_list = []
        from database import SessionLocal
        import models
        db = SessionLocal()
        try:
            for p in partners:
                email = p.get("email", "")
                name = p.get("name", "")
                # Try to find locally for better classification
                local_s = db.query(models.Supplier).filter(
                    (models.Supplier.email.ilike(email)) | (models.Supplier.name == name)
                ).first()
                
                category = "Other Approved Suppliers"
                if local_s:
                    if local_s.preferred:
                        category = "Preferred Suppliers"
                    else:
                        po_count = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.supplier_id == local_s.id).count()
                        if po_count > 0:
                            category = "Previously Used Suppliers"
                
                suppliers_list.append({
                    "name": p.get("name", "Unknown Name"),
                    "email": email,
                    "phone": p.get("phone") or "N/A",
                    "source": "Odoo ERP",
                    "category": category
                })
        finally:
            db.close()
            
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
            category = "New Supplier Candidates"
            if s.preferred:
                category = "Preferred Suppliers"
            else:
                po_count = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.supplier_id == s.id).count()
                if po_count > 0:
                    category = "Previously Used Suppliers"
                elif s.synced_to_erp or s.erp_vendor_id is not None:
                    category = "Other Approved Suppliers"
            
            suppliers_list.append({
                "name": s.name,
                "email": s.email,
                "phone": s.phone or "N/A",
                "source": "Local Procurement DB",
                "category": category
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

    # Group suppliers by category
    categories = {
        "Preferred Suppliers": [],
        "Previously Used Suppliers": [],
        "Other Approved Suppliers": [],
        "New Supplier Candidates": []
    }
    
    for s in suppliers:
        cat = s.get("category", "New Supplier Candidates")
        if cat in categories:
            categories[cat].append(s)
        else:
            categories["New Supplier Candidates"].append(s)
            
    # Generate tables for each category
    tables_html = ""
    for category_name, list_sups in categories.items():
        if not list_sups:
            tables_html += f"""
            <div style="margin-top: 25px; margin-bottom: 15px;">
                <h3 style="color: #475569; font-size: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px; margin-bottom: 10px;">
                    {category_name} <span style="font-size: 11px; color: #94a3b8; font-weight: normal;">(0 suppliers found)</span>
                </h3>
                <p style="font-size: 12px; color: #94a3b8; font-style: italic; margin: 0; padding: 12px; background-color: #f8fafc; border-radius: 8px; border: 1px dashed #e2e8f0;">No suppliers match this segment in current query results.</p>
            </div>
            """
            continue
            
        table_rows = ""
        badge_bg = "#fff7ed"
        badge_text = "#c2410c"
        if category_name == "Preferred Suppliers":
            badge_bg = "#fef3c7"
            badge_text = "#b45309"
        elif category_name == "Previously Used Suppliers":
            badge_bg = "#dbeafe"
            badge_text = "#1d4ed8"
        elif category_name == "Other Approved Suppliers":
            badge_bg = "#f1f5f9"
            badge_text = "#475569"
        else:
            badge_bg = "#d1fae5"
            badge_text = "#047857"
            
        for i, s in enumerate(list_sups, 1):
            bg_color = "#f8fafc" if i % 2 == 0 else "#ffffff"
            table_rows += f"""
            <tr style="background-color: {bg_color};">
                <td style="padding: 10px 12px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: #1e293b;">{s['name']}</td>
                <td style="padding: 10px 12px; border: 1px solid #e2e8f0; text-align: left; color: #2563eb;"><a href="mailto:{s['email']}" style="color: #2563eb; text-decoration: none;">{s['email']}</a></td>
                <td style="padding: 10px 12px; border: 1px solid #e2e8f0; text-align: left; color: #64748b;">{s['phone']}</td>
                <td style="padding: 10px 12px; border: 1px solid #e2e8f0; text-align: center;"><span style="background-color: {badge_bg}; color: {badge_text}; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; display: inline-block; border: 1px solid rgba(0,0,0,0.05);">{s['source']}</span></td>
            </tr>
            """
            
        tables_html += f"""
        <div style="margin-top: 25px; margin-bottom: 15px;">
            <h3 style="color: #0f172a; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">
                {category_name} <span style="font-size: 12px; color: #64748b; font-weight: normal;">({len(list_sups)} suppliers)</span>
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background-color: #f1f5f9; color: #475569;">
                        <th style="padding: 10px 12px; border: 1px solid #e2e8f0; text-align: left;">Supplier Name</th>
                        <th style="padding: 10px 12px; border: 1px solid #e2e8f0; text-align: left;">Email Address</th>
                        <th style="padding: 10px 12px; border: 1px solid #e2e8f0; text-align: left;">Phone Number</th>
                        <th style="padding: 10px 12px; border: 1px solid #e2e8f0; text-align: center;">Source</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows}
                </tbody>
            </table>
        </div>
        """

    html_content = f"""
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #334155; margin: 0; padding: 20px; background-color: #f8fafc;">
        <div style="max-width: 800px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border-top: 5px solid #2563eb;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">ERP Supplier Synchronization Report</h2>
            <p style="font-size: 15px; color: #475569;">
                Hello,
            </p>
            <p style="font-size: 15px; color: #475569;">
                Below is the structured list of active suppliers synchronized via the **ProcureX** ERP integration pipeline, grouped by procurement eligibility segment.
            </p>
            <p style="font-size: 13px; color: #64748b;">
                <strong>Source Connection:</strong> {source_name}
            </p>
            
            {tables_html}
            
            <p style="font-size: 14px; color: #475569; margin-top: 30px;">
                If you have any questions or require additional details, please reply directly.
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; letter-spacing: 0.5px;">
                PROCUREX &bull; AUTONOMOUS PROCUREMENT ENGINE
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
