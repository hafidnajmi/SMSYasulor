import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pyodbc
from database import Database

def run_rename():
    db = Database()
    conn = db.sql_conn
    if not conn:
        print("Could not connect to database")
        return
    
    renames = [
        ("electrical_parts", "Electrical_Parts"),
        ("machine_line", "Machine_Line"),
        ("master_line", "Master_Line"),
        ("sparepart_line_mapping", "Sparepart_Line_Mapping"),
        ("SPAREPART_PRICE_HISTORY", "Sparepart_Price_History"),
    ]
    
    cursor = conn.cursor()
    for old_name, new_name in renames:
        try:
            sql = f"""
            IF EXISTS (
                SELECT 1 FROM sys.tables 
                WHERE name = '{old_name}' COLLATE Latin1_General_CS_AS
            )
            BEGIN
                EXEC sp_rename 'dbo.[{old_name}]', '{new_name}';
            END
            """
            cursor.execute(sql)
            conn.commit()
            print(f"[RENAME SUCCESS] {old_name} -> {new_name}")
        except Exception as ex:
            print(f"[RENAME ERROR] {old_name} -> {new_name}: {ex}")

if __name__ == "__main__":
    run_rename()
