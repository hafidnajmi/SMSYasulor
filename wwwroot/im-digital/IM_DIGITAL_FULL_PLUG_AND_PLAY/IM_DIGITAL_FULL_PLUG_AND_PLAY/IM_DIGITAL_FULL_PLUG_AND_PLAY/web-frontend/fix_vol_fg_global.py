import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_line = """                        <span>Volume FG {qcResult && qcResult.type !== 'Duo' && qcResult.type !== 'LipEye' ? <span className="text-black font-normal ml-2">{qcFillingData.volumeFg}.0</span> : ""}</span>"""
new_line = """                        <span>Volume FG</span>"""

content = content.replace(old_line, new_line)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed Volume FG number universally!")
