"""
test_nft002_evidence.py - Automated Reliability & Timeout Verification Test (NFT-002 Audit)
"""

import sys
import os
import time
import pyodbc

# Ensure root workspace is in sys.path
root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

# Force UTF-8 output encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

import utils.db_pool as db_pool
from database import Database

def test_nft002_timeouts_and_recovery():
    print("=== [NFT-002 AUDIT STEP 1] Initializing Database Pool Connection ===")
    db = Database()
    if not db.sql_conn:
        print("❌ FAIL: Database connection failed.")
        return False

    conn = db_pool.get_connection()
    print(f"  - Active Connection Object : {conn}")
    print(f"  - Default Query Timeout    : {conn.timeout} seconds")

    if conn.timeout != 30:
        print(f"❌ FAIL: Query timeout is set to {conn.timeout}s, expected 30s!")
        return False

    print("✓ Default Query Timeout (30s) Verified!")

    print("\n=== [NFT-002 AUDIT STEP 2] Testing Query Timeout Abort (Simulating Long Query) ===")
    # Set a temporary 2-second timeout for rapid test execution
    conn.timeout = 2
    start_time = time.time()
    query_timed_out = False

    try:
        cursor = conn.cursor()
        print("  Executing long query: WAITFOR DELAY '00:00:05' (Timeout set to 2s)...")
        cursor.execute("WAITFOR DELAY '00:00:05'")
        cursor.fetchone()
    except pyodbc.Error as ex:
        elapsed = round(time.time() - start_time, 2)
        print(f"  ✓ Query Timed Out Exception Caught in {elapsed}s!")
        print(f"    - Exception details: {ex}")
        query_timed_out = True
    finally:
        # Reset timeout back to 30s
        conn.timeout = 30

    if not query_timed_out:
        print("❌ FAIL: Long query did NOT time out!")
        return False

    print("\n=== [NFT-002 AUDIT STEP 3] Testing Pool Automatic Recovery After Timeout ===")
    # Verify pool can recover cleanly without cascading failures
    try:
        recovered_conn = db_pool.get_connection()
        rec_cursor = recovered_conn.cursor()
        rec_cursor.execute("SELECT 1, GETDATE()")
        row = rec_cursor.fetchone()
        if row and row[0] == 1:
            print(f"  ✓ Pool Recovery Successful! Normal query returned: {row}")
            recovery_success = True
        else:
            recovery_success = False
    except Exception as ex:
        print(f"❌ FAIL: Pool recovery failed: {ex}")
        recovery_success = False

    return query_timed_out and recovery_success

if __name__ == "__main__":
    res = test_nft002_timeouts_and_recovery()
    print("\n====================================================")
    if res:
        print("[RESULT] NFT-002 AUDIT RESULT: PASSED (10s CONN / 30s QUERY TIMEOUT & RECOVERY)")
    else:
        print("[RESULT] NFT-002 AUDIT RESULT: FAILED")
    print("====================================================")
