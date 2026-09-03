import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database
db = Database()
cur = db.sql_conn.cursor()
cur.execute("SELECT fk.name, col.name FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id JOIN sys.columns col ON fkc.parent_object_id = col.object_id AND fkc.parent_column_id = col.column_id WHERE OBJECT_NAME(fk.parent_object_id) = 'Barang_Keluar'")
print("FKs ON Barang_Keluar:", cur.fetchall())
