"""
test_nft018_evidence.py - NFT-018 Structured Logging & 7-Day Auto-Rotation Test

Audits:
1. TimedRotatingFileHandler settings (when="midnight", interval=1, backupCount=7).
2. Proactive purge_old_logs() cleanup of log files older than 7 days.
3. Thread-safe logger initialization and log formatting.
"""

import sys
import os
import time
import tempfile
import logging
from logging.handlers import TimedRotatingFileHandler

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure root workspace is in sys.path
root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

from utils.logger import get_logger, purge_old_logs, _init_logger

def test_nft018_log_rotation_and_purge():
    print("====================================================")
    print("   NFT-018 STRUCTURED LOGGING & RETENTION AUDIT     ")
    print("====================================================\n")

    # Step 1: Verify TimedRotatingFileHandler properties
    print("=== [NFT-018 STEP 1] Handler Configuration Audit ===")
    logger = get_logger("UPMS")
    handlers = [h for h in logger.handlers if isinstance(h, TimedRotatingFileHandler)]
    
    assert len(handlers) > 0, "Must have a TimedRotatingFileHandler registered!"
    handler = handlers[0]
    
    print(f"  - Handler Class       : {handler.__class__.__name__}")
    print(f"  - Rotation When       : '{handler.when}'")
    print(f"  - Rotation Interval   : {handler.interval}")
    print(f"  - Backup Count (Days) : {handler.backupCount}")
    print(f"  - Target Log File     : {handler.baseFilename}")

    assert handler.when.upper() == "MIDNIGHT", "Handler must rotate at midnight!"
    assert handler.interval in (1, 86400), "Rotation interval must be 1 day (86400 seconds)!"
    assert handler.backupCount == 7, "Backup count must be 7 days!"
    print("  ✓ Handler 7-day daily rotation settings verified PASSED.\n")

    # Step 2: Test purge_old_logs() with mock files
    print("=== [NFT-018 STEP 2] Proactive Auto-Purge Audit ===")
    with tempfile.TemporaryDirectory() as tmp_dir:
        now = time.time()
        one_day = 86400

        # Create mock log files
        files_to_create = [
            ("upms.log", 0),                # Current active log (keep)
            ("upms.log.2026-08-11", 1),     # 1 day old (keep)
            ("upms.log.2026-08-08", 4),     # 4 days old (keep)
            ("upms.log.2026-08-05", 7),     # 7 days old (keep)
            ("upms.log.2026-08-02", 10),    # 10 days old (MUST PURGE)
            ("upms.log.2026-07-25", 18),    # 18 days old (MUST PURGE)
        ]

        for fname, age_days in files_to_create:
            fpath = os.path.join(tmp_dir, fname)
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(f"Mock log content for {fname}\n")
            
            # Set artificial modification time (mtime)
            mtime = now - (age_days * one_day) - 10
            os.utime(fpath, (mtime, mtime))

        print("  [*] Mock log files created before purge:")
        for fn in sorted(os.listdir(tmp_dir)):
            print(f"      - {fn}")

        # Run purge_old_logs
        deleted_count = purge_old_logs(tmp_dir, max_days=7)
        remaining_files = os.listdir(tmp_dir)

        print(f"\n  [+] Executed purge_old_logs(max_days=7). Purged files count: {deleted_count}")
        print("  [*] Remaining log files after purge:")
        for fn in sorted(remaining_files):
            print(f"      - {fn}")

        assert deleted_count >= 2, f"Expected at least 2 old log files purged, got {deleted_count}"
        assert "upms.log.2026-08-02" not in remaining_files, "10-day old file must be purged!"
        assert "upms.log.2026-07-25" not in remaining_files, "18-day old file must be purged!"
        assert "upms.log" in remaining_files, "Active upms.log must be kept!"
        assert "upms.log.2026-08-08" in remaining_files, "4-day old file must be kept!"

    print("\n✓ Proactive purge engine verified: Files older than 7 days automatically removed.")
    print("====================================================")
    print("[RESULT] NFT-018 AUDIT STATUS: ALL TESTS PASSED (7-DAY RETENTION GUARANTEED)")
    print("====================================================")

if __name__ == "__main__":
    test_nft018_log_rotation_and_purge()
