import requests

url = "http://127.0.0.1:8000/api/rfqs/delete-batch"
payload = {"rfq_numbers": [
    "RFQ-2026-1002", 
    "RFQ-2026-1001", 
    "RFQ-2026-1000", 
    "RFQ-2026-TEST-AUTO", 
    "RFQ-5995", 
    "RFQ-3644", 
    "RFQ-2026-DEMO"
]}

try:
    response = requests.post(url, json=payload)
    print("Status code:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Request failed:", e)
