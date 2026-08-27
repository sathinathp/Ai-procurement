import os
import glob

pb_files = glob.glob(r"C:\Users\Sathinath\.gemini\antigravity\conversations\*.pb")
out_path = r"e:\poc-july\backend\scratch\matched_all_strings.txt"

terms = ["veolia", "dosing", "pumps"]

results = []

for filepath in pb_files:
    try:
        with open(filepath, "rb") as f:
            content = f.read()
        
        # Check UTF-8 lower
        content_lower_utf8 = content.lower()
        
        # Check UTF-16 lower (we can encode the terms as utf-16-le and utf-16-be)
        for term in terms:
            term_utf8 = term.encode('utf-8')
            term_utf16le = term.encode('utf-16-le')
            term_utf16be = term.encode('utf-16-be')
            
            found = False
            pos = -1
            enc = ""
            
            if term_utf8 in content_lower_utf8:
                pos = content_lower_utf8.find(term_utf8)
                enc = "utf-8"
                found = True
            elif term_utf16le in content_lower_utf8:
                pos = content_lower_utf8.find(term_utf16le)
                enc = "utf-16le"
                found = True
            elif term_utf16be in content_lower_utf8:
                pos = content_lower_utf8.find(term_utf16be)
                enc = "utf-16be"
                found = True
                
            if found:
                results.append((filepath, term, pos, enc))
                print(f"FOUND '{term}' in {os.path.basename(filepath)} at pos {pos} via {enc}")
                
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

with open(out_path, "w", encoding="utf-8") as out:
    out.write(f"Total files found with matches: {len(results)}\n")
    for filepath, term, pos, enc in results:
        out.write(f"\nFile: {os.path.basename(filepath)} | Term: {term} | Pos: {pos} | Enc: {enc}\n")
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            start = max(0, pos - 200)
            end = min(len(content), pos + 10000) # Print a large chunk to get the 14 steps
            chunk = content[start:end]
            if enc == "utf-8":
                out.write(chunk.decode("utf-8", errors="replace"))
            else:
                out.write(chunk.decode("utf-16", errors="replace"))
            out.write("\n" + "="*80 + "\n")
        except Exception as e:
            out.write(f"Error decoding chunk: {e}\n")

print(f"Finished. Written to {out_path}")
