"""
get_build_version.py - Generates dynamic build version tag: SMS v<Month>.<Day>.<Seq>
Tracks daily build sequence in build_counter.txt.
"""

import sys
import os
from datetime import datetime

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
counter_file = os.path.join(root_dir, "build_counter.txt")

now = datetime.now()
cur_month = now.month
cur_day = now.day
date_key = f"{cur_month}.{cur_day}"

last_date = ""
last_seq = 0

if os.path.exists(counter_file):
    try:
        with open(counter_file, "r", encoding="utf-8") as f:
            line = f.read().strip()
            if "=" in line:
                last_date, seq_str = line.split("=", 1)
                last_seq = int(seq_str)
    except Exception:
        pass

if last_date == date_key:
    seq = last_seq + 1
else:
    seq = 1

# Save updated count
with open(counter_file, "w", encoding="utf-8") as f:
    f.write(f"{date_key}={seq}")

version_str = f"v{cur_month}.{cur_day}.{seq}"
app_label = f"SMS {version_str}"
folder_name = app_label
exe_name = f"{app_label}.exe"

if len(sys.argv) > 1 and sys.argv[1] == "--batch":
    print(f'SET "APP_VERSION={cur_month}.{cur_day}.{seq}"')
    print(f'SET "VERSION_TAG={version_str}"')
    print(f'SET "OUTPUT_EXE_LABEL={app_label}"')
    print(f'SET "DEPLOY_FOLDER={folder_name}"')
else:
    print(version_str)
