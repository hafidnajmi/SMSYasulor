import sys
import os
import flet as ft

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database
from views.electrical_parts_view import ElectricalPartsContent

class MockPage:
    def __init__(self):
        self.dialog = None
        self.snack_bar = None
        self.session = {"user": {"id": 1, "role": "admin"}}
        self.overlay = []
    def update(self):
        pass

def test_electrical_bmasuk():
    db = Database()
    
    # 1. Test database create_electrical_parts_masuk
    test_data = {
        "tanggal": "19 Aug 2026 10:10",
        "place": "TEST-RACK-01",
        "part_number": "UPF-E9999",
        "item_name": "Test MCB Electrical 3P",
        "brand": "Schneider",
        "condition": "New",
        "qty": 5,
        "purchase_price": 150000.0,
        "po_number": "PO-TEST-123",
        "pic": "Priyanto",
        "remarks": "Unit Test Electrical Barang Masuk",
        "supplier": "BOSCH",
        "user_id": 1
    }
    
    ok, msg, bm_id = db.create_electrical_parts_masuk(test_data)
    assert ok, f"create_electrical_parts_masuk failed: {msg}"
    print(f"[OK] create_electrical_parts_masuk: {msg} (ID: {bm_id})")

    # 2. Test get_electrical_barang_masuk_history
    hist = db.get_electrical_barang_masuk_history(search="UPF-E9999")
    assert len(hist) > 0, "History record not found"
    print(f"[OK] Electrical Barang Masuk history fetched: {hist[0]}")

    # 3. Test View Instantiation
    page = MockPage()
    view = ElectricalPartsContent(page, db)
    assert view is not None, "ElectricalPartsContent view is None"
    print("[OK] ElectricalPartsContent instantiated successfully with Barang Masuk feature!")

    # Clean up test item
    cur = db.sql_conn.cursor()
    cur.execute("DELETE FROM dbo.Barang_Masuk WHERE part_number = 'UPF-E9999'")
    cur.execute("DELETE FROM dbo.electrical_parts WHERE part_number = 'UPF-E9999'")
    db.sql_conn.commit()
    print("[OK] Cleanup completed.")

if __name__ == "__main__":
    test_electrical_bmasuk()
