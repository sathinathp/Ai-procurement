import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import engine, SessionLocal
import models

def clean_production_data():
    """
    Cleans all dummy operational data (RFQs, Quotes, POs, GRNs, Invoices, Payment Vouchers, Emails, Timelines, Logs)
    while keeping Supplier data completely intact for Production launch.
    """
    db = SessionLocal()
    try:
        print("Initiating production cleanup: Retaining all Suppliers while purging dummy transactional records...")
        
        # 1. Delete dependent transactional records
        vouchers_count = db.query(models.PaymentVoucher).delete()
        invoices_count = db.query(models.InvoiceMatch).delete()
        grns_count = db.query(models.GoodsReceiptNote).delete()
        pos_count = db.query(models.PurchaseOrder).delete()
        quotes_count = db.query(models.QuoteResponse).delete()
        emails_count = db.query(models.EmailHistory).delete()
        timelines_count = db.query(models.RFQTimeline).delete()
        rfqs_count = db.query(models.RFQ).delete()
        logs_count = db.query(models.ErpSyncLog).delete()
        defects_count = db.query(models.QualityDefect).delete()
        inventory_count = db.query(models.InventoryItem).delete()
        
        db.commit()

        suppliers_count = db.query(models.Supplier).count()

        print("--------------------------------------------------")
        print("PRODUCTION CLEANUP COMPLETE RESULT:")
        print(f"[OK] Retained Suppliers: {suppliers_count} active vendors preserved")
        print(f"[-] Purged Payment Vouchers: {vouchers_count}")
        print(f"[-] Purged Invoice Matches: {invoices_count}")
        print(f"[-] Purged Goods Receipt Notes: {grns_count}")
        print(f"[-] Purged Purchase Orders: {pos_count}")
        print(f"[-] Purged Quote Responses: {quotes_count}")
        print(f"[-] Purged Email History: {emails_count}")
        print(f"[-] Purged RFQ Timelines: {timelines_count}")
        print(f"[-] Purged RFQs: {rfqs_count}")
        print(f"[-] Purged ERP Sync Logs: {logs_count}")
        print(f"[-] Purged Quality Defects: {defects_count}")
        print(f"[-] Purged Inventory Items: {inventory_count}")
        print("--------------------------------------------------")
        print("Database is now clean and ready for Live Production Operations!")

    except Exception as e:
        print(f"Error during production cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clean_production_data()
