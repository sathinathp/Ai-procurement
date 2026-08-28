import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def generate_rfq_pdf():
    pdf_path = "e:/poc-july/veolia_rfq.pdf"
    c = canvas.Canvas(pdf_path, pagesize=letter)
    W, H = letter # 612 x 792
    
    # Header Banner - Dark Navy
    c.setFillColorRGB(0.06, 0.18, 0.37)
    c.rect(0, H - 90, W, 90, fill=1, stroke=0)
    
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(36, H - 38, "VEOLIA WATER TECHNOLOGIES")
    c.setFont("Helvetica", 10)
    c.drawString(36, H - 56, "OFFICIAL REQUEST FOR QUOTATION (RFQ)")
    c.drawString(36, H - 72, "Wastewater Treatment Facility Upgrade Program")
    
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(W - 36, H - 38, "RFQ-WWT-2026-0847")
    c.setFont("Helvetica", 9)
    c.drawRightString(W - 36, H - 54, "Date: August 28, 2026")
    c.drawRightString(W - 36, H - 70, "Priority: HIGH")

    # Document Section: Summary
    y = H - 120
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(36, y, "1. PROJECT & DOCUMENT METADATA")
    
    # Metadata Table
    c.setStrokeColorRGB(0.8, 0.8, 0.8)
    c.setLineWidth(0.8)
    
    metadata = [
        ("RFQ Number:", "RFQ-WWT-2026-0847"),
        ("Project Name:", "Wastewater Treatment Plant Chemical Dosing System Upgrade"),
        ("Department:", "Operations / Procurement"),
        ("Delivery Location:", "Houston, Texas, USA"),
        ("Required Delivery:", "Within 21 calendar days from PO confirmation"),
        ("Quotation Due Date:", "September 5, 2026"),
        ("Priority Level:", "High (Urgent Commissioning Required)")
    ]
    
    ty = y - 18
    for label, val in metadata:
        c.setFillColorRGB(0.2, 0.2, 0.2)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, ty, label)
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.setFont("Helvetica", 9)
        c.drawString(180, ty, val)
        c.line(36, ty - 4, W - 36, ty - 4)
        ty -= 18
        
    # Requirement Details
    y = ty - 15
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(36, y, "2. SCOPE OF SUPPLY & EQUIPMENT SPECIFICATIONS")
    
    # Paragraph text
    y -= 18
    c.setFont("Helvetica", 9.5)
    c.drawString(36, y, "Veolia requires the supply of exactly twelve (12) industrial motor-driven chemical dosing pump")
    y -= 12
    c.drawString(36, y, "assemblies suitable for sodium hypochlorite dosing under continuous industrial conditions.")
    
    # Technical Specifications Box
    box_y = y - 190
    c.setFillColorRGB(0.96, 0.97, 0.99)
    c.rect(36, box_y, W - 72, 165, fill=1, stroke=1)
    
    c.setFillColorRGB(0.06, 0.18, 0.37)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(48, box_y + 148, "MANDATORY TECHNICAL PARAMETERS:")
    
    specs = [
        ("Equipment Type:", "Motor-driven chemical metering/dosing pumps"),
        ("Quantity Required:", "12 complete assemblies"),
        ("Application Medium:", "Sodium hypochlorite (highly corrosive treatment chemical)"),
        ("Flow Range:", "0–120 L/hr (fully adjustable control range)"),
        ("Discharge Pressure:", "Minimum 7.0 bar operating pressure"),
        ("Wetted Materials:", "PVDF / PTFE (chemically compatible with medium)"),
        ("Power Supply Requirements:", "460V / 3 Phase / 60 Hz"),
        ("Control Interface:", "4–20 mA remote analog control + local manual interface"),
        ("Enclosure Rating:", "NEMA 4X minimum protection rating"),
        ("Metering Accuracy:", "±2% or better over entire operating range")
    ]
    
    spec_y = box_y + 130
    for label, val in specs:
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(48, spec_y, label)
        c.setFont("Helvetica", 8.5)
        c.drawString(200, spec_y, val)
        spec_y -= 13
        
    # Sourcing Requirements Notes
    y = box_y - 25
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(36, y, "3. IMPORTANT PROVISIONS & MISSING COMMERCIAL TERMS")
    y -= 18
    c.setFont("Helvetica", 9)
    notes = [
        "• Quotations must specify the exact warranty period (a minimum of 24 months is preferred).",
        "• Standard payment terms must be stated (Veolia preferred standard is Net 45 Days).",
        "• Acceptability of alternate equivalent pump manufacturers must be declared.",
        "• Complete technical datasheets, drawings, and wetted parts compatibility charts must be attached.",
        "• Failure to supply these values may halt the automated compliance ranking workflow."
    ]
    for n in notes:
        c.drawString(45, y, n)
        y -= 13
        
    # Footer
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.setFont("Helvetica-Oblique", 7.5)
    c.drawString(36, 30, "Confidential Document - Veolia Water Technologies Procurement Division")
    c.drawRightString(W - 36, 30, "Generated August 2026 | Page 1 of 1")
    
    c.save()
    print(f"Generated PDF successfully: {pdf_path}")

if __name__ == "__main__":
    generate_rfq_pdf()
