import io
import os
import json
import logging
from typing import Dict, Any, Optional
from openai import OpenAI

# Try importing parsing packages
try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import docx
except ImportError:
    docx = None

try:
    import openpyxl
except ImportError:
    openpyxl = None

logger = logging.getLogger(__name__)

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """
    Extract raw text from PDF, Excel, Word, or Text files.
    """
    ext = filename.split(".")[-1].lower()
    text = ""
    
    try:
        if ext == "pdf":
            if pypdf:
                pdf_file = io.BytesIO(file_bytes)
                reader = pypdf.PdfReader(pdf_file)
                pages_text = []
                for page in reader.pages:
                    t = page.extract_text()
                    if t:
                        pages_text.append(t)
                text = "\n".join(pages_text)
            else:
                text = "[PDF parser not available]"
        
        elif ext in ["docx", "doc"]:
            if docx:
                doc_file = io.BytesIO(file_bytes)
                doc_obj = docx.Document(doc_file)
                text = "\n".join([p.text for p in doc_obj.paragraphs])
            else:
                text = "[Word parser not available]"
                
        elif ext in ["xlsx", "xls"]:
            if openpyxl:
                xlsx_file = io.BytesIO(file_bytes)
                wb = openpyxl.load_workbook(xlsx_file, data_only=True)
                lines = []
                for sheet in wb.worksheets:
                    for row in sheet.iter_rows(values_only=True):
                        row_vals = [str(cell) for cell in row if cell is not None]
                        if row_vals:
                            lines.append("\t".join(row_vals))
                text = "\n".join(lines)
            else:
                text = "[Excel parser not available]"
                
        elif ext in ["txt", "csv", "json"]:
            text = file_bytes.decode("utf-8", errors="ignore")
            
        else:
            text = f"[Unsupported file format: {ext}]"
            
    except Exception as e:
        logger.error(f"Error parsing file {filename}: {e}")
        text = f"[Error parsing file content: {str(e)}]"
        
    return text.strip()

def ai_extract_rfq(text: str, openai_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Use OpenAI to extract RFQ metadata from the text.
    If no key is present, returns a structured mockup.
    """
    # 1. Mocked Fallback
    mock_data = {
        "rfq_number": "RFQ-2026-TEMP",
        "project_name": "Project PVC Resin Pipeline Setup",
        "department": "Procurement",
        "required_date": "2026-08-15",
        "item_name": "PVC Resin",
        "item_code": "ITM-POL-0428",
        "description": "Premium industrial grade PVC Resin. White powder form, Bulk density 0.5-0.6 g/cm3.",
        "quantity": 100.0,
        "unit": "MT",
        "specifications": "K-value 67-68, Viscosity 110-120 ml/g, Volatile matter < 0.3%.",
        "priority": "Medium",
        "delivery_location": "Jeddah Plant",
        "expected_delivery_date": "2026-09-01",
        "remarks": "Test extracted from document upload.",
        "warranty_requirement": "",
        "delivery_tolerance": "",
        "missing_fields": ["Warranty requirement", "Acceptable delivery tolerance"]
    }
    
    # Customize mock output depending on file text
    lowered = text.lower()
    if "hdpe" in lowered or "granule" in lowered:
        mock_data["item_name"] = "HDPE Granules"
        mock_data["item_code"] = "ITM-POL-0495"
        mock_data["quantity"] = 50.0
        mock_data["unit"] = "MT"
        mock_data["description"] = "High-Density Polyethylene Granules, Blow molding grade."
        mock_data["specifications"] = "MFR 0.3 g/10min, Density 0.954 g/cm3."
        mock_data["project_name"] = "Project HDPE Warehouse Refill"
    elif "calcium" in lowered:
        mock_data["item_name"] = "Calcium Carbonate"
        mock_data["item_code"] = "ITM-ADD-0105"
        mock_data["quantity"] = 2500.0
        mock_data["unit"] = "KG"
        mock_data["description"] = "Ultra-fine coated Calcium Carbonate powder."
        mock_data["specifications"] = "Mesh size 800, CaCO3 content > 98%."
    
    # If the text is very short/empty, add some missing field warnings
    if not text or len(text) < 20:
        mock_data["missing_fields"] = ["quantity", "required_date", "drawing_attachment", "Warranty requirement", "Acceptable delivery tolerance"]
    else:
        # For standard text files, we always want to flag these to demonstrate the AI recommendation step
        if "Warranty requirement" not in mock_data["missing_fields"]:
            mock_data["missing_fields"].append("Warranty requirement")
        if "Acceptable delivery tolerance" not in mock_data["missing_fields"]:
            mock_data["missing_fields"].append("Acceptable delivery tolerance")
        
    if not openai_key:
        return mock_data

    # 2. Call OpenAI API
    try:
        client = OpenAI(api_key=openai_key)
        
        system_prompt = (
            "You are an expert procurement AI extractor. Parse the text from an uploaded RFQ document and return a JSON object.\n"
            "The JSON object MUST contain the following keys:\n"
            "- rfq_number: (str or null)\n"
            "- project_name: (str, short summary like 'Project X Resin')\n"
            "- department: (str or null, like 'Procurement', 'Engineering')\n"
            "- required_date: (str ISO YYYY-MM-DD or null)\n"
            "- item_name: (str, e.g. 'PVC Resin')\n"
            "- item_code: (str or null)\n"
            "- description: (str detailed item description)\n"
            "- quantity: (float, number only)\n"
            "- unit: (str, e.g. 'MT', 'KG', 'Pcs')\n"
            "- specifications: (str, specs/standards)\n"
            "- priority: ('Low', 'Medium', 'High')\n"
            "- delivery_location: (str or null, e.g. 'Jeddah Plant')\n"
            "- expected_delivery_date: (str ISO YYYY-MM-DD or null)\n"
            "- remarks: (str or null)\n"
            "- warranty_requirement: (str or null, e.g., '12 Months')\n"
            "- delivery_tolerance: (str or null, e.g., '±3 days')\n"
            "- missing_fields: (list of strings representing fields that are required but missing from the document. Required fields are: item_name, quantity, unit, required_date, warranty_requirement, delivery_tolerance. Represent warranty_requirement as 'Warranty requirement' and delivery_tolerance as 'Acceptable delivery tolerance' in the missing_fields list if they are empty or not mentioned in the text.)\n\n"
            "Ensure that you output ONLY a raw JSON string. Do not include markdown code block syntax (like ```json) or any extra characters."
        )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini", # standard, fast
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Document text:\n---\n{text}\n---"}
            ],
            temperature=0.0
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Clean potential markdown wrapping
        if result_text.startswith("```"):
            result_text = result_text.split("\n", 1)[1]
            if result_text.endswith("```"):
                result_text = result_text.rsplit("\n", 1)[0]
        
        data = json.loads(result_text)
        # Ensure the commercial missing fields are present if not found
        if "missing_fields" not in data:
            data["missing_fields"] = []
        if not data.get("warranty_requirement") and "Warranty requirement" not in data["missing_fields"]:
            data["missing_fields"].append("Warranty requirement")
        if not data.get("delivery_tolerance") and "Acceptable delivery tolerance" not in data["missing_fields"]:
            data["missing_fields"].append("Acceptable delivery tolerance")
            
        return data
    except Exception as e:
        logger.error(f"OpenAI RFQ extraction error: {e}")
        # Add error tag to mock response so client knows it failed back
        mock_data["ai_error"] = str(e)
        return mock_data

def ai_extract_quote(text: str, openai_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Use OpenAI to extract quote metrics from the supplier's quotation.
    If no key is present, returns a structured mockup.
    """
    # 1. Mocked Fallback
    mock_data = {
        "price": 1020.0,
        "currency": "USD",
        "moq": 10.0,
        "lead_time_days": 14,
        "payment_terms": "Net 30 Days",
        "incoterms": "CIF Jeddah",
        "warranty": "12 Months",
        "validity": "30 Days",
        "delivery_details": "Ocean freight to Jeddah Port."
    }
    
    # Customise mock depending on supplier or text keywords
    lowered = text.lower()
    
    # Dosing Pump Suppliers
    if "budget pumps" in lowered or "budget" in lowered:
        mock_data["price"] = 850.0
        mock_data["currency"] = "USD"
        mock_data["lead_time_days"] = 25
        mock_data["payment_terms"] = "100% Advance"
        mock_data["incoterms"] = "EXW Houston"
        mock_data["delivery_details"] = "EXW Houston warehouse pickup."
    elif "munich dosing" in lowered or "munich" in lowered:
        mock_data["price"] = 1150.0
        mock_data["currency"] = "USD"
        mock_data["lead_time_days"] = 3
        mock_data["payment_terms"] = "Net 30 Days"
        mock_data["incoterms"] = "DDP Jeddah"
        mock_data["delivery_details"] = "Air freight delivery DDP Jeddah."
    elif "houston pump" in lowered or "houston" in lowered:
        mock_data["price"] = 980.0
        mock_data["currency"] = "USD"
        mock_data["lead_time_days"] = 12
        mock_data["payment_terms"] = "Net 45 Days"
        mock_data["incoterms"] = "CIF Dammam"
        mock_data["delivery_details"] = "Sea freight to Dammam port."
    elif "tokyo precision" in lowered or "tokyo" in lowered:
        mock_data["price"] = 920.0
        mock_data["currency"] = "EUR"
        mock_data["lead_time_days"] = 14
        mock_data["payment_terms"] = "Letter of Credit (L/C)"
        mock_data["incoterms"] = "FOB Tokyo"
        mock_data["delivery_details"] = "FOB Tokyo port shipment."
        
    # Polymer Suppliers
    elif "al-khobar plastics" in lowered or "khobar" in lowered:
        mock_data["price"] = 950.0
        mock_data["currency"] = "USD"
        mock_data["lead_time_days"] = 28
        mock_data["payment_terms"] = "100% Advance"
        mock_data["incoterms"] = "EXW Al-Khobar"
        mock_data["delivery_details"] = "EXW warehouse pickup."
    elif "basf middle east" in lowered or "basf" in lowered:
        mock_data["price"] = 1250.0
        mock_data["currency"] = "USD"
        mock_data["lead_time_days"] = 4
        mock_data["payment_terms"] = "Net 30 Days"
        mock_data["incoterms"] = "DDP Dammam"
        mock_data["delivery_details"] = "Road cargo shipping to Dammam."
    elif "sabic" in lowered:
        mock_data["price"] = 1050.0
        mock_data["currency"] = "USD"
        mock_data["lead_time_days"] = 7
        mock_data["payment_terms"] = "Net 60 Days"
        mock_data["incoterms"] = "DDP Dammam"
        mock_data["delivery_details"] = "Direct shipping from Jubail refinery."
    elif "borouge" in lowered:
        mock_data["price"] = 1100.0
        mock_data["currency"] = "EUR"
        mock_data["lead_time_days"] = 10
        mock_data["payment_terms"] = "10% Advance, 90% LC"
        mock_data["incoterms"] = "FOB Shanghai"
        mock_data["delivery_details"] = "Ocean freight shipment FOB Shanghai."
    elif "jubail" in lowered:
        mock_data["price"] = 990.0
        mock_data["currency"] = "USD"
        mock_data["lead_time_days"] = 21
        mock_data["payment_terms"] = "Cash against documents"
        mock_data["incoterms"] = "EXW Jubail"
        
    if not openai_key:
        return mock_data

    # 2. Call OpenAI API
    try:
        client = OpenAI(api_key=openai_key)
        
        system_prompt = (
            "You are an expert procurement AI quote extractor. Parse the text from an uploaded quotation invoice/proposal and return a JSON object.\n"
            "The JSON object MUST contain the following keys:\n"
            "- price: (float, base unit price. If multiple items, extract the main item unit price)\n"
            "- currency: (str, e.g. 'USD', 'SAR', 'EUR')\n"
            "- moq: (float, Minimum Order Quantity, or 0/1 if none specified)\n"
            "- lead_time_days: (int, delivery lead time in days)\n"
            "- payment_terms: (str, e.g. 'Net 30 Days', '10% Advance')\n"
            "- incoterms: (str, e.g. 'FOB', 'CIF', 'EXW')\n"
            "- warranty: (str, e.g. '12 Months', 'None')\n"
            "- validity: (str, quotation validity period)\n"
            "- delivery_details: (str, shipment mode/routing details)\n\n"
            "Ensure that you output ONLY a raw JSON string. Do not include markdown code block syntax or extra text."
        )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Quotation text:\n---\n{text}\n---"}
            ],
            temperature=0.0
        )
        
        result_text = response.choices[0].message.content.strip()
        
        if result_text.startswith("```"):
            result_text = result_text.split("\n", 1)[1]
            if result_text.endswith("```"):
                result_text = result_text.rsplit("\n", 1)[0]
                
        data = json.loads(result_text)
        return data
    except Exception as e:
        logger.error(f"OpenAI quote extraction error: {e}")
        mock_data["ai_error"] = str(e)
        return mock_data
