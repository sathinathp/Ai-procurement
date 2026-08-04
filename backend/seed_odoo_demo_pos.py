import os
import xmlrpc.client
from dotenv import load_dotenv
from datetime import datetime

def seed_demo_pos():
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
        
        # Helper to find partner ID by name
        def get_partner_id(name):
            partner_ids = models.execute_kw(db_name, uid, password, 'res.partner', 'search', [[['name', '=', name]]])
            return partner_ids[0] if partner_ids else None

        # Helper to find product ID by name
        def get_product_id(name):
            product_ids = models.execute_kw(db_name, uid, password, 'product.product', 'search', [[['name', '=', name]]])
            return product_ids[0] if product_ids else None

        # Define 6 demo orders
        demo_orders = [
            {
                "vendor": "SABIC Polymers",
                "product": "PVC Resin K-67",
                "qty": 800.0,
                "price": 1.25,
                "origin": "DEMO-RFQ-001",
                "state": "purchase" # Confirmed Purchase Order
            },
            {
                "vendor": "TASNEE Petrochemicals",
                "product": "HDPE Granules Grade 5",
                "qty": 1200.0,
                "price": 1.48,
                "origin": "DEMO-RFQ-002",
                "state": "purchase" # Confirmed Purchase Order
            },
            {
                "vendor": "Softstandard Polymer Labs",
                "product": "Calcium Carbonate Powder",
                "qty": 3000.0,
                "price": 0.62,
                "origin": "DEMO-RFQ-003",
                "state": "sent" # Sent RFQ
            },
            {
                "vendor": "PetaBytz Plastics",
                "product": "PVC Resin K-67",
                "qty": 500.0,
                "price": 1.20,
                "origin": "DEMO-RFQ-004",
                "state": "draft" # Draft RFQ
            },
            {
                "vendor": "Sathya Polymer Suppliers",
                "product": "HDPE Granules Grade 5",
                "qty": 950.0,
                "price": 1.42,
                "origin": "DEMO-RFQ-005",
                "state": "purchase" # Confirmed Purchase Order
            },
            {
                "vendor": "SABIC Polymers",
                "product": "Calcium Carbonate Powder",
                "qty": 2000.0,
                "price": 0.58,
                "origin": "DEMO-RFQ-006",
                "state": "draft" # Draft RFQ
            }
        ]

        for order in demo_orders:
            partner_id = get_partner_id(order["vendor"])
            product_id = get_product_id(order["product"])
            
            if not partner_id or not product_id:
                print(f"Skipping {order['origin']} due to missing partner or product reference.")
                continue
                
            # Create PO in Odoo
            po_data = {
                'partner_id': partner_id,
                'origin': order["origin"],
                'order_line': [
                    (0, 0, {
                        'name': order["product"],
                        'product_id': product_id,
                        'product_qty': order["qty"],
                        'price_unit': order["price"],
                        'date_planned': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
                    })
                ]
            }
            
            po_id = models.execute_kw(db_name, uid, password, 'purchase.order', 'create', [po_data])
            print(f"Created PO {order['origin']} in Odoo (ID: {po_id})")
            
            # Transition state if needed
            if order["state"] == "sent":
                # Mark as RFQ Sent
                models.execute_kw(db_name, uid, password, 'purchase.order', 'write', [[po_id], {'state': 'sent'}])
                print(f" -> Marked as Sent")
            elif order["state"] == "purchase":
                # Confirm order (becomes Purchase Order)
                models.execute_kw(db_name, uid, password, 'purchase.order', 'button_confirm', [[po_id]])
                print(f" -> Confirmed as Purchase Order")

        print("\nAll demo purchase orders seeded successfully!")
    except Exception as e:
        print(f"Error seeding demo POs in Odoo: {e}")

if __name__ == "__main__":
    seed_demo_pos()
