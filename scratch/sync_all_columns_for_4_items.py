import sys
import os
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

def sync_all_cols():
    excel_path = "Master_Data_20260818.xlsx"
    df = pd.read_excel(excel_path)
    id_col = [c for c in df.columns if "id" in str(c).lower() or "part" in str(c).lower()][0]
    target_ids = ["UPF-12984", "UPF-12985", "UPF-12986", "UPF-12997"]
    sub = df[df[id_col].astype(str).str.strip().isin(target_ids)]

    db = Database()
    cur = db.sql_conn.cursor()

    cur.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Master_Data'")
    col_types = {r[0].lower(): r[1].lower() for r in cur.fetchall()}

    for idx, row in sub.iterrows():
        p_id = str(row[id_col]).strip()
        
        # Build dictionary for all DB columns
        update_dict = {}
        for col in df.columns:
            clean_col = str(col).strip().lower().replace(" ", "_")
            val = row[col]
            if pd.isna(val):
                val = None

            # Map Excel column names to DB column names
            db_col = None
            if clean_col in ["id", "part_number", "partnumber"]:
                db_col = "id"
            elif clean_col in ["bin", "location", "bin_location"]:
                db_col = "bin"
            elif clean_col in ["item", "item_name", "items", "nama_barang"]:
                db_col = "item"
            elif clean_col in ["category", "kategori"]:
                db_col = "category"
            elif clean_col in ["machine", "mesin"]:
                db_col = "machine"
            elif clean_col in ["line", "lini"]:
                db_col = "line"
            elif clean_col in ["up_area", "uparea", "area"]:
                db_col = "up_area"
            elif clean_col in ["current_stock", "qty", "stok"]:
                db_col = "current_stock"
            elif clean_col in ["safety_stock", "safety"]:
                db_col = "safety_stock"
            elif clean_col in ["current_unit_price", "unit_price", "price"]:
                db_col = "current_unit_price"
            elif clean_col in ["brand", "merk"]:
                db_col = "brand"
            elif clean_col in ["frequency", "frekuensi"]:
                db_col = "frequency"
            elif clean_col in ["detail"]:
                db_col = "detail"
            elif clean_col in ["qty_line"]:
                db_col = "qty_line"
            elif clean_col in ["tbm_per_month", "tbm_month", "tbm"]:
                db_col = "tbm_per_month"
            elif clean_col in ["lt_per_month", "lt_month", "lt"]:
                db_col = "lt_per_month"
            elif clean_col in ["qty_need_year", "need_yr", "need_year"]:
                db_col = "qty_need_year"
            elif clean_col in ["budget_code", "budget"]:
                db_col = "budget_code"
            elif clean_col in ["currency"]:
                db_col = "currency"

            if db_col and db_col in col_types and db_col != "id":
                # Convert data type
                t = col_types[db_col]
                if val is not None:
                    if t == "int":
                        val = int(float(val))
                    elif t in ["float", "decimal"]:
                        val = float(val)
                    elif t == "nvarchar":
                        val = str(val).strip()
                elif db_col == "bin":
                    val = "-"
                
                update_dict[db_col] = val

        # Add updated_at
        update_dict["updated_at"] = pd.Timestamp.now()

        set_clauses = [f"{k} = ?" for k in update_dict.keys()]
        set_str = ", ".join(set_clauses)
        vals = list(update_dict.values()) + [p_id]

        sql = f"UPDATE dbo.Master_Data SET {set_str} WHERE id = ?"
        cur.execute(sql, vals)
        print(f"[OK] Updated all columns for {p_id}: {update_dict}")

    db.sql_conn.commit()
    print("\nSUCCESS: All columns for UPF-12984, UPF-12985, UPF-12986, UPF-12997 updated 100% with Excel!")

if __name__ == "__main__":
    sync_all_cols()
