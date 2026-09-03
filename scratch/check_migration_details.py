import sys
import os
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

def check_migration_details():
    excel_path = "Master_Data_20260818.xlsx"
    if not os.path.exists(excel_path):
        print(f"File {excel_path} not found")
        return

    df = pd.read_excel(excel_path)
    id_col = next((c for c in df.columns if str(c).strip().lower() in ["id", "part_number", "part number"]), None)
    qty_col = next((c for c in df.columns if str(c).strip().lower() in ["current stock", "current_stock", "qty", "stok", "stock"]), None)

    db = Database()
    cur = db.sql_conn.cursor()

    cur.execute("SELECT COUNT(*) FROM dbo.Master_Data WHERE is_deleted = 0 OR is_deleted IS NULL")
    total_master_data = cur.fetchone()[0]

    # Check updated_at timestamp from the migration (around 14:02:17 today)
    cur.execute("SELECT COUNT(*) FROM dbo.Master_Data WHERE updated_at >= '2026-08-18 14:00:00'")
    updated_in_migration = cur.fetchone()[0]

    print(f"Total Part Number di Database (Master_Data) : {total_master_data}")
    print(f"Total Part Number di File Excel             : {len(df)}")
    print(f"Total Part Number yang diproses & di-update : {updated_in_migration}")

if __name__ == "__main__":
    check_migration_details()
