import os
import random
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# Create output folder
output_dir = os.path.join("..", "sample_rfqs_pdf")
os.makedirs(output_dir, exist_ok=True)

# Data arrays
categories = ["Raw Polymers", "Additives & Stabilizers", "Packaging Materials", "Industrial Chemicals"]
products = {
    "Raw Polymers": ["PVC Resin", "HDPE Granules", "LDPE Film", "PP Homopolymer", "PET Resin"],
    "Additives & Stabilizers": ["Calcium Carbonate", "Titanium Dioxide", "Stearic Acid", "PVC Stabilizer"],
    "Packaging Materials": ["Wooden Pallets", "PP Woven Bags", "Stretch Film", "Cardboard Boxes"],
    "Industrial Chemicals": ["Plasticizer DOP", "DINP", "Adipic Acid", "Paraffin Wax"]
}
locations = ["Jeddah Plant", "Riyadh Warehouse", "Dammam Factory", "Yanbu Industrial Area"]
depts = ["Procurement", "Engineering", "Production", "Maintenance"]

print(f"Generating 100 PDF RFQ documents in '{os.path.abspath(output_dir)}'...")

styles = getSampleStyleSheet()

# Create custom styles
title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=18,
    textColor=colors.HexColor('#0078d4'),
    spaceAfter=12
)

subtitle_style = ParagraphStyle(
    'DocSubTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=10,
    textColor=colors.HexColor('#475569'),
    spaceAfter=15
)

body_style = ParagraphStyle(
    'DocBody',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=14,
    textColor=colors.HexColor('#334155')
)

bold_label = ParagraphStyle(
    'BoldLabel',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=9,
    textColor=colors.HexColor('#1e293b')
)

for idx in range(1, 101):
    rfq_number = f"RFQ-2026-GEN-{idx:03d}"
    filename = os.path.join(output_dir, f"{rfq_number}.pdf")
    
    # Pick random details
    cat = random.choice(categories)
    item = random.choice(products[cat])
    qty = random.randint(10, 500) * 10
    unit = "MT" if cat in ["Raw Polymers", "Industrial Chemicals"] else "Pcs"
    location = random.choice(locations)
    dept = random.choice(depts)
    
    created_date = datetime.now() - timedelta(days=random.randint(1, 30))
    required_date = created_date + timedelta(days=random.randint(15, 30))
    expected_delivery = required_date + timedelta(days=random.randint(5, 10))
    
    doc = SimpleDocTemplate(filename, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    
    # Header block
    story.append(Paragraph("NEPROPLAST MANUFACTURING CORP", title_style))
    story.append(Paragraph(f"INQUIRY FOR PRODUCT SUPPLY • REQUEST FOR QUOTATION (RFQ)", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Table layout for metadata
    data = [
        [Paragraph("RFQ Number:", bold_label), Paragraph(rfq_number, body_style), Paragraph("Inquiry Date:", bold_label), Paragraph(created_date.strftime('%Y-%b-%d'), body_style)],
        [Paragraph("Product Name:", bold_label), Paragraph(item, body_style), Paragraph("Quantity Required:", bold_label), Paragraph(f"{qty} {unit}", body_style)],
        [Paragraph("Category Group:", bold_label), Paragraph(cat, body_style), Paragraph("Required Date:", bold_label), Paragraph(required_date.strftime('%Y-%b-%d'), body_style)],
        [Paragraph("Department:", bold_label), Paragraph(dept, body_style), Paragraph("Delivery Site:", bold_label), Paragraph(location, body_style)]
    ]
    
    t = Table(data, colWidths=[120, 150, 120, 130])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f1f5f9')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    story.append(t)
    story.append(Spacer(1, 20))
    
    # Specifications text
    story.append(Paragraph("TECHNICAL SPECIFICATIONS & REQUIREMENTS", bold_label))
    spec_text = (
        f"The supplier must provide high quality industrial-grade {item} conforming to international standards. "
        "A certified Certificate of Analysis (COA) must accompany each batch. Delivery should be performed in moisture-proof "
        "containers or bags to protect from degradation. All pricing must remain valid for a minimum of 60 days from the bid submission date."
    )
    story.append(Paragraph(spec_text, body_style))
    story.append(Spacer(1, 15))
    
    # Terms text
    story.append(Paragraph("TERMS AND CONDITIONS", bold_label))
    terms_text = (
        "1. Incoterms: CIF / DDP (as per final negotiated selection).\n"
        "2. Payment Terms: Net 30 days following successful QA inspection.\n"
        "3. Lead Time: Priority lead times preferred. Please indicate transit durations clearly in your reply."
    )
    story.append(Paragraph(terms_text, body_style))
    story.append(Spacer(1, 25))
    
    # Signature placeholder
    story.append(Paragraph("___________________________", body_style))
    story.append(Paragraph("Authorized Procurement Manager", bold_label))
    story.append(Paragraph("Neproplast Supply Chain Division", body_style))
    
    doc.build(story)

print(f"Successfully created 100 PDF RFQ documents!")
