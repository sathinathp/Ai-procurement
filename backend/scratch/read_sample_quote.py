import pypdf

reader = pypdf.PdfReader("sample_supplier_quote.pdf")
text = ""
for i, page in enumerate(reader.pages):
    print(f"--- PAGE {i} ---")
    print(page.extract_text())
