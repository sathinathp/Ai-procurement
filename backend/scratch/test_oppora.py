import os
import json
import requests

OPPORA_API_KEY = "opp_live_VQLHO4E-R1tpeeU5DQDnwpl8nkZyqHw8"

def test_search(item_name="PVC Resin"):
    payload = {
        "title": "Sales Manager",
        "keywords": [item_name],
        "limit": 10
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
            timeout=25
        )
        print("Status Code:", res.status_code)
        if res.status_code == 200:
            data = res.json()
            items = data.get("data", [])
            print("Total returned:", len(items))
            if items:
                first = items[0]
                # Print root keys
                print("Root keys:", list(first.keys()))
                # Print basic contact info
                print("Name:", first.get("full_name"), first.get("first_name"), first.get("last_name"))
                print("Title:", first.get("title"))
                print("Location:", first.get("location"))
                print("LinkedIn URL:", first.get("linkedin_url"))
                print("Linkedin URL (alternate keys?):", first.get("linkedin"), first.get("linkedin_profile_url"))
                # Print experience details
                experiences = first.get("experience", [])
                print("Number of experiences:", len(experiences))
                if experiences:
                    print("First experience keys:", list(experiences[0].keys()))
                    print("Current company details:")
                    curr = next((e for e in experiences if e.get("is_current")), experiences[0])
                    for k, v in curr.items():
                        print(f"  {k}: {v}")
        else:
            print("Error response:", res.text)
    except Exception as e:
        print("Exception:", e)

if __name__ == "__main__":
    test_search()
