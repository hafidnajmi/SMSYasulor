import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: LipEyeVolumeBlock height
old_vol_bg = """<div className="flex flex-col bg-[#FAEAD6] pt-[1px] pb-[1px] relative h-[18px]">"""
new_vol_bg = """<div className="flex flex-col bg-[#FAEAD6] pt-[1px] pb-[4px] relative min-h-[22px]">"""
content = content.replace(old_vol_bg, new_vol_bg)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed clipped text and overflowing yellow box!")
