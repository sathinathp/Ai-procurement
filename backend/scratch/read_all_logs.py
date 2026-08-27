import os
import glob

brain_dir = r"C:\Users\Sathinath\.gemini\antigravity\brain"
out_path = r"e:\poc-july\backend\scratch\matched_logs.txt"

terms = ["veolia", "dosing", "pumps", "walkthrough", "14-step"]
results = []

for root, dirs, files in os.walk(brain_dir):
    for file in files:
        if file == "overview.txt":
            filepath = os.path.join(root, file)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                
                content_lower = content.lower()
                for term in terms:
                    if term in content_lower:
                        pos = content_lower.find(term)
                        print(f"FOUND term '{term}' in {filepath} (Size: {len(content)} bytes)")
                        results.append((filepath, term, pos))
                        break
            except Exception as e:
                print(f"Error reading {filepath}: {e}")

with open(out_path, "w", encoding="utf-8") as out:
    out.write(f"Total log files with matches: {len(results)}\n")
    for filepath, term, pos in results:
        out.write(f"\nFile: {filepath} | Match term: {term}\n")
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            # Find the first place the term appears and get a large chunk around it
            pos_term = content.lower().find(term)
            start = max(0, pos_term - 500)
            end = min(len(content), pos_term + 15000) # Get a really large chunk to ensure we get the full text!
            out.write(content[start:end])
            out.write("\n" + "="*80 + "\n")
        except Exception as e:
            out.write(f"Error writing chunk: {e}\n")

print(f"Finished scanning. Results in {out_path}")
