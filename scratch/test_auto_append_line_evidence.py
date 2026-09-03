"""
test_auto_append_line_evidence.py - Verification script for auto-appending new transaction Line to Master_Data.line
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

def test_auto_append_line_feature():
    print("====================================================")
    print("   AUTO-APPEND TRANSACTION LINE VERIFICATION       ")
    print("====================================================\n")

    db = Database()
    cur = db.sql_conn.cursor()

    # Step 1: Create a test item in Master_Data
    test_id = "UPF-99999"
    test_bin = "TEST-BIN-AUTO"
    cur.execute("DELETE FROM dbo.sparepart_line_mapping WHERE sparepart_id = ?", (test_id,))
    cur.execute("DELETE FROM dbo.Barang_Keluar WHERE bin = ?", (test_bin,))
    cur.execute("DELETE FROM dbo.Master_Data WHERE id = ? OR bin = ?", (test_id, test_bin))
    db.sql_conn.commit()

    cur.execute("""
        INSERT INTO dbo.Master_Data 
        (id, bin, item, line, category, current_stock, current_unit_price, is_deleted)
        VALUES (?, ?, 'TEST AUTO LINE ITEM', 'GENERAL', 'TEST', 10.0, 50000.0, 0)
    """, (test_id, test_bin))
    db.sql_conn.commit()

    print("[1] Initial Master_Data state:")
    cur.execute("SELECT id, line, current_stock FROM dbo.Master_Data WHERE id = ?", (test_id,))
    row1 = cur.fetchone()
    print(f"    Item ID: {row1[0]} | Line: '{row1[1]}' | Stock: {row1[2]}\n")
    assert row1[1] == "GENERAL", "Initial line must be GENERAL!"

    # Step 2: Submit Barang Keluar transaction with line = "B19"
    bk_id_1 = db.create_barang_keluar_with_cost(
        tanggal="2026-08-14",
        bin_code=test_bin,
        item_name="TEST AUTO LINE ITEM",
        qty=1.0,
        rem_name="AUTO LINE TEST 1",
        master_data_id=test_id,
        line="B19",
        pic="OPERATOR_TEST",
        approval_status="approved"
    )

    cur.execute("SELECT id, line, current_stock FROM dbo.Master_Data WHERE id = ?", (test_id,))
    row2 = cur.fetchone()
    print(f"[2] After transaction 1 (Line: B19, QTY: 1):")
    print(f"    Item ID: {row2[0]} | Line: '{row2[1]}' | Stock: {row2[2]}\n")

    assert row2[2] == 9.0, "Stock must be deducted to 9.0!"
    assert "B19" in row2[1] and "GENERAL" in row2[1], f"Line must contain GENERAL, B19! Actual: '{row2[1]}'"

    # Step 3: Submit second transaction with line = "B19" again (test no duplicate)
    bk_id_2 = db.create_barang_keluar_with_cost(
        tanggal="2026-08-14",
        bin_code=test_bin,
        item_name="TEST AUTO LINE ITEM",
        qty=1.0,
        rem_name="AUTO LINE TEST 2",
        master_data_id=test_id,
        line="B19",
        pic="OPERATOR_TEST",
        approval_status="approved"
    )

    cur.execute("SELECT id, line, current_stock FROM dbo.Master_Data WHERE id = ?", (test_id,))
    row3 = cur.fetchone()
    print(f"[3] After transaction 2 (Line: B19 again):")
    print(f"    Item ID: {row3[0]} | Line: '{row3[1]}' | Stock: {row3[2]}\n")

    assert row3[1] == "GENERAL, B19", f"Line must remain 'GENERAL, B19' without duplicate! Actual: '{row3[1]}'"

    # Step 4: Submit third transaction with line = "S14"
    bk_id_3 = db.create_barang_keluar_with_cost(
        tanggal="2026-08-14",
        bin_code=test_bin,
        item_name="TEST AUTO LINE ITEM",
        qty=1.0,
        rem_name="AUTO LINE TEST 3",
        master_data_id=test_id,
        line="S14",
        pic="OPERATOR_TEST",
        approval_status="approved"
    )

    cur.execute("SELECT id, line, current_stock FROM dbo.Master_Data WHERE id = ?", (test_id,))
    row4 = cur.fetchone()
    print(f"[4] After transaction 3 (Line: S14):")
    print(f"    Item ID: {row4[0]} | Line: '{row4[1]}' | Stock: {row4[2]}\n")

    assert "S14" in row4[1], f"Line must contain S14! Actual: '{row4[1]}'"

    # Step 5: Clean up test item
    cur.execute("DELETE FROM dbo.sparepart_line_mapping WHERE sparepart_id = ?", (test_id,))
    cur.execute("DELETE FROM dbo.Barang_Keluar WHERE bin = ?", (test_bin,))
    cur.execute("DELETE FROM dbo.Master_Data WHERE id = ?", (test_id,))
    db.sql_conn.commit()

    print("====================================================")
    print("[RESULT] VERIFICATION PASSED: Transaction lines auto-appended to Master_Data.line!")
    print("====================================================")

if __name__ == "__main__":
    test_auto_append_line_feature()
