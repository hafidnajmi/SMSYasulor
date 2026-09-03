"""
test_ft025.py - Automated Execution Script for Test Case FT-025
(Duplicate Line Mapping Prevention Test)
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import Database

def run_test():
    print("=" * 60)
    print(" EXECUTION OF TEST CASE FT-025: DUPLICATE LINE MAPPING TEST")
    print("=" * 60)

    db = Database()
    if not db.sql_conn:
        print("[FAIL] Database connection could not be established.")
        return

    cur = db.sql_conn.cursor()

    # Inspect Columns of sparepart_line_mapping
    cur.execute("""
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'sparepart_line_mapping'
    """)
    cols = cur.fetchall()
    print("\n[DB SCHEMA] Columns in dbo.sparepart_line_mapping:")
    for c in cols:
        print(f"  - {c[0]} ({c[1]})")

    # Fetch active sparepart and line
    cur.execute("SELECT TOP 1 id, item FROM dbo.Master_Data WHERE is_deleted = 0")
    sp = cur.fetchone()
    
    cur.execute("SELECT TOP 1 id, line_code FROM dbo.master_line")
    line = cur.fetchone()

    if not sp or not line:
        print("[FAIL] Could not fetch sample sparepart or line.")
        return

    sp_id, sp_item = sp[0], sp[1]
    line_id, line_code = line[0], line[1]

    print(f"\n[SETUP] Selected Sparepart : {sp_id} ({sp_item})")
    print(f"[SETUP] Target Line        : ID {line_id} ({line_code})")

    # Clean up existing test mapping
    cur.execute("DELETE FROM dbo.sparepart_line_mapping WHERE sparepart_id = ? AND line_id = ?", (sp_id, line_id))
    db.sql_conn.commit()

    # STEP 1: Insert initial mapping
    print("\n--- STEP 1: Inserting initial line mapping ---")
    try:
        cur.execute("""
            INSERT INTO dbo.sparepart_line_mapping 
            (sparepart_id, line_id, mapping_source, confidence_score, approved, is_active) 
            VALUES (?, ?, 'MANUAL_TEST', 1.0, 1, 1)
        """, (sp_id, line_id))
        db.sql_conn.commit()
        print(f"[SUCCESS] Step 1 Passed: Sparepart {sp_id} mapped to line {line_code} (Line ID: {line_id}).")
    except Exception as ex:
        print(f"[FAIL] Step 1 Failed: {ex}")
        return

    # STEP 2: Insert duplicate mapping
    print("\n--- STEP 2: Attempting duplicate line mapping ---")
    duplicate_blocked = False
    error_message = ""
    try:
        cur.execute("""
            INSERT INTO dbo.sparepart_line_mapping 
            (sparepart_id, line_id, mapping_source, confidence_score, approved, is_active) 
            VALUES (?, ?, 'MANUAL_TEST', 1.0, 1, 1)
        """, (sp_id, line_id))
        db.sql_conn.commit()
        print("[FAIL] Step 2 Failed: Duplicate mapping was allowed without error!")
    except Exception as ex:
        db.sql_conn.rollback()
        duplicate_blocked = True
        error_message = str(ex)
        print(f"[BLOCKED OK] Step 2 Intercepted: SQL Server rejected duplicate entry!")
        print(f"[SQL ERROR LOG]: {error_message.strip()}")

    # Cleanup
    cur.execute("DELETE FROM dbo.sparepart_line_mapping WHERE sparepart_id = ? AND line_id = ?", (sp_id, line_id))
    db.sql_conn.commit()

    print("\n" + "=" * 60)
    if duplicate_blocked:
        print(" VERDICT: PASSED [FT-025] - Duplicate line mapping successfully rejected.")
    else:
        print(" VERDICT: FAILED [FT-025] - Constraint check failed.")
    print("=" * 60)

if __name__ == "__main__":
    run_test()
