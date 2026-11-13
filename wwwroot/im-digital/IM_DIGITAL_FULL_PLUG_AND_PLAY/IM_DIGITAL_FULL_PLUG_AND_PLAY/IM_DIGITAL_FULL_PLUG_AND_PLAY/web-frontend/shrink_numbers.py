import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx1 = content.find('const renderBiphaseRow = ')
idx_end_vol = content.find('const v1 = parseFloat(qcFillingData.volPhase1)', idx1)

if idx1 == -1 or idx_end_vol == -1:
    print("Could not find blocks")
    sys.exit()

biphase_chunk = content[idx1:idx_end_vol]
biphase_chunk = biphase_chunk.replace('text-[14px]', 'text-[9.5px]')
biphase_chunk = biphase_chunk.replace('text-[13px]', 'text-[9.5px]')
biphase_chunk = biphase_chunk.replace('text-[8.5px]', 'text-[7px]')

content = content[:idx1] + biphase_chunk + content[idx_end_vol:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done making numbers smaller!")
