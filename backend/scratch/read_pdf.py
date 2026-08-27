import os
try:
    import pypdf
except ImportError:
    pypdf = None

pdf_path = r"e:\poc-july\Neproplast_AI_Procurement_Agent_Architecture_and_Workflow.pdf"

if not os.path.exists(pdf_path):
    print("PDF not found")
elif pypdf is None:
    print("pypdf not installed")
else:
    reader = pypdf.PdfReader(pdf_path)
    print(f"Number of pages: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        print(f"--- Page {i+1} ---")
        print(page.extract_text()[:2000])
