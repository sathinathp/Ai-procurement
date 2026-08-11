import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print("Connecting to:", DATABASE_URL)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    import models
    # Get last RFQ
    rfq = db.query(models.RFQ).order_by(models.RFQ.created_at.desc()).first()
    if rfq:
        print(f"Last RFQ: RFQ_Number={rfq.rfq_number}, Item_Name={rfq.item_name}, Status={rfq.status}")
        
        # Get quotes/suppliers for this RFQ (QuoteResponse relation is mapped to models.QuoteResponse, but maybe quotes is something else? Let's check model definitions)
        quotes = db.query(models.QuoteResponse).filter_by(rfq_number=rfq.rfq_number).all()
        print(f"Matched Suppliers count for {rfq.rfq_number}: {len(quotes)}")
        for q in quotes:
            supplier = db.query(models.Supplier).filter_by(id=q.supplier_id).first()
            if supplier:
                print(f" - Supplier ID={supplier.id}, Name={supplier.name}, Email={supplier.email}, Quoted Price={q.price}")
                
        # Get negotiation logs
        logs = db.query(models.NegotiationLog).filter_by(rfq_number=rfq.rfq_number).order_by(models.NegotiationLog.id.asc()).all()
        print(f"Negotiation Logs count: {len(logs)}")
        for l in logs:
            print(f" - Log ID={l.id}, Direction={l.direction}, Supplier ID={l.supplier_id}, Price={l.extracted_price}, Sent At={l.sent_at}")
    else:
        print("No RFQs found in database.")
finally:
    db.close()
