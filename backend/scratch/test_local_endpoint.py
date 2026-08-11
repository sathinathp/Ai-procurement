import os
import sys
import json

# Add e:\poc-july\backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import oppora_supplier_search

def test_endpoint():
    # Make sure env var is set
    os.environ["OPENAI_API_KEY"] = "sk-proj-test" # Or it might already be loaded from env/venv
    
    # We will test search for "PVC Resin"
    data = {
        "item_name": "PVC Resin",
        "description": "High grade suspension PVC resin for pipe grade manufacturing"
    }
    
    print("Testing oppora_supplier_search for PVC Resin...")
    result = oppora_supplier_search(data)
    
    print("\n--- Result ---")
    print("ICP Industry:", result.get("icp", {}).get("industry"))
    print("ICP Real Companies:", result.get("icp", {}).get("real_supplier_companies"))
    print("ICP Regions/Countries:", result.get("icp", {}).get("regions"))
    print("Total Contacts Found:", result.get("total"))
    print("Source Used:", result.get("source_used"))
    
    print("\nContacts Detail:")
    for i, c in enumerate(result.get("contacts", [])):
        print(f"{i+1}. Company: {c.get('name')}")
        print(f"   Contact: {c.get('contact')} ({c.get('title')})")
        print(f"   Email: {c.get('email')}")
        print(f"   Country: {c.get('country')}")
        print(f"   LinkedIn: {c.get('linkedin')}")
        print(f"   Source: {c.get('source')}")
        print("-" * 40)

if __name__ == "__main__":
    test_endpoint()
