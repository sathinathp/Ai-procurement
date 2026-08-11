import os
import requests

OPPORA_API_KEY = "opp_live_VQLHO4E-R1tpeeU5DQDnwpl8nkZyqHw8"

payload = {
    "title": "Sales Manager",
    "keywords": ["PVC Resin"],
    "limit": 20
}

headers = {
    "Authorization": f"Bearer {OPPORA_API_KEY}",
    "Content-Type": "application/json"
}

try:
    res = requests.post(
        "https://api.oppora.ai/api/v1/public/discover/people",
        headers=headers,
        json=payload,
        timeout=45
    )
    print("Status:", res.status_code)
    if res.status_code == 200:
        data = res.json().get("data", [])
        for i, item in enumerate(data):
            print(f"{i+1}. Name: {item.get('full_name')}")
            print(f"   Title: {item.get('title')}")
            print(f"   LinkedIn: {item.get('linkedin_url')}")
            experiences = item.get("experience", [])
            if experiences:
                curr = next((e for e in experiences if e.get("is_current")), experiences[0])
                print(f"   Company: {curr.get('company_name')}")
            print("-" * 40)
except Exception as e:
    print("Error:", e)
