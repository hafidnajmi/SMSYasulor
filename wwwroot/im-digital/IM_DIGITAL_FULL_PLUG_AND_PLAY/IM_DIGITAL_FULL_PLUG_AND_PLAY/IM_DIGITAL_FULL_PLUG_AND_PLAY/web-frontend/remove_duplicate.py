import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Verify that line 284 starts with the duplicate 'const v1'
if 'const v1 = parseFloat(qcFillingData.volPhase1)' in lines[283]:
    # Lines 284-302 correspond to index 283 to 301.
    del lines[283:302]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Deleted duplicate dangling block!")
else:
    print("Error: Could not find duplicate block at expected line!")
