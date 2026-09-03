import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()

try:
    print("Mencoba rename tabel 'dbo.Master_Data' menjadi 'Master_Data'...")
    cur.execute("EXEC sp_rename 'dbo.[dbo.Master_Data]', 'Master_Data'")
    db.sql_conn.commit()
    print("[OK] Berhasil rename tabel menjadi 'Master_Data'!")
except Exception as ex:
    print(f"[ERROR] Rename gagal: {ex}")

# Re-check table names
cur.execute("SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Master%' OR TABLE_NAME LIKE '%Data%'")
rows = cur.fetchall()
print("\n=== DAFTAR TABEL SETELAH RENAME ===")
for r in rows:
    print(f"Schema: '{r[0]}' | TableName: '{r[1]}'")
