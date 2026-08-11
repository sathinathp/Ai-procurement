import os
from datetime import datetime
from sqlalchemy.orm import Session
import models

def generate_po_pdf_file(po, db: Session) -> str:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    
    # Ensure target directory exists
    pdf_dir = os.path.join(os.path.dirname(__file__), "..", "sample_rfqs_pdf")
    os.makedirs(pdf_dir, exist_ok=True)
    
    pdf_filename = f"po_{po.po_number}.pdf"
    pdf_path = os.path.join(pdf_dir, pdf_filename)
    
    doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'POTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#0078d4'),
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'POSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=colors.HexColor('#475569'),
        spaceAfter=15
    )
    
    body_style = ParagraphStyle(
        'POBody',
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
    
    header_style = ParagraphStyle(
        'POHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.white
    )
    
    # Title Block
    story.append(Paragraph("AI PROCUREMENT CORP", title_style))
    story.append(Paragraph("OFFICIAL PURCHASE ORDER (PO)", subtitle_style))
    story.append(Spacer(1, 10))
    
    po_date_str = po.created_at.strftime('%Y-%b-%d') if po.created_at else datetime.utcnow().strftime('%Y-%b-%d')
    supplier_name = po.supplier.name if po.supplier else "Unknown Supplier"
    delivery_loc = po.rfq.delivery_location if po.rfq else "Yanbu Industrial Area"
    
    # Metadata Table
    meta_data = [
        [Paragraph("PO Number:", bold_label), Paragraph(po.po_number, body_style), Paragraph("PO Date:", bold_label), Paragraph(po_date_str, body_style)],
        [Paragraph("Supplier Name:", bold_label), Paragraph(supplier_name, body_style), Paragraph("RFQ Reference:", bold_label), Paragraph(po.rfq_number, body_style)],
        [Paragraph("Delivery Site:", bold_label), Paragraph(delivery_loc or "Yanbu Industrial Area", body_style), Paragraph("Payment Terms:", bold_label), Paragraph("Net 45 Days", body_style)]
    ]
    
    t_meta = Table(meta_data, colWidths=[120, 150, 120, 130])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f1f5f9')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 20))
    
    # Items Table
    headers = [Paragraph("Item Name / Description", header_style), Paragraph("Qty", header_style), Paragraph("Unit Price", header_style), Paragraph("Total Amount", header_style)]
    row_data = [
        Paragraph(po.item_name or "Unknown Item", body_style),
        Paragraph(f"{(po.quantity or 0.0):.2f} MT", body_style),
        Paragraph(f"USD {(po.unit_price or 0.0):.2f}", body_style),
        Paragraph(f"USD {(po.total_amount or 0.0):.2f}", body_style)
    ]
    
    items_data = [headers, row_data]
    t_items = Table(items_data, colWidths=[240, 70, 100, 110])
    t_items.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0078d4')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    story.append(t_items)
    story.append(Spacer(1, 30))
    
    # Instructions / Signatures
    story.append(Paragraph("INSTRUCTIONS TO SUPPLIER:", bold_label))
    instructions_text = (
        "1. Please acknowledge receipt of this Purchase Order immediately.<br/>"
        "2. All shipments must include a certified Certificate of Analysis (COA).<br/>"
        "3. Standard payment terms are Net 45 Days from quality clearance of material at delivery site."
    )
    story.append(Paragraph(instructions_text, body_style))
    story.append(Spacer(1, 30))
    
    story.append(Paragraph("___________________________", body_style))
    story.append(Paragraph("Authorized Procurement Manager", bold_label))
    story.append(Paragraph("AI Procurement Division", body_style))
    
    doc.build(story)
    return pdf_path
