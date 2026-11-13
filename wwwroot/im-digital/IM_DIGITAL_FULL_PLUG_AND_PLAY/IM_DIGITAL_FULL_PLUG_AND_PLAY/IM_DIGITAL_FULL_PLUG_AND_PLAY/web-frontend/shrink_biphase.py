import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx1 = content.find('const renderBiphaseRow = ')
idx2 = content.find('const renderDuoRow = ')

if idx1 == -1 or idx2 == -1:
    print("Could not find bounds")
    sys.exit()

biphase_chunk = content[idx1:idx2]

# Shrink the sizes slightly in Biphase Row and Biphase Vol Row
biphase_chunk = biphase_chunk.replace('text-[10px]', 'text-[8.5px]') # Header and STOP/ADJUST
biphase_chunk = biphase_chunk.replace('text-[11px]', 'text-[9.5px]') # Main limit numbers
biphase_chunk = biphase_chunk.replace('text-[10.5px]', 'text-[9.5px]') # Main limit numbers (Link BOM, Max)
biphase_chunk = biphase_chunk.replace('text-[8px]', 'text-[7px]') # Min, max, nominal labels
biphase_chunk = biphase_chunk.replace('text-[7px]', 'text-[6.5px]') # Link BOM label

content = content[:idx1] + biphase_chunk + content[idx2:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Shrunk Biphase fonts slightly!")
