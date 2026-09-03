"""
profile_dialog.py - Line-by-line profiler for _make_bidding_dialog
"""

import sys
import os
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

from database import Database
import flet as ft

t0 = time.perf_counter()
print("[STEP 1] Connecting to Database()...")
db = Database()
print(f"-> Database() initialized in {(time.perf_counter()-t0)*1000:.2f} ms")

t1 = time.perf_counter()
print("[STEP 2] Calling db.get_master_data_fast_picker(limit=35)...")
parts = db.get_master_data_fast_picker(limit=35)
print(f"-> db.get_master_data_fast_picker returned {len(parts)} items in {(time.perf_counter()-t1)*1000:.2f} ms")

t2 = time.perf_counter()
print("[STEP 3] Testing pyodbc cursor SELECT TOP 35...")
if db.sql_conn:
    with db.sql_conn.cursor() as cur:
        cur.execute("SELECT TOP 35 id, bin, item FROM dbo.Master_Data")
        res = cur.fetchall()
print(f"-> Raw SQL query returned in {(time.perf_counter()-t2)*1000:.2f} ms")

print("Profile finished!")
