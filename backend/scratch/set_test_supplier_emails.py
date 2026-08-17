import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("[ERROR] DATABASE_URL not found in environment variables.")
    exit(1)

print(f"Connecting to database...")
conn = psycopg2.connect(db_url)
c = conn.cursor()

# Suppliers to seed or update
supplier_data = [
    {
        "name": "Sathya Polymer Suppliers",
        "email": "sathinath.padhi@petabytz.com",
        "products": "PVC Resin, HDPE Granules, Polymers",
        "categories": "Raw Polymers"
    },
    {
        "name": "PetaBytz Plastics",
        "email": "ashok.kumar@petabytz.com",
        "products": "PVC Resin, HDPE Granules, Polymers",
        "categories": "Raw Polymers"
    },
    {
        "name": "Softstandard Polymer Labs",
        "email": "sathinath.padhi@softstandard.com",
        "products": "PVC Resin, HDPE Granules, Polymers",
        "categories": "Raw Polymers"
    },
    {
        "name": "SABIC Polymers",
        "email": "sathinath.padhi@petabytz.com",
        "products": "PVC Resin, HDPE Granules, Polymers",
        "categories": "Raw Polymers"
    },
    {
        "name": "Jubail Polymers",
        "email": "ashok.kumar@petabytz.com",
        "products": "PVC Resin, HDPE Granules, Polymers",
        "categories": "Raw Polymers"
    },
    {
        "name": "Borouge",
        "email": "sathinath.padhi@softstandard.com",
        "products": "PVC Resin, HDPE Granules, Polymers",
        "categories": "Raw Polymers"
    }
]

print("\nUpdating/Inserting supplier email addresses for autonomous testing...")
for s in supplier_data:
    # Check if supplier already exists
    c.execute("SELECT id FROM suppliers WHERE name = %s", (s["name"],))
    row = c.fetchone()
    
    if row:
        supplier_id = row[0]
        # Update existing supplier's email, products, and categories
        c.execute(
            "UPDATE suppliers SET email = %s, products = %s, categories = %s WHERE id = %s",
            (s["email"], s["products"], s["categories"], supplier_id)
        )
        print(f"[UPDATED] Supplier '{s['name']}' (ID: {supplier_id}) -> Email: {s['email']}")
    else:
        # Insert new supplier
        c.execute(
            """
            INSERT INTO suppliers (name, email, rating, country, products, categories, lead_time_days, quality_score, delivery_score, price_competitiveness, risk_level, synced_to_erp)
            VALUES (%s, %s, 4.8, 'Saudi Arabia', %s, %s, 7, 95.0, 95.0, 90.0, 'Low', TRUE)
            RETURNING id
            """,
            (s["name"], s["email"], s["products"], s["categories"])
        )
        new_id = c.fetchone()[0]
        print(f"[CREATED] Supplier '{s['name']}' (ID: {new_id}) -> Email: {s['email']}")

conn.commit()

# Print summary
print("\nVerifying current supplier emails in the database:")
c.execute("SELECT id, name, email FROM suppliers WHERE name IN %s", (tuple(s["name"] for s in supplier_data),))
for row in c.fetchall():
    print(f" - ID: {row[0]} | Name: {row[1]} | Email: {row[2]}")

c.close()
conn.close()
print("\nSuccessfully configured test supplier emails.")
