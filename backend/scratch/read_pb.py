import os

search_dir = r"C:\Users\Sathinath\.gemini\antigravity"
terms = [b"veolia", b"dosing", b"pumps"]

for root, dirs, files in os.walk(search_dir):
    for file in files:
        if file.endswith((".pb", ".txt", ".pbtxt", ".json", ".db")):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, "rb") as f:
                    content = f.read()
                content_lower = content.lower()
                for term in terms:
                    if term in content_lower:
                        print(f"FOUND term {term} in {filepath} (Size: {len(content)} bytes)")
                        # Try decoding
                        try:
                            text = content.decode("utf-8")
                        except:
                            text = content.decode("utf-16", errors="ignore")
                        
                        pos = text.lower().find(term.decode())
                        print("Context:")
                        print(text[max(0, pos-200):min(len(text), pos+4000)])
                        print("="*60)
                        break
            except Exception as e:
                pass
print("Search finished.")
