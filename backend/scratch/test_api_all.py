import requests

url = "http://127.0.0.1:8000/api/copilot/chat"

queries = [
    "how many payment vouchers do we have in total and what is their status?",
    "show me recent quality defects",
    "what is the status of invoice matches?",
    "list recent goods receipt notes"
]

for q in queries:
    print(f"\n--- QUERY: {q} ---")
    payload = {"messages": [{"role": "user", "content": q}]}
    response = requests.post(url, json=payload)
    print("Response:")
    print(response.json().get("response"))
