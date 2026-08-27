import os

pb_path = r"C:\Users\Sathinath\.gemini\antigravity\conversations\99222479-63ba-45de-8ae8-de5b1ed25b0f.pb"

if os.path.exists(pb_path):
    with open(pb_path, "rb") as f:
        header = f.read(200)
    print("UTF-8 decoded repr:")
    print(repr(header.decode("utf-8", errors="ignore")))
    print("UTF-16 decoded repr:")
    print(repr(header.decode("utf-16", errors="ignore")))
