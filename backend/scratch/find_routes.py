import re

with open("../main.py", "r", encoding="utf-8") as f:
    content = f.read()

# find all decorators like @app.get("/api/...") or @app.post("/api/...")
routes = re.findall(r'@app\.(get|post|put|delete)\("([^"]+)"\)', content)
for r in routes:
    print(f"{r[0].upper()} {r[1]}")
