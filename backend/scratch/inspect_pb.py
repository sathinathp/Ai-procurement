import os

pb_path = r"C:\Users\Sathinath\.gemini\antigravity\conversations\99222479-63ba-45de-8ae8-de5b1ed25b0f.pb"
out_path = r"e:\poc-july\backend\scratch\matched_strings.txt"

if not os.path.exists(pb_path):
    print("File not found")
else:
    with open(pb_path, "rb") as f:
        data = f.read()
    
    print(f"File size: {len(data)} bytes")
    
    # Check lowercase bytes
    data_lower = data.lower()
    
    matches = []
    for term in [b"veolia", b"dosing", b"pumps", b"runbook"]:
        pos = 0
        while True:
            pos = data_lower.find(term, pos)
            if pos == -1:
                break
            matches.append((pos, term))
            pos += len(term)
            
    print(f"Found {len(matches)} matches")
    
    with open(out_path, "w", encoding="utf-8") as out:
        out.write(f"Found {len(matches)} matches\n")
        for idx, (pos, term) in enumerate(matches):
            out.write(f"\nMatch {idx}: term '{term.decode()}' at byte position {pos}\n")
            start = max(0, pos - 200)
            end = min(len(data), pos + 6000)
            chunk = data[start:end]
            # Try to decode or replace errors
            chunk_str = chunk.decode("utf-8", errors="replace")
            out.write("CONTEXT:\n")
            out.write(chunk_str)
            out.write("\n" + "="*80 + "\n")
            
    print(f"Results written to {out_path}")
