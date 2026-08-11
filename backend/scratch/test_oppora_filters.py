import os
import json
import requests

OPPORA_API_KEY = "opp_live_VQLHO4E-R1tpeeU5DQDnwpl8nkZyqHw8"

def test_filters():
    headers = {
        "Authorization": f"Bearer {OPPORA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Test 1: Query with location and industry (strict)
    payload_strict = {
        "title": "Sales Manager",
        "keywords": ["PVC Resin"],
        "company_industries": ["Petrochemicals & Polymers"],
        "location": "Middle East",
        "limit": 10
    }
    
    # Test 2: Query with location only
    payload_loc = {
        "title": "Sales Manager",
        "keywords": ["PVC Resin"],
        "location": "Middle East",
        "limit": 10
    }
    
    # Test 3: Query with industry only
    payload_ind = {
        "title": "Sales Manager",
        "keywords": ["PVC Resin"],
        "company_industries": ["Petrochemicals & Polymers"],
        "limit": 10
    }

    for name, payload in [("STRICT", payload_strict), ("LOCATION ONLY", payload_loc), ("INDUSTRY ONLY", payload_ind)]:
        print(f"\n--- Running {name} ---")
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
    test_filters()
