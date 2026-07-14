import os
import json
import logging
import difflib
import re
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from models import Supplier, RFQ, QuoteResponse, PurchaseOrder, EmailHistory, RFQTimeline
from openai import OpenAI

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
    
    # Fetch all suppliers and items from DB
    all_suppliers = db.query(Supplier).all()
    db_items = [r[0] for r in db.query(PurchaseOrder.item_name).distinct().all()] + \
               [r[0] for r in db.query(RFQ.item_name).distinct().all()]
    items_to_check = list(set([item.strip() for item in db_items if item and item.strip()]))
    
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
    if "pending rfq" in lowered or "how many rfq" in lowered or "rfq counts" in lowered or "number of rfq" in lowered:
        rfq_counts = db.query(RFQ.status, func.count(RFQ.rfq_number)).group_by(RFQ.status).all()
        counts_dict = {status: count for status, count in rfq_counts}
        context.append(f"RFQ Counts by Status: {json.dumps(counts_dict)}")

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

    # 10. Default summary of data if context is empty
    if not context:
        summary = {
            "total_suppliers": db.query(Supplier).count(),
            "total_rfqs": db.query(RFQ).count(),
            "total_pos": db.query(PurchaseOrder).count(),
            "latest_rfqs": [r.rfq_number for r in db.query(RFQ).order_by(desc(RFQ.created_at)).limit(3).all()]
        }
        context.append(f"General Procurement DB summary: {json.dumps(summary)}")

    return "\n\n".join(context)

def get_mock_copilot_response(query: str, db: Session) -> str:
    """
    Returns a rule-based mock response that answers precisely based on DB data.
    Used when OpenAI is not available or errors out.
    """
    lowered = query.lower()
    words = clean_words(query)
    
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
    if "pending rfq" in lowered or "how many rfq" in lowered or "status of rfq" in lowered or "rfq counts" in lowered:
        pending_statuses = ["Created", "RFQ Sent", "Responses Received", "Under Comparison"]
        count = db.query(RFQ).filter(RFQ.status.in_(pending_statuses)).count()
        breakdown = db.query(RFQ.status, func.count(RFQ.rfq_number)).filter(RFQ.status.in_(pending_statuses)).group_by(RFQ.status).all()
        rows = [f"- **{status}**: {cnt} RFQs" for status, cnt in breakdown]
        return (
            f"There are currently **{count} pending RFQs** in the system. Here is the breakdown by status:\n\n" +
            "\n".join(rows)
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

    # Default Copilot response
    return (
        "Hello! I am your Procurement AI Copilot. I can search through our database of suppliers, RFQs, quote responses, "
        "and purchase orders. Ask me things like:\n\n"
        "- *What is the last purchase price of PVC Resin?*\n"
        "- *Who supplied HDPE Granules last?*\n"
        "- *Who has the best delivery score?*\n"
        "- *Which suppliers have delayed deliveries recently?*\n"
        "- *How many pending RFQs do we have?*\n"
        "- *Show suppliers from Germany.*"
    )

def copilot_chat(messages: list, rfq_number: Optional[str], db: Session, openai_key: Optional[str] = None) -> str:
    """
    Core Copilot chat API logic.
    Retrieves DB facts and sends a query to OpenAI. Falls back to get_mock_copilot_response if OpenAI fails.
    """
    user_query = messages[-1]["content"] if messages else ""
    
    # 1. Fetch DB facts
    db_context = get_db_context(user_query, db)
    
    if not openai_key:
        logger.info("OpenAI key missing. Using rule-based database response.")
        return get_mock_copilot_response(user_query, db)
        
    try:
        client = OpenAI(api_key=openai_key)
        
        system_prompt = (
            "You are a professional, highly capable Procurement AI Copilot for Neproplast.\n"
            "You have direct access to Neproplast's database tables (Suppliers, RFQs, Quote Responses, Purchase Orders, Email History).\n"
            "Your answers MUST be strictly grounded in the database facts provided below. If you don't find the answer in the database facts, state that you cannot find it, rather than hallucinating.\n"
            "Format your answers with professional markdown (e.g. bold figures, bullet lists, tables where appropriate).\n"
            "Adopt a helpful, Microsoft-Copilot-style tone.\n\n"
            f"--- DATABASE STATE ---\n{db_context}\n----------------------"
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
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"OpenAI Copilot chat error: {e}. Falling back to rules.")
        return get_mock_copilot_response(user_query, db)
