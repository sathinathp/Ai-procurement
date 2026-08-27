import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_rfq_pdf(filename):
    c = canvas.Canvas(filename, pagesize=letter)
    
    # Title
    c.setFont("Helvetica-Bold", 24)
    c.drawString(72, 720, "PROCUREX CO.")
    
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
    c.setFont("Helvetica-Bold", 20)
    c.setFillColorRGB(0.0, 0.47, 0.83) # Blue brand color
    c.drawString(54, 735, "PROCUREX MANUFACTURING CORP.")
    
    c.setFont("Helvetica-Bold", 12)
    c.setFillColorRGB(0.27, 0.33, 0.41) # Dark grey
    c.drawString(54, 715, "PROCUREX BID EVALUATION & QUOTE COMPARISON MATRIX")
    
    # Decorative line
    c.setLineWidth(2)
    c.setStrokeColorRGB(0.0, 0.47, 0.83)
    c.line(54, 705, 558, 705)
    
    # General Info Table
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(0, 0, 0)
    c.drawString(54, 680, "RFQ REFERENCE:")
    c.setFont("Helvetica", 9)
    c.drawString(160, 680, "RFQ-2026-999")
    
    c.setFont("Helvetica-Bold", 9)
    c.drawString(320, 680, "PROJECT NAME:")
    c.setFont("Helvetica", 9)
    c.drawString(420, 680, "Project PVC Resin Pipeline Setup")
    
    c.setFont("Helvetica-Bold", 9)
    c.drawString(54, 665, "ITEM NAME:")
    c.setFont("Helvetica", 9)
    c.drawString(160, 665, "PVC Resin K-67")
    
    c.setFont("Helvetica-Bold", 9)
    c.drawString(320, 665, "QUANTITY:")
    c.setFont("Helvetica", 9)
    c.drawString(420, 665, "100.0 MT")
    
    # Comparison Table Headers
    y = 620
    c.setFont("Helvetica-Bold", 10)
    c.setFillColorRGB(1, 1, 1)
    
    # Header Background
    c.setFillColorRGB(0.0, 0.47, 0.83)
    c.rect(54, y, 504, 25, fill=1, stroke=0)
    
    c.setFillColorRGB(1, 1, 1)
    c.drawString(60, y + 8, "Evaluation Criteria")
    c.drawString(200, y + 8, "SABIC Polymers (Rec)")
    c.drawString(320, y + 8, "Petabytz Polymers")
    c.drawString(440, y + 8, "Softstandard Labs")
    
    # Comparison Rows Data
    rows = [
        ("Unit Price (USD)", "1,050.00 USD / MT", "1,120.00 USD / MT", "1,180.00 USD / MT"),
        ("Total Quote Value", "105,000.00 USD", "112,000.00 USD", "118,000.00 USD"),
        ("Delivery Lead Time", "7 Days", "12 Days", "15 Days"),
        ("Payment Terms", "Net 60 Days", "Net 30 Days", "Net 30 Days"),
        ("Incoterms", "CIF Jeddah", "FOB Dammam", "EXW Riyadh"),
        ("ERP Supplier Sync", "Verified (ERP-105)", "Verified (ERP-302)", "Verified (ERP-412)"),
        ("ProcureX Score / Decision", "98/100 (RECOMMENDED)", "84/100 (REJECTED)", "71/100 (REJECTED)")
    ]
    
    c.setStrokeColorRGB(0.8, 0.8, 0.8)
    c.setLineWidth(0.5)
    
    for i, row in enumerate(rows):
        y -= 25
        # Alternating background
        if i % 2 == 1:
            c.setFillColorRGB(0.96, 0.97, 0.99)
            c.rect(54, y, 504, 25, fill=1, stroke=0)
            
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(60, y + 8, row[0])
        c.setFont("Helvetica", 8.5)
        
        # Color highlight recommended decision
        if i == len(rows) - 1:
            c.setFont("Helvetica-Bold", 8.5)
            c.setFillColorRGB(0.1, 0.6, 0.1) # Green for recommended
            c.drawString(200, y + 8, row[1])
            c.setFillColorRGB(0.7, 0.1, 0.1) # Red for rejected
            c.drawString(320, y + 8, row[2])
            c.drawString(440, y + 8, row[3])
        else:
            c.setFillColorRGB(0.15, 0.2, 0.25)
            c.drawString(200, y + 8, row[1])
            c.drawString(320, y + 8, row[2])
            c.drawString(440, y + 8, row[3])
            
        # Draw cell border
        c.line(54, y, 558, y)
        
    # Draw vertical gridlines
    c.line(54, 645, 54, y)
    c.line(190, 645, 190, y)
    c.line(310, 645, 310, y)
    c.line(430, 645, 430, y)
    c.line(558, 645, 558, y)
    
    # AI Recommendation Section
    y -= 45
    c.setFillColorRGB(0.94, 0.96, 0.99)
    c.rect(54, y, 504, 60, fill=1, stroke=1)
    
    c.setFillColorRGB(0.0, 0.47, 0.83)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(64, y + 45, "PROCUREX COPILOT RECOMMENDATION:")
    
    c.setFillColorRGB(0.2, 0.25, 0.3)
    c.setFont("Helvetica", 8.5)
    c.drawString(64, y + 30, "- SABIC Polymers Co. is the optimal choice: lowest unit price ($1,050.00 USD/MT), fastest lead time")
    c.drawString(70, y + 18, "(7 Days), and the most favorable payment terms (Net 60 Days).")
    c.drawString(64, y + 6, "- Action Recommended: Proceed to generate and issue official Purchase Order to SABIC Polymers.")
    
    # Audit stamp
    y -= 35
    c.setFont("Helvetica-Oblique", 7.5)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.drawString(54, y, "This comparison matrix was generated dynamically by the ProcureX Assistant. All parameters are verified against D365 ERP.")
    
    c.save()
    print(f"[OK] Generated Comparative Quote PDF: {filename}")

if __name__ == "__main__":
    create_rfq_pdf("sample_rfq_document.pdf")
    create_quote_pdf("sample_supplier_quote.pdf")
