import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
print("Connecting to:", DATABASE_URL)
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE email_history ADD COLUMN supplier_email VARCHAR(255);"))
        conn.commit()
        print("Successfully added supplier_email column to email_history.")
    except Exception as e:
        print("Error or column already exists:", e)
