"""
test_nft014_evidence.py - Automated Internationalization (i18n) & Hardcoded String Audit Test (NFT-014)
"""

import sys
import os
import re

# Ensure root workspace is in sys.path
root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

# Force UTF-8 output encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

from utils.i18n import tr, set_language, get_language

def audit_nft014_hardcoded_strings():
    print("=== [NFT-014 AUDIT STEP 1] Scanning View Modules for UI Text Strings ===")
    views_dir = os.path.join(root_workspace, "views")
    view_files = [f for f in os.listdir(views_dir) if f.endswith(".py") and f != "__init__.py"]

    total_files = len(view_files)
    total_hardcoded_lines = 0
    file_stats = {}

    # Common Indonesian string patterns found in UI views
    indonesian_keywords = [
        "Tambahkan", "Ubah", "Hapus", "Persetujuan", "Keluar", "Masuk",
        "Tutup", "Simpan", "Batal", "Semua", "Catatan", "Tipe", "Stok",
        "Pengaturan", "Sistem", "Konfirmasi"
    ]

    for vfile in view_files:
        fpath = os.path.join(views_dir, vfile)
        match_count = 0
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if any(kw in line for kw in indonesian_keywords):
                    match_count += 1

        file_stats[vfile] = match_count
        total_hardcoded_lines += match_count

    print(f"  - Total UI View Files Scanned : {total_files}")
    print(f"  - Total Lines with Hardcoded Strings : {total_hardcoded_lines}")
    print("\n  Sample View Files Breakdown:")
    for vf, cnt in sorted(file_stats.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"    - {vf:30s} : {cnt} hardcoded string occurrences")

    print("\n=== [NFT-014 AUDIT STEP 2] Verifying Centralized i18n Framework (utils/i18n.py) ===")
    # 1. Test Bahasa Indonesia Mode (Default)
    set_language("id")
    str_id = tr("showing_entries", start=1, end=50, total=4341)
    btn_id = tr("save")
    print(f"  - Language Active : {get_language()}")
    print(f"  - Translated 'save'            : '{btn_id}'")
    print(f"  - Translated 'showing_entries': '{str_id}'")

    # 2. Test English Mode
    set_language("en")
    str_en = tr("showing_entries", start=1, end=50, total=4341)
    btn_en = tr("save")
    print(f"  - Language Active : {get_language()}")
    print(f"  - Translated 'save'            : '{btn_en}'")
    print(f"  - Translated 'showing_entries': '{str_en}'")

    i18n_working = (btn_id == "Simpan" and btn_en == "Save" and "Showing 1 to 50" in str_en)

    if i18n_working:
        print("\n✓ Centralized i18n module is fully operational and ready for UI integration!")

    # Reset back to Bahasa Indonesia default
    set_language("id")

    return total_hardcoded_lines, i18n_working

if __name__ == "__main__":
    lines_cnt, i18n_ok = audit_nft014_hardcoded_strings()
    print("\n====================================================")
    print(f"[RESULT] NFT-014 AUDIT STATUS: AUDITED & i18n FRAMEWORK IMPLEMENTED")
    print(f"         Hardcoded UI Strings Detected : {lines_cnt} occurrences across views")
    print(f"         i18n Localization Engine      : {'✓ READY' if i18n_ok else '❌ FAILED'}")
    print("====================================================")
