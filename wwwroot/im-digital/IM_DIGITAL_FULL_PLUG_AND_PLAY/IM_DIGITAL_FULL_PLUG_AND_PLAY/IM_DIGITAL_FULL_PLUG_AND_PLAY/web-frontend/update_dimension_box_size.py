import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Canvas export sizing in handleSavePoleResult
old_save_box = """              ctx.font = 'bold 11px Segoe UI, sans-serif';
              const textW = ctx.measureText(item.text || '').width;
              const boxW = textW + 10;
              const boxH = 16;"""

new_save_box = """              ctx.font = 'bold 10px Segoe UI, sans-serif';
              const textW = ctx.measureText(item.text || '').width;
              const boxW = textW + 5;
              const boxH = 13;"""

if old_save_box in code:
    code = code.replace(old_save_box, new_save_box, 1)
    print("Updated canvas export dimension box size!")
else:
    print("ERROR: old_save_box not found")

# 2. HTML overlay Dimension box
old_html_box = """                          <div
                            key={item.id}
                            className={`absolute bg-white px-2 py-0.5 text-[11px] font-bold border border-[#DC2626] rounded-[1px] shadow-sm cursor-move select-none z-20 ${isSelected ? 'ring-2 ring-[#2563EB]' : ''}`}
                            style={{
                              left: `${midX}px`,
                              top: `${midY}px`,
                              transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                              transformOrigin: 'center center',
                              color: item.color || '#DC2626'
                            }}"""

new_html_box = """                          <div
                            key={item.id}
                            className={`absolute bg-white text-[10px] font-bold border border-[#DC2626] rounded-[1px] cursor-move select-none z-20 leading-none ${isSelected ? 'ring-2 ring-[#2563EB]' : ''}`}
                            style={{
                              left: `${midX}px`,
                              top: `${midY}px`,
                              padding: '1px 3px',
                              transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                              transformOrigin: 'center center',
                              color: item.color || '#DC2626'
                            }}"""

if old_html_box in code:
    code = code.replace(old_html_box, new_html_box, 1)
    print("Updated HTML dimension box size to match screenshot!")
else:
    print("ERROR: old_html_box not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Applied dimension box compact size successfully!")
