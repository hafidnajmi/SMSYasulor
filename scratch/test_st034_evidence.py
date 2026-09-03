"""
test_st034_evidence.py - Automated Verification for Log Rotation and 7-Day Purge Policy (ST-034 Audit)
"""

import sys
import os
import time
from logging.handlers import TimedRotatingFileHandler

# Ensure root workspace is in sys.path
root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

# Force UTF-8 output encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

import utils.logger as logger_module

def test_st034_log_rotation_and_purge():
    print("=== [ST-034 AUDIT STEP 1] Inspecting Logger Configuration in utils/logger.py ===")
    logger = logger_module.get_logger("UPMS")
    
    # Check handlers on main UPMS logger
    import logging
    upms_logger = logging.getLogger("UPMS")
    timed_handlers = [h for h in upms_logger.handlers if isinstance(h, TimedRotatingFileHandler)]
    
    if not timed_handlers:
        print("❌ FAIL: TimedRotatingFileHandler not found in UPMS logger.handlers!")
        return False

    handler = timed_handlers[0]
    print(f"  - Handler Type  : {type(handler).__name__}")
    print(f"  - Log File Path : {handler.baseFilename}")
    print(f"  - Rotation When : {handler.when}")
    print(f"  - Backup Count  : {handler.backupCount} days")

    if handler.backupCount != 7:
        print(f"❌ FAIL: backupCount is set to {handler.backupCount}, expected 7!")
        return False

    print("✓ TimedRotatingFileHandler configuration matches ST-034 7-day retention specification.")

    print("\n=== [ST-034 AUDIT STEP 2] Testing Automatic Purging of Files > 7 Days Old ===")
    log_dir = os.path.dirname(handler.baseFilename)
    os.makedirs(log_dir, exist_ok=True)

    now = time.time()
    ten_days_ago = now - (10 * 86400)
    five_days_ago = now - (5 * 86400)

    # Create test dummy log files
    dummy_old_log = os.path.join(log_dir, "upms.log.2026-07-30")
    dummy_new_log = os.path.join(log_dir, "upms.log.2026-08-06")

    with open(dummy_old_log, "w", encoding="utf-8") as f:
        f.write("DUMMY LOG ENTRY 10 DAYS AGO\n")
    os.utime(dummy_old_log, (ten_days_ago, ten_days_ago))

    with open(dummy_new_log, "w", encoding="utf-8") as f:
        f.write("DUMMY LOG ENTRY 5 DAYS AGO\n")
    os.utime(dummy_new_log, (five_days_ago, five_days_ago))

    print(f"  Created dummy test log file (10 days old): {os.path.basename(dummy_old_log)}")
    print(f"  Created dummy test log file (5 days old) : {os.path.basename(dummy_new_log)}")

    # Run purge function
    purged_count = logger_module.purge_old_logs(log_dir=log_dir, max_days=7)
    print(f"  - Files Purged by purge_old_logs(max_days=7): {purged_count}")

    # Check remaining files
    old_exists = os.path.exists(dummy_old_log)
    new_exists = os.path.exists(dummy_new_log)

    print(f"  - 10-Day Old Log Exists? : {old_exists} (Expected: False - Purged)")
    print(f"  - 5-Day Old Log Exists?  : {new_exists} (Expected: True - Retained)")

    # Clean up remaining test artifact
    if os.path.exists(dummy_old_log):
        os.remove(dummy_old_log)
    if os.path.exists(dummy_new_log):
        os.remove(dummy_new_log)

    if not old_exists and new_exists:
        print("✓ SUCCESS: Automatic 7-day purging & rotation verified 100%!")
        return True
    else:
        print("❌ FAIL: Purge logic did not remove log files older than 7 days!")
        return False

if __name__ == "__main__":
    res = test_st034_log_rotation_and_purge()
    print("\n====================================================")
    if res:
        print("[RESULT] ST-034 AUDIT RESULT: PASSED (7-DAY ROTATION & PURGE)")
    else:
        print("[RESULT] ST-034 AUDIT RESULT: FAILED")
    print("====================================================")
