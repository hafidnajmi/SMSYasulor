"""
test_duplicate_bidding_prevention_evidence.py - Verification script for Duplicate Bidding Prevention per Year
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

def test_duplicate_bidding_prevention():
    print("====================================================")
    print("   DUPLICATE BIDDING PREVENTION VERIFICATION       ")
    print("====================================================\n")

    db = Database()
    cur = db.sql_conn.cursor()

    # Step 1: Pick an active master_data item
    cur.execute("SELECT TOP 1 id, bin, item FROM dbo.Master_Data WHERE is_deleted = 0")
    row = cur.fetchone()
    assert row is not None, "Master Data must contain at least 1 item!"

    m_id, m_bin, m_item = row[0], row[1], row[2]
    test_year = 2026

    # Clean any existing bidding history for this test item in test_year
    cur.execute("DELETE FROM dbo.Bidding_History WHERE master_data_id = ? AND bidding_year = ?", (m_id, test_year))
    db.sql_conn.commit()

    # Step 2: Check before insert (should be None)
    dup1 = db.check_duplicate_bidding(master_data_id=m_id, bin_code=m_bin, item_name=m_item, year=test_year)
    print(f"[1] Before insert check for year {test_year}: Duplicate = {dup1}")
    assert dup1 is None, "Before insert, check_duplicate_bidding must return None!"

    # Step 3: Insert first bidding entry
    bidding_data = {
        "master_data_id": m_id,
        "bin": m_bin,
        "item_name": m_item,
        "year": test_year,
        "bid_status": "1st",
        "current_supplier": "TEST SUPPLIER",
        "current_price": 75000.0,
        "status": "active"
    }
    bid_id = db.create_bidding(bidding_data, changed_by="TEST_RUNNER")
    print(f"[2] Inserted Bidding Record ID: {bid_id} for year {test_year}")
    assert bid_id > 0, "create_bidding must return a valid positive ID!"

    # Step 4: Check duplicate for same item & same year (MUST return duplicate description)
    dup2 = db.check_duplicate_bidding(master_data_id=m_id, bin_code=m_bin, item_name=m_item, year=test_year)
    print(f"[3] Second insert check for same year ({test_year}): Duplicate = '{dup2}'")
    assert dup2 is not None, "Duplicate check for same year MUST detect duplicate!"

    # Step 5: Check duplicate for DIFFERENT year (e.g. 2027) (should be None)
    dup3 = db.check_duplicate_bidding(master_data_id=m_id, bin_code=m_bin, item_name=m_item, year=2027)
    print(f"[4] Insert check for DIFFERENT year (2027): Duplicate = {dup3}")
    assert dup3 is None, "Different year MUST allow bidding creation!"

    # Step 6: Clean up test bidding record
    if bid_id > 0:
        db.delete_bidding(bid_id)

    print("====================================================")
    print("[RESULT] VERIFICATION PASSED: Duplicate Bidding Prevention working per year!")
    print("====================================================")

if __name__ == "__main__":
    test_duplicate_bidding_prevention()
