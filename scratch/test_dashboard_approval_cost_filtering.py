import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

def test_dashboard_approval_filtering():
    db = Database()
    if not db.sql_conn:
        print("[FAIL] Cannot connect to DB")
        return

    cur = db.sql_conn.cursor()

    # 1. Measure initial cost for line 'B19'
    initial_line_costs = db.get_cost_per_line()
    b19_initial = next((c["total_cost"] for c in initial_line_costs if c["line"] == "B19"), 0.0)
    print(f"[1] Initial Total Cost for Line B19 = Rp {b19_initial:,.0f}")

    # 2. Insert a PENDING transaction of Rp 5,000,000 for Line B19
    cur.execute("""
        INSERT INTO dbo.Barang_Keluar (tanggal, bin, item_name, qty, line, Unit_Price, Total_Cost, approval_status, created_at)
        VALUES (GETDATE(), 'TEST-BIN', 'TEST-ITEM-APPROVAL', 1, 'B19', 5000000, 5000000, 'pending', GETDATE())
    """)
    db.sql_conn.commit()

    cur.execute("SELECT @@IDENTITY")
    tx_id = cur.fetchone()[0]
    print(f"[2] Inserted PENDING transaction (id={tx_id}, cost=Rp 5.000.000, line=B19)")

    # 3. Check line cost for B19 while PENDING (Must remain equal to b19_initial)
    pending_line_costs = db.get_cost_per_line()
    b19_pending = next((c["total_cost"] for c in pending_line_costs if c["line"] == "B19"), 0.0)
    print(f"[3] Cost for Line B19 while transaction is PENDING = Rp {b19_pending:,.0f} (Expected Rp {b19_initial:,.0f})")
    assert b19_pending == b19_initial, f"FAILED: Pending cost updated line cost! {b19_pending} != {b19_initial}"

    # 4. Reject transaction
    db.reject_barang_keluar(tx_id, "TestAdmin")
    print(f"[4] Rejected transaction id={tx_id}")

    # 5. Check line cost for B19 while REJECTED (Must still remain equal to b19_initial)
    rejected_line_costs = db.get_cost_per_line()
    b19_rejected = next((c["total_cost"] for c in rejected_line_costs if c["line"] == "B19"), 0.0)
    print(f"[5] Cost for Line B19 after transaction REJECTED = Rp {b19_rejected:,.0f} (Expected Rp {b19_initial:,.0f})")
    assert b19_rejected == b19_initial, f"FAILED: Rejected cost updated line cost! {b19_rejected} != {b19_initial}"

    # 6. Change status to APPROVED
    cur.execute("UPDATE dbo.Barang_Keluar SET approval_status = 'approved' WHERE id = ?", (tx_id,))
    db.sql_conn.commit()
    print(f"[6] Set transaction id={tx_id} to APPROVED")

    # 7. Check line cost for B19 while APPROVED (Must increase by 5,000,000)
    approved_line_costs = db.get_cost_per_line()
    b19_approved = next((c["total_cost"] for c in approved_line_costs if c["line"] == "B19"), 0.0)
    expected_approved = float(b19_initial) + 5000000.0
    b19_approved_val = float(b19_approved)
    print(f"[7] Cost for Line B19 after APPROVED = Rp {b19_approved_val:,.0f} (Expected Rp {expected_approved:,.0f})")
    assert b19_approved_val == expected_approved, f"FAILED: Approved cost mismatch! {b19_approved_val} != {expected_approved}"

    # 8. Cleanup test transaction
    cur.execute("DELETE FROM dbo.Barang_Keluar WHERE id = ?", (tx_id,))
    db.sql_conn.commit()
    print("[8] Cleanup successful.")

    print("\nVERIFICATION PASSED 100%: Line Cost Distribution & Dashboard Analytics update ONLY upon Admin Approval!")

if __name__ == "__main__":
    test_dashboard_approval_filtering()
