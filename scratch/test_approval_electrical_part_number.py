import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

def test_approval_electrical():
    db = Database()
    if not db.sql_conn:
        print("[FAIL] Cannot connect to DB")
        return

    # 1. Create a test electrical part
    p_num = "UPF-9999"
    cur = db.sql_conn.cursor()
    cur.execute("DELETE FROM dbo.Electrical_Parts WHERE part_number = ?", (p_num,))
    cur.execute("DELETE FROM dbo.Barang_Keluar WHERE master_data_id = ?", (p_num,))
    db.sql_conn.commit()

    cur.execute(
        "INSERT INTO dbo.Electrical_Parts (part_number, place, items, brand, qty, price_per_unit, value) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (p_num, "RACK-TEST", "TEST MOTOR SERVO", "TEST-BRAND", 10.0, 50000.0, 500000.0)
    )
    db.sql_conn.commit()
    print(f"[1] Inserted test Electrical Part {p_num} with Stock = 10.0")

    # 2. Submit a pending barang keluar for electrical part
    ok, msg, tx_id = db.create_electrical_parts_keluar(
        part_number=p_num,
        qty=2.0,
        line="B24",
        pic="TestPIC",
        remarks="Test Approval",
        approval_status="pending"
    )
    assert ok, f"Failed submitting pending: {msg}"
    print(f"[2] Submitted pending transaction ID = {tx_id}")

    # 3. Check get_pending_barang_keluar returns master_data_id = UPF-9999
    pendings = db.get_pending_barang_keluar()
    target = next((p for p in pendings if p["id"] == tx_id), None)
    assert target is not None, "Pending record not found in get_pending_barang_keluar"
    
    part_number_displayed = target.get("master_id") or target.get("master_data_id") or "-"
    print(f"[3] Displayed Part Number in Pending Approval = {part_number_displayed}")
    assert part_number_displayed == p_num, f"Expected {p_num}, got {part_number_displayed}"

    # 4. Approve transaction
    approved = db.approve_barang_keluar(tx_id, "TestAdmin")
    assert approved, "approve_barang_keluar returned False"
    print(f"[4] Approved transaction ID = {tx_id}")

    # 5. Verify stock deducted to 8.0
    cur.execute("SELECT qty FROM dbo.Electrical_Parts WHERE part_number = ?", (p_num,))
    new_stock = cur.fetchone()[0]
    print(f"[5] Stock after approval = {new_stock} (Expected 8.0)")
    assert float(new_stock) == 8.0, f"Expected 8.0, got {new_stock}"

    # 6. Cleanup
    cur.execute("DELETE FROM dbo.Barang_Keluar WHERE id = ?", (tx_id,))
    cur.execute("DELETE FROM dbo.Electrical_Parts WHERE part_number = ?", (p_num,))
    db.sql_conn.commit()
    print("[6] Cleanup successful.")
    print("\nVERIFICATION SUCCESSFUL: Approval Part Number & Stock Deduction Verified 100%!")

if __name__ == "__main__":
    test_approval_electrical()
