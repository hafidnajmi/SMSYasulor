"""
test_column_perf.py - Pinpoint exact SQL Server bottleneck in Master_Data queries
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
conn = db.sql_conn
cur = conn.cursor()

queries = {
    "1. Simple SELECT TOP 35 id, bin": "SELECT TOP 35 id, bin FROM dbo.Master_Data",
    "2. Simple WITH ORDER BY bin": "SELECT TOP 35 id, bin FROM dbo.Master_Data ORDER BY bin ASC",
    "3. WITH is_deleted filter": "SELECT TOP 35 id, bin FROM dbo.Master_Data WHERE (is_deleted = 0 OR is_deleted IS NULL) ORDER BY bin ASC",
    "4. WITH ISNULL(is_deleted, 0) = 0": "SELECT TOP 35 id, bin FROM dbo.Master_Data WHERE ISNULL(is_deleted, 0) = 0 ORDER BY bin ASC",
    "5. WITH current_unit_price": "SELECT TOP 35 id, bin, current_unit_price FROM dbo.Master_Data WHERE ISNULL(is_deleted, 0) = 0 ORDER BY bin ASC",
    "6. WITH ALL COLUMNS NO WHERE": "SELECT TOP 35 id, bin, item, detail, line, qty_need_year, safety_stock, current_stock, current_unit_price, brand FROM dbo.Master_Data ORDER BY bin ASC",
    "7. WITH ALL COLUMNS AND WHERE": "SELECT TOP 35 id, bin, item, detail, line, qty_need_year, safety_stock, current_stock, current_unit_price, brand FROM dbo.Master_Data WHERE (is_deleted = 0 OR is_deleted IS NULL) ORDER BY bin ASC",
}

for name, q in queries.items():
    t0 = time.perf_counter()
    cur.execute(q)
    rows = cur.fetchall()
    elapsed = (time.perf_counter() - t0) * 1000
    print(f"{name} -> {elapsed:.2f} ms ({len(rows)} rows)")

print("Pinpoint finished!")
