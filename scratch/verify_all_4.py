import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()

ids = ["UPF-12984", "UPF-12985", "UPF-12986", "UPF-12997"]

print("=== VERIFYING 4 PART NUMBERS IN DATABASE ===")
for p_id in ids:
    cur.execute("SELECT id, bin, item, category, current_stock, current_unit_price FROM dbo.Master_Data WHERE id = ?", (p_id,))
    r = cur.fetchone()
    if r:
        print(f"  [Master_Data] ID={r[0]} | BIN={r[1]} | Item={r[2]} | Category={r[3]} | Stock={r[4]} | Price={r[5]}")
    else:
        cur.execute("SELECT part_number, place, items, qty, price_per_unit FROM dbo.Electrical_Parts WHERE part_number = ?", (p_id,))
        e = cur.fetchone()
        if e:
            print(f"  [Electrical_Parts] ID={e[0]} | Place={e[1]} | Item={e[2]} | Qty={e[3]} | Price={e[4]}")
        else:
            print(f"  [NOT FOUND] ID={p_id}")
