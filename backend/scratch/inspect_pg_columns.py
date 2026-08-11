import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
print("DATABASE_URL:", DATABASE_URL)
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

for table in ["email_history", "negotiation_logs", "suppliers"]:
    print(f"\n--- Columns in {table} ---")
    columns = inspector.get_columns(table)
    for col in columns:
        print(f"Name: {col['name']}, Type: {col['type']}")
