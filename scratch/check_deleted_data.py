import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()

# Get list of tables
cur.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
tables = [r[0] for r in cur.fetchall()]

print("=== DAFTAR TABEL & KOLOM PENANDA (IS_DELETED / STATUS / DELETED) ===")
for t in tables:
    cur.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{t}'")
    cols = [r[0] for r in cur.fetchall()]
    deleted_cols = [c for c in cols if 'del' in c.lower() or 'status' in c.lower() or 'active' in c.lower() or 'flag' in c.lower()]
    print(f"Tabel [{t}]: {cols}")
    if deleted_cols:
        print(f"   -> Kolom status/deleted: {deleted_cols}")
