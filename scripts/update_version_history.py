"""
scripts/update_version_history.py - Generator Otomatis Catatan Rilis & Version History (Bahasa Indonesia)

Fungsi:
1. Membaca nomor versi build terbaru dari build_counter.txt / argumen CLI (misal SMS v8.10.1).
2. Memperbarui VERSION_HISTORY.md secara dinamis dengan ringkasan rilis jika versi baru belum tercatat.
3. Mengkstrak catatan rilis spesifik untuk versi ini dan menyimpannya di CATATAN_RILIS.txt pada folder deploy.
4. Menyalin VERSION_HISTORY.md lengkap ke dalam folder deploy rilis.
"""

import os
import sys
import re
import subprocess
from datetime import datetime

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
counter_file = os.path.join(root_dir, "build_counter.txt")
history_file = os.path.join(root_dir, "VERSION_HISTORY.md")

# Determine Version Tag
now = datetime.now()
cur_month = now.month
cur_day = now.day
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

version_tag = f"SMS v{cur_month}.{cur_day}.{seq}"
date_str = now.strftime("%d %B %Y %H:%M WIB")

# Check if deploy folder argument passed
deploy_folder = None
if len(sys.argv) > 1 and sys.argv[1]:
    deploy_folder = os.path.abspath(sys.argv[1])
    # Extract folder name as version tag if named like 'SMS vX.Y.Z'
    folder_basename = os.path.basename(deploy_folder)
    if folder_basename.startswith("SMS v"):
        version_tag = folder_basename

print(f"[VERSION HISTORY] Menyiapkan dokumentasi rilis untuk {version_tag}...")

# Read existing VERSION_HISTORY.md
history_content = ""
if os.path.exists(history_file):
    with open(history_file, "r", encoding="utf-8") as f:
        history_content = f.read()

# Helper: Extract latest release section from VERSION_HISTORY.md
def extract_latest_notes(md_text, target_tag):
    lines = md_text.splitlines()
    in_section = False
    notes_lines = []
    
    # Try exact match or match first version header
    pattern = re.escape(target_tag)
    
    for line in lines:
        if line.startswith("## 📌"):
            if in_section:
                break
            if target_tag.lower() in line.lower() or not notes_lines:
                in_section = True
                notes_lines.append(line)
        elif in_section:
            if line.startswith("---") and len(notes_lines) > 2:
                break
            notes_lines.append(line)
            
    return "\n".join(notes_lines).strip()

# Check if current version header exists in VERSION_HISTORY.md
if f"## 📌 {version_tag}" not in history_content:
    # Try getting recent git commits for automatic changelog
    git_commits = []
    try:
        res = subprocess.run(["git", "log", "-n", "5", "--pretty=format:- %s"], capture_output=True, text=True, cwd=root_dir)
        if res.returncode == 0 and res.stdout.strip():
            git_commits = res.stdout.strip().splitlines()
    except Exception:
        pass

    if not git_commits:
        git_commits = [
            "- **Automated Build Update**: Pembaruan stabilitas dan optimasi aplikasi SMS.",
            "- **Database Sync**: Penyelarasan skema data dan performa query SQL Server."
        ]

    commit_text = "\n".join(git_commits)
    new_entry = f"""## 📌 {version_tag} ({now.strftime('%d %B %Y')})
### 🚀 Perubahan Versi & Pembaruan Sistem
{commit_text}

---
"""
    # Insert new entry right after header
    if "---" in history_content:
        header_part, rest_part = history_content.split("---", 1)
        history_content = f"{header_part}---\n\n{new_entry}\n{rest_part.lstrip()}"
    else:
        history_content = f"{history_content}\n\n{new_entry}"

    with open(history_file, "w", encoding="utf-8") as f:
        f.write(history_content)
    print(f"[OK] VERSION_HISTORY.md diperbarui dengan entri rilis {version_tag}")

# Extract release notes for CATATAN_RILIS.txt
current_notes = extract_latest_notes(history_content, version_tag)

catatan_rilis_text = f"""====================================================
CATATAN RILIS & RIWAYAT PERUBAHAN
Aplikasi : {version_tag}
Tanggal  : {date_str}
====================================================

{current_notes}

====================================================
Informasi Penggunaan:
- Buka config.yaml untuk menyesuaikan kredensial SQL Server.
- Jalankan {version_tag}.exe untuk mengoperasikan aplikasi.
====================================================
"""

# Write CATATAN_RILIS.txt & copy VERSION_HISTORY.md to Deploy Folder
if deploy_folder and os.path.exists(deploy_folder):
    release_note_path = os.path.join(deploy_folder, "CATATAN_RILIS.txt")
    with open(release_note_path, "w", encoding="utf-8") as f:
        f.write(catatan_rilis_text)
    print(f"[OK] CATATAN_RILIS.txt dibuat di {release_note_path}")

    import shutil
    target_hist = os.path.join(deploy_folder, "VERSION_HISTORY.md")
    shutil.copy2(history_file, target_hist)
    print(f"[OK] VERSION_HISTORY.md disalin ke {target_hist}")
else:
    print(f"[OK] Version History siap.")
