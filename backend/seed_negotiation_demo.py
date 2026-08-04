import sys
import json
from datetime import datetime, timedelta

# Add e:\poc-july\backend to sys.path
sys.path.append(r"e:\poc-july\backend")

from database import SessionLocal
import models

db = SessionLocal()

try:
    rfq_number = "RFQ-2026-GEN-005"
    
    # 1. Ensure the RFQ exists and update its status
    rfq = db.query(models.RFQ).filter(models.RFQ.rfq_number == rfq_number).first()
    if not rfq:
        print(f"Creating mock RFQ {rfq_number}...")
        rfq = models.RFQ(
            rfq_number=rfq_number,
            item_code="STR-FLM-01",
            item_name="Stretch Film",
            quantity=2490.0,
            unit="Roll",
            delivery_location="Dammam Warehouse",
            target_delivery_date=datetime.utcnow() + timedelta(days=15),
            status="Negotiating"
        )
        db.add(rfq)
        db.flush()
    else:
        rfq.status = "Negotiating"
        print(f"Found existing RFQ {rfq_number}, set status to Negotiating.")

    # 2. Clear any old logs/notifications for this RFQ to keep it clean
    db.query(models.NegotiationLog).filter(models.NegotiationLog.rfq_number == rfq_number).delete()
    db.query(models.WorkflowNotification).filter(models.WorkflowNotification.rfq_number == rfq_number).delete()
    db.commit()

    # Softstandard Polymer Labs details
    supplier_id = 71
    supplier_email = "sathinath.padhi@softstandard.com"
    supplier_name = "Softstandard Polymer Labs"

    # 3. Insert Outbound & Inbound Negotiation Logs (Simulating 3 rounds)
    now = datetime.utcnow()
    
    logs = [
        # Round 1: Outbound Outreach
        models.NegotiationLog(
            rfq_number=rfq_number,
            supplier_id=supplier_id,
            supplier_email=supplier_email,
            round_number=1,
            direction="outbound",
            subject=f"RFQ Outreach: Spec request for Stretch Film ({rfq_number})",
            body="Hello Softstandard Polymer Labs Team,\n\nWe are requesting a quote for 2,490 Rolls of Stretch Film to be delivered to our Dammam Warehouse. Please reply with your unit price, lead time, and payment terms.\n\nBest regards,\nAI Procurement Engine",
            sent_at=now - timedelta(hours=3),
            reply_received=True
        ),
        # Round 1: Inbound Quote Response
        models.NegotiationLog(
            rfq_number=rfq_number,
            supplier_id=supplier_id,
            supplier_email=supplier_email,
            round_number=1,
            direction="inbound",
            subject=f"Re: RFQ Outreach: Spec request for Stretch Film ({rfq_number})",
            body="Hello,\n\nThank you for the opportunity. We can supply the 2,490 Rolls of Stretch Film at a unit price of $5.50 per roll. Delivery lead time will be 8 days. Payment terms: 30 days net.\n\nBest,\nSales Team",
            extracted_price=5.50,
            extracted_currency="USD",
            extracted_lead_time=8,
            sent_at=now - timedelta(hours=2.5),
            reply_received=True
        ),
        # Round 2: Outbound Counter-Offer
        models.NegotiationLog(
            rfq_number=rfq_number,
            supplier_id=supplier_id,
            supplier_email=supplier_email,
            round_number=2,
            direction="outbound",
            subject=f"Negotiation Round 2: Target Offer for Stretch Film ({rfq_number})",
            body="Dear Softstandard Team,\n\nThank you for the initial quote. To proceed, we are targeting a price of $4.95 per roll (10% discount). Can you meet this target or offer your best final price?\n\nRegards,\nAI Procurement Engine",
            sent_at=now - timedelta(hours=2),
            reply_received=True
        ),
        # Round 2: Inbound Supplier Adjustment
        models.NegotiationLog(
            rfq_number=rfq_number,
            supplier_id=supplier_id,
            supplier_email=supplier_email,
            round_number=2,
            direction="inbound",
            subject=f"Re: Negotiation Round 2: Target Offer for Stretch Film ({rfq_number})",
            body="Hello,\n\nWe cannot go as low as $4.95, but we can offer a special discounted rate of $5.20 per roll as our best and final price. We can also expedite the delivery lead time to 5 days.\n\nRegards,\nSales Team",
            extracted_price=5.20,
            extracted_currency="USD",
            extracted_lead_time=5,
            sent_at=now - timedelta(hours=1.5),
            reply_received=True
        ),
        # Round 3: Outbound Acceptance
        models.NegotiationLog(
            rfq_number=rfq_number,
            supplier_id=supplier_id,
            supplier_email=supplier_email,
            round_number=3,
            direction="outbound",
            subject=f"Negotiation Round 3: Final Acceptance ({rfq_number})",
            body="Dear Softstandard Team,\n\nThank you for your final quote. We accept your negotiated unit price of $5.20 per roll with a 5-day delivery lead time. We are submitting this proposal for internal management approval.\n\nRegards,\nAI Procurement Engine",
            sent_at=now - timedelta(hours=1),
            reply_received=True,
            is_final=True
        )
    ]

    for log in logs:
        db.add(log)
    db.flush()

    # 4. Generate WorkflowNotification Recommendation Card for the Dashboard
    comparison_data = [
        {
            "supplier_name": "Softstandard Polymer Labs",
            "rating": 4.8,
            "price": 5.20,
            "currency": "USD",
            "lead_time_days": 5,
            "risk_level": "Low"
        },
        {
            "supplier_name": "PetaBytz Plastics",
            "rating": 4.5,
            "price": 5.45,
            "currency": "USD",
            "lead_time_days": 7,
            "risk_level": "Medium"
        },
        {
            "supplier_name": "SABIC Polymers",
            "rating": 4.9,
            "price": 5.60,
            "currency": "USD",
            "lead_time_days": 6,
            "risk_level": "Low"
        }
    ]

    summary_msg = (
        "AI has successfully completed 3 negotiation rounds for Stretch Film. "
        "Softstandard Polymer Labs offered the best final unit price of $5.20 per roll (5.4% savings from original $5.50 quote), "
        "outperforming PetaBytz Plastics ($5.45) and SABIC Polymers ($5.60). "
        "Softstandard has also reduced lead time to 5 days, maintaining a Low risk profile. "
        "Recommended action: Approve proposal to generate Purchase Order and sync to Odoo ERP."
    )

    notification = models.WorkflowNotification(
        rfq_number=rfq_number,
        rfq_item="Stretch Film",
        type="approval_required",
        status="pending",
        recommended_supplier=supplier_name,
        recommended_price=5.20,
        recommended_currency="USD",
        comparison_json=json.dumps(comparison_data),
        summary_message=summary_msg,
        notification_email_sent=True,
        created_at=datetime.utcnow()
    )
    db.add(notification)
    
    db.commit()
    print("Successfully seeded simulated email negotiation discussion logs and workflow notification!")
    
except Exception as e:
    db.rollback()
    print(f"Error seeding negotiation: {e}")
finally:
    db.close()
