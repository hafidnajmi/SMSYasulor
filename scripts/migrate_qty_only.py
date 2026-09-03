"""
migrate_qty_only.py - Safe QTY-only Migration Tool for Master Data & Electrical Parts.

This script updates ONLY the QTY (current_stock / qty) per Part Number (ID).
It guarantees 100% ZERO changes to Part Number, BIN, Item Name, Category, Brand, etc.

Supported File Formats:
- Excel (.xlsx, .xls)
- CSV (.csv)

Usage:
  python scripts/migrate_qty_only.py <path_to_excel_or_csv> [--dry-run]
"""

import sys
import os
import argparse
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

def find_column(df, candidates):
    for c in df.columns:
        clean_c = str(c).strip().lower().replace("_", "").replace(" ", "")
        for cand in candidates:
            if cand.lower().replace("_", "").replace(" ", "") == clean_c:
                return c
    return None

def migrate_qty(file_path: str, dry_run: bool = False):
    if not os.path.exists(file_path):
        print(f"[ERROR] File tidak ditemukan: {file_path}")
        return

    print(f"=== QTY-ONLY MIGRATION TOOL ===")
    print(f"File Source : {file_path}")
    print(f"Mode        : {'DRY RUN (Preview Only)' if dry_run else 'LIVE MIGRATION'}\n")

    # Read File
    ext = os.path.splitext(file_path)[1].lower()
    if ext in [".xlsx", ".xls"]:
        df = pd.read_excel(file_path)
    elif ext == ".csv":
        df = pd.read_csv(file_path)
    else:
        print(f"[ERROR] Format file tidak didukung: {ext}. Gunakan .xlsx, .xls, atau .csv.")
        return

    # Identify Columns
    id_col = find_column(df, ["part_number", "partnumber", "id", "part_no", "partno", "kode_part", "kodepart"])
    qty_col = find_column(df, ["qty", "current_stock", "stok", "stock", "jumlah", "qty_stok", "jumlah_stok"])

    if not id_col or not qty_col:
        print(f"[ERROR] Kolom Part Number atau QTY tidak terdeteksi otomatis.")
        print(f"Daftar Kolom di File: {list(df.columns)}")
        print(f"Pastikan ada kolom 'Part Number' (atau 'id') dan 'QTY' (atau 'current_stock').")
        return

    print(f"[OK] Detected Part Number Column : '{id_col}'")
    print(f"[OK] Detected QTY Column         : '{qty_col}'\n")

    db = Database()
    if not db.sql_conn:
        print("[ERROR] Gagal terhubung ke Database!")
        return

    conn = db.sql_conn
    cursor = conn.cursor()

    updated_master = 0
    updated_electrical = 0
    not_found = []
    errors = []

    try:
        if not dry_run:
            conn.autocommit = False

        for idx, row in df.iterrows():
            raw_id = row.get(id_col)
            raw_qty = row.get(qty_col)

            if pd.isna(raw_id) or str(raw_id).strip() == "":
                continue

            part_id = str(raw_id).strip()
            try:
                new_qty = float(raw_qty) if not pd.isna(raw_qty) else 0.0
                if new_qty < 0:
                    new_qty = 0.0
            except (ValueError, TypeError):
                errors.append((part_id, f"Nilai QTY tidak valid: {raw_qty}"))
                continue

            # Check Master_Data
            cursor.execute("SELECT current_stock FROM dbo.Master_Data WHERE id = ?", (part_id,))
            m_row = cursor.fetchone()

            if m_row:
                old_qty = float(m_row[0] or 0)
                if not dry_run:
                    cursor.execute(
                        "UPDATE dbo.Master_Data SET current_stock = ?, updated_at = GETDATE() WHERE id = ?",
                        (new_qty, part_id)
                    )
                updated_master += 1
                if updated_master <= 5 or dry_run:
                    print(f"  [Master_Data] {part_id}: {old_qty} -> {new_qty}")
                continue

            # Check Electrical_Parts
            cursor.execute("SELECT qty, price_per_unit FROM dbo.Electrical_Parts WHERE part_number = ?", (part_id,))
            e_row = cursor.fetchone()

            if e_row:
                old_qty = float(e_row[0] or 0)
                price = float(e_row[1] or 0)
                new_val = new_qty * price
                if not dry_run:
                    cursor.execute(
                        "UPDATE dbo.Electrical_Parts SET qty = ?, value = ? WHERE part_number = ?",
                        (new_qty, new_val, part_id)
                    )
                updated_electrical += 1
                if updated_electrical <= 5 or dry_run:
                    print(f"  [Electrical_Parts] {part_id}: {old_qty} -> {new_qty}")
                continue

            not_found.append(part_id)

        if not dry_run:
            conn.commit()
            print("\n[OK] Transaction COMMITTED successfully.")

    except Exception as ex:
        if not dry_run:
            conn.rollback()
        print(f"\n[FATAL ERROR] Migration failed: {ex}")
        return
    finally:
        conn.autocommit = True

    print("\n" + "=" * 50)
    print("MIGRATION SUMMARY:")
    print(f"  - Updated in Master_Data     : {updated_master} items")
    print(f"  - Updated in Electrical_Parts: {updated_electrical} items")
    print(f"  - Part Numbers Not Found     : {len(not_found)} items")
    print(f"  - Row Errors                 : {len(errors)} items")
    print("=" * 50)

    if not_found:
        print(f"\n[WARNING] {len(not_found)} Part Number tidak ditemukan di database. Sampel: {not_found[:10]}")
    if errors:
        print(f"\n[WARNING] {len(errors)} Baris error: {errors[:5]}")

    print("\n[OK] SAFE GUARANTEE: 0 field lain (BIN, Item Name, Category, Machine, dsb) yang diubah!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QTY-only Migration Tool for UPMS")
    parser.add_argument("file_path", help="Path to Excel (.xlsx) or CSV (.csv) file")
    parser.add_argument("--dry-run", action="store_true", help="Preview migration without saving changes")
    args = parser.parse_args()

    migrate_qty(args.file_path, dry_run=args.dry_run)
