import sys
import os
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

def insert_missing_parts():
    excel_path = "Master_Data_20260818.xlsx"
    if not os.path.exists(excel_path):
        print(f"File {excel_path} not found")
        return

    df = pd.read_excel(excel_path)
    id_col = [c for c in df.columns if "id" in str(c).lower() or "part" in str(c).lower()][0]
    target_ids = ["UPF-12984", "UPF-12985", "UPF-12986", "UPF-12997"]
    filtered_df = df[df[id_col].astype(str).str.strip().isin(target_ids)]

    db = Database()
    if not db.sql_conn:
        print("Cannot connect to DB")
        return

    cur = db.sql_conn.cursor()

    # Get column mapping from Master_Data table schema
    cur.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Master_Data'")
    db_cols = set(r[0] for r in cur.fetchall())

    inserted_count = 0
    for idx, row in filtered_df.iterrows():
        p_id = str(row[id_col]).strip()
        
        # Check if already exists in Master_Data
        cur.execute("SELECT id FROM dbo.Master_Data WHERE id = ?", (p_id,))
        if cur.fetchone():
            print(f"Item {p_id} already exists in DB.")
            continue

        data_dict = {"id": p_id}
        for col in df.columns:
            clean_col = str(col).strip().lower().replace(" ", "_")
            val = row[col]
            if pd.isna(val):
                val = None

            db_col_name = None
            if clean_col in ["id", "part_number", "partnumber"]:
                db_col_name = "id"
            elif clean_col in ["bin", "location", "bin_location"]:
                db_col_name = "bin"
            elif clean_col in ["item", "item_name", "items", "nama_barang"]:
                db_col_name = "item"
            elif clean_col in ["category", "kategori"]:
                db_col_name = "category"
            elif clean_col in ["machine", "mesin"]:
                db_col_name = "machine"
            elif clean_col in ["line", "lini"]:
                db_col_name = "line"
            elif clean_col in ["up_area", "uparea", "area"]:
                db_col_name = "up_area"
            elif clean_col in ["current_stock", "qty", "stok"]:
                db_col_name = "current_stock"
            elif clean_col in ["safety_stock", "safety"]:
                db_col_name = "safety_stock"
            elif clean_col in ["current_unit_price", "unit_price", "price"]:
                db_col_name = "current_unit_price"
            elif clean_col in ["brand", "merk"]:
                db_col_name = "brand"
            elif clean_col in ["frequency", "frekuensi"]:
                db_col_name = "frequency"
            elif clean_col in ["detail"]:
                db_col_name = "detail"

            if db_col_name and db_col_name in db_cols and db_col_name != "id":
                data_dict[db_col_name] = val

        # Default bin to '-' if missing
        if not data_dict.get("bin"):
            data_dict["bin"] = "-"
        if not data_dict.get("current_stock"):
            data_dict["current_stock"] = 0.0

        cols = list(data_dict.keys())
        vals = [data_dict[c] for c in cols]
        placeholders = ", ".join(["?"] * len(cols))
        col_str = ", ".join(cols)

        sql = f"INSERT INTO dbo.Master_Data ({col_str}) VALUES ({placeholders})"
        cur.execute(sql, vals)
        inserted_count += 1
        print(f"[OK] Inserted {p_id}: Item='{data_dict.get('item')}', BIN='{data_dict.get('bin')}', QTY={data_dict.get('current_stock')}")

    db.sql_conn.commit()
    print(f"\nSUCCESS: Successfully inserted {inserted_count} missing Part Numbers into dbo.Master_Data!")

if __name__ == "__main__":
    insert_missing_parts()
