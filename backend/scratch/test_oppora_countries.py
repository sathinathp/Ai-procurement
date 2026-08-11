import os
import json
import requests

OPPORA_API_KEY = "opp_live_VQLHO4E-R1tpeeU5DQDnwpl8nkZyqHw8"

def test_country_locations():
    headers = {
        "Authorization": f"Bearer {OPPORA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Test specific countries as location filters
    payload_sa = {
        "title": "Sales Manager",
        "keywords": ["PVC Resin"],
        "location": "Saudi Arabia",
        "limit": 5
    }
    
    payload_ger = {
        "title": "Sales Manager",
        "keywords": ["PVC Resin"],
        "location": "Germany",
        "limit": 5
    }

    for country, payload in [("Saudi Arabia", payload_sa), ("Germany", payload_ger)]:
        print(f"\n--- Testing country: {country} ---")
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
                    first_item = data["data"][0]
                    print("Sample Name:", first_item.get("full_name"))
                    print("Sample Location:", first_item.get("location"))
                    exp = first_item.get("experience", [{}])
                    print("Sample Company:", exp[0].get("company_name") if exp else "N/A")
            else:
                print("Error:", res.text)
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    test_country_locations()
