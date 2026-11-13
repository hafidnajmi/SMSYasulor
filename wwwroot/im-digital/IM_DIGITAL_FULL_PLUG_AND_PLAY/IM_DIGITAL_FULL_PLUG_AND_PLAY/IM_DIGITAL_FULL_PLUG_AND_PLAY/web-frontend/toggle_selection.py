import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Change condition to only show handles when image is actively selected (selectedItemId === 'image')
old_condition = "{(selectedItemId === 'image' || selectedItemId === null) && ("
new_condition = "{selectedItemId === 'image' && ("

if old_condition in code:
    code = code.replace(old_condition, new_condition, 1)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Selection toggle updated: handles disappear when clicking outside!")
else:
    print("ERROR: old_condition not found")
