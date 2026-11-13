import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx_normal = content.find('// Normal / Sachet layout')
if idx_normal == -1:
    print("Could not find Normal layout")
    sys.exit()

normal_chunk = content[idx_normal:]

# Only safely restore the STOP/ADJUST row and the min/max labels
normal_chunk = normal_chunk.replace('text-[6px]', 'text-[10px]')
normal_chunk = normal_chunk.replace('h-[11px]', 'h-[14px]')
# Note: we DO NOT touch text-[9px] so we don't break the main header.

content = content[:idx_normal] + normal_chunk

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Properly restored Normal layout fonts without breaking header!")
