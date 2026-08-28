with open('e:/poc-july/frontend/src/components/RfqAssistant.jsx', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        if 'search' in line.lower() or 'supplier' in line.lower() or 'candidate' in line.lower():
            if 'import' not in line and len(line.strip()) < 80:
                print(f"{idx}: {line.strip()}")
