from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Date, Text
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    country = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    rating = Column(Float, default=0.0)
    lead_time_days = Column(Integer, default=15)
    preferred = Column(Boolean, default=False)
    quality_score = Column(Float, default=100.0)
    delivery_score = Column(Float, default=100.0)
    price_competitiveness = Column(Float, default=100.0)
    risk_level = Column(String(50), default="Low") # Low, Medium, High
    products = Column(Text, nullable=True) # Comma-separated list of items they supply
    categories = Column(Text, nullable=True) # Comma-separated list of categories
    average_response_time_hours = Column(Float, default=24.0)

    # ERP integration columns
    synced_to_erp = Column(Boolean, default=False)
    erp_sync_date = Column(DateTime, nullable=True)
    erp_vendor_id = Column(String(100), nullable=True)

    quotes = relationship("QuoteResponse", back_populates="supplier")
    pos = relationship("PurchaseOrder", back_populates="supplier")
    emails = relationship("EmailHistory", back_populates="supplier")

class RFQ(Base):
    __tablename__ = "rfqs"

    rfq_number = Column(String(100), primary_key=True, index=True)
    project_name = Column(String(255), nullable=False)
    department = Column(String(100), nullable=True)
    required_date = Column(Date, nullable=True)
    item_name = Column(String(255), nullable=False)
    item_code = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    specifications = Column(Text, nullable=True)
    drawing_attachment = Column(String(255), nullable=True)
    priority = Column(String(50), default="Medium") # Low, Medium, High
    delivery_location = Column(String(255), nullable=True)
    expected_delivery_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)
    status = Column(String(100), default="Created") 
    # Statuses: Created, RFQ Sent, Responses Received, Under Comparison, Approved, PO Generated
    created_at = Column(DateTime, default=datetime.utcnow)

    quotes = relationship("QuoteResponse", back_populates="rfq", cascade="all, delete-orphan")
    pos = relationship("PurchaseOrder", back_populates="rfq", cascade="all, delete-orphan")
    emails = relationship("EmailHistory", back_populates="rfq", cascade="all, delete-orphan")
    timeline_events = relationship("RFQTimeline", back_populates="rfq", cascade="all, delete-orphan")

class QuoteResponse(Base):
    __tablename__ = "quote_responses"

    id = Column(Integer, primary_key=True, index=True)
    rfq_number = Column(String(100), ForeignKey("rfqs.rfq_number"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    moq = Column(Float, default=1.0)
    lead_time_days = Column(Integer, default=10)
    payment_terms = Column(String(255), nullable=True)
    incoterms = Column(String(50), nullable=True)
    warranty = Column(String(100), nullable=True)
    validity = Column(String(100), nullable=True)
    delivery_details = Column(String(255), nullable=True)
    responded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(100), default="Quotation Received") # Quotation Received, Rejected, Under Review

    rfq = relationship("RFQ", back_populates="quotes")
    supplier = relationship("Supplier", back_populates="quotes")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    po_number = Column(String(100), primary_key=True, index=True)
    rfq_number = Column(String(100), ForeignKey("rfqs.rfq_number"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    item_name = Column(String(255), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String(100), default="Draft") # Draft, Sent, Acknowledged, Delayed, Completed
    created_at = Column(DateTime, default=datetime.utcnow)

    # ERP integration columns
    synced_to_erp = Column(Boolean, default=False)
    erp_sync_date = Column(DateTime, nullable=True)
    erp_po_number = Column(String(100), nullable=True)

    rfq = relationship("RFQ", back_populates="pos")
    supplier = relationship("Supplier", back_populates="pos")

class EmailHistory(Base):
    __tablename__ = "email_history"

    id = Column(Integer, primary_key=True, index=True)
    rfq_number = Column(String(100), ForeignKey("rfqs.rfq_number"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    type = Column(String(100), default="RFQ Invitation") # RFQ Invitation, Reminder, Follow-up
    sent_at = Column(DateTime, default=datetime.utcnow)
    response_received = Column(Boolean, default=False)

    rfq = relationship("RFQ", back_populates="emails")
    supplier = relationship("Supplier", back_populates="emails")

class RFQTimeline(Base):
    __tablename__ = "rfq_timeline"

    id = Column(Integer, primary_key=True, index=True)
    rfq_number = Column(String(100), ForeignKey("rfqs.rfq_number"), nullable=False)
    stage = Column(String(100), nullable=False)
    # Stage values: Created, RFQ Sent, Supplier Responded, Reminder Sent, Comparison Generated, Buyer Reviewed, Approved, PO Generated
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(Text, nullable=True)

    rfq = relationship("RFQ", back_populates="timeline_events")


class ErpSyncLog(Base):
    __tablename__ = "erp_sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    object_type = Column(String(100), nullable=False)  # Supplier, PurchaseOrder
    object_id = Column(String(100), nullable=False)
    direction = Column(String(50), default="Outbound")  # Outbound, Inbound
    url = Column(String(500), nullable=False)
    method = Column(String(10), default="POST")
    headers = Column(Text, nullable=True)
    request_payload = Column(Text, nullable=True)
    response_payload = Column(Text, nullable=True)
    status_code = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String(255), nullable=False, unique=True)
    stock_level = Column(Float, nullable=False)
    min_safety_stock = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)


class QualityDefect(Base):
    __tablename__ = "quality_defects"

    id = Column(Integer, primary_key=True, index=True)
    defect_type = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    confidence = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String(100), default="Active") # Active, Resolved


class GoodsReceiptNote(Base):
    __tablename__ = "goods_receipt_notes"

    grn_number = Column(String(100), primary_key=True, index=True)
    po_number = Column(String(100), ForeignKey("purchase_orders.po_number"), nullable=False)
    supplier_name = Column(String(255), nullable=False)
    item_name = Column(String(255), nullable=False)
    quantity_ordered = Column(Float, nullable=False)
    quantity_received = Column(Float, nullable=False)
    quantity_accepted = Column(Float, nullable=False)
    quality_status = Column(String(100), default="Passed") # Passed, Rejected, QC Pending
    grn_date = Column(DateTime, default=datetime.utcnow)
    synced_to_erp = Column(Boolean, default=True)


class InvoiceMatch(Base):
    __tablename__ = "invoice_matches"

    invoice_number = Column(String(100), primary_key=True, index=True)
    po_number = Column(String(100), ForeignKey("purchase_orders.po_number"), nullable=False)
    grn_number = Column(String(100), ForeignKey("goods_receipt_notes.grn_number"), nullable=True)
    supplier_name = Column(String(255), nullable=False)
    po_amount = Column(Float, nullable=False)
    invoice_amount = Column(Float, nullable=False)
    match_status = Column(String(100), default="Matched 3-Way") # Matched 3-Way, Price Mismatch, Quantity Mismatch, Pending
    mismatch_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PaymentVoucher(Base):
    __tablename__ = "payment_vouchers"

    voucher_number = Column(String(100), primary_key=True, index=True)
    invoice_number = Column(String(100), ForeignKey("invoice_matches.invoice_number"), nullable=False)
    supplier_name = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    payment_status = Column(String(100), default="Approved") # Approved, Paid, Processing
    payment_method = Column(String(100), default="Wire Transfer")
    payment_date = Column(DateTime, default=datetime.utcnow)


class ERPConfig(Base):
    __tablename__ = "erp_configs"

    id = Column(Integer, primary_key=True, index=True)
    erp_system = Column(String(50), default="Dynamics365") # Dynamics365, SAP_S4HANA, SAP_Ariba, Oracle
    base_url = Column(String(500), default="https://neproplast-prod.operations.dynamics.com/data")
    tenant_id = Column(String(255), default="72f988bf-86f1-41af-91ab-2d7cd011db47")
    client_id = Column(String(255), default="d365-ai-procurement-app-client-id")
    client_secret = Column(String(255), default="••••••••••••••••••••••••••••")
    environment = Column(String(50), default="Production") # Production, Sandbox, Demo
    sync_mode = Column(String(50), default="Live") # Live, Simulated
    auto_sync_on_po = Column(Boolean, default=True)
    last_connected_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="Connected") # Connected, Disconnected, Error


class WorkflowNotification(Base):
    """Human-in-the-loop notification — bot creates this when comparison is ready."""
    __tablename__ = "workflow_notifications"

    id = Column(Integer, primary_key=True, index=True)
    rfq_number = Column(String(100), nullable=False, index=True)
    rfq_item = Column(String(255), nullable=True)
    type = Column(String(100), default="approval_required")
    # pending → approved → rejected
    status = Column(String(50), default="pending")
    # Winner supplier recommended by AI
    recommended_supplier = Column(String(255), nullable=True)
    recommended_price = Column(Float, nullable=True)
    recommended_currency = Column(String(10), default="USD")
    # Full comparison JSON blob stored as text
    comparison_json = Column(Text, nullable=True)
    # Short AI-written summary for the human
    summary_message = Column(Text, nullable=True)
    # Email notification sent to the human reviewer
    notification_email_sent = Column(Boolean, default=False)
    # PO number created after approval
    po_number = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)


class NegotiationLog(Base):
    """Tracks each negotiation round per supplier per RFQ."""
    __tablename__ = "negotiation_logs"

    id = Column(Integer, primary_key=True, index=True)
    rfq_number = Column(String(100), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    supplier_email = Column(String(255), nullable=True)
    round_number = Column(Integer, default=1)
    # outbound = bot sent; inbound = supplier replied
    direction = Column(String(20), default="outbound")
    subject = Column(String(255), nullable=True)
    body = Column(Text, nullable=True)
    extracted_price = Column(Float, nullable=True)
    extracted_currency = Column(String(10), nullable=True)
    extracted_lead_time = Column(Integer, nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)
    # True once supplier has replied for this round
    reply_received = Column(Boolean, default=False)
    # Is this the final accepted price?
    is_final = Column(Boolean, default=False)

    supplier = relationship("Supplier")
