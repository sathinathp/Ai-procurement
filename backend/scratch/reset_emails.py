import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
conn = psycopg2.connect(db_url)
c = conn.cursor()

c.execute("UPDATE suppliers SET email = 'sales@bahrainchemicalcorp.com' WHERE name = 'Bahrain Chemical Corp'")
c.execute("UPDATE suppliers SET email = 'sales@bayanchemical.com' WHERE name = 'Bayan Chemical'")
c.execute("UPDATE suppliers SET email = 'ashok.kumar@petabytz.com' WHERE name = 'Bahrain Polymer Group'")
conn.commit()

print("Reset supplier emails successfully.")
c.execute("SELECT id, name, email FROM suppliers WHERE name IN ('Bahrain Chemical Corp', 'Bayan Chemical', 'Bahrain Polymer Group')")
print(c.fetchall())
conn.close()
