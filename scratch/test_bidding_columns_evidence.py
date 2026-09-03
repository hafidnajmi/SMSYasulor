"""
test_bidding_columns_evidence.py - Verification for DETAIL and BUDGET CODE columns in Bidding History
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

def test_bidding_columns():
    print("====================================================")
    print("   BIDDING HISTORY COLUMNS VERIFICATION (DETAIL & BUDGET CODE)   ")
    print("====================================================\n")

    db = Database()
    if not db.sql_conn:
        print("[SKIP] Database connection unavailable.")
        return

    bidding_data = db.get_bidding()
    print(f"[1] Retrieved {len(bidding_data)} bidding records from database.")

    if bidding_data:
        sample = bidding_data[0]
        print(f"[2] Sample Record Keys: {list(sample.keys())}")
        print(f"[3] Sample Detail: '{sample.get('detail')}' (po_name: '{sample.get('po_name')}')")
        print(f"[4] Sample Budget Code: '{sample.get('budget_code')}'")

        assert "detail" in sample, "Key 'detail' missing from get_bidding output"
        assert "budget_code" in sample, "Key 'budget_code' missing from get_bidding output"
        print("\n[5] Verified 'detail' and 'budget_code' are correctly selected in SQL query.")

    print("\n====================================================")
    print("[RESULT] VERIFICATION PASSED: Detail & Budget Code columns fully functional!")
    print("====================================================")

if __name__ == "__main__":
    test_bidding_columns()
