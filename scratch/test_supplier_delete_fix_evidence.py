"""
test_supplier_delete_fix_evidence.py - Verification for delete_supplier with changed_by parameter.
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

def test_supplier_delete():
    print("====================================================")
    print("     SUPPLIER DELETE FIX VERIFICATION (NO DELAY)     ")
    print("====================================================\n")

    db = Database()
    if not db.sql_conn:
        print("[SKIP] Database connection unavailable.")
        return

    # 1. Create temporary supplier
    temp_id = db.create_supplier("PT TEMPORARY SUPPLIER TO DELETE", "Address", "email@test.com", "08123", "PIC")
    print(f"[1] Created temporary supplier with ID: {temp_id}")
    assert temp_id > 0, "Failed to create temporary supplier"

    # 2. Call delete_supplier with changed_by parameter
    ok, msg = db.delete_supplier(temp_id, changed_by="TestAdmin")
    print(f"[2] db.delete_supplier({temp_id}, changed_by='TestAdmin') result: ok={ok}, msg='{msg}'")
    assert ok is True, f"Expected delete success True, got {ok} ({msg})"

    # 3. Verify supplier is no longer in database
    deleted_supplier = db.get_supplier_by_id(temp_id)
    print(f"[3] Verification get_supplier_by_id({temp_id}): {deleted_supplier}")
    assert deleted_supplier is None, "Supplier still exists in database!"

    print("\n====================================================")
    print("[RESULT] VERIFICATION PASSED: Supplier delete fix fully verified!")
    print("====================================================")

if __name__ == "__main__":
    test_supplier_delete()
