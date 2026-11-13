import sys, re

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# === BIPHASE ROW COMPACTING ===
# Header row
content = re.sub(
    r'className="bg-\[#C0CBE1\] border-b border-black h-\[18px\] flex items-center px-1 font-semibold text-\[10px\] text-black"',
    r'className="bg-[#C0CBE1] border-b border-black h-[14px] flex items-center px-1 font-semibold text-[9px] text-black"',
    content
)
# Stop/Adjust/Running row
content = re.sub(
    r'className="grid grid-cols-5 text-center text-\[8px\] font-bold border-b border-black h-\[14px\]"',
    r'className="grid grid-cols-5 text-center text-[7px] font-bold border-b border-black h-[11px] items-center"',
    content
)
# Limits row container
content = re.sub(
    r'className="grid grid-cols-5 text-center text-\[11px\] bg-white h-\[35px\] relative"',
    r'className="grid grid-cols-5 text-center text-[9px] bg-white h-[26px] relative items-center"',
    content
)
# Link BOM box
content = re.sub(
    r'className="bg-\[#FFC000\] border-l border-r border-black flex flex-col items-center justify-center text-\[8px\] font-bold w-\[45px\] mx-auto absolute left-\[50%\] -translate-x-\[50%\] h-\[35px\] top-0 z-10"',
    r'className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center text-[8px] font-bold w-[45px] mx-auto absolute left-[50%] -translate-x-[50%] h-[26px] top-0 z-10"',
    content
)

# text-[10.5px] -> text-[9px]
content = re.sub(r'text-\[10\.5px\]', 'text-[9px]', content)
# text-[13px] inside limits -> text-[9px]
# text-[14px] inside limits -> text-[9px]
# text-[7px] -> text-[6px]
content = re.sub(r'text-\[7px\]', 'text-[6px]', content)


# === DUO ROW COMPACTING (additional ones) ===
# Syarat legal row
content = re.sub(
    r'className="h-\[12px\] border-b border-black bg-\[#EAEFE3\] flex justify-between px-1 text-\[7\.5px\] text-\[#555\] relative"',
    r'className="h-[10px] border-b border-black bg-[#EAEFE3] flex items-center justify-between px-1 text-[6.5px] text-[#555] relative"',
    content
)
# Density row
content = re.sub(
    r'className="h-\[18px\] bg-white flex items-center px-1 text-\[8\.5px\] font-bold justify-between"',
    r'className="h-[14px] bg-white flex items-center px-1 text-[7.5px] font-bold justify-between"',
    content
)
# Duo Limit texts
content = content.replace('text-[14px]', 'text-[9.5px]')
content = content.replace('text-[13px]', 'text-[9.5px]')
content = content.replace('text-[8.5px]', 'text-[6px]')
content = content.replace('text-[8px]', 'text-[6px]')

# Fix small margin tops
content = re.sub(r'-mt-\[6px\]', '-mt-[2px]', content)
content = re.sub(r'mt-\[2px\]', 'mt-[1px]', content)
content = re.sub(r'mb-\[2px\]', 'mb-0', content)
content = re.sub(r'mb-\[1px\]', 'mb-0', content)
content = re.sub(r'pt-\[2px\]', 'pt-[1px]', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done compacting tables!")
