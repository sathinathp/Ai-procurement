import os
import json
import requests

OPPORA_API_KEY = "opp_live_VQLHO4E-R1tpeeU5DQDnwpl8nkZyqHw8"

def test_company_filter():
    headers = {
        "Authorization": f"Bearer {OPPORA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Try different company filters in payload
    payload1 = {
        "title": "Sales Manager",
        "companies": ["SABIC"],
        "limit": 5
    }
    payload2 = {
        "title": "Sales Manager",
        "company_name": "SABIC",
        "limit": 5
    }
    payload3 = {
        "title": "Sales Manager",
        "company_domains": ["sabic.com"],
        "limit": 5
    }

    for name, payload in [("companies", payload1), ("company_name", payload2), ("company_domains", payload3)]:
        print(f"\n--- Testing {name} filter ---")
        try:
            res = requests.post(
                "https://api.oppora.ai/api/v1/public/discover/people",
                headers=headers,
                json=payload,
                timeout=15
            )
            print("Status Code:", res.status_code)
            if res.status_code == 200:
                data = res.json()
                print("Count:", len(data.get("data", [])))
                if data.get("data"):
                    print("Sample:", data["data"][0].get("full_name"), "-", data["data"][0].get("experience", [{}])[0].get("company_name"))
            else:
                print("Error:", res.text)
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    test_company_filter()
