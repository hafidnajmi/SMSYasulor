import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()
cur.execute("SELECT id, is_deleted FROM dbo.Master_Data WHERE id IN ('UPF-12984', 'UPF-12985', 'UPF-12986', 'UPF-12997')")
for r in cur.fetchall():
    print(f"  {r[0]}: is_deleted={r[1]}")
