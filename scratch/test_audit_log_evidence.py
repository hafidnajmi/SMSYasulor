"""
test_audit_log_evidence.py - Automated Verification Test for Master Data Audit Logging (dbo.Audit_Log)
"""

import sys
import os
import json

# Ensure root workspace is in sys.path
root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

# Force UTF-8 output encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

from database import Database

def test_master_data_audit_logging():
    print("=== [AUDIT LOG TEST STEP 1] Connecting to SQL Server Database ===")
    db = Database()
    if not db.sql_conn:
        print("❌ FAIL: Cannot connect to database.")
        return False

    cursor = db.sql_conn.cursor()

    # 1. Create a dummy test sparepart
    print("\n=== [AUDIT LOG TEST STEP 2] Testing INSERT Audit Log ===")
    test_data = {
        "item": "TEST_AUDIT_BEARING_XYZ",
        "bin": "TEST-BIN-999",
        "category": "MECHANICAL",
        "current_unit_price": 150000.0,
        "currency": "IDR"
    }
    
    new_sp_id = db.create_master_data(test_data, changed_by="Test_Audit_Admin")
    print(f"  Created test sparepart with ID: {new_sp_id}")

    # Check if INSERT is logged in dbo.Audit_Log
    cursor.execute("""
        SELECT TOP 1 action, table_name, record_id, changed_by, new_value, changed_at
        FROM dbo.Audit_Log
        WHERE table_name = 'Master_Data' AND record_id = ? AND action = 'INSERT'
        ORDER BY id DESC
    """, (new_sp_id,))
    insert_log = cursor.fetchone()

    if insert_log:
        print(f"  ✓ INSERT Audit Log Verified: action={insert_log[0]}, record_id={insert_log[2]}, changed_by={insert_log[3]}")
    else:
        print("  ❌ FAIL: INSERT Audit Log record NOT found in dbo.Audit_Log!")

    # 2. Update the dummy test sparepart
    print("\n=== [AUDIT LOG TEST STEP 3] Testing UPDATE Audit Log ===")
    update_data = {
        "item": "TEST_AUDIT_BEARING_XYZ_UPDATED",
        "current_unit_price": 175000.0,
        "currency": "IDR"
    }

    db.update_master_data(new_sp_id, update_data, changed_by="Test_Audit_Admin")
    print(f"  Updated test sparepart ID: {new_sp_id}")

    # Check if UPDATE is logged in dbo.Audit_Log
    cursor.execute("""
        SELECT TOP 1 action, table_name, record_id, changed_by, old_value, new_value, changed_at
        FROM dbo.Audit_Log
        WHERE table_name = 'Master_Data' AND record_id = ? AND action = 'UPDATE'
        ORDER BY id DESC
    """, (new_sp_id,))
    update_log = cursor.fetchone()

    if update_log:
        print(f"  ✓ UPDATE Audit Log Verified: action={update_log[0]}, record_id={update_log[2]}, changed_by={update_log[3]}")
        print(f"    - Old Value Sample: {str(update_log[4])[:60]}")
        print(f"    - New Value Sample: {str(update_log[5])[:60]}")
    else:
        print("  ❌ FAIL: UPDATE Audit Log record NOT found in dbo.Audit_Log!")

    # 3. Soft Delete the dummy test sparepart
    print("\n=== [AUDIT LOG TEST STEP 4] Testing DELETE Audit Log ===")
    db.delete_master_data(new_sp_id, changed_by="Test_Audit_Admin")
    print(f"  Soft-deleted test sparepart ID: {new_sp_id}")

    # Check if DELETE is logged in dbo.Audit_Log
    cursor.execute("""
        SELECT TOP 1 action, table_name, record_id, changed_by, old_value, changed_at
        FROM dbo.Audit_Log
        WHERE table_name = 'Master_Data' AND record_id = ? AND action = 'DELETE'
        ORDER BY id DESC
    """, (new_sp_id,))
    delete_log = cursor.fetchone()

    if delete_log:
        print(f"  ✓ DELETE Audit Log Verified: action={delete_log[0]}, record_id={delete_log[2]}, changed_by={delete_log[3]}")
    else:
        print("  ❌ FAIL: DELETE Audit Log record NOT found in dbo.Audit_Log!")

    # Cleanup test record hard-purge
    try:
        cursor.execute("DELETE FROM dbo.Master_Data WHERE id = ?", (new_sp_id,))
        cursor.execute("DELETE FROM dbo.Audit_Log WHERE record_id = ?", (new_sp_id,))
        db.sql_conn.commit()
    except Exception:
        pass

    success = bool(insert_log and update_log and delete_log)
    return success

if __name__ == "__main__":
    res = test_master_data_audit_logging()
    print("\n====================================================")
    if res:
        print("[RESULT] AUDIT LOG VERIFICATION: PASSED (ALL OPERATIONS LOGGED)")
    else:
        print("[RESULT] AUDIT LOG VERIFICATION: FAILED")
    print("====================================================")
