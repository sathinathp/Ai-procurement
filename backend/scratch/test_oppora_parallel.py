import os
import json
import requests
from concurrent.futures import ThreadPoolExecutor

OPPORA_API_KEY = "opp_live_VQLHO4E-R1tpeeU5DQDnwpl8nkZyqHw8"

def query_single_company(company):
    headers = {
        "Authorization": f"Bearer {OPPORA_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "title": "Sales Manager",
        "company_name": company,
        "limit": 3
    }
    try:
        res = requests.post(
            "https://api.oppora.ai/api/v1/public/discover/people",
            headers=headers,
            json=payload,
            timeout=10
        )
        if res.status_code == 200:
            contacts = res.json().get("data", [])
            return company, contacts
        else:
            return company, []
    except Exception as e:
        return company, []

def test_parallel():
    companies = ["SABIC", "Ineos", "LG Chem", "Formosa Plastics"]
    print("Querying companies in parallel:", companies)
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(query_single_company, companies))
        
    for comp, contacts in results:
        print(f"\nCompany: {comp}")
        print(f"Contacts found: {len(contacts)}")
        for c in contacts[:2]:
            print(f"  - {c.get('full_name')} ({c.get('title')}) - {c.get('location')}")

if __name__ == "__main__":
    test_parallel()
