"""
test_procurement_price_validation_evidence.py - Empirical test for strict integer & non-negative price validation.
"""

import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

from database import Database

def test_price_validation():
    print("====================================================")
    print("   PROCUREMENT SUPPLIER PRICE VALIDATION VERIFICATION  ")
    print("====================================================\n")

    db = Database()
    if not db.sql_conn:
        print("[SKIP] Database connection unavailable.")
        return

    # Pick a sample master data item
    with db.sql_conn.cursor() as cur:
        cur.execute("SELECT TOP 1 id, bin FROM dbo.Master_Data WHERE is_deleted = 0")
        m_row = cur.fetchone()
        if not m_row:
            print("[SKIP] No Master_Data found.")
            return

        m_id, m_bin = m_row[0], m_row[1]
        
        # Pick or create a test supplier
        cur.execute("SELECT TOP 1 id, name FROM dbo.Supplier")
        s_row = cur.fetchone()
        if not s_row:
            s_id = db.create_supplier("TEST_SUPPLIER_PRICE_VAL")
            s_name = "TEST_SUPPLIER_PRICE_VAL"
        else:
            s_id, s_name = s_row[0], s_row[1]

        print(f"[1] Target Item: ID={m_id}, BIN={m_bin}, Supplier: ID={s_id}, Name='{s_name}'")

        # Test 1: add_supplier_to_master with negative price (-80000)
        offer_id = db.add_supplier_to_master(m_id, m_bin, s_id, -80000, "2026-08-14", changed_by="PriceTest")
        print(f"[2] db.add_supplier_to_master with price=-80000 created offer_id={offer_id}")

        cur.execute("SELECT price FROM dbo.Supplier_Offer WHERE id = ?", (offer_id,))
        saved_price = float(cur.fetchone()[0])
        print(f"[3] Saved Price in Database: {saved_price}")
        assert saved_price == 80000.0, f"Expected 80000.0, got {saved_price}"
        assert saved_price > 0, "Price must be positive"

        # Test 2: update_supplier_offer with decimal price (150000.75)
        db.update_supplier_offer(offer_id, s_name, 150000.75, "2026-08-14", changed_by="PriceTest")
        cur.execute("SELECT price FROM dbo.Supplier_Offer WHERE id = ?", (offer_id,))
        updated_price = float(cur.fetchone()[0])
        print(f"[4] db.update_supplier_offer with price=150000.75 updated price to: {updated_price}")
        assert updated_price == 150001.0 or updated_price == 150000.0, f"Expected integer rounded price, got {updated_price}"

        # Clean up test offer
        db.delete_supplier_offer(offer_id)
        print("[5] Cleaned up test offer record.")

    print("\n====================================================")
    print("[RESULT] VERIFICATION PASSED: Supplier price validation 100% successful!")
    print("====================================================")

if __name__ == "__main__":
    test_price_validation()
