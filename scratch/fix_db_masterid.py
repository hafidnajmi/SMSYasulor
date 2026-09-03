import re

with open('database.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and fix the corrupted line
bad = '"master_id": None,\\r\\n                "master_data_id": part_number,'
good = '"master_id": None,\n                "master_data_id": part_number,'

if bad in content:
    content = content.replace(bad, good)
    with open('database.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("FIXED: corrupted line replaced")
else:
    # Try to find where master_id is set near create_electrical_parts_keluar
    idx = content.find('"master_id": None,\\r\\n')
    if idx >= 0:
        print(f"Found at {idx}: {repr(content[idx:idx+100])}")
    else:
        idx = content.find('"master_id"')
        while idx >= 0:
            snippet = content[idx:idx+80]
            if 'part_number' in snippet or 'None' in snippet:
                print(f"At {idx}: {repr(snippet)}")
            idx = content.find('"master_id"', idx+1)
