"""
test_bidding_supplier_priority_evidence.py - Verification for Bidding History Supplier Priority
"""

import sys
import os
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

from database import Database

def test_supplier_priority():
    print("====================================================")
    print("   BIDDING HISTORY SUPPLIER PRIORITY VERIFICATION    ")
    print("====================================================\n")

    db = Database()
    if not db.sql_conn:
        print("[SKIP] Database connection unavailable.")
        return

    with db.sql_conn.cursor() as cur:
        # Check if there is an existing bidding history item
        cur.execute("SELECT TOP 1 id, master_data_id, supplier_name FROM dbo.Bidding_History ORDER BY id DESC")
        r = cur.fetchone()
        if not r:
            print("[SKIP] No bidding history records found.")
            return
        
        bid_id, m_id, orig_supplier = r[0], r[1], r[2]
        
        # Temporarily update supplier_name to 'LOCAL'
        cur.execute("UPDATE dbo.Bidding_History SET supplier_name = 'LOCAL' WHERE id = ?", (bid_id,))
        db.sql_conn.commit()

        # Query via get_bidding()
        b_list = db.get_bidding(search="")
        target = next((item for item in b_list if int(item["id"]) == int(bid_id)), None)

        print(f"[1] Target Bidding ID {bid_id} supplier in Bidding_History DB: 'LOCAL'")
        print(f"[2] Supplier returned by get_bidding(): '{target.get('current_supplier') if target else None}'")

        assert target is not None, "Target bidding record must be returned"
        assert target.get("current_supplier") == "LOCAL", f"Expected 'LOCAL', got '{target.get('current_supplier')}'"

        # Restore original supplier
        cur.execute("UPDATE dbo.Bidding_History SET supplier_name = ? WHERE id = ?", (orig_supplier, bid_id))
        db.sql_conn.commit()

    print("\n====================================================")
    print("[RESULT] VERIFICATION PASSED: Bidding History supplier 'LOCAL' preserved correctly!")
    print("====================================================")

if __name__ == "__main__":
    test_supplier_priority()
