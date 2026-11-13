import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Remove mb-1 from LipEyeBeratBlock container
old_berat_container = """<div className="flex flex-col border border-black w-full mb-1">"""
new_berat_container = """<div className="flex flex-col border-b border-l border-r border-black w-full">"""
content = content.replace(old_berat_container, new_berat_container)

# Fix 2: Remove mb-1 from LipEyeVolumeBlock container and fix background + height
# Find renderLipEyeVolumeBlock
block_start = content.find("const renderLipEyeVolumeBlock =")
if block_start != -1:
    block_end = content.find("};", block_start)
    block_content = content[block_start:block_end]
    
    new_block_content = block_content.replace(
        """<div className="flex flex-col border border-black w-full mb-1">""",
        """<div className="flex flex-col border-b border-l border-r border-black w-full">"""
    )
    new_block_content = new_block_content.replace(
        """<div className="grid grid-cols-5 text-center bg-[#EAEFE3] h-[28px] relative items-center">""",
        """<div className="grid grid-cols-5 text-center bg-[#FAEAD6] h-[20px] relative items-center">"""
    )
    content = content[:block_start] + new_block_content + content[block_end:]


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed LipEye gaps and volume row heights!")
