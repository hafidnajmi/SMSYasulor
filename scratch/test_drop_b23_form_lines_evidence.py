"""
test_drop_b23_form_lines_evidence.py - Verification script for B23 removal and Add/Edit Line Checkbox features
"""

import sys
import os
from unittest.mock import MagicMock

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

from database import Database
from views.master_data_view import _make_form_dialog

def test_drop_b23_and_form_line_checkboxes():
    print("====================================================")
    print("   DROP LINE B23 & ADD/EDIT LINE CHECKBOX VERIFY    ")
    print("====================================================\n")

    db = Database()

    # Step 1: Check B23 in Database Filters
    filters = db.get_master_data_filters()
    lines = filters.get('line', [])
    print(f"[*] Filter Lines ({len(lines)} total lines):")
    print(f"    {lines}\n")

    assert "B23" not in lines, "Line B23 must NOT appear in master_data_filters!"
    assert "B23" not in Database.UP2_LINE_CODES, "B23 must NOT be in UP2_LINE_CODES!"

    # Step 2: Check SQL Server Database Tables for B23
    cur = db.sql_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM dbo.Master_Data WHERE line LIKE '%B23%'")
    b23_master_cnt = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM dbo.master_line WHERE line_code = 'B23'")
    b23_ml_cnt = cur.fetchone()[0]

    print(f"  - Master_Data B23 count : {b23_master_cnt}")
    print(f"  - master_line B23 count : {b23_ml_cnt}")

    assert b23_master_cnt == 0, "B23 must be 0 in Master_Data!"
    assert b23_ml_cnt == 0, "B23 must be 0 in master_line!"
    print("  ✓ B23 completely purged from database tables.\n")

    # Step 3: Test Add/Edit Form Dialog Checkbox Instantiation
    mock_page = MagicMock()
    sample_row = {"id": "UPF-9007", "item": "BEARING TEST", "line": "B19, B20, B21"}
    
    dlg = _make_form_dialog(mock_page, db, "Edit Sparepart", sample_row, lambda data: None)
    assert dlg is not None, "Form dialog must instantiate cleanly!"

    print("====================================================")
    print("[RESULT] VERIFICATION PASSED: B23 dropped & Add/Edit Line Checkboxes ready!")
    print("====================================================")

if __name__ == "__main__":
    test_drop_b23_and_form_line_checkboxes()
