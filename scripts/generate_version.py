"""Generate Windows version info text file for PyInstaller dynamically based on build_counter.txt."""
import os
from datetime import datetime
from PyInstaller.utils.win32 import versioninfo

counter_file = "build_counter.txt"
now = datetime.now()
cur_month = now.month
cur_day = now.day
date_key = f"{cur_month}.{cur_day}"

last_date = ""
seq = 1

if os.path.exists(counter_file):
    try:
        with open(counter_file, "r", encoding="utf-8") as f:
            line = f.read().strip()
            if "=" in line:
                last_date, seq_str = line.split("=", 1)
                seq = int(seq_str)
    except Exception:
        pass

ver_str = f"{cur_month}.{cur_day}.{seq}"
full_label = f"SMS v{cur_month}.{cur_day}.{seq}"

v = versioninfo.VSVersionInfo(
    ffi=versioninfo.FixedFileInfo(
        filevers=(cur_month, cur_day, seq, 0),
        prodvers=(cur_month, cur_day, seq, 0),
        mask=0x3F, flags=0x0,
        OS=0x40004, fileType=0x1,
        subtype=0x0, date=(0, 0),
    ),
    kids=[
        versioninfo.StringFileInfo([
            versioninfo.StringTable('040904B0', [
                versioninfo.StringStruct('CompanyName', 'Sparepart Management System'),
                versioninfo.StringStruct('FileDescription', 'Sparepart Management System'),
                versioninfo.StringStruct('FileVersion', f"{ver_str}.0"),
                versioninfo.StringStruct('InternalName', full_label),
                versioninfo.StringStruct('LegalCopyright', 'Copyright (C) Sparepart Management'),
                versioninfo.StringStruct('OriginalFilename', f"{full_label}.exe"),
                versioninfo.StringStruct('ProductName', 'Sparepart Management System'),
                versioninfo.StringStruct('ProductVersion', f"{ver_str}.0"),
            ]),
        ]),
        versioninfo.VarFileInfo([versioninfo.VarStruct('Translation', [1033, 1200])]),
    ],
)

text = repr(v)

text = text.replace('versioninfo.', '')

with open('version_info.txt', 'w', encoding='utf-8') as f:
    f.write(text)

print(f'[OK] version_info.txt generated ({full_label})')
