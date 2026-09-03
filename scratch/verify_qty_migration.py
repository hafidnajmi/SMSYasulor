import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()

cur.execute("SELECT TOP 5 id, bin, item, current_stock, updated_at FROM dbo.Master_Data WHERE updated_at >= CAST(GETDATE() AS DATE) ORDER BY updated_at DESC")
rows = cur.fetchall()

print("Sample updated records in dbo.Master_Data:")
for r in rows:
    print(f"  ID={r[0]}, BIN={r[1]}, Item={r[2]}, Current_Stock={r[3]}, Updated_At={r[4]}")
