import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def run_verification():
    print("=============================================================")
    print("       PROCUREX VEOLIA END-TO-END WORKFLOW INTEGRATION TEST   ")
    print("=============================================================")
    
    # 1. Seed Database
    print("\n[STEP 1] Seeding database with Veolia Dosing Pumps dataset...")
    resp = requests.post(f"{BASE_URL}/api/db/seed")
    if resp.status_code == 200:
        print(f"SUCCESS: {resp.json().get('message')}")
    else:
        print(f"FAILED: {resp.status_code} - {resp.text}")
        return

    # 2. Ingest RFQ
    print("\n[STEP 2] Creating RFQ for 12 Chemical Dosing Pump Assemblies...")
    rfq_data = {
        "rfq_number": "RFQ-WWT-2026-0847",
        "project_name": "Wastewater Treatment Plant Chemical Dosing System Upgrade",
        "department": "Operations / Procurement",
        "required_date": "2026-09-05",
        "item_name": "Chemical Dosing Pump Assembly",
        "item_code": "ITM-WWT-PUMP-0847",
        "description": "Supply 12 industrial chemical dosing pump assemblies for Veolia facility.",
        "quantity": 12.0,
        "unit": "Units",
        "specifications": "Flow Range: 0-120 L/hr | Discharge Pressure: min 7 bar.",
        "priority": "High",
        "delivery_location": "Houston, Texas, USA",
        "expected_delivery_date": "2026-09-05"
    }
    resp = requests.post(f"{BASE_URL}/api/rfqs/create", json=rfq_data)
    if resp.status_code == 200:
        print(f"SUCCESS: Created RFQ {resp.json().get('rfq_number')}")
    else:
        print(f"FAILED: {resp.status_code} - {resp.text}")
        return

    # 3. Validate Material / Stock Check
    print("\n[STEP 3] Validating material inventory check...")
    validate_data = {
        "item_name": "Chemical Dosing Pump Assembly",
        "quantity": 12.0
    }
    resp = requests.post(f"{BASE_URL}/api/materials/validate", json=validate_data)
    if resp.status_code == 200:
        result = resp.json()
        print(f"SUCCESS: Inventory Status -> Deficit: {result.get('deficit')}, Sourcing Required: {result.get('sourcing_required')}")
    else:
        print(f"FAILED: {resp.status_code} - {resp.text}")
        return

    # 4. Run RFP Campaign Simulation
    print("\n[STEP 4] Launching RFP campaign simulation...")
    sim_data = {
        "rfq_number": "RFQ-WWT-2026-0847"
    }
    resp = requests.post(f"{BASE_URL}/api/campaign/simulate", json=sim_data)
    if resp.status_code == 200:
        result = resp.json()
        print(f"SUCCESS: Received {result.get('quotes_received')} supplier quotations.")
        print("Shortlisted Bids:")
        for idx, s in enumerate(result.get('shortlist', [])):
            print(f"  {idx+1}. {s['supplier_name']} - Price: ${s['price']}/unit, Lead Time: {s['lead_time']} days, Weighted Score: {s['weighted_score']}")
    else:
        print(f"FAILED: {resp.status_code} - {resp.text}")
        return

    # 5. Fetch Workflow Notifications
    print("\n[STEP 5] Fetching pending approvals from notifications endpoint...")
    resp = requests.get(f"{BASE_URL}/api/workflow/notifications")
    if resp.status_code == 200:
        notifications = resp.json()
        pending = [n for n in notifications if n.get('status') == 'pending' and n.get('rfq_number') == 'RFQ-WWT-2026-0847']
        if pending:
            n = pending[0]
            print(f"SUCCESS: Found pending notification ID {n.get('id')}")
            print(f"  Item: {n.get('rfq_item')}")
            print(f"  Recommended Supplier: {n.get('recommended_supplier')}")
            print(f"  Recommended Price: ${n.get('recommended_price')}")
            print(f"  Summary: {n.get('summary_message')}")
            notification_id = n.get('id')
        else:
            print("FAILED: No pending notification found for RFQ-WWT-2026-0847")
            return
    else:
        print(f"FAILED: {resp.status_code} - {resp.text}")
        return

    # 6. Approve Proposal / PO Release
    print(f"\n[STEP 6] Approving proposal for notification ID {notification_id}...")
    resp = requests.post(f"{BASE_URL}/api/workflow/notifications/{notification_id}/approve")
    po_number = None
    if resp.status_code == 200:
        result = resp.json()
        po_number = result.get("po_number")
        print(f"SUCCESS: Proposal approved. {result.get('message')}")
        print(f"  PO Number: {po_number}")
    else:
        print(f"FAILED: {resp.status_code} - {resp.text}")
        return

    # 7. Verify generated PO
    print("\n[STEP 7] Verifying generated Purchase Order...")
    resp = requests.get(f"{BASE_URL}/api/purchase-orders")
    if resp.status_code == 200:
        pos = resp.json()
        demo_pos = [po for po in pos if po.get('rfq_number') == 'RFQ-WWT-2026-0847']
        if demo_pos:
            po = demo_pos[0]
            print(f"SUCCESS: Found PO {po.get('po_number')}")
            print(f"  Supplier ID: {po.get('supplier_id')}")
            print(f"  Item: {po.get('item_name')}")
            print(f"  Qty: {po.get('quantity')}")
            print(f"  Unit Price: ${po.get('unit_price')}")
            print(f"  Total: ${po.get('total_amount')}")
            print(f"  Synced to ERP: {po.get('synced_to_erp')}")
        else:
            print("FAILED: No PO found for RFQ-WWT-2026-0847")
    else:
        print(f"FAILED: {resp.status_code} - {resp.text}")

    # 8. Verify ERP sync log
    print("\n[STEP 8] Verifying ERP sync log...")
    resp = requests.get(f"{BASE_URL}/api/erp/logs")
    if resp.status_code == 200:
        logs = resp.json()
        demo_logs = [l for l in logs if l.get('object_id') == po_number]
        if demo_logs:
            log = demo_logs[0]
            print("SUCCESS: ERP Sync Log exists:")
            print(f"  Direction: {log.get('direction')}")
            print(f"  Method: {log.get('method')}")
            print(f"  Request Payload: {log.get('request_payload')}")
            print(f"  Response Payload: {log.get('response_payload')}")
            print(f"  Status Code: {log.get('status_code')}")
        else:
            print(f"FAILED: No ERP sync log found for {po_number}")
    else:
        print(f"FAILED: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    run_verification()
