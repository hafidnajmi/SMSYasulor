import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()

query = """
SELECT id AS [Part Number], bin AS [BIN], item AS [Nama Item], brand AS [Brand], current_stock AS [Stok], deleted_at AS [Waktu Dihapus], is_deleted AS [Delete]
FROM dbo.Master_Data
WHERE is_deleted = 1
ORDER BY deleted_at DESC;
"""

cur.execute(query)
rows = cur.fetchall()
print(f"[OK] Query berhasil dieksekusi! Ditemukan {len(rows)} data terhapus.")
