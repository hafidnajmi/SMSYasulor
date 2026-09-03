"""
test_area_line_filter_evidence.py - Verification script for dynamic Area -> Line filter linkage
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

def test_area_line_filter_linkage():
    print("====================================================")
    print("   AREA -> LINE DYNAMIC FILTER LINKAGE VERIFICATION ")
    print("====================================================\n")

    db = Database()

    # Step 1: Fetch filters for All areas
    all_filters = db.get_master_data_filters()
    all_lines = all_filters.get('line', [])
    print(f"[*] Total Lines across ALL areas ({len(all_lines)} lines):")
    print(f"    {all_lines}\n")

    # Step 2: Fetch filters for UP1
    up1_filters = db.get_master_data_filters("UP1")
    up1_lines = up1_filters.get('line', [])
    print(f"[*] Total Lines for Area 'UP1' ({len(up1_lines)} lines):")
    print(f"    {up1_lines}\n")

    # Step 3: Fetch filters for UP2
    up2_filters = db.get_master_data_filters("UP2")
    up2_lines = up2_filters.get('line', [])
    print(f"[*] Total Lines for Area 'UP2' ({len(up2_lines)} lines):")
    print(f"    {up2_lines}\n")

    # Verification checks
    assert len(up1_lines) > 0, "UP1 must return valid lines!"
    assert len(up2_lines) > 0, "UP2 must return valid lines!"
    assert len(up1_lines) < len(all_lines), "UP1 line list must be filtered specifically to UP1!"
    
    # Check that S-lines (S1, S6, S14, S20) belong to UP2 and not UP1
    assert "S14" not in up1_lines, "Line S14 is in UP2, must NOT appear under UP1!"
    assert "S14" in up2_lines, "Line S14 must appear under UP2!"

    print("====================================================")
    print("[RESULT] VERIFICATION PASSED: Area -> Line filter linkage working dynamically!")
    print("====================================================")

if __name__ == "__main__":
    test_area_line_filter_linkage()
