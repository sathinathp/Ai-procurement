import os
import xmlrpc.client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

url = os.getenv("ODOO_URL")
db_name = os.getenv("ODOO_DB")
username = os.getenv("ODOO_USERNAME")
password = os.getenv("ODOO_PASSWORD")

if not url or not db_name or not username or not password:
    print("[ERROR] Odoo credentials not found in .env")
    exit(1)

url = url.strip().rstrip("/")
db_name = db_name.strip()
username = username.strip()
password = password.strip()

print(f"Connecting to Odoo ERP at {url}...")
try:
    common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
    uid = common.authenticate(db_name, username, password, {})
    
    if not uid:
        print("[ERROR] Authentication failed on Odoo ERP!")
        exit(1)
        
    print(f"Authenticated successfully! User ID: {uid}")
    models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")
    
    # Suppliers to update
    supplier_updates = [
        {"name": "SABIC Polymers", "email": "sathinath.padhi@petabytz.com"},
        {"name": "Sathya Polymer Suppliers", "email": "sathinath.padhi@petabytz.com"},
        {"name": "Jubail Polymers", "email": "ashok.kumar@petabytz.com"},
        {"name": "PetaBytz Plastics", "email": "ashok.kumar@petabytz.com"},
        {"name": "Borouge", "email": "sathinath.padhi@softstandard.com"},
        {"name": "Softstandard Polymer Labs", "email": "sathinath.padhi@softstandard.com"},
    ]
    
    print("\nUpdating supplier email addresses in Odoo ERP...")
    for s in supplier_updates:
        # Search for partner by name
        partner_ids = models.execute_kw(
            db_name, uid, password, 'res.partner', 'search',
            [[['name', '=', s['name']]]]
        )
        
        if partner_ids:
            # Get current record to print info
            records = models.execute_kw(
                db_name, uid, password, 'res.partner', 'read',
                [partner_ids, ['name', 'email']]
            )
            old_email = records[0].get('email')
            
            # Update the email
            models.execute_kw(
                db_name, uid, password, 'res.partner', 'write',
                [partner_ids, {'email': s['email']}]
            )
            print(f"[UPDATED] {s['name']} (ID: {partner_ids[0]}) | Email: '{old_email}' -> '{s['email']}'")
        else:
            # If it doesn't exist, create it to ensure smooth testing
            partner_id = models.execute_kw(
                db_name, uid, password, 'res.partner', 'create',
                [{'name': s['name'], 'email': s['email'], 'phone': '+966 50 123 4567'}]
            )
            print(f"[CREATED] {s['name']} did not exist. Created with ID: {partner_id} | Email: '{s['email']}'")
            
    print("\nVerifying current supplier emails in Odoo ERP:")
    all_names = [s['name'] for s in supplier_updates]
    partner_ids = models.execute_kw(
        db_name, uid, password, 'res.partner', 'search',
        [[['name', 'in', all_names]]]
    )
    records = models.execute_kw(
        db_name, uid, password, 'res.partner', 'read',
        [partner_ids, ['name', 'email']]
    )
    for r in records:
        print(f" - Name: {r.get('name')} | Email: {r.get('email')}")
        
    print("\nOdoo ERP updates completed successfully!")
    
except Exception as e:
    print(f"[ERROR] Failed to update Odoo ERP: {e}")
