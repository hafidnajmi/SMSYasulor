import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()

cur.execute("SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Master%' OR TABLE_NAME LIKE '%Data%'")
rows = cur.fetchall()
print("=== DAFTAR TABEL SAAT INI ===")
for r in rows:
    print(f"Schema: '{r[0]}' | TableName: '{r[1]}'")
