import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

db = Database()
cur = db.sql_conn.cursor()

tables = [
    "App_Settings", "Audit_Log", "Barang_Keluar", "Barang_Masuk", "Bidding_History",
    "Electrical_Parts", "Email_Draft", "Email_Supplier_Log", "EXCHANGE_RATES",
    "Machine_Line", "Machine_Master", "Master_Data", "Master_Line", "Schema_Version",
    "Sparepart_Line_Mapping", "Sparepart_Machine_Usage", "Sparepart_Price_History",
    "Supplier", "Supplier_Offer", "Users"
]

print("=== TABLE ROW COUNTS AND USAGE CHECK ===")
for tbl in tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM dbo.[{tbl}]")
        cnt = cur.fetchone()[0]
        print(f"{tbl:<25}: {cnt} rows")
    except Exception as ex:
        print(f"{tbl:<25}: ERROR ({ex})")
