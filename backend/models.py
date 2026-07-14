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


