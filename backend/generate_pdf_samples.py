import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_rfq_pdf(filename):
    c = canvas.Canvas(filename, pagesize=letter)
    
    # Title
    c.setFont("Helvetica-Bold", 24)
    c.drawString(72, 720, "NEPROPLAST CO.")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(72, 690, "MATERIAL REQUEST & RFQ")
    
    # Decorative line
    c.setLineWidth(1.5)
    c.setStrokeColorRGB(0.09, 0.57, 1.0) # blue color
    c.line(72, 680, 540, 680)
    
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(1)
    
    # RFQ Details
    y = 640
    details = [
        ("RFQ NUMBER:", "RFQ-2026-999"),
        ("PROJECT NAME:", "Project PVC Resin Pipeline Setup"),
        ("DEPARTMENT:", "Procurement Operations"),
        ("REQUIRED DATE:", "2026-09-15"),
        ("PRIORITY:", "High"),
        ("DELIVERY LOCATION:", "Dammam Plant"),
        ("EXPECTED DELIVERY DATE:", "2026-09-10")
    ]
    
    for label, val in details:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(72, y, label)
        c.setFont("Helvetica", 10)
        c.drawString(220, y, val)
        y -= 20
        
    # Item Details Header
    y -= 15
    c.setFont("Helvetica-Bold", 12)
    c.drawString(72, y, "ITEM DETAILS:")
    y -= 10
    c.line(72, y, 540, y)
    y -= 25
    
    item_details = [
        ("Item Name:", "PVC Resin K-67"),
        ("Item Code:", "ITM-RAW-PVC-K67"),
        ("Quantity:", "100.0 MT"),
        ("Unit:", "MT"),
        ("Specifications:", "K-Value 67-68, Viscosity 110-120 ml/g, Bulk density 0.5-0.6 g/cm3")
    ]
    
    for label, val in item_details:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(72, y, label)
        c.setFont("Helvetica", 10)
        # Handle wrap for long specifications
        if len(val) > 60:
            c.drawString(220, y, val[:55] + "-")
            y -= 15
            c.drawString(220, y, val[55:])
        else:
            c.drawString(220, y, val)
        y -= 20
        
    # Remarks Header
    y -= 15
    c.setFont("Helvetica-Bold", 12)
    c.drawString(72, y, "REMARKS:")
    y -= 10
    c.line(72, y, 540, y)
    y -= 25
    
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(72, y, "Please submit your quotation with FOB/CIF Dammam terms, payment terms, and lead time.")
    
    c.save()
    print(f"[OK] Generated RFQ PDF: {filename}")

def create_quote_pdf(filename):
    c = canvas.Canvas(filename, pagesize=letter)
    
    # Title
    c.setFont("Helvetica-Bold", 24)
    c.drawString(72, 720, "SABIC POLYMERS CO.")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(72, 690, "COMMERCIAL PROPOSAL / QUOTATION")
    
    # Decorative line
    c.setLineWidth(1.5)
    c.setStrokeColorRGB(0.09, 0.57, 1.0)
    c.line(72, 680, 540, 680)
    
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(1)
    
    # Quotation details
    y = 640
    details = [
        ("QUOTATION REF:", "SABIC-2026-Q91"),
        ("DATE:", "2026-08-07"),
        ("VALIDITY:", "30 Days"),
        ("RFQ REFERENCE:", "RFQ-2026-999")
    ]
    
    for label, val in details:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(72, y, label)
        c.setFont("Helvetica", 10)
        c.drawString(220, y, val)
        y -= 20
        
    # Commercial Proposal Header
    y -= 15
    c.setFont("Helvetica-Bold", 12)
    c.drawString(72, y, "COMMERCIAL PROPOSAL:")
    y -= 10
    c.line(72, y, 540, y)
    y -= 25
    
    comm_details = [
        ("Item Name:", "PVC Resin K-67"),
        ("Unit Price:", "1050.00 USD per MT"),
        ("Total Quantity:", "100.00 MT"),
        ("Total Value:", "105,000.00 USD"),
        ("Minimum Order Quantity:", "10.0 MT")
    ]
    
    for label, val in comm_details:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(72, y, label)
        c.setFont("Helvetica", 10)
        c.drawString(220, y, val)
        y -= 20
        
    # Logistics & Terms Header
    y -= 15
    c.setFont("Helvetica-Bold", 12)
    c.drawString(72, y, "LOGISTICS & TERMS:")
    y -= 10
    c.line(72, y, 540, y)
    y -= 25
    
    logistics = [
        ("Delivery Lead Time:", "7 Days"),
        ("Payment Terms:", "Net 60 Days"),
        ("Incoterms:", "CIF Jeddah"),
        ("Warranty:", "12 Months"),
        ("Shipment Mode:", "Ocean freight to Jeddah Port")
    ]
    
    for label, val in logistics:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(72, y, label)
        c.setFont("Helvetica", 10)
        c.drawString(220, y, val)
        y -= 20
        
    c.save()
    print(f"[OK] Generated Supplier Quote PDF: {filename}")

if __name__ == "__main__":
    create_rfq_pdf("sample_rfq_document.pdf")
    create_quote_pdf("sample_supplier_quote.pdf")
