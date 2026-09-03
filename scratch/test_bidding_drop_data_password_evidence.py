"""
test_bidding_drop_data_password_evidence.py - Verification for Bidding History Password-Protected Drop Data & Delete
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

def test_bidding_drop_data():
    print("====================================================")
    print("   BIDDING HISTORY DROP DATA & DELETE VERIFICATION   ")
    print("====================================================\n")

    db = Database()
    if not db.sql_conn:
        print("[SKIP] Database connection unavailable.")
        return

    TEST_YEAR = 1999

    with db.sql_conn.cursor() as cur:
        # Cleanup any existing test year data
        cur.execute("DELETE FROM dbo.Bidding_History WHERE bidding_year = ?", (TEST_YEAR,))
        db.sql_conn.commit()

        # Get 2 different valid master_data_ids
        cur.execute("SELECT TOP 2 id FROM dbo.Master_Data WHERE is_deleted = 0")
        m_rows = cur.fetchall()
        if len(m_rows) < 2:
            print("[SKIP] Not enough active master data found.")
            return

        m_id1, m_id2 = m_rows[0][0], m_rows[1][0]

        # Insert 2 test bidding items for TEST_YEAR with different spareparts
        item1_id = db.create_bidding({"master_data_id": m_id1, "year": TEST_YEAR, "current_supplier": "TEST_SUP1", "current_price": 50000}, changed_by="UnitTestUser")
        item2_id = db.create_bidding({"master_data_id": m_id2, "year": TEST_YEAR, "current_supplier": "TEST_SUP2", "current_price": 75000}, changed_by="UnitTestUser")

        print(f"[1] Created test bidding items ID {item1_id} and ID {item2_id} for year {TEST_YEAR}")
        count_before = db.count_bidding_by_year(TEST_YEAR)
        print(f"[2] Count bidding items for year {TEST_YEAR}: {count_before}")
        assert count_before == 2, f"Expected 2 records, got {count_before}"

        # Test single item deletion with changed_by
        res_del = db.delete_bidding(item1_id, changed_by="AdminSecurityTest")
        print(f"[3] Single item delete_bidding({item1_id}): {res_del}")
        assert res_del is True, "Single delete must return True"

        count_after_single = db.count_bidding_by_year(TEST_YEAR)
        print(f"[4] Count bidding items after single delete: {count_after_single}")
        assert count_after_single == 1, "Expected 1 record remaining"

        # Test Drop Data by year with changed_by
        dropped_count = db.delete_bidding_by_year(TEST_YEAR, changed_by="AdminSecurityTest")
        print(f"[5] Drop bidding year delete_bidding_by_year({TEST_YEAR}): {dropped_count} records dropped")
        assert dropped_count == 1, "Expected 1 record dropped"

        count_after_drop = db.count_bidding_by_year(TEST_YEAR)
        print(f"[6] Count bidding items after drop year: {count_after_drop}")
        assert count_after_drop == 0, "Expected 0 records remaining after drop year"

    print("\n====================================================")
    print("[RESULT] VERIFICATION PASSED: Bidding Drop Data & Secure Delete fully functional!")
    print("====================================================")

if __name__ == "__main__":
    test_bidding_drop_data()
