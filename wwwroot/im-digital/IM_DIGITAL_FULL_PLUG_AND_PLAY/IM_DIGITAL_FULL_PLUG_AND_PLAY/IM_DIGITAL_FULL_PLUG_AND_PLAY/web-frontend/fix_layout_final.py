import sys, re

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Main Outer Container
content = re.sub(
    r'(\{\/\* Main Outer Container matching Desktop App \*\/\}\s*)<div className="border border-black">',
    r'\1<div className="border border-black flex flex-col flex-1 min-h-0">',
    content
)

# 2. Form Sections Flex Layout
content = re.sub(
    r'(\{\/\* Form Sections Flex Layout \*\/\}\s*)<div className="flex w-full">',
    r'\1<div className="flex w-full flex-1 min-h-0">',
    content
)

# 3. Right Column
content = re.sub(
    r'(\{\/\* Right Column \(Flex-1\) \*\/\}\s*)<div className="flex-1 flex flex-col justify-between">',
    r'\1<div className="flex-1 flex flex-col justify-between min-h-0">',
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done fixing layout!")
