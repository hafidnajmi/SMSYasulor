"""
test_nft003_evidence.py - Performance & Pagination Benchmark Test (NFT-003 Audit)
"""

import sys
import os
import time

# Ensure root workspace is in sys.path
root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

# Force UTF-8 output encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

from database import Database

def benchmark_nft003_pagination():
    print("=== [NFT-003 AUDIT STEP 1] Connecting to SQL Server Database ===")
    db = Database()
    if not db.sql_conn:
        print("❌ FAIL: Cannot connect to database.")
        return False

    PAGE_SIZE = 50

    # 1. Total Count Query Benchmark
    t0 = time.time()
    total_count = db.count_master_data()
    t_count = round((time.time() - t0) * 1000, 2)
    print(f"  - Total Master Data Records in DB : {total_count:,} rows")
    print(f"  - COUNT Query Time                 : {t_count} ms")

    # 2. Page 1 Fetch Benchmark (Offset 0)
    t0 = time.time()
    page1_rows = db.get_master_data(limit=PAGE_SIZE, offset=0)
    t_page1 = round((time.time() - t0) * 1000, 2)
    print(f"\n=== [NFT-003 AUDIT STEP 2] Benchmarking Page 1 Fetch (50 Rows) ===")
    print(f"  - Fetched Rows Count               : {len(page1_rows)}")
    print(f"  - Page 1 Query Time                : {t_page1} ms")

    if len(page1_rows) > PAGE_SIZE:
        print(f"❌ FAIL: Fetched {len(page1_rows)} rows instead of page limit {PAGE_SIZE}!")
        return False

    # 3. Deep Page Fetch Benchmark (Offset 5000)
    t0 = time.time()
    deep_rows = db.get_master_data(limit=PAGE_SIZE, offset=5000)
    t_deep = round((time.time() - t0) * 1000, 2)
    print(f"\n=== [NFT-003 AUDIT STEP 3] Benchmarking Deep Page Offset (5000th Row) ===")
    print(f"  - Deep Page Query Time (Offset 5000): {t_deep} ms")

    # 4. Search Filter Benchmark
    t0 = time.time()
    search_term = "BEARING"
    search_count = db.count_master_data(search=search_term)
    search_rows = db.get_master_data(search=search_term, limit=PAGE_SIZE, offset=0)
    t_search = round((time.time() - t0) * 1000, 2)
    print(f"\n=== [NFT-003 AUDIT STEP 4] Benchmarking Search Filter ('{search_term}') ===")
    print(f"  - Matching Records Count           : {search_count:,}")
    print(f"  - Search + Fetch Time              : {t_search} ms")

    print("\n=== [NFT-003 AUDIT STEP 5] Evaluating Performance Criteria ===")
    is_fast = t_page1 < 500 and t_deep < 1000 and t_search < 500
    is_memory_efficient = len(page1_rows) <= PAGE_SIZE

    print(f"  - Memory Efficiency (Loads Only Page Size): {'✓ PASSED' if is_memory_efficient else '❌ FAILED'}")
    print(f"  - Execution Speed (sub-second UI response): {'✓ PASSED' if is_fast else '❌ FAILED'}")

    return is_memory_efficient and is_fast

if __name__ == "__main__":
    res = benchmark_nft003_pagination()
    print("\n====================================================")
    if res:
        print("[RESULT] NFT-003 AUDIT RESULT: PASSED (OFFSET-FETCH PAGINATION 100% OPTIMAL)")
    else:
        print("[RESULT] NFT-003 AUDIT RESULT: FAILED")
    print("====================================================")
