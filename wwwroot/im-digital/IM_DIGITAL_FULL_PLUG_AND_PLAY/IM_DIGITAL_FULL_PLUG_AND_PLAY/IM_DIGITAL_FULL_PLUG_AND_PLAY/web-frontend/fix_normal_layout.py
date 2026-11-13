import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx_normal = content.find('// Normal / Sachet layout')
if idx_normal == -1:
    print("Could not find Normal layout")
    sys.exit()

normal_chunk = content[idx_normal:]

# We know that fix_compact.py reduced text-[10px] -> text-[6px] and h-[14px] -> h-[11px].
# And text-[13px] -> text-[9.5px], but fix_undo_styles reverted text-[9.5px] -> text-[13px].
# So text-[13px] is fine.
# We need to revert the remaining:
normal_chunk = normal_chunk.replace('text-[6px]', 'text-[10px]')
normal_chunk = normal_chunk.replace('h-[11px]', 'h-[14px]')

# Also check for text-[9px] which might have been text-[14px] or text-[13px] originally?
# Let's revert text-[9px] to text-[13px] just in case it was a header.
normal_chunk = normal_chunk.replace('text-[9px]', 'text-[13px]')

content = content[:idx_normal] + normal_chunk

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored Normal layout fonts!")
