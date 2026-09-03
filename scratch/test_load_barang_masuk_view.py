import sys
import os
import flet as ft

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database
from views.barang_masuk_view import BarangMasukContent

class MockPage:
    def __init__(self):
        self.dialog = None
        self.snack_bar = None
        self.session = {}
        self.overlay = []
    def update(self):
        pass

def test_load_view():
    db = Database()
    page = MockPage()
    try:
        view = BarangMasukContent(page, db)
        print("[OK] BarangMasukContent instantiated successfully without any error!")
    except Exception as ex:
        print(f"[ERROR] Failed to load BarangMasukContent: {ex}")
        raise ex

if __name__ == "__main__":
    test_load_view()
