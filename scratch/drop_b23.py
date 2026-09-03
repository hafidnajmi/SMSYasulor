import sys
import os

root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

from database import Database

db = Database()
cur = db.sql_conn.cursor()

# 1. Delete B23 references from Sparepart_Line_Mapping
cur.execute("SELECT id FROM dbo.master_line WHERE line_code = 'B23'")
b23_row = cur.fetchone()
if b23_row:
    b23_id = b23_row[0]
    cur.execute("DELETE FROM dbo.Sparepart_Line_Mapping WHERE line_id = ?", (b23_id,))
    print(f"Deleted Sparepart_Line_Mapping rows for line_id={b23_id}")

try:
    cur.execute("DELETE FROM dbo.Sparepart_Line_Mapping WHERE line = 'B23'")
except Exception:
    pass

# 2. Delete B23 from master_line
cur.execute("DELETE FROM dbo.master_line WHERE line_code = 'B23'")
print("Deleted B23 from master_line")

# 3. Clean B23 from Master_Data line values
cur.execute("SELECT id, line FROM dbo.Master_Data WHERE line LIKE '%B23%'")
rows = cur.fetchall()
print("Found B23 rows in Master_Data:", len(rows))
for rid, rline in rows:
    new_line = ', '.join([t.strip() for t in str(rline).split(',') if t.strip().upper() != 'B23'])
    cur.execute("UPDATE dbo.Master_Data SET line = ? WHERE id = ?", (new_line, rid))

db.sql_conn.commit()

cur.execute("SELECT COUNT(*) FROM dbo.Master_Data WHERE line LIKE '%B23%'")
print("Remaining B23 rows in Master_Data:", cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM dbo.master_line WHERE line_code = 'B23'")
print("Remaining B23 in master_line:", cur.fetchone()[0])
