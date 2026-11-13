import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx1 = content.find('const renderDuoRow = ')
idx2 = content.find('// Normal / Sachet layout')

if idx1 == -1 or idx2 == -1:
    print("Could not find bounds")
    sys.exit()

duo_chunk = content[idx1:idx2]

# STOP/ADJUST row
duo_chunk = duo_chunk.replace('text-[8px] font-bold border-b border-black h-[14px]', 'text-[10px] font-bold border-b border-black h-[14px]')

# Big numbers
duo_chunk = duo_chunk.replace('text-[9.5px]', 'text-[11px]')

# Small labels
duo_chunk = duo_chunk.replace('text-[7px]', 'text-[8px]')

content = content[:idx1] + duo_chunk + content[idx2:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Enlarged Duo layout fonts!")
