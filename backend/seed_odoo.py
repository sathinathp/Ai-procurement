import os
import xmlrpc.client
from dotenv import load_dotenv

def seed_odoo():
    load_dotenv(override=True)
    
    url = os.getenv("ODOO_URL")
    db_name = os.getenv("ODOO_DB")
    username = os.getenv("ODOO_USERNAME")
    password = os.getenv("ODOO_PASSWORD")
    
    if not url or not db_name or not username or not password:
        print("Error: Odoo credentials not found in env")
        return
        
    url = url.strip().rstrip("/")
    db_name = db_name.strip()
    username = username.strip()
    password = password.strip()
    
    print(f"Connecting to Odoo at {url}...")
    try:
        common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
        uid = common.authenticate(db_name, username, password, {})
        
        if not uid:
            print("Authentication failed!")
            return
            
        print(f"Authenticated successfully! User ID: {uid}")
        models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")
        
        # 1. Seed Products
        products = [
            {"name": "PVC Resin K-67", "type": "consu", "default_code": "PVC-K67"},
            {"name": "HDPE Granules Grade 5", "type": "consu", "default_code": "HDPE-G5"},
            {"name": "Calcium Carbonate Powder", "type": "consu", "default_code": "CA-CO3"},
        ]
        for p in products:
            existing = models.execute_kw(db_name, uid, password, 'product.product', 'search', [[['name', '=', p['name']]]])
            if not existing:
                prod_id = models.execute_kw(db_name, uid, password, 'product.product', 'create', [p])
                print(f"Created product: {p['name']} (ID: {prod_id})")
            else:
                print(f"Product already exists: {p['name']}")
                
        # 2. Seed Suppliers
        suppliers = [
            {"name": "SABIC Polymers", "email": "sabic_sales@gmail.com", "phone": "+966 11 225 0000"},
            {"name": "TASNEE Petrochemicals", "email": "tasnee_quotes@gmail.com", "phone": "+966 13 356 0000"},
            {"name": "Sathya Polymer Suppliers", "email": "sathinath.padhi@petabytz.com", "phone": "+91 99887 76655"}, # User's real email
            {"name": "Softstandard Polymer Labs", "email": "sathinath.padhi@softstandard.com", "phone": "+91 99887 76666"},
            {"name": "PetaBytz Plastics", "email": "ashok.kumar@petabytz.com", "phone": "+91 99887 76677"},
        ]
        for s in suppliers:
            existing = models.execute_kw(db_name, uid, password, 'res.partner', 'search', [[['name', '=', s['name']]]])
            if not existing:
                partner_id = models.execute_kw(db_name, uid, password, 'res.partner', 'create', [s])
                print(f"Created Supplier: {s['name']} (ID: {partner_id})")
            else:
                print(f"Supplier already exists: {s['name']}")
                
        print("Seeding completed successfully!")
    except Exception as e:
        print(f"Error seeding Odoo: {e}")

if __name__ == "__main__":
    seed_odoo()
