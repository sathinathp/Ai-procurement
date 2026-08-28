with open('e:/poc-july/frontend/src/components/RfqAssistant.jsx', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        if 'isAiExtracted' in line or 'Drop RFQ' in line or 'BOM details' in line or 'BOM' in line:
            if 'import' not in line:
                print(f"{idx}: {line.strip()}")
