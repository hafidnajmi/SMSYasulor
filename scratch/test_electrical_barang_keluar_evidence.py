"""
test_electrical_barang_keluar_evidence.py - Empirical test for Electrical Parts Barang Keluar feature.
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

def test_electrical_barang_keluar():
    print("====================================================")
    print("   ELECTRICAL PARTS BARANG KELUAR VERIFICATION      ")
    print("====================================================\n")

    db = Database()
    if not db.sql_conn:
        print("[SKIP] Database connection unavailable.")
        return

    # 1. Create a test electrical part
    test_data = {
        "place": "TEST-LOC-E1",
        "items": "MCB 3P 16A Schneider",
        "brand": "Schneider",
        "qty": 20.0,
        "condition": "New",
        "price_per_unit": 150000.0,
    }
    part_num = db.create_electrical_parts(test_data)
    print(f"[1] Created test electrical part: {part_num} (Stock = 20.0)")

    # 2. Test Barang Keluar (qty = 5.0)
    ok, msg, tx_id = db.create_electrical_parts_keluar(
        part_number=part_num,
        qty=5.0,
        line="Line A",
        machine_id=None,
        pic="Adit",
        maintenance_type="Breakdown",
        remarks="Penggantian MCB rusak di Line A"
    )
    print(f"[2] Barang Keluar Execution: ok={ok}, msg='{msg}', tx_id={tx_id}")
    assert ok is True, f"Barang keluar failed: {msg}"

    # 3. Verify deducted stock in dbo.electrical_parts
    parts = db.get_electrical_parts(search=part_num)
    assert len(parts) > 0, "Electrical part not found"
    updated_qty = float(parts[0]["qty"])
    updated_val = float(parts[0]["value"])
    print(f"[3] Updated Stock: {updated_qty} (Expected 15.0), Updated Value: {updated_val}")
    assert updated_qty == 15.0, f"Expected stock 15.0, got {updated_qty}"
    assert updated_val == 15.0 * 150000.0, f"Expected value {15.0 * 150000.0}, got {updated_val}"

    # 4. Verify transaction record in dbo.Barang_Keluar
    with db.sql_conn.cursor() as cur:
        cur.execute("SELECT id, item_name, qty, line, pic FROM dbo.Barang_Keluar WHERE id = ?", (tx_id,))
        tx = cur.fetchone()
        print(f"[4] Logged Outgoing Transaction in dbo.Barang_Keluar: {tx}")
        assert tx is not None, "Outgoing transaction record missing in dbo.Barang_Keluar"
        assert tx[2] == 5.0, f"Expected qty 5.0, got {tx[2]}"

    # 5. Test Insufficient Stock rejection (qty = 100.0)
    ok_fail, msg_fail, _ = db.create_electrical_parts_keluar(
        part_number=part_num,
        qty=100.0,
        line="Line A",
        pic="Adit"
    )
    print(f"[5] Insufficient Stock Test: ok={ok_fail}, msg='{msg_fail}'")
    assert ok_fail is False, "Should reject when qty > available stock"

    # 6. Cleanup test records
    db.delete_electrical_parts(part_num)
    with db.sql_conn.cursor() as cur:
        cur.execute("DELETE FROM dbo.Barang_Keluar WHERE id = ?", (tx_id,))
        db.sql_conn.commit()
    print("[6] Cleaned up test records.")

    print("\n====================================================")
    print("[RESULT] VERIFICATION PASSED: Electrical Parts Barang Keluar verified 100%!")
    print("====================================================")

if __name__ == "__main__":
    test_electrical_barang_keluar()
