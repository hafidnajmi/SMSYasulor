"""
profile_picker_details.py - Micro-profiler for get_master_data_fast_picker
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

db = Database()

print("--- START MICRO PROFILE ---")
t0 = time.perf_counter()
conn = db.sql_conn
t1 = time.perf_counter()
print(f"[1] db.sql_conn took {(t1-t0)*1000:.2f} ms")

cur = conn.cursor()
t2 = time.perf_counter()
print(f"[2] conn.cursor() took {(t2-t1)*1000:.2f} ms")

query = """
    SELECT TOP 35 id, bin, item, detail, line, 
           ISNULL(qty_need_year, 0) as qty_need_year,
           ISNULL(safety_stock, 0) as safety_stock,
           ISNULL(current_stock, 0) as current_stock,
           ISNULL(current_unit_price, 0) as current_unit_price,
           ISNULL(brand, '') as brand
    FROM dbo.Master_Data
    WHERE (is_deleted = 0 OR is_deleted IS NULL)
    ORDER BY bin ASC
"""

cur.execute(query)
t3 = time.perf_counter()
print(f"[3] cur.execute(query) took {(t3-t2)*1000:.2f} ms")

rows = cur.fetchall()
t4 = time.perf_counter()
print(f"[4] cur.fetchall() returned {len(rows)} rows in {(t4-t3)*1000:.2f} ms")

res = Database._sql_rows_to_dicts(cur)
t5 = time.perf_counter()
print(f"[5] _sql_rows_to_dicts took {(t5-t4)*1000:.2f} ms")

print("--- MICRO PROFILE FINISHED ---")
