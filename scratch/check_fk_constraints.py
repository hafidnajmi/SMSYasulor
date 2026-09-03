import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()

cur.execute("""
SELECT 
    fk.name AS fk_name,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS col,
    OBJECT_NAME(fkc.referenced_object_id) AS ref_table,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS ref_col
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
WHERE OBJECT_NAME(fk.parent_object_id) = 'Barang_Keluar'
""")
rows = cur.fetchall()
print("FK constraints on dbo.Barang_Keluar:")
for r in rows:
    print(f"  {r[0]}: col={r[1]} -> {r[2]}.{r[3]}")
