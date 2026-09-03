import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()
cur.execute("SELECT id, up_area, line, bin, category, frequency, machine, item, detail, brand, budget_code, qty_line, tbm_per_month, lt_per_month, qty_need_year, safety_stock, current_stock, current_unit_price FROM dbo.Master_Data WHERE id = 'UPF-12984'")
r = cur.fetchone()
cols = ["id", "up_area", "line", "bin", "category", "frequency", "machine", "item", "detail", "brand", "budget_code", "qty_line", "tbm_per_month", "lt_per_month", "qty_need_year", "safety_stock", "current_stock", "current_unit_price"]

print("=== VERIFICATION OF UPF-12984 ===")
for c, v in zip(cols, r):
    print(f"  {c:<20}: {v}")
