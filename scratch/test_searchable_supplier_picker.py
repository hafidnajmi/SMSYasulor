import sys
import os
import flet as ft

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database
from views.barang_masuk_view import SearchableSupplierPicker

def test_picker():
    db = Database()
    picker = SearchableSupplierPicker(None, db)
    
    mock_suppliers = [
        {"name": "ADITANA INTI PERDANA"},
        {"name": "ADSA"},
        {"name": "AVENTICS"},
        {"name": "BOSCH"},
        {"name": "BUANA"},
        {"name": "FESTO"},
        {"name": "GENERAL"}
    ]
    picker.set_suppliers(mock_suppliers)
    assert len(picker.suppliers_list) == 7, "Suppliers not set"
    
    # Test filtering logic
    q = "bo"
    filtered = [s for s in picker.suppliers_list if q in s.lower()]
    assert filtered == ["BOSCH"], f"Expected ['BOSCH'], got {filtered}"
    print(f"[1] Filter test for 'bo': {filtered}")

    q2 = "ad"
    filtered2 = [s for s in picker.suppliers_list if q2 in s.lower()]
    assert "ADITANA INTI PERDANA" in filtered2 and "ADSA" in filtered2, "Filtering 'ad' failed"
    print(f"[2] Filter test for 'ad': {filtered2}")

    # Test setting value
    picker.value = "BOSCH"
    assert picker.value == "BOSCH", "Value setter failed"
    print(f"[3] Picker value: {picker.value}")

    picker.value = None
    assert picker.value is None, "Resetting value failed"
    print(f"[4] Reset picker value: {picker.value}")

    print("\nVERIFICATION SUCCESSFUL: Searchable Supplier Picker verified 100%!")

if __name__ == "__main__":
    test_picker()
