"""
test_budget_code_autofill_evidence.py - Empirical test for Budget Code auto-fill and auto-update between Bidding History and Master Data.
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

def test_budget_code_autofill():
    print("====================================================")
    print("   BUDGET CODE AUTO-FILL & AUTO-UPDATE VERIFICATION   ")
    print("====================================================\n")

    db = Database()
    if not db.sql_conn:
        print("[SKIP] Database connection unavailable.")
        return

    TEST_YEAR = 1998
    TEST_BUDGET_CODE = "BG-AUTO-888"

    with db.sql_conn.cursor() as cur:
        # Get an active master data item
        cur.execute("SELECT TOP 1 id, bin, item, ISNULL(budget_code, '') FROM dbo.Master_Data WHERE is_deleted = 0")
        m_row = cur.fetchone()
        if not m_row:
            print("[SKIP] No master data found.")
            return

        m_id, m_bin, m_item, old_bg = m_row[0], m_row[1], m_row[2], m_row[3]
        print(f"[1] Selected Master Data Item: ID={m_id}, BIN={m_bin}, Item='{m_item}', Current Budget Code='{old_bg}'")

        # Cleanup existing test bidding records for TEST_YEAR
        cur.execute("DELETE FROM dbo.Bidding_History WHERE bidding_year = ? AND master_data_id = ?", (TEST_YEAR, m_id))
        db.sql_conn.commit()

        # Create bidding record with new TEST_BUDGET_CODE
        bid_id = db.create_bidding({
            "master_data_id": m_id,
            "bin": m_bin,
            "year": TEST_YEAR,
            "budget_code": TEST_BUDGET_CODE,
            "current_supplier": "TEST_SUPPLIER_BG",
            "current_price": 15000
        }, changed_by="BudgetCodeTest")

        print(f"[2] Created Bidding Record ID={bid_id} with Budget Code='{TEST_BUDGET_CODE}'")

        # Verify Master_Data.budget_code was updated
        m_updated = db.get_master_data_by_id(m_id)
        new_bg = m_updated.get("budget_code", "")
        print(f"[3] Updated Master Data Budget Code: '{new_bg}'")
        assert new_bg == TEST_BUDGET_CODE, f"Expected '{TEST_BUDGET_CODE}', got '{new_bg}'"

        # Test update_bidding with modified budget code
        UPDATED_BUDGET_CODE = "BG-AUTO-999"
        db.update_bidding(bid_id, {
            "budget_code": UPDATED_BUDGET_CODE,
            "bin": m_bin
        }, changed_by="BudgetCodeTest")

        m_updated2 = db.get_master_data_by_id(m_id)
        new_bg2 = m_updated2.get("budget_code", "")
        print(f"[4] Updated Bidding Record ID={bid_id} with Budget Code='{UPDATED_BUDGET_CODE}'")
        print(f"[5] Master Data Budget Code after update_bidding: '{new_bg2}'")
        assert new_bg2 == UPDATED_BUDGET_CODE, f"Expected '{UPDATED_BUDGET_CODE}', got '{new_bg2}'"

        # Cleanup test record
        cur.execute("DELETE FROM dbo.Bidding_History WHERE bidding_year = ? AND master_data_id = ?", (TEST_YEAR, m_id))
        # Restore old budget code
        cur.execute("UPDATE dbo.Master_Data SET budget_code = ? WHERE id = ?", (old_bg, m_id))
        db.sql_conn.commit()

    print("\n====================================================")
    print("[RESULT] VERIFICATION PASSED: Budget Code auto-fills & auto-updates Master Data 100% successfully!")
    print("====================================================")

if __name__ == "__main__":
    test_budget_code_autofill()
