import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()

print("=== dbo.Users columns ===")
cur.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' ORDER BY ORDINAL_POSITION")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

print()
print("=== dbo.Electrical_Parts columns ===")
cur.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Electrical_Parts' ORDER BY ORDINAL_POSITION")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

print()
print("=== dbo.Barang_Keluar columns ===")
cur.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Barang_Keluar' ORDER BY ORDINAL_POSITION")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

print()
print("=== All tables in DB ===")
cur.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")
for row in cur.fetchall():
    print(f"  {row[0]}")

print()
print("=== Users data ===")
cur.execute("SELECT id, username, full_name, role, can_electrical_parts, can_barang_keluar, can_master_data FROM dbo.Users")
for row in cur.fetchall():
    print(f"  id={row[0]}, user={row[1]}, role={row[3]}, can_elec={row[4]}, can_bk={row[5]}, can_md={row[6]}")
