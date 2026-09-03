import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()

# Query deleted items in Master_Data
cur.execute("""
    SELECT id, bin, item, brand, is_deleted, deleted_at, updated_at
    FROM [dbo.Master_Data]
    WHERE is_deleted = 1 OR is_deleted = 'true' OR is_deleted = '1'
""")
deleted_items = cur.fetchall()
print(f"Total Master Data yang terhapus (is_deleted = 1): {len(deleted_items)}")
for r in deleted_items[:10]:
    print(f"  ID: {r[0]} | BIN: {r[1]} | Item: {r[2]} | Deleted At: {r[5]}")

# Query Audit_Log for DELETE actions
cur.execute("""
    SELECT TOP 10 id, action, table_name, record_id, changed_by, changed_at, old_value
    FROM Audit_Log
    WHERE action LIKE '%DELETE%' OR action LIKE '%HAPUS%'
    ORDER BY id DESC
""")
audit_deletes = cur.fetchall()
print(f"\nTotal Audit Log Delete: {len(audit_deletes)}")
for a in audit_deletes:
    print(f"  Audit ID: {a[0]} | Action: {a[1]} | Table: {a[2]} | Record: {a[3]} | By: {a[4]} | At: {a[5]}")
