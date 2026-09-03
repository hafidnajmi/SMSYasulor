import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()

cur.execute("""
    SELECT id, bin, item, brand, current_stock, deleted_at
    FROM [dbo.Master_Data]
    WHERE is_deleted = 1
    ORDER BY id
""")
rows = cur.fetchall()
print(f"=== TOTAL DATA MASTER TERHAPUS (is_deleted = 1): {len(rows)} ===")
for r in rows:
    print(f"ID: {r[0]:<10} | BIN: {str(r[1]):<12} | Item: {str(r[2]):<35} | Brand: {str(r[3]):<15} | Stock: {r[4]} | Waktu Hapus: {r[5]}")
