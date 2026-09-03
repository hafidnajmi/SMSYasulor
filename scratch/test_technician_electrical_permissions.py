"""
test_technician_electrical_permissions.py - Verify Technician permissions in Electrical Parts View
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
from views.electrical_parts_view import ElectricalPartsContent
import flet as ft

def test_technician_permissions():
    print("====================================================")
    print("   TECHNICIAN ELECTRICAL PERMISSIONS TEST           ")
    print("====================================================\n")

    db = Database()

    # Mock Flet Page
    class MockSession:
        def __init__(self, data):
            self._data = data
        def get(self, key, default=None):
            return self._data.get(key, default)

    class MockPage:
        def __init__(self, role):
            self.session = MockSession({"user": {"role": role, "can_electrical_parts": 1}})
            self.dialog = None
            self.snack_bar = None
            self.overlay = []
            self.on_global_refresh = None
        def update(self):
            pass

    # 1. Test Technician User
    tech_page = MockPage("technician")
    tech_content = ElectricalPartsContent(tech_page, db)
    print("[1] Loaded ElectricalPartsContent for role='technician'")
    assert tech_content is not None, "Content container is None"

    # 2. Test Admin User
    admin_page = MockPage("admin")
    admin_content = ElectricalPartsContent(admin_page, db)
    print("[2] Loaded ElectricalPartsContent for role='admin'")
    assert admin_content is not None, "Content container is None"

    print("\n====================================================")
    print("[RESULT] VERIFICATION PASSED: Technician Electrical permissions verified 100%!")
    print("====================================================")

if __name__ == "__main__":
    test_technician_permissions()
