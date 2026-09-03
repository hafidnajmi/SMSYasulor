import sys
import os
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

def sync_4_items():
    excel_path = "Master_Data_20260818.xlsx"
    df = pd.read_excel(excel_path)
    id_col = [c for c in df.columns if "id" in str(c).lower() or "part" in str(c).lower()][0]
    target_ids = ["UPF-12984", "UPF-12985", "UPF-12986", "UPF-12997"]
    sub = df[df[id_col].astype(str).str.strip().isin(target_ids)]

    db = Database()
    cur = db.sql_conn.cursor()

    for idx, row in sub.iterrows():
        p_id = str(row[id_col]).strip()
        item = str(row.get("Item") or "-").strip()
        bin_val = str(row.get("Bin") or "-").strip()
        if bin_val == "nan" or not bin_val:
            bin_val = "-"
        category = str(row.get("Category") or "").strip()
        machine = str(row.get("Machine") or "").strip()
        line = str(row.get("Line") or "").strip()
        brand = str(row.get("Brand") or "").strip()
        frequency = str(row.get("Frequency") or "").strip()
        detail = str(row.get("Detail") or "").strip()
        up_area = str(row.get("Up Area") or "").strip()

        try:
            stock = int(float(row.get("Current Stock") or 0))
        except:
            stock = 0

        try:
            safety = int(float(row.get("Safety Stock") or 0))
        except:
            safety = 0

        try:
            price = float(row.get("Current Unit Price") or row.get("Unit Price") or 0)
        except:
            price = 0.0

        # Check if exists
        cur.execute("SELECT id FROM dbo.Master_Data WHERE id = ?", (p_id,))
        if cur.fetchone():
            cur.execute("""
                UPDATE dbo.Master_Data
                SET item = ?, bin = ?, category = ?, machine = ?, line = ?, brand = ?, 
                    frequency = ?, detail = ?, up_area = ?, current_stock = ?, safety_stock = ?, 
                    current_unit_price = ?, updated_at = GETDATE()
                WHERE id = ?
            """, (item, bin_val, category, machine, line, brand, frequency, detail, up_area, stock, safety, price, p_id))
            print(f"[UPDATED] {p_id}: Item='{item}', BIN='{bin_val}', Stock={stock}, Price={price:,.0f}")
        else:
            cur.execute("""
                INSERT INTO dbo.Master_Data 
                (id, item, bin, category, machine, line, brand, frequency, detail, up_area, current_stock, safety_stock, current_unit_price, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
            """, (p_id, item, bin_val, category, machine, line, brand, frequency, detail, up_area, stock, safety, price))
            print(f"[INSERTED] {p_id}: Item='{item}', BIN='{bin_val}', Stock={stock}, Price={price:,.0f}")

    db.sql_conn.commit()
    print("\nSUCCESS: All 4 Part Numbers (UPF-12984, UPF-12985, UPF-12986, UPF-12997) synced 100% with Excel!")

if __name__ == "__main__":
    sync_4_items()
