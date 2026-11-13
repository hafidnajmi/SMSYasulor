import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx_normal = content.find('// Normal / Sachet layout')
if idx_normal == -1:
    print("Could not find Normal layout")
    sys.exit()

normal_chunk = content[idx_normal:]

# Revert what fix_normal_layout.py did:
# normal_chunk = normal_chunk.replace('text-[6px]', 'text-[10px]')
# normal_chunk = normal_chunk.replace('h-[11px]', 'h-[14px]')
# normal_chunk = normal_chunk.replace('text-[9px]', 'text-[13px]')

# So we do the reverse:
normal_chunk = normal_chunk.replace('text-[13px] font-bold relative', 'text-[9px] font-bold relative')
# Wait, let's just be careful. We only replaced text-[10px] from text-[6px].
# There might have been legitimate text-[10px] that we shouldn't touch.
# Let's see what was changed.
# 'text-[10px]' was originally 'text-[6px]'
# 'h-[14px]' was originally 'h-[11px]'
# 'text-[13px]' was originally 'text-[9px]'

normal_chunk = normal_chunk.replace('text-[10px]', 'text-[6px]')
normal_chunk = normal_chunk.replace('h-[14px]', 'h-[11px]')
normal_chunk = normal_chunk.replace('text-[13px]', 'text-[9px]')

content = content[:idx_normal] + normal_chunk

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Reverted Normal layout fonts back to previous state!")
