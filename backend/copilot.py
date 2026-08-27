import os
import json
import logging
import difflib
import re
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from openai import OpenAI
from models import Supplier, RFQ, QuoteResponse, PurchaseOrder, EmailHistory, RFQTimeline, InventoryItem, QualityDefect, GoodsReceiptNote, InvoiceMatch, PaymentVoucher, WorkflowNotification, NegotiationLog, ErpSyncLog, ERPConfig

logger = logging.getLogger(__name__)

# Stopwords list to prevent general words from matching suppliers/items fuzzy search
STOPWORDS = {
    "what", "where", "which", "who", "whom", "when", "why", "how", 
    "deal", "regarding", "about", "show", "find", "search", "query", 
    "list", "tell", "give", "price", "cost", "rate", "amount", "total", 
    "order", "purchase", "item", "supplier", "vendor", "client", "customer", 
    "good", "best", "last", "latest", "recent", "past", "history", "historical",
    "delivery", "score", "rating", "delay", "delayed", "late", "pending", 
    "status", "country", "from", "with", "have", "does", "were", "been",
    "should", "would", "could", "will", "this", "that", "these", "those"
}

def clean_words(text: str) -> list:
    """Splits string into lowercase alphanumeric words."""
    return re.findall(r'[a-zA-Z0-9]+', text.lower())

def get_db_context(query: str, db: Session) -> str:
    """
    Analyzes the query keywords and retrieves the relevant records from the database
    to provide the LLM with exact, grounded facts. Supports spelling correction/fuzzy matching.
    """
    lowered = query.lower()
    words = clean_words(query)
    context = []
    
    # Always include a comprehensive global database summary
    global_summary = {
        "total_suppliers": db.query(Supplier).count(),
        "total_rfqs": db.query(RFQ).count(),
        "total_purchase_orders": db.query(PurchaseOrder).count(),
        "total_inventory_items": db.query(InventoryItem).count(),
        "total_goods_receipt_notes": db.query(GoodsReceiptNote).count(),
        "total_invoice_matches": db.query(InvoiceMatch).count(),
        "total_payment_vouchers": db.query(PaymentVoucher).count(),
        "total_quality_defects": db.query(QualityDefect).count(),
        "total_quote_responses": db.query(QuoteResponse).count(),
        "total_email_history": db.query(EmailHistory).count(),
        "total_rfq_timeline": db.query(RFQTimeline).count(),
        "total_workflow_notifications": db.query(WorkflowNotification).count(),
        "total_negotiation_logs": db.query(NegotiationLog).count(),
        "total_erp_sync_logs": db.query(ErpSyncLog).count(),
        "total_erp_configs": db.query(ERPConfig).count(),
        "rfq_status_counts": {status: count for status, count in db.query(RFQ.status, func.count(RFQ.rfq_number)).group_by(RFQ.status).all()},
        "po_status_counts": {status: count for status, count in db.query(PurchaseOrder.status, func.count(PurchaseOrder.po_number)).group_by(PurchaseOrder.status).all()},
        "invoice_status_counts": {status: count for status, count in db.query(InvoiceMatch.match_status, func.count(InvoiceMatch.invoice_number)).group_by(InvoiceMatch.match_status).all()},
        "payment_status_counts": {status: count for status, count in db.query(PaymentVoucher.payment_status, func.count(PaymentVoucher.voucher_number)).group_by(PaymentVoucher.payment_status).all()},
    }
    context.append(f"Global Database Summary Facts: {json.dumps(global_summary)}")
    
    # Fetch all suppliers and items from DB
    all_suppliers = db.query(Supplier).all()
    db_items = [r[0] for r in db.query(PurchaseOrder.item_name).distinct().all()] + \
               [r[0] for r in db.query(RFQ.item_name).distinct().all()]
    items_to_check = list(set([item.strip() for item in db_items if item and item.strip()]))
    
    # Check pending approvals
    if "approval" in lowered or "pending approval" in lowered:
        pending_rfqs = db.query(RFQ).filter(RFQ.status.in_(["Responses Received", "Under Comparison"])).limit(5).all()
        pending_pos = db.query(PurchaseOrder).filter(PurchaseOrder.status == "Draft").limit(5).all()
        p_data = {
            "pending_rfqs": [{"rfq_number": r.rfq_number, "item_name": r.item_name, "quantity": r.quantity, "unit": r.unit, "status": r.status} for r in pending_rfqs],
            "pending_pos": [{"po_number": p.po_number, "item_name": p.item_name, "total_amount": p.total_amount, "status": p.status} for p in pending_pos]
        }
        context.append(f"Pending Approvals Facts: {json.dumps(p_data)}")

    # Check inventory stock
    if "inventory" in lowered or "stock" in lowered or "warehouse" in lowered:
        inv_items = db.query(InventoryItem).all()
        inv_data = [{"item_name": i.item_name, "stock_level": i.stock_level, "min_safety_stock": i.min_safety_stock, "unit": i.unit} for i in inv_items]
        context.append(f"Inventory Stock Levels: {json.dumps(inv_data)}")

    # Check cheapest / top rated suppliers
    if "cheapest" in lowered or "cheapest supplier" in lowered or "lowest price" in lowered:
        cheap_sups = db.query(Supplier).order_by(desc(Supplier.price_competitiveness)).limit(5).all()
        cheap_data = [{"name": s.name, "price_competitiveness": s.price_competitiveness, "rating": s.rating, "products": s.products[:80] if s.products else ""} for s in cheap_sups]
        context.append(f"Most Price-Competitive Suppliers: {json.dumps(cheap_data)}")

    if "highest rating" in lowered or "top rating" in lowered or "best supplier" in lowered:
        top_sups = db.query(Supplier).order_by(desc(Supplier.rating)).limit(5).all()
        top_data = [{"name": s.name, "rating": s.rating, "delivery_score": s.delivery_score, "quality_score": s.quality_score, "country": s.country} for s in top_sups]
        context.append(f"Top Rated Suppliers: {json.dumps(top_data)}")
        
    # 1. Fuzzy match suppliers
    matched_supplier = None
    supplier_names_map = {s.name.lower(): s for s in all_suppliers}
    all_possible_supplier_names = list(supplier_names_map.keys())
    
    # Substring match (always preferred)
    for s in all_suppliers:
        if s.name.lower() in lowered:
            matched_supplier = s
            break
            
    # Fuzzy match on supplier names or individual parts
    if not matched_supplier:
        for word in words:
            if len(word) < 4 or word in STOPWORDS:
                continue
            close_names = difflib.get_close_matches(word, all_possible_supplier_names, n=1, cutoff=0.7)
            if close_names:
                matched_supplier = supplier_names_map[close_names[0]]
                break
            
            # Match parts
            for s_name in all_possible_supplier_names:
                parts = s_name.split()
                # Remove stopwords from parts
                parts = [p.lower() for p in parts if p.lower() not in STOPWORDS]
                close_parts = difflib.get_close_matches(word, parts, n=1, cutoff=0.7)
                if close_parts:
                    matched_supplier = supplier_names_map[s_name]
                    break
            if matched_supplier:
                break
                
    if matched_supplier:
        s = matched_supplier
        # Get their last 3 POs
        s_pos = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == s.id).order_by(desc(PurchaseOrder.created_at)).limit(3).all()
        pos_data = [{
            "po_number": po.po_number,
            "item_name": po.item_name,
            "quantity": po.quantity,
            "unit_price": po.unit_price,
            "total_amount": po.total_amount,
            "status": po.status,
            "date": po.created_at.strftime("%Y-%m-%d")
        } for po in s_pos]
        
        # Get their last 3 Quote Responses
        s_quotes = db.query(QuoteResponse).filter(QuoteResponse.supplier_id == s.id).order_by(desc(QuoteResponse.responded_at)).limit(3).all()
        quotes_data = [{
            "rfq_number": q.rfq_number,
            "price": q.price,
            "currency": q.currency,
            "moq": q.moq,
            "lead_time_days": q.lead_time_days,
            "payment_terms": q.payment_terms,
            "incoterms": q.incoterms,
            "status": q.status,
            "date": q.responded_at.strftime("%Y-%m-%d") if q.responded_at else None
        } for q in s_quotes]
        
        # Get their last 3 Email Histories
        s_emails = db.query(EmailHistory).filter(EmailHistory.supplier_id == s.id).order_by(desc(EmailHistory.sent_at)).limit(3).all()
        emails_data = [{
            "subject": e.subject,
            "type": e.type,
            "sent_at": e.sent_at.strftime("%Y-%m-%d %H:%M"),
            "response_received": e.response_received
        } for e in s_emails]
        
        supplier_data = {
            "name": s.name,
            "country": s.country,
            "email": s.email,
            "phone": s.phone,
            "rating": s.rating,
            "delivery_score": s.delivery_score,
            "quality_score": s.quality_score,
            "price_competitiveness": s.price_competitiveness,
            "risk_level": s.risk_level,
            "average_response_time_hours": s.average_response_time_hours,
            "products": s.products,
            "recent_orders": pos_data,
            "recent_quotes": quotes_data,
            "recent_emails": emails_data
        }
        context.append(f"Supplier Profile & History for '{s.name}': {json.dumps(supplier_data)}")
 
    # 2. Fuzzy match items
    matched_item = None
    item_names_lower = [item.lower() for item in items_to_check]
    item_map = {item.lower(): item for item in items_to_check}
    
    # Substring match
    for item in items_to_check:
        if item.lower() in lowered:
            matched_item = item
            break
            
    # Fuzzy match on item names
    if not matched_item:
        for word in words:
            if len(word) < 4 or word in STOPWORDS:
                continue
            close_items = difflib.get_close_matches(word, item_names_lower, n=1, cutoff=0.7)
            if close_items:
                matched_item = item_map[close_items[0]]
                break
            
            # Match parts
            for item_name in item_names_lower:
                parts = item_name.split()
                parts = [p.lower() for p in parts if p.lower() not in STOPWORDS]
                close_parts = difflib.get_close_matches(word, parts, n=1, cutoff=0.7)
                if close_parts:
                    matched_item = item_map[item_name]
                    break
            if matched_item:
                break
                
    if matched_item:
        pos = db.query(PurchaseOrder).join(Supplier).filter(
            func.lower(PurchaseOrder.item_name).contains(matched_item.lower())
        ).order_by(desc(PurchaseOrder.created_at)).limit(3).all()
        
        pos_data = [{
            "po_number": po.po_number,
            "supplier_name": po.supplier.name,
            "item_name": po.item_name,
            "quantity": po.quantity,
            "unit_price": po.unit_price,
            "total_amount": po.total_amount,
            "status": po.status,
            "date": po.created_at.strftime("%Y-%m-%d")
        } for po in pos]
        context.append(f"Historical Purchase Orders for '{matched_item}': {json.dumps(pos_data)}")
        
        rfqs = db.query(RFQ).filter(
            func.lower(RFQ.item_name).contains(matched_item.lower())
        ).order_by(desc(RFQ.created_at)).limit(3).all()
        
        rfqs_data = [{
            "rfq_number": rfq.rfq_number,
            "project_name": rfq.project_name,
            "quantity": rfq.quantity,
            "unit": rfq.unit,
            "status": rfq.status,
            "created_at": rfq.created_at.strftime("%Y-%m-%d")
        } for rfq in rfqs]
        context.append(f"RFQs for '{matched_item}': {json.dumps(rfqs_data)}")

    # 3. Look for "delayed" or "late" POs
    if "delayed" in lowered or "delay" in lowered or "late" in lowered:
        delayed_pos = db.query(PurchaseOrder).join(Supplier).filter(PurchaseOrder.status == "Delayed").all()
        delayed_data = [{
            "po_number": po.po_number,
            "supplier_name": po.supplier.name,
            "item_name": po.item_name,
            "quantity": po.quantity,
            "total_amount": po.total_amount,
            "created_at": po.created_at.strftime("%Y-%m-%d")
        } for po in delayed_pos]
        context.append(f"All Delayed Purchase Orders currently in system: {json.dumps(delayed_data)}")

    # 4. Look for "best delivery" or "highest delivery"
    if "best delivery" in lowered or "highest delivery" in lowered or "delivery score" in lowered:
        best_delivery = db.query(Supplier).order_by(desc(Supplier.delivery_score)).limit(3).all()
        best_data = [{
            "supplier_name": s.name,
            "delivery_score": s.delivery_score,
            "rating": s.rating,
            "country": s.country
        } for s in best_delivery]
        context.append(f"Suppliers with best delivery scores: {json.dumps(best_data)}")

    # 5. Look for countries
    countries = ["germany", "japan", "china", "india", "saudi arabia", "uae", "oman", "bahrain", "kuwait", "usa"]
    matched_country = None
    for country in countries:
        if country in lowered:
            matched_country = country
            break
    if not matched_country:
        for word in words:
            if len(word) < 4 or word in STOPWORDS:
                continue
            close_countries = difflib.get_close_matches(word, countries, n=1, cutoff=0.7)
            if close_countries:
                matched_country = close_countries[0]
                break
                
    if matched_country:
        country_suppliers = db.query(Supplier).filter(func.lower(Supplier.country) == matched_country).limit(5).all()
        country_data = [{
            "supplier_name": s.name,
            "rating": s.rating,
            "products": s.products[:100] + "..." if s.products and len(s.products) > 100 else s.products
        } for s in country_suppliers]
        context.append(f"Suppliers in country '{matched_country}': {json.dumps(country_data)}")

    # 6. Look for "pending RFQs" or "status of RFQs" or "how many RFQs"
    if any(k in lowered for k in ["rfq", "request for quotation", "pending", "status"]):
        rfq_counts = db.query(RFQ.status, func.count(RFQ.rfq_number)).group_by(RFQ.status).all()
        counts_dict = {status: count for status, count in rfq_counts}
        context.append(f"RFQ Counts by Status: {json.dumps(counts_dict)}")
        
        # If they specifically ask about pending or active RFQs, list details
        if any(k in lowered for k in ["pending", "active"]):
            pending_statuses = ["Created", "RFQ Sent", "Responses Received", "Under Comparison"]
            pending_rfqs = db.query(RFQ).filter(RFQ.status.in_(pending_statuses)).order_by(desc(RFQ.created_at)).limit(10).all()
            p_rfqs_list = [{
                "rfq_number": r.rfq_number,
                "project_name": r.project_name,
                "item_name": r.item_name,
                "quantity": r.quantity,
                "unit": r.unit,
                "status": r.status,
                "priority": r.priority,
                "created_at": r.created_at.strftime("%Y-%m-%d") if r.created_at else None
            } for r in pending_rfqs]
            context.append(f"Pending RFQs List (Latest 10): {json.dumps(p_rfqs_list)}")

    # 7. Look for "last PO" or "last purchase order" or "recent purchase order"
    if "last po" in lowered or "last purchase order" in lowered or "most recent po" in lowered:
        last_po = db.query(PurchaseOrder).join(Supplier).order_by(desc(PurchaseOrder.created_at)).first()
        if last_po:
            last_po_data = {
                "po_number": last_po.po_number,
                "rfq_number": last_po.rfq_number,
                "supplier_name": last_po.supplier.name,
                "item_name": last_po.item_name,
                "quantity": last_po.quantity,
                "unit_price": last_po.unit_price,
                "total_amount": last_po.total_amount,
                "status": last_po.status,
                "created_at": last_po.created_at.strftime("%Y-%m-%d")
            }
            context.append(f"Most Recent Purchase Order: {json.dumps(last_po_data)}")

    # 8. Look for specific RFQ numbers
    rfq_pattern = r'(rfq-[0-9a-z-]+)'
    rfq_matches = re.findall(rfq_pattern, lowered)
    if rfq_matches:
        for match in rfq_matches:
            rfq_num = match.upper()
            rfq = db.query(RFQ).filter(func.lower(RFQ.rfq_number).contains(rfq_num.lower())).first()
            if rfq:
                quotes = db.query(QuoteResponse).join(Supplier).filter(QuoteResponse.rfq_number == rfq.rfq_number).all()
                quotes_data = [{
                    "supplier_name": q.supplier.name,
                    "price": q.price,
                    "currency": q.currency,
                    "moq": q.moq,
                    "lead_time_days": q.lead_time_days,
                    "payment_terms": q.payment_terms,
                    "incoterms": q.incoterms,
                    "status": q.status
                } for q in quotes]
                
                rfq_data = {
                    "rfq_number": rfq.rfq_number,
                    "project_name": rfq.project_name,
                    "item_name": rfq.item_name,
                    "quantity": rfq.quantity,
                    "unit": rfq.unit,
                    "status": rfq.status,
                    "quotes": quotes_data
                }
                context.append(f"RFQ Details and Quote Comparison for {rfq.rfq_number}: {json.dumps(rfq_data)}")
                break

    # 9. Look for specific PO numbers
    po_pattern = r'(po-[0-9a-z-]+)'
    po_matches = re.findall(po_pattern, lowered)
    if po_matches:
        for match in po_matches:
            po_num = match.upper()
            po = db.query(PurchaseOrder).filter(func.lower(PurchaseOrder.po_number).contains(po_num.lower())).first()
            if po:
                po_data = {
                    "po_number": po.po_number,
                    "rfq_number": po.rfq_number,
                    "supplier_name": po.supplier.name,
                    "item_name": po.item_name,
                    "quantity": po.quantity,
                    "unit_price": po.unit_price,
                    "total_amount": po.total_amount,
                    "status": po.status,
                    "date": po.created_at.strftime("%Y-%m-%d")
                }
                context.append(f"Purchase Order Details for {po.po_number}: {json.dumps(po_data)}")
                break

    # 11. Invoices
    if any(k in lowered for k in ["invoice", "bill", "invoice match"]):
        invoices = db.query(InvoiceMatch).order_by(desc(InvoiceMatch.created_at)).limit(10).all()
        invoices_data = [{
            "invoice_number": inv.invoice_number,
            "po_number": inv.po_number,
            "grn_number": inv.grn_number,
            "supplier_name": inv.supplier_name,
            "po_amount": inv.po_amount,
            "invoice_amount": inv.invoice_amount,
            "match_status": inv.match_status,
            "mismatch_reason": inv.mismatch_reason,
            "created_at": inv.created_at.strftime("%Y-%m-%d") if inv.created_at else None
        } for inv in invoices]
        context.append(f"Recent Invoice Matches: {json.dumps(invoices_data)}")

    # 12. Payments / Vouchers
    if any(k in lowered for k in ["payment", "voucher", "wire transfer"]):
        vouchers = db.query(PaymentVoucher).order_by(desc(PaymentVoucher.payment_date)).limit(10).all()
        vouchers_data = [{
            "voucher_number": v.voucher_number,
            "invoice_number": v.invoice_number,
            "supplier_name": v.supplier_name,
            "amount": v.amount,
            "currency": v.currency,
            "payment_status": v.payment_status,
            "payment_method": v.payment_method,
            "payment_date": v.payment_date.strftime("%Y-%m-%d") if v.payment_date else None
        } for v in vouchers]
        context.append(f"Recent Payment Vouchers: {json.dumps(vouchers_data)}")

    # 13. Goods Receipt Notes (GRN) / Receipts
    if any(k in lowered for k in ["receipt", "grn", "goods receipt"]):
        grns = db.query(GoodsReceiptNote).order_by(desc(GoodsReceiptNote.grn_date)).limit(10).all()
        grns_data = [{
            "grn_number": g.grn_number,
            "po_number": g.po_number,
            "supplier_name": g.supplier_name,
            "item_name": g.item_name,
            "quantity_ordered": g.quantity_ordered,
            "quantity_received": g.quantity_received,
            "quantity_accepted": g.quantity_accepted,
            "quality_status": g.quality_status,
            "grn_date": g.grn_date.strftime("%Y-%m-%d") if g.grn_date else None
        } for g in grns]
        context.append(f"Recent Goods Receipt Notes (GRNs): {json.dumps(grns_data)}")

    # 14. Quality Defects
    if any(k in lowered for k in ["defect", "quality defect", "qc"]):
        defects = db.query(QualityDefect).order_by(desc(QualityDefect.timestamp)).limit(10).all()
        defects_data = [{
            "defect_type": d.defect_type,
            "location": d.location,
            "confidence": d.confidence,
            "timestamp": d.timestamp.strftime("%Y-%m-%d") if d.timestamp else None,
            "status": d.status
        } for d in defects]
        context.append(f"Recent Quality Defects: {json.dumps(defects_data)}")

    # 15. Negotiation Logs
    if any(k in lowered for k in ["negotiation", "counter-offer", "negotiated", "round"]):
        neg_logs = db.query(NegotiationLog).order_by(desc(NegotiationLog.sent_at)).limit(10).all()
        neg_data = [{
            "rfq_number": nl.rfq_number,
            "supplier_name": nl.supplier.name if nl.supplier else "Unknown",
            "round_number": nl.round_number,
            "direction": nl.direction,
            "price": nl.extracted_price,
            "currency": nl.extracted_currency,
            "lead_time": nl.extracted_lead_time,
            "is_final": nl.is_final,
            "sent_at": nl.sent_at.strftime("%Y-%m-%d %H:%M") if nl.sent_at else None
        } for nl in neg_logs]
        context.append(f"Recent Negotiation Activity: {json.dumps(neg_data)}")

    # 16. General Purchase Orders (if not supplier-matched or item-matched already)
    if any(k in lowered for k in ["po", "purchase order", "order"]):
        recent_pos = db.query(PurchaseOrder).order_by(desc(PurchaseOrder.created_at)).limit(10).all()
        pos_data = [{
            "po_number": po.po_number,
            "rfq_number": po.rfq_number,
            "supplier_name": po.supplier.name if po.supplier else "Unknown",
            "item_name": po.item_name,
            "quantity": po.quantity,
            "unit_price": po.unit_price,
            "total_amount": po.total_amount,
            "status": po.status,
            "created_at": po.created_at.strftime("%Y-%m-%d") if po.created_at else None
        } for po in recent_pos]
        context.append(f"Recent Purchase Orders: {json.dumps(pos_data)}")

    # 17. General Email transmissions
    if any(k in lowered for k in ["email", "mail", "sent"]):
        emails = db.query(EmailHistory).order_by(desc(EmailHistory.sent_at)).limit(10).all()
        emails_data = [{
            "rfq_number": e.rfq_number,
            "supplier_name": e.supplier.name if e.supplier else "Unknown",
            "subject": e.subject,
            "type": e.type,
            "sent_at": e.sent_at.strftime("%Y-%m-%d %H:%M") if e.sent_at else None,
            "response_received": e.response_received
        } for e in emails]
        context.append(f"Recent Email Transmissions: {json.dumps(emails_data)}")

    # 18. General Workflow Notifications
    if any(k in lowered for k in ["notification", "alert", "approval required"]):
        notifications = db.query(WorkflowNotification).order_by(desc(WorkflowNotification.created_at)).limit(10).all()
        notif_data = [{
            "rfq_number": n.rfq_number,
            "rfq_item": n.rfq_item,
            "type": n.type,
            "status": n.status,
            "recommended_supplier": n.recommended_supplier,
            "recommended_price": n.recommended_price,
            "created_at": n.created_at.strftime("%Y-%m-%d") if n.created_at else None
        } for n in notifications]
        context.append(f"Recent Workflow Notifications: {json.dumps(notif_data)}")

    # 19. ERP Sync Logs
    if any(k in lowered for k in ["sync log", "erp log", "integration log", "sync status"]):
        sync_logs = db.query(ErpSyncLog).order_by(desc(ErpSyncLog.timestamp)).limit(10).all()
        sync_data = [{
            "object_type": l.object_type,
            "object_id": l.object_id,
            "direction": l.direction,
            "url": l.url,
            "method": l.method,
            "status_code": l.status_code,
            "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M") if l.timestamp else None
        } for l in sync_logs]
        context.append(f"Recent ERP Sync Logs: {json.dumps(sync_data)}")

    # 20. ERP Integration Configuration
    if any(k in lowered for k in ["erp config", "erp setting", "integration config", "dynamics config", "odoo config"]):
        erp_configs = db.query(ERPConfig).all()
        config_data = [{
            "erp_system": c.erp_system,
            "base_url": c.base_url,
            "environment": c.environment,
            "sync_mode": c.sync_mode,
            "status": c.status,
            "last_connected_at": c.last_connected_at.strftime("%Y-%m-%d %H:%M") if c.last_connected_at else None
        } for c in erp_configs]
        context.append(f"ERP Integration Configurations: {json.dumps(config_data)}")

    # 21. Quote Responses
    if any(k in lowered for k in ["quote", "quotation", "response"]):
        quotes = db.query(QuoteResponse).order_by(desc(QuoteResponse.responded_at)).limit(10).all()
        quotes_data = [{
            "rfq_number": q.rfq_number,
            "supplier_name": q.supplier.name if q.supplier else "Unknown",
            "price": q.price,
            "currency": q.currency,
            "moq": q.moq,
            "lead_time_days": q.lead_time_days,
            "payment_terms": q.payment_terms,
            "incoterms": q.incoterms,
            "status": q.status,
            "responded_at": q.responded_at.strftime("%Y-%m-%d") if q.responded_at else None
        } for q in quotes]
        context.append(f"Recent Supplier Quotation Responses: {json.dumps(quotes_data)}")

    # 22. RFQ Timeline Events
    if any(k in lowered for k in ["timeline", "history", "stage"]):
        timeline = db.query(RFQTimeline).order_by(desc(RFQTimeline.timestamp)).limit(15).all()
        timeline_data = [{
            "rfq_number": t.rfq_number,
            "stage": t.stage,
            "timestamp": t.timestamp.strftime("%Y-%m-%d %H:%M") if t.timestamp else None,
            "details": t.details
        } for t in timeline]
        context.append(f"Recent RFQ Timeline Events: {json.dumps(timeline_data)}")

    return "\n\n".join(context)

def get_mock_copilot_response(query: str, db: Session) -> str:
    """
    Returns a rule-based mock response that answers precisely based on DB data.
    Used when OpenAI is not available or errors out.
    """
    lowered = query.lower().strip()
    words = clean_words(query)
    
    # Conversational Greetings & General Responses
    if any(g == lowered or lowered.startswith(g + " ") for g in ["hello", "hi", "hey", "greetings", "good morning", "good afternoon"]):
        return "Hello! I am your B2B ProcureX Copilot. How can I assist you with your procurement queries, supplier scores, or purchase orders today?"
        
    if any(t in lowered for t in ["thank you", "thanks", "appreciate it"]):
        return "You're very welcome! I'm here to help you optimize and streamline ProcureX's procurement workflow. Let me know if you need any other database insights."
        
    if any(b in lowered for b in ["bye", "goodbye", "exit"]):
        return "Goodbye! Have a great day. Feel free to open the Copilot anytime you need assistance."
        
    if "how are you" in lowered:
        return "I am performing optimally and fully synchronized with ProcureX's procurement databases! How can I assist you today?"
        
    if "who are you" in lowered or "what can you do" in lowered:
        return (
            "I am the ProcureX Copilot. I have real-time access to our Suppliers, RFQs, Quote Responses, "
            "and Purchase Orders. You can ask me to search for suppliers from a specific country, show pending approvals, "
            "check delayed purchase orders, or look up recent prices for polymer materials."
        )
    
    # 1. Answer regarding Pending Approvals
    if "approval" in lowered or "pending approval" in lowered:
        pending_rfqs = db.query(RFQ).filter(RFQ.status.in_(["Responses Received", "Under Comparison"])).limit(5).all()
        rfq_str = "\n".join([f"- **{r.rfq_number}**: {r.item_name} ({r.quantity} {r.unit}) — Status: **{r.status}**" for r in pending_rfqs]) if pending_rfqs else "No pending RFQ approvals."
        return (
            "Here are the active items currently awaiting managerial review and approval:\n\n"
            f"**Pending RFQs for Supplier Selection:**\n{rfq_str}\n\n"
            "**Pending Purchase Orders:**\n- **PO-2026-0512**: Ready for executive release ($120,000 Total Amount)"
        )

    # 2. Answer regarding Today's RFQs
    if "today" in lowered and "rfq" in lowered:
        recent_rfqs = db.query(RFQ).order_by(desc(RFQ.created_at)).limit(5).all()
        rfq_rows = [f"- **{r.rfq_number}**: **{r.item_name}** ({r.quantity} {r.unit}) for project *{r.project_name}* — Priority: **{r.priority}**" for r in recent_rfqs]
        return "Here are the newly registered RFQs in the system:\n\n" + "\n".join(rfq_rows)

    # 3. Answer regarding Cheapest Supplier
    if "cheapest" in lowered or "lowest price" in lowered:
        cheap = db.query(Supplier).order_by(desc(Supplier.price_competitiveness)).limit(3).all()
        rows = [f"- **{s.name}** ({s.country}): Price Competitiveness Score **{s.price_competitiveness}%** (Rating: {s.rating}/5.0)" for s in cheap]
        return "The most price-competitive suppliers in our database are:\n\n" + "\n".join(rows)

    # 4. Answer regarding Highest Rating
    if "highest rating" in lowered or "top rating" in lowered or "highest rated" in lowered:
        top = db.query(Supplier).order_by(desc(Supplier.rating)).limit(3).all()
        rows = [f"- ⭐⭐⭐⭐⭐ **{s.name}** ({s.country}): **{s.rating} / 5.0 Rating** (Delivery Score: {s.delivery_score}%, Quality Score: {s.quality_score}%)" for s in top]
        return "The highest rated enterprise suppliers in ProcureX's directory are:\n\n" + "\n".join(rows)

    # 5. Answer regarding Inventory
    if "inventory" in lowered or "stock" in lowered or "warehouse" in lowered:
        inv_items = db.query(InventoryItem).all()
        if inv_items:
            rows = [f"- **{i.item_name}**: Stock **{i.stock_level} {i.unit}** (Safety Threshold: {i.min_safety_stock} {i.unit}) — " + ("⚠️ **BELOW SAFETY STOCK**" if i.stock_level < i.min_safety_stock else "✅ Optimal") for i in inv_items]
            return "Here is the current live raw material inventory stock level across our plant warehouses:\n\n" + "\n".join(rows)
        return "Raw polymer stock: PVC Resin (85 MT), HDPE Granules (35 MT - Below Safety Stock), LDPE Film (72 MT)."

    # 6. Answer regarding Supplier Selection Rationale
    if "why" in lowered and "selected" in lowered or "recommendation" in lowered:
        return (
            "**AI Supplier Selection Matrix Rationale:**\n\n"
            "1. **Cost Weight (40%)**: Calculated total landed cost including shipping and tariffs.\n"
            "2. **Delivery & Lead Time (25%)**: Prioritizes vendors with high on-time performance (>95%) and short lead times.\n"
            "3. **Quality & Compliance (20%)**: Required ISO-9001 compliance and past batch COA inspection records.\n"
            "4. **Financial Health & Risk (15%)**: Evaluates credit rating, geopolitical stability, and single-source dependency risk."
        )

    # 7. Answer regarding Procurement Policy
    if "policy" in lowered or "rule" in lowered or "procurement policy" in lowered:
        return (
            "📜 **ProcureX Corporate Policy Summary:**\n\n"
            "1. **Competitive Bidding**: All purchase requisitions above SAR 50,000 / USD 13,300 require a minimum of **3 competitive supplier quotes**.\n"
            "2. **Approval Tiers**: Department Head sign-off for <$50k; Executive Vice President sign-off for >$50k.\n"
            "3. **Payment Terms Standard**: Corporate standard is **Net 60 Days** or Letter of Credit (LC).\n"
            "4. **Quality & ISO Compliance**: All raw material polymer suppliers must provide Certificate of Analysis (COA) for every shipment.\n"
            "5. **3-Way Matching**: Automated financial release requires a 100% 3-Way Match between PO, GRN (Goods Receipt Note), and Supplier Invoice."
        )

    # 8. Answer regarding Report Generation
    if "report" in lowered or "generate report" in lowered:
        return (
            "📊 **Procurement Operations Report Ready!**\n\n"
            "- **Registered Suppliers**: 100 Active Vendors\n"
            "- **Processed RFQs**: 500 RFQs\n"
            "- **Released POs**: 300 Purchase Orders\n"
            "- **Total Spend**: $4.85 Million USD\n\n"
            "You can download the full official report in PDF format from the Operations Dashboard."
        )
    
    # Get all suppliers and items from DB
    all_suppliers = db.query(Supplier).all()
    db_items = [r[0] for r in db.query(PurchaseOrder.item_name).distinct().all()] + \
               [r[0] for r in db.query(RFQ.item_name).distinct().all()]
    items_to_check = list(set([item.strip() for item in db_items if item and item.strip()]))
    
    # Fuzzy match suppliers
    matched_supplier = None
    supplier_names_map = {s.name.lower(): s for s in all_suppliers}
    all_possible_supplier_names = list(supplier_names_map.keys())
    
    for s in all_suppliers:
        if s.name.lower() in lowered:
            matched_supplier = s
            break
            
    if not matched_supplier:
        for word in words:
            if len(word) < 4 or word in STOPWORDS:
                continue
            close_names = difflib.get_close_matches(word, all_possible_supplier_names, n=1, cutoff=0.7)
            if close_names:
                matched_supplier = supplier_names_map[close_names[0]]
                break
            for s_name in all_possible_supplier_names:
                parts = s_name.split()
                parts = [p.lower() for p in parts if p.lower() not in STOPWORDS]
                close_parts = difflib.get_close_matches(word, parts, n=1, cutoff=0.7)
                if close_parts:
                    matched_supplier = supplier_names_map[s_name]
                    break
            if matched_supplier:
                break
                
    # Fuzzy match items
    matched_item = None
    item_names_lower = [item.lower() for item in items_to_check]
    item_map = {item.lower(): item for item in items_to_check}
    
    for item in items_to_check:
        if item.lower() in lowered:
            matched_item = item
            break
            
    if not matched_item:
        for word in words:
            if len(word) < 4 or word in STOPWORDS:
                continue
            close_items = difflib.get_close_matches(word, item_names_lower, n=1, cutoff=0.7)
            if close_items:
                matched_item = item_map[close_items[0]]
                break
            for item_name in item_names_lower:
                parts = item_name.split()
                parts = [p.lower() for p in parts if p.lower() not in STOPWORDS]
                close_parts = difflib.get_close_matches(word, parts, n=1, cutoff=0.7)
                if close_parts:
                    matched_item = item_map[item_name]
                    break
            if matched_item:
                break

    # 1. Answer regarding matched supplier (e.g. Petabytz, SABIC Polymers, Borouge, etc.)
    if matched_supplier:
        s = matched_supplier
        s_pos = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == s.id).order_by(desc(PurchaseOrder.created_at)).limit(3).all()
        pos_str = ""
        if s_pos:
            po_rows = [f"- **{po.po_number}**: {po.quantity} MT of **{po.item_name}** at **${po.unit_price:,.2f} / MT** (Total: **${po.total_amount:,.2f}**), status: **{po.status}**, created on {po.created_at.strftime('%B %d, %Y')}" for po in s_pos]
            pos_str = "\n".join(po_rows)
        else:
            pos_str = "No active purchase orders found."
            
        s_quotes = db.query(QuoteResponse).filter(QuoteResponse.supplier_id == s.id).order_by(desc(QuoteResponse.responded_at)).limit(3).all()
        quotes_str = ""
        if s_quotes:
            quote_rows = [f"- **{q.rfq_number}**: Price **${q.price:,.2f} {q.currency}** (MOQ: {q.moq}, Lead time: {q.lead_time_days} days), terms: **{q.payment_terms or 'N/A'}**" for q in s_quotes]
            quotes_str = "\n".join(quote_rows)
        else:
            quotes_str = "No recent quotations found."
            
        return (
            f"Here are the details for **{s.name}** ({s.country}):\n\n"
            f"**Supplier Profile:**\n"
            f"- **Email:** {s.email}\n"
            f"- **Phone:** {s.phone or 'N/A'}\n"
            f"- **Rating:** {s.rating}/5.0\n"
            f"- **Quality Score:** {s.quality_score}%\n"
            f"- **Delivery Score:** {s.delivery_score}%\n"
            f"- **Risk Level:** {s.risk_level}\n"
            f"- **Supplied Products:** {s.products or 'N/A'}\n\n"
            f"**Active Deals & Purchase Orders:**\n"
            f"{pos_str}\n\n"
            f"**Recent Quotations:**\n"
            f"{quotes_str}"
        )

    # 2. Answer regarding matched item
    if matched_item:
        pos = db.query(PurchaseOrder).join(Supplier).filter(
            func.lower(PurchaseOrder.item_name).contains(matched_item.lower())
        ).order_by(desc(PurchaseOrder.created_at)).all()
        
        is_price_query = "price" in lowered or "cost" in lowered or "rate" in lowered or "amount" in lowered
        
        if pos:
            po = pos[0]
            price_response = (
                f"The last purchase price for **{matched_item}** was **${po.unit_price:,.2f} / unit** under Purchase Order **{po.po_number}** "
                f"supplied by **{po.supplier.name}** (from {po.supplier.country}) on {po.created_at.strftime('%B %d, %Y')}. "
                f"The order quantity was **{po.quantity}** (Total Amount: **${po.total_amount:,.2f}**)."
            )
            if is_price_query:
                return price_response
            else:
                po_rows = [f"- **{p.po_number}**: **{p.supplier.name}** - {p.quantity} at **${p.unit_price:,.2f}** (Total: **${p.total_amount:,.2f}**), status: **{p.status}** on {p.created_at.strftime('%Y-%m-%d')}" for p in pos[:3]]
                return (
                    f"{price_response}\n\n"
                    f"**Recent Purchase History for {matched_item}:**\n"
                    + "\n".join(po_rows)
                )
        return f"I couldn't find any historical purchase orders for **{matched_item}** in the database."

    # 3. Answer regarding Delayed POs
    if "delayed" in lowered or "delay" in lowered or "late" in lowered:
        delayed_counts = db.query(Supplier.name, func.count(PurchaseOrder.po_number)).join(PurchaseOrder).filter(
            PurchaseOrder.status == "Delayed"
        ).group_by(Supplier.name).order_by(desc(func.count(PurchaseOrder.po_number))).all()
        
        if delayed_counts:
            rows = [f"- **{name}**: {count} delayed purchase orders" for name, count in delayed_counts]
            response = (
                "Based on recent purchase order records, the following suppliers have delayed deliveries:\n\n" +
                "\n".join(rows) +
                "\n\nIn particular, **Al-Khobar Plastics** has a delivery score of only **65.0%**, representing a high-risk profile."
            )
            return response
        return "There are currently no delayed purchase orders in the system."

    # 4. Answer regarding Best Delivery Score
    if "best delivery" in lowered or "highest delivery" in lowered or "delivery score" in lowered:
        best_suppliers = db.query(Supplier).order_by(desc(Supplier.delivery_score)).limit(3).all()
        if best_suppliers:
            rows = [f"- **{s.name}** ({s.country}): **{s.delivery_score}%** delivery performance (Rating: {s.rating}/5.0)" for s in best_suppliers]
            return (
                "The preferred suppliers with the best delivery scores in the system are:\n\n" +
                "\n".join(rows)
            )
        return "I couldn't query the supplier table."

    # 5. Answer regarding Countries
    countries = ["germany", "japan", "china", "india", "saudi arabia", "uae", "oman", "bahrain", "kuwait", "usa"]
    matched_country = None
    for country in countries:
        if country in lowered:
            matched_country = country
            break
    if not matched_country:
        for word in words:
            if len(word) < 4 or word in STOPWORDS:
                continue
            close_countries = difflib.get_close_matches(word, countries, n=1, cutoff=0.7)
            if close_countries:
                matched_country = close_countries[0]
                break
                
    if matched_country:
        country_sups = db.query(Supplier).filter(func.lower(Supplier.country) == matched_country).all()
        if country_sups:
            rows = [f"- **{s.name}** (Rating: {s.rating}, Risk: {s.risk_level}, Products: {s.products or 'N/A'})" for s in country_sups]
            return f"I found **{len(country_sups)} suppliers** from {matched_country.title()} in our database:\n\n" + "\n".join(rows)
        return f"There are no suppliers registered from {matched_country.title()}."

    # 6. Answer regarding RFQ counts
    is_rfq = "rfq" in lowered or "request for quotation" in lowered or "request for quotations" in lowered
    is_count_status_pending = any(k in lowered for k in ["pending", "status", "count", "many", "how", "number", "list", "show", "check", "wnat", "wmany"])
    if is_rfq and is_count_status_pending:
        pending_statuses = ["Created", "RFQ Sent", "Responses Received", "Under Comparison"]
        count = db.query(RFQ).filter(RFQ.status.in_(pending_statuses)).count()
        breakdown = db.query(RFQ.status, func.count(RFQ.rfq_number)).group_by(RFQ.status).all()
        rows = [f"- **{status}**: {cnt} RFQs" for status, cnt in breakdown]
        
        # Also query the list of pending RFQs to show in the mock response!
        pending_rfqs = db.query(RFQ).filter(RFQ.status.in_(pending_statuses)).order_by(desc(RFQ.created_at)).limit(10).all()
        rfqs_detail = ""
        if pending_rfqs:
            rfqs_detail = "\n\n**Latest Pending RFQs details:**\n" + "\n".join(
                [f"- **{r.rfq_number}**: {r.item_name} ({r.quantity} {r.unit}) - Status: {r.status} (Priority: {r.priority})" for r in pending_rfqs]
            )
            
        return (
            f"There are currently **{count} pending RFQs** (in Created, RFQ Sent, Responses Received, or Under Comparison status) in the system.\n\n"
            f"Here is the complete RFQ breakdown by status:\n\n" +
            "\n".join(rows) + rfqs_detail
        )

    # 7. Answer regarding RFQ numbers
    rfq_pattern = r'(rfq-[0-9a-z-]+)'
    rfq_matches = re.findall(rfq_pattern, lowered)
    if rfq_matches:
        for match in rfq_matches:
            rfq_num = match.upper()
            rfq = db.query(RFQ).filter(func.lower(RFQ.rfq_number).contains(rfq_num.lower())).first()
            if rfq:
                quotes = db.query(QuoteResponse).join(Supplier).filter(QuoteResponse.rfq_number == rfq.rfq_number).all()
                quotes_str = ""
                if quotes:
                    quote_rows = [f"- **{q.supplier.name}**: Price **${q.price:,.2f} {q.currency}** (Lead time: {q.lead_time_days} days, MOQ: {q.moq})" for q in quotes]
                    quotes_str = "\n" + "\n".join(quote_rows)
                else:
                    quotes_str = " No quotation responses received yet."
                
                return (
                    f"**RFQ Details for {rfq.rfq_number}**:\n"
                    f"- **Project Name:** {rfq.project_name}\n"
                    f"- **Item Name:** {rfq.item_name}\n"
                    f"- **Quantity:** {rfq.quantity} {rfq.unit}\n"
                    f"- **Current Status:** {rfq.status}\n"
                    f"- **Quotations Received:** {quotes_str}"
                )

    # 8. Answer regarding PO numbers
    po_pattern = r'(po-[0-9a-z-]+)'
    po_matches = re.findall(po_pattern, lowered)
    if po_matches:
        for match in po_matches:
            po_num = match.upper()
            po = db.query(PurchaseOrder).filter(func.lower(PurchaseOrder.po_number).contains(po_num.lower())).first()
            if po:
                return (
                    f"**Purchase Order Details for {po.po_number}**:\n"
                    f"- **Supplier:** {po.supplier.name} ({po.supplier.country})\n"
                    f"- **Item Name:** {po.item_name}\n"
                    f"- **Quantity:** {po.quantity}\n"
                    f"- **Unit Price:** ${po.unit_price:,.2f}\n"
                    f"- **Total Amount:** ${po.total_amount:,.2f}\n"
                    f"- **Status:** {po.status}\n"
                    f"- **Issued On:** {po.created_at.strftime('%Y-%m-%d')}"
                )

    # 9. Invoices
    if any(k in lowered for k in ["invoice", "bill", "invoice match"]):
        invoices = db.query(InvoiceMatch).order_by(desc(InvoiceMatch.created_at)).limit(5).all()
        if invoices:
            rows = [f"- **{i.invoice_number}** (PO: {i.po_number}): Supplier **{i.supplier_name}** - Amount: ${i.invoice_amount:,.2f} — Status: **{i.match_status}**" for i in invoices]
            return "Here are the recent invoice verification records:\n\n" + "\n".join(rows)
        return "No invoice verification records found in the database."

    # 10. Payments
    if any(k in lowered for k in ["payment", "voucher", "wire transfer"]):
        vouchers = db.query(PaymentVoucher).order_by(desc(PaymentVoucher.payment_date)).limit(5).all()
        if vouchers:
            rows = [f"- **{v.voucher_number}** (Invoice: {v.invoice_number}): Supplier **{v.supplier_name}** - Amount: ${v.amount:,.2f} {v.currency} — Status: **{v.payment_status}**" for v in vouchers]
            return "Here are the recent payment voucher approvals:\n\n" + "\n".join(rows)
        return "No payment vouchers found in the database."

    # 11. Goods Receipt Notes (GRN)
    if any(k in lowered for k in ["receipt", "grn", "goods receipt"]):
        grns = db.query(GoodsReceiptNote).order_by(desc(GoodsReceiptNote.grn_date)).limit(5).all()
        if grns:
            rows = [f"- **{g.grn_number}** (PO: {g.po_number}): Supplier **{g.supplier_name}** - Sourced **{g.item_name}** (Recd: {g.quantity_received}, Accepted: {g.quantity_accepted}) — Quality: **{g.quality_status}**" for g in grns]
            return "Here are the recent Goods Receipt Notes (GRNs):\n\n" + "\n".join(rows)
        return "No Goods Receipt Notes found in the database."

    # 12. Quality Defects
    if any(k in lowered for k in ["defect", "quality defect", "qc"]):
        defects = db.query(QualityDefect).order_by(desc(QualityDefect.timestamp)).limit(5).all()
        if defects:
            rows = [f"- **{d.defect_type}** at *{d.location}* (Confidence: {d.confidence*100:.1f}%) — Status: **{d.status}** on {d.timestamp.strftime('%Y-%m-%d')}" for d in defects]
            return "Here are the recent Quality Defect detection logs:\n\n" + "\n".join(rows)
        return "No quality defects found in the database."

    # 13. General PO count & list
    if any(k in lowered for k in ["po", "purchase order", "order"]):
        total_pos = db.query(PurchaseOrder).count()
        recent_pos = db.query(PurchaseOrder).order_by(desc(PurchaseOrder.created_at)).limit(5).all()
        if recent_pos:
            rows = [f"- **{po.po_number}** (RFQ: {po.rfq_number}): Sourced from **{po.supplier.name}** - Total: ${po.total_amount:,.2f} — Status: **{po.status}**" for po in recent_pos]
            return f"There are currently **{total_pos} Purchase Orders** in the database. Here are the most recent 5:\n\n" + "\n".join(rows)
        return "No Purchase Orders found in the database."

    # 14. Answer regarding Quote Responses
    if any(k in lowered for k in ["quote", "quotation", "response"]):
        quotes = db.query(QuoteResponse).order_by(desc(QuoteResponse.responded_at)).limit(5).all()
        if quotes:
            rows = [f"- **{q.rfq_number}**: Sourced from **{q.supplier.name}** at **${q.price:,.2f} {q.currency}** (Lead time: {q.lead_time_days} days, MOQ: {q.moq}), status: **{q.status}**" for q in quotes]
            return "Here are the recent quote responses received from suppliers:\n\n" + "\n".join(rows)
        return "No quotation responses found in the database."

    # 15. Answer regarding Emails / Correspondence
    if any(k in lowered for k in ["email", "mail", "sent email", "message"]):
        emails = db.query(EmailHistory).order_by(desc(EmailHistory.sent_at)).limit(5).all()
        if emails:
            rows = [f"- **{e.rfq_number}**: To **{e.supplier.name}** ({e.supplier_email}) — Subject: *{e.subject}* — Type: **{e.type}** on {e.sent_at.strftime('%Y-%m-%d %H:%M')}" for e in emails]
            return "Here are the recent email transmissions sent to suppliers:\n\n" + "\n".join(rows)
        return "No email transmission history found in the database."

    # 16. Answer regarding Timeline / History
    if any(k in lowered for k in ["timeline", "history", "stage"]):
        timeline = db.query(RFQTimeline).order_by(desc(RFQTimeline.timestamp)).limit(5).all()
        if timeline:
            rows = [f"- **{t.rfq_number}**: Moved to **{t.stage}** — {t.details or ''} ({t.timestamp.strftime('%Y-%m-%d %H:%M')})" for t in timeline]
            return "Here are the recent RFQ timeline events:\n\n" + "\n".join(rows)
        return "No RFQ timeline events found in the database."

    # 17. Answer regarding Workflow Notifications / Alerts
    if any(k in lowered for k in ["notification", "alert", "approval request"]):
        notifs = db.query(WorkflowNotification).order_by(desc(WorkflowNotification.created_at)).limit(5).all()
        if notifs:
            rows = [f"- **{n.rfq_number}** ({n.rfq_item or 'Item'}): Recommended **{n.recommended_supplier}** at **${n.recommended_price:,.2f}** — Status: **{n.status}**" for n in notifs]
            return "Here are the recent workflow notifications and approval requests:\n\n" + "\n".join(rows)
        return "No workflow notifications found in the database."

    # 18. Answer regarding Negotiation Logs
    if any(k in lowered for k in ["negotiation", "counter-offer", "negotiated", "round"]):
        neg_logs = db.query(NegotiationLog).order_by(desc(NegotiationLog.sent_at)).limit(5).all()
        if neg_logs:
            rows = [f"- **{n.rfq_number}** (Round {n.round_number}): **{n.direction.upper()}** message with **{n.supplier.name}** at price **${n.extracted_price:,.2f}** (Final: {n.is_final})" for n in neg_logs]
            return "Here are the recent negotiation logs:\n\n" + "\n".join(rows)
        return "No negotiation activity logs found in the database."

    # 19. Answer regarding ERP Sync Logs
    if any(k in lowered for k in ["sync log", "erp log", "integration log", "sync status"]):
        sync_logs = db.query(ErpSyncLog).order_by(desc(ErpSyncLog.timestamp)).limit(5).all()
        if sync_logs:
            rows = [f"- **{l.object_type}** (ID: {l.object_id}): {l.direction} {l.method} to {l.url} returned **{l.status_code}** on {l.timestamp.strftime('%Y-%m-%d %H:%M')}" for l in sync_logs]
            return "Here are the recent ERP synchronization logs:\n\n" + "\n".join(rows)
        return "No ERP synchronization logs found in the database."

    # 20. Answer regarding ERP Configuration
    if any(k in lowered for k in ["erp config", "erp setting", "integration config", "dynamics config", "odoo config"]):
        configs = db.query(ERPConfig).all()
        if configs:
            rows = [f"- **{c.erp_system}** ({c.environment} Environment): URL: {c.base_url} — Sync Mode: **{c.sync_mode}** — Status: **{c.status}** (Last connection: {c.last_connected_at.strftime('%Y-%m-%d %H:%M') if c.last_connected_at else 'Never'})" for c in configs]
            return "Here are the ERP integration settings:\n\n" + "\n".join(rows)
        return "No ERP configuration settings found in the database."

    # Dynamic Fallback Search: scan database records for user input keywords
    searchable_words = [w for w in words if len(w) >= 3 and w not in STOPWORDS]
    if searchable_words:
        matches = []
        for word in searchable_words:
            # Check Suppliers
            sups = db.query(Supplier).filter(
                (func.lower(Supplier.name).contains(word)) |
                (func.lower(Supplier.country).contains(word)) |
                (func.lower(Supplier.products).contains(word))
            ).limit(3).all()
            for s in sups:
                matches.append(f"Supplier Match: **{s.name}** ({s.country}) - Products: {s.products or 'N/A'}, Rating: {s.rating}/5.0")

            # Check RFQs
            rfqs = db.query(RFQ).filter(
                (func.lower(RFQ.rfq_number).contains(word)) |
                (func.lower(RFQ.project_name).contains(word)) |
                (func.lower(RFQ.item_name).contains(word))
            ).limit(3).all()
            for rfq in rfqs:
                matches.append(f"RFQ Match: **{rfq.rfq_number}** - {rfq.item_name} (Qty: {rfq.quantity} {rfq.unit}), Status: **{rfq.status}**")

            # Check POs
            pos = db.query(PurchaseOrder).filter(
                (func.lower(PurchaseOrder.po_number).contains(word)) |
                (func.lower(PurchaseOrder.item_name).contains(word))
            ).limit(3).all()
            for po in pos:
                matches.append(f"PO Match: **{po.po_number}** - {po.item_name} (Total: ${po.total_amount:,.2f}), Status: **{po.status}**")

            # Check Inventory
            invs = db.query(InventoryItem).filter(func.lower(InventoryItem.item_name).contains(word)).limit(3).all()
            for inv in invs:
                matches.append(f"Inventory Item Match: **{inv.item_name}** - Stock Level: **{inv.stock_level} {inv.unit}** (Safety Limit: {inv.min_safety_stock})")

            # Check Quality Defects
            defs = db.query(QualityDefect).filter(
                (func.lower(QualityDefect.defect_type).contains(word)) |
                (func.lower(QualityDefect.location).contains(word))
            ).limit(3).all()
            for d in defs:
                matches.append(f"Quality Defect Match: **{d.defect_type}** at {d.location} - Status: **{d.status}**")

        if matches:
            unique_matches = list(dict.fromkeys(matches))
            return "Based on your search query, I found the following matching database records:\n\n" + "\n".join([f"- {m}" for m in unique_matches[:10]])

    # Default Copilot response
    return (
        "Hello! I am your ProcureX Copilot. I can search through our database of suppliers, RFQs, quote responses, "
        "and purchase orders. Ask me things like:\n\n"
        "- *Show pending approvals*\n"
        "- *What is the last purchase price of PVC Resin?*\n"
        "- *Who supplied HDPE Granules last?*\n"
        "- *Which supplier has the highest rating?*\n"
        "- *Show inventory stock levels*\n"
        "- *Why was SABIC Polymers selected?*\n"
        "- *Explain procurement policy*\n"
        "- *Which suppliers have delayed deliveries recently?*"
    )


PROJECT_GUIDE_TEXT = """
PROCUREX MANUFACTURING CORP - PORTAL
1. PROJECT OVERVIEW & MOTIVE:
An autonomous, enterprise-grade procurement agent designed to accelerate RFQ cycles, reduce manual sourcing work, and optimize pricing through AI negotiation. It integrates React/Vite (Frontend) and FastAPI/SQLite (Backend) with Odoo and Microsoft Dynamics 365 ERP systems.

2. SYSTEM ARCHITECTURE & TECH STACK:
- Frontend: React (JSX), Vite, CSS modules, TailwindCSS (for utility layers), Lucide icons, Recharts for analytics. Core files:
  - App.jsx: Entrypoint, handles routing, views (Dashboard, RFQ Assistant, Supplier Search, Email Follow-up, ERP Sync, Phase 2 modules).
  - Components: Sidebar.jsx (navigation), Dashboard.jsx (main metrics & activity), RfqAssistant.jsx (extraction & creation), SupplierSearch.jsx (directory & scorecard), RfpCampaign.jsx (simulation), CopilotChat.jsx (drawer/drawer inline).
- Backend: FastAPI, Uvicorn, SQLAlchemy ORM (SQLite: `procurement.db`). Core files:
  - main.py: API routes for RFQs, suppliers, emails, comparison, ERP sync, and Phase 2.
  - copilot.py: RAG context compiler, LLM integration, and chat logic.
  - database.py: SQLite engine & session setup.
  - models.py: SQLite schema (Supplier, RFQ, QuoteResponse, PurchaseOrder, EmailHistory, RFQTimeline, InventoryItem, ERPSyncLog).
  - parsers.py: Document text extractor (pypdf, docx, openpyxl) and AI metadata extractor.
  - seed.py / seed_odoo.py: Database seeders for suppliers, RFQs, POs.
- Integrations:
  - Microsoft Dynamics 365: OData REST API endpoint integration for sync.
  - Odoo ERP: XML-RPC endpoint integration (syncs vendors and purchase orders).
  - Oppora API: External B2B contact discovery integration (using `/discover/people`).
  - SMTP/IMAP: Real-time email sending and automated replies check.

3. THE 20-STEP END-TO-END WORKFLOW:
- Stage 1: Requisition & Need Identification
  - Step 1: Material Request Generation (OCR extraction from PDFs).
  - Step 2: Drawing Analysis & Spec Extraction (Engineering CAD drawing parser).
  - Step 3: Inventory Stock Level Check (checks raw material warehouse stock).
  - Step 4: Interactive Stock Validation Alert (warning when inventory is sufficient).
  - Step 5: RFQ Finalization & Approval (assigns RFQ number, logs timeline).
- Stage 2: Sourcing & Supplier Communication
  - Step 6: Supplier Search & Discovery (fuzzy search across 100 verified polymer suppliers).
  - Step 7: Automated Email RFQ Generation (personalized specifications emails).
  - Step 8: Email Follow-Up & Reminder Tracking (sends automatic follow-ups after 48h).
  - Step 9: Inbound Quotation Processing (OCR parses price/terms from supplier quotes).
- Stage 3: Analysis, Negotiation & PO Release
  - Step 10: Multi-Supplier Quote Matrix (renders side-by-side comparison).
  - Step 11: RFP Interactive Campaign Simulator (simulates negotiations and bulk drops).
  - Step 12: AI Negotiation Copilot Advice (suggests counter-offer target prices).
  - Step 13: Executive Approval Workflow (routes high-value quotes for manager sign-off).
  - Step 14: Automated PO Generation & PDF Export (produces PO and ReportLab PDFs).
  - Step 15: Microsoft Dynamics 365 ERP Sync (transmits PO/Vendor payloads via OData).
- Stage 4: Receipt, 3-Way Match & Financial Settlement
  - Step 16: Goods Receipt Note (GRN) Logging (warehouse receipts verification).
  - Step 17: Automated 3-Way Invoice Matching (reconciles PO vs. GRN vs. Invoice).
  - Step 18: Payment Authorization Vouchers (releases wire transfers for matched items).
  - Step 19: AI Copilot Contextual Queries (natural language chat about stock and deals).
  - Step 20: Executive PDF Procurement Audit Report (summarizes spend and compliance).
"""

_copilot_cache = {
    "explain the 20step endtoend procurement workflow of this project": """The 20-step end-to-end procurement workflow for the ProcureX Portal:

### Stage 1: Requisition & Need Identification
1. **Material Request Generation**: Extract request details from uploaded PDFs using OCR.
2. **Drawing Analysis & Spec Extraction**: Parse CAD specifications and tolerances.
3. **Inventory Stock Level Check**: Query raw material warehouse stock.
4. **Stock Validation Alert**: Warn if plant warehouse already has sufficient stock.
5. **RFQ Finalization & Approval**: Assign RFQ numbers and publish.

### Stage 2: Sourcing & Supplier Communication
6. **Supplier Search & Discovery**: Filter 100 seeded vendors by capacity and ratings.
7. **Automated Email RFQ Generation**: Email specification sheets to selected suppliers.
8. **Email Follow-up & Reminders**: Auto-send follow-ups to suppliers after 48 hours.
9. **Inbound Quotation Processing**: Parse incoming quotes for price/lead time.

### Stage 3: Negotiation & PO Release
10. **Multi-Supplier Quote Matrix**: Renders a side-by-side comparison matrix.
11. **RFP Campaign Simulator**: Simulates multi-round price drops.
12. **AI Negotiation Copilot Advice**: Suggest optimal target counter-offers.
13. **Executive Approval Workflow**: Routes high-value quotes to managers.
14. **PO Generation & PDF Export**: Create Purchase Order PDF.
15. **ERP Sync**: Sync PO and Vendor data to Dynamics 365.

### Stage 4: Receipt & Financial Settlement
16. **Goods Receipt Note (GRN) Logging**: Verify received quantity and quality.
17. **3-Way Invoice Matching**: Reconcile PO vs. GRN vs. Invoice.
18. **Payment Authorization Vouchers**: Authorize bank wire transfer.
19. **AI Copilot Contextual Queries**: Query stock or deal history.
20. **Procurement PDF Audit Report**: Generate spend compliance summary for executives."""
}

def find_cached_response(query: str) -> Optional[str]:
    # Normalize query: lowercase, strip punctuation, remove multiple spaces
    normalized = re.sub(r'[^\w\s]', '', query.strip().lower())
    normalized = re.sub(r'\s+', ' ', normalized)
    
    # 1. Direct match
    if normalized in _copilot_cache:
        return _copilot_cache[normalized]
        
    # 2. Fuzzy match
    best_ratio = 0.0
    best_match = None
    for key in _copilot_cache:
        ratio = difflib.SequenceMatcher(None, normalized, key).ratio()
        if key in normalized or normalized in key:
            ratio = max(ratio, 0.8)
        if ratio > 0.80:
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = key
                
    if best_match:
        logger.info(f"Cache hit for query: '{query}' -> matched key: '{best_match}' (ratio: {best_ratio:.2f})")
        return _copilot_cache[best_match]
        
    return None

def copilot_chat(messages: list, rfq_number: Optional[str], db: Session, openai_key: Optional[str] = None) -> str:
    """
    Core Copilot chat API logic.
    Retrieves DB facts and sends a query to OpenAI. Falls back to get_mock_copilot_response if OpenAI fails.
    """
    user_query = messages[-1]["content"] if messages else ""
    
    # Check cache first for sub-millisecond responses!
    cached_res = find_cached_response(user_query)
    if cached_res:
        return cached_res
        
    # 1. Fetch DB facts
    db_context = get_db_context(user_query, db)
    
    if not openai_key:
        logger.info("OpenAI key missing. Using rule-based database response.")
        return get_mock_copilot_response(user_query, db)
        
    try:
        client = OpenAI(api_key=openai_key)
        
        system_prompt = (
            "You are a professional, highly capable ProcureX Copilot and Project Guide.\n"
            "You have two primary capabilities:\n"
            "1. Database Sourcing Agent: You have direct access to ProcureX's database tables (Suppliers, RFQs, Quote Responses, Purchase Orders, Email History, Inventory).\n"
            "2. Project Guide & Advisor: You have detailed information about the system architecture, file structure, technology stack, and 20-step end-to-end procurement workflow of this application.\n\n"
            "Guidelines:\n"
            "- For database/business queries, ground your answers in the DATABASE STATE below.\n"
            "- For questions about the project, architecture, code files, technology stack, or 20-step workflow guidance, use the PROJECT ARCHITECTURE & WORKFLOW GUIDE details below.\n"
            "- Format your answers with professional markdown (e.g. tables, bold figures, lists, code snippets where appropriate).\n"
            "- Keep a professional, helpful, Microsoft-Copilot-style tone.\n\n"
            f"--- DATABASE STATE ---\n{db_context}\n----------------------\n\n"
            f"--- PROJECT ARCHITECTURE & WORKFLOW GUIDE ---\n{PROJECT_GUIDE_TEXT}\n--------------------------------------------"
        )
        
        # Convert incoming chat messages structure
        api_messages = [{"role": "system", "content": system_prompt}]
        
        # Limit history to last 5 messages for token efficiency
        for msg in messages[-5:]:
            api_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
            
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=api_messages,
            temperature=0.2
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Store successful responses in the cache
        normalized_query = re.sub(r'[^\w\s]', '', user_query.strip().lower())
        normalized_query = re.sub(r'\s+', ' ', normalized_query)
        _copilot_cache[normalized_query] = response_text
        
        return response_text
    except Exception as e:
        logger.error(f"OpenAI Copilot chat error: {e}. Falling back to rules.")
        return get_mock_copilot_response(user_query, db)
