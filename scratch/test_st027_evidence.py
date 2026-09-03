"""
test_st027_evidence.py - Automated Concurrency & Thread-Local Isolation Verification Test (ST-027 Audit)
"""

import sys
import os
import threading
import time

# Ensure root workspace is in sys.path
root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

# Force UTF-8 output encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

import utils.db_pool as db_pool
from database import Database

def test_thread_local_concurrency():
    print("=== [ST-027 CONCURRENCY TEST STEP 1] Spawning 10 Simultaneously Active Worker Threads ===")
    
    db = Database()
    NUM_THREADS = 10
    barrier = threading.Barrier(NUM_THREADS)
    thread_connection_map = {}
    lock = threading.Lock()
    errors = []

    def worker_task(thread_idx):
        try:
            thread_name = threading.current_thread().name
            conn1 = db_pool.get_connection()
            conn1_id = id(conn1)

            # Synchronize all threads so they hold connection simultaneously
            barrier.wait()

            # Perform a test query
            cursor = conn1.cursor()
            cursor.execute("SELECT @@SPID, @@VERSION")
            spid, version = cursor.fetchone()

            # Calling get_connection again in the SAME thread should return the exact same thread-local connection
            conn2 = db_pool.get_connection()
            conn2_id = id(conn2)

            if conn1_id != conn2_id:
                with lock:
                    errors.append(f"Thread {thread_name}: Re-calling get_connection returned different instance! ({conn1_id} vs {conn2_id})")

            with lock:
                thread_connection_map[thread_name] = {
                    "thread_idx": thread_idx,
                    "conn_id": conn1_id,
                    "sql_spid": spid
                }
                print(f"  [Thread {thread_idx} | {thread_name}] -> Memory Addr: {conn1_id} | SQL SPID: {spid}")

            # Keep connection open until all threads finish querying
            time.sleep(0.1)

        except Exception as ex:
            with lock:
                errors.append(f"Thread {thread_idx} Error: {ex}")

    # Launch 10 parallel threads
    threads = []
    for i in range(NUM_THREADS):
        t = threading.Thread(target=worker_task, args=(i,))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    print("\n=== [ST-027 CONCURRENCY TEST STEP 2] Analyzing Thread-Local Connection Isolation ===")
    
    unique_conn_ids = set(item["conn_id"] for item in thread_connection_map.values())
    unique_spids = set(item["sql_spid"] for item in thread_connection_map.values())
    total_threads = len(thread_connection_map)

    print(f"  - Simultaneously Executed Threads: {total_threads}")
    print(f"  - Unique Python Connection Addresses: {len(unique_conn_ids)}")
    print(f"  - Unique SQL Server Session SPIDs  : {len(unique_spids)}")

    if len(errors) > 0:
        print("❌ FAIL: Errors detected during concurrency execution:")
        for err in errors:
            print(f"    - {err}")
        return False

    if len(unique_conn_ids) == total_threads and len(unique_spids) == total_threads:
        print("[SUCCESS] 100% Thread Isolation Verified! 10 simultaneous threads maintained 10 distinct connections and 10 unique SQL Server SPIDs!")
        return True
    else:
        print(f"❌ FAIL: Connection Sharing Detected! {total_threads} threads shared connections!")
        return False

if __name__ == "__main__":
    res = test_thread_local_concurrency()
    print("\n====================================================")
    if res:
        print("[RESULT] ST-027 AUDIT RESULT: PASSED (THREAD-LOCAL ISOLATED)")
    else:
        print("[RESULT] ST-027 AUDIT RESULT: FAILED")
    print("====================================================")
