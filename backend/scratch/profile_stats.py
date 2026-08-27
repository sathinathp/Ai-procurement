import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import time
from database import SessionLocal
import models
from sqlalchemy import func, desc
from datetime import datetime, date

db = SessionLocal()
try:
    print("Profiling dashboard stats queries...")
    
    t0 = time.time()
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_rfqs_count = db.query(models.RFQ).filter(models.RFQ.created_at >= today_start).count()
    print(f"today_rfqs_count: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    pending_rfqs_count = db.query(models.RFQ).filter(
        models.RFQ.status.in_(["Created", "RFQ Sent", "Responses Received", "Under Comparison"])
    ).count()
    print(f"pending_rfqs_count: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    supplier_responses_count = db.query(models.QuoteResponse).count()
    print(f"supplier_responses_count: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    awaiting_comparison_count = db.query(models.RFQ).filter(
        models.RFQ.status == "Responses Received"
    ).count()
    print(f"awaiting_comparison_count: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    pending_approval_count = db.query(models.RFQ).filter(
        models.RFQ.status == "Approved"
    ).count()
    print(f"pending_approval_count: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    completed_rfqs_count = db.query(models.RFQ).filter(
        models.RFQ.status == "PO Generated"
    ).count()
    print(f"completed_rfqs_count: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    avg_resp_time_res = db.query(func.avg(models.Supplier.average_response_time_hours)).scalar()
    print(f"avg_resp_time: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    avg_rating = db.query(func.avg(models.Supplier.rating)).scalar()
    print(f"avg_rating: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    avg_delivery = db.query(func.avg(models.Supplier.delivery_score)).scalar()
    print(f"avg_delivery: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    avg_quality = db.query(func.avg(models.Supplier.quality_score)).scalar()
    print(f"avg_quality: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    total_suppliers_count = db.query(models.Supplier).count()
    print(f"total_suppliers_count: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    total_rfq_val = db.query(func.sum(models.PurchaseOrder.total_amount)).scalar() or 0.0
    print(f"total_rfq_val: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    recent_events = db.query(models.RFQTimeline).order_by(
        desc(models.RFQTimeline.timestamp)
    ).limit(7).all()
    print(f"recent_events: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    high_medium_risk_suppliers = db.query(models.Supplier).filter(
        models.Supplier.risk_level.in_(["Medium", "High"])
    ).order_by(models.Supplier.risk_level.desc()).limit(10).all()
    print(f"high_medium_risk_suppliers: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    attention_rfqs = db.query(models.RFQ).order_by(models.RFQ.created_at.desc()).limit(10).all()
    print(f"attention_rfqs fetch: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    for r in attention_rfqs:
        latest_event = db.query(models.RFQTimeline).filter(
            models.RFQTimeline.rfq_number == r.rfq_number
        ).order_by(models.RFQTimeline.timestamp.desc()).first()
    print(f"attention_rfqs subqueries: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    preferred_suppliers = db.query(models.Supplier).filter(models.Supplier.preferred == True).limit(10).all()
    print(f"preferred_suppliers: {(time.time()-t0)*1000:.2f}ms")
    
    t0 = time.time()
    deviated_suppliers = db.query(models.Supplier).filter(models.Supplier.delivery_score < 80).limit(10).all()
    print(f"deviated_suppliers: {(time.time()-t0)*1000:.2f}ms")

finally:
    db.close()
