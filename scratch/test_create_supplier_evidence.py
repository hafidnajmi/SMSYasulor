"""
test_create_supplier_evidence.py - Empirical test for Supplier creation in SQL Server.
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

def test_supplier_creation():
    print("====================================================")
    print("      SUPPLIER CREATION FIX VERIFICATION            ")
    print("====================================================\n")

    db = Database()
    if not db.sql_conn:
        print("[SKIP] Database connection unavailable.")
        return

    TEST_NAME = "PT TEST SUPPLIER MAJU"
    TEST_EMAIL = "contact@suppliemaju.co.id"
    TEST_PHONE = "021-5551234"
    TEST_PIC = "Budi Santoso"
    TEST_ADDR = "Jl. Industri No. 88, Cikarang"

    # 1. Test create_supplier
    new_id = db.create_supplier(
        name=TEST_NAME,
        address=TEST_ADDR,
        email=TEST_EMAIL,
        phone=TEST_PHONE,
        pic=TEST_PIC
    )

    print(f"[1] db.create_supplier returned new ID: {new_id}")
    assert new_id > 0, f"Expected valid positive ID, got {new_id}"

    # 2. Test get_supplier_by_id
    created_supplier = db.get_supplier_by_id(new_id)
    print(f"[2] Retrieved Created Supplier: {created_supplier}")
    assert created_supplier is not None, "Supplier record not found in database!"
    assert created_supplier.get("name") == TEST_NAME, f"Expected '{TEST_NAME}', got '{created_supplier.get('name')}'"

    # 3. Clean up test record
    ok, msg = db.delete_supplier(new_id)
    print(f"[3] Cleaned up test supplier record: success={ok}, msg='{msg}'")

    print("\n====================================================")
    print("[RESULT] VERIFICATION PASSED: Supplier creation fixed & returning new ID successfully!")
    print("====================================================")

if __name__ == "__main__":
    test_supplier_creation()
