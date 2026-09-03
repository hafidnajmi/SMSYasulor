import sys
import os
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

def audit_comparison():
    excel_path = "Master_Data_20260818.xlsx"
    if not os.path.exists(excel_path):
        print(f"[ERROR] File {excel_path} tidak ditemukan.")
        return

    df = pd.read_excel(excel_path)
    
    # Identify ID column
    id_col = None
    for c in df.columns:
        if str(c).strip().lower() in ["id", "part_number", "part number", "partnumber"]:
            id_col = c
            break

    if not id_col:
        print("[ERROR] Kolom ID / Part Number tidak ditemukan di Excel.")
        return

    excel_pnums = set(str(val).strip() for val in df[id_col].dropna() if str(val).strip() != "")
    
    db = Database()
    if not db.sql_conn:
        print("[ERROR] Cannot connect to DB")
        return

    cur = db.sql_conn.cursor()

    # DB Master Data part numbers
    cur.execute("SELECT id FROM dbo.Master_Data WHERE is_deleted = 0 OR is_deleted IS NULL")
    db_master_pnums = set(r[0].strip() for r in cur.fetchall() if r[0])

    # DB Electrical Parts part numbers
    cur.execute("SELECT part_number FROM dbo.Electrical_Parts")
    db_elec_pnums = set(r[0].strip() for r in cur.fetchall() if r[0])

    db_all_pnums = db_master_pnums.union(db_elec_pnums)

    # Comparisons
    in_excel_not_in_db = sorted(list(excel_pnums - db_all_pnums))
    in_db_not_in_excel = sorted(list(db_master_pnums - excel_pnums))
    in_elec_not_in_excel = sorted(list(db_elec_pnums - excel_pnums))

    # QTY Discrepancy Check (compare Excel current stock vs DB current stock)
    qty_col = None
    for c in df.columns:
        if str(c).strip().lower() in ["current stock", "current_stock", "qty", "stok", "stock"]:
            qty_col = c
            break

    qty_mismatches = []
    if qty_col:
        for idx, row in df.iterrows():
            pid = str(row.get(id_col) or "").strip()
            if not pid or pid not in db_master_pnums:
                continue
            try:
                ex_qty = float(row.get(qty_col) or 0)
            except:
                ex_qty = 0.0

            cur.execute("SELECT current_stock FROM dbo.Master_Data WHERE id = ?", (pid,))
            db_qty = float(cur.fetchone()[0] or 0)

            if abs(ex_qty - db_qty) > 0.001:
                qty_mismatches.append((pid, ex_qty, db_qty))

    print("=" * 60)
    print("AUDIT PERBANDINGAN PART NUMBER (EXCEL VS DATABASE)")
    print("=" * 60)
    print(f"Total Part Number di File Excel           : {len(excel_pnums)}")
    print(f"Total Part Number di DB (Master_Data)     : {len(db_master_pnums)}")
    print(f"Total Part Number di DB (Electrical_Parts): {len(db_elec_pnums)}")
    print("-" * 60)
    print(f"1. ADA di Excel tetapi TIDAK ADA di Database: {len(in_excel_not_in_db)}")
    if in_excel_not_in_db:
        print(f"   Daftar: {in_excel_not_in_db}")
    print("-" * 60)
    print(f"2. ADA di DB (Master_Data) tetapi TIDAK ADA di Excel: {len(in_db_not_in_excel)}")
    if in_db_not_in_excel:
        print(f"   Daftar: {in_db_not_in_excel}")
    print("-" * 60)
    print(f"3. Ketidakcocokan QTY (Excel vs DB setelah migrasi): {len(qty_mismatches)}")
    if qty_mismatches:
        print(f"   Daftar beda QTY: {qty_mismatches[:10]}")

if __name__ == "__main__":
    audit_comparison()
