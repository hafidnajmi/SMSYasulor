"""
test_st033_evidence.py - Timezone & Timestamp Integrity Audit Script (ST-033 Audit)
"""

import sys
import os
from datetime import datetime, timezone

# Ensure root workspace is in sys.path
root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

# Force UTF-8 output encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

from database import Database

def audit_timezone_handling():
    print("=== [ST-033 AUDIT STEP 1] Inspecting System & DB Server Timezone Settings ===")
    
    # 1. Local Python Time
    local_now = datetime.now()
    utc_now = datetime.now(timezone.utc)
    tz_offset_hours = round((local_now - utc_now.replace(tzinfo=None)).total_seconds() / 3600, 2)
    
    print(f"  - Client Local Time (Python datetime.now()): {local_now.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  - Client UTC Time   (datetime.now(utc))   : {utc_now.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"  - Client Timezone Offset                  : UTC{'+' if tz_offset_hours >= 0 else ''}{tz_offset_hours} hours")

    # 2. Database Server Time
    db = Database()
    if db.sql_conn:
        cursor = db.sql_conn.cursor()
        cursor.execute("SELECT GETDATE(), GETUTCDATE(), CAST(SYSDATETIMEOFFSET() AS VARCHAR(50)), DATEDIFF(hour, GETUTCDATE(), GETDATE())")
        row = cursor.fetchone()
        if row:
            db_getdate, db_getutcdate, db_sysoffset, db_tz_diff = row
            print(f"\n=== [ST-033 AUDIT STEP 2] Inspecting SQL Server Timezone Functions ===")
            print(f"  - SQL Server Local Time (GETDATE())     : {db_getdate}")
            print(f"  - SQL Server UTC Time   (GETUTCDATE())  : {db_getutcdate}")
            print(f"  - SQL Server SYSDATETIMEOFFSET()        : {db_sysoffset}")
            print(f"  - SQL Server DB Timezone Offset         : UTC{'+' if db_tz_diff >= 0 else ''}{db_tz_diff} hours")

            diff_client_db = round((local_now - db_getdate).total_seconds() / 3600, 2)
            print(f"\n=== [ST-033 AUDIT STEP 3] Analyzing Client vs DB Server Drift ===")
            print(f"  - Client vs DB Server Time Drift        : {diff_client_db} hours")
            
            if abs(diff_client_db) > 0.1:
                print("⚠️ WARNING: Client PC time and DB Server time are DIFFERENT! Naive datetime.now() will cause drift errors!")
            else:
                print("✓ NOTE: Client and DB Server are currently in the SAME timezone/clock offset.")

if __name__ == "__main__":
    audit_timezone_handling()
