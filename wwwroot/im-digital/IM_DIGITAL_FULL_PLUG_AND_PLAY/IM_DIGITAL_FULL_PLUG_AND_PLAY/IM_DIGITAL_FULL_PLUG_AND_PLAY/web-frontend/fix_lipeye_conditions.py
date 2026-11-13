import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix line 1239
old_line1 = """{(!qcResult || (qcResult.type !== 'Duo' && (qcResult.type !== 'Biphase' && qcResult.type !== 'LIP EYE MAKE UP REMOVER'))) && ("""
new_line1 = """{(!qcResult || (qcResult.type !== 'Duo' && (qcResult.type !== 'Biphase' && qcResult.type !== 'LipEye'))) && ("""
content = content.replace(old_line1, new_line1)

# Fix line 1389
old_line2 = """{(!qcResult || (qcResult.type !== 'Duo' && qcResult.type !== 'Biphase' && qcResult.type !== 'LIP EYE MAKE UP REMOVER')) && ("""
new_line2 = """{(!qcResult || (qcResult.type !== 'Duo' && qcResult.type !== 'Biphase' && qcResult.type !== 'LipEye')) && ("""
content = content.replace(old_line2, new_line2)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated LipEye conditionals successfully!")
