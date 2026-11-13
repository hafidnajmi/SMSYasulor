import sys, re

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will isolate renderDuoRow and fix its sizes
idx_duo = content.find('const renderDuoRow')
idx_normal = content.find('const renderNormalRow')
if idx_normal == -1: idx_normal = content.find('const getShortPhaseName')

duo_chunk = content[idx_duo:idx_normal]

# Fix Duo chunk manually
duo_chunk = duo_chunk.replace('h-[14px]', 'h-[18px]')
duo_chunk = duo_chunk.replace('text-[9px]', 'text-[10px]') # Header

duo_chunk = duo_chunk.replace('h-[10px]', 'h-[12px]')
duo_chunk = duo_chunk.replace('text-[6.5px]', 'text-[7.5px]') # Syarat legal

duo_chunk = duo_chunk.replace('h-[11px]', 'h-[14px]')
duo_chunk = duo_chunk.replace('text-[7.5px]', 'text-[8px]') # Stop/Adjust row
duo_chunk = duo_chunk.replace('text-[7px]', 'text-[8px]') # If any

duo_chunk = duo_chunk.replace('h-[26px]', 'h-[35px]')
duo_chunk = duo_chunk.replace('text-[9px]', 'text-[11px]') # Limits grid container

duo_chunk = duo_chunk.replace('text-[9.5px]', 'text-[13px]') # The values were 13px mostly
# Make stopMin and nominal 14px again
duo_chunk = re.sub(r'\{limits\?\.stopMin\?\.toFixed\(1\) \?\? \'\'\}</span>', r"{limits?.stopMin?.toFixed(1) ?? ''}</span>", duo_chunk) # Will replace below
duo_chunk = duo_chunk.replace('<span className="text-[#003366] leading-none mb-0 text-[13px]">{limits?.stopMin', '<span className="text-[#003366] leading-none mb-[2px] text-[14px]">{limits?.stopMin')
duo_chunk = duo_chunk.replace('<span className="text-[#003366] leading-none mb-0 text-[13px]">{limits?.nominal', '<span className="text-[#003366] leading-none mb-[1px] text-[14px]">{limits?.nominal')

duo_chunk = duo_chunk.replace('text-[6px]', 'text-[8.5px]')
duo_chunk = duo_chunk.replace('text-[8px]', 'text-[13px]') # Revert LINK BOM maybe? Wait LINK BOM was 13px
# Specific link bom text
duo_chunk = duo_chunk.replace('<span className="leading-none text-[8.5px] text-[#555] font-normal">LINK BOM</span>', '<span className="leading-none text-[6.5px] text-[#555] font-normal">LINK BOM</span>')
duo_chunk = duo_chunk.replace('<span className="text-black font-bold text-[8.5px] leading-none absolute bottom-[1px] right-[10px]">max</span>', '<span className="text-black font-bold text-[8px] leading-none absolute bottom-[1px] right-[10px]">max</span>')

content = content[:idx_duo] + duo_chunk + content[idx_normal:]

# Now fix the rest of the file (before renderBiphaseRow and after getShortPhaseName)
idx_biphase = content.find('const renderBiphaseRow')
before_biphase = content[:idx_biphase]
after_duo = content[idx_normal:]

# Fix text-[9.5px] back to text-[13px] EXCEPT JUMLAH NOZZLE
def fix_95(text):
    return text.replace('text-[9.5px]', 'text-[13px]').replace('JUMLAH NOZZLE <div className="text-[#1E3A8A] font-bold text-[13px]">', 'JUMLAH NOZZLE <div className="text-[#1E3A8A] font-bold text-[9.5px]">')

before_biphase = before_biphase.replace('text-[9.5px]', 'text-[13px]')
# Revert JUMLAH NOZZLE
before_biphase = before_biphase.replace('className="text-[#1E3A8A] font-bold text-[13px]">JUMLAH NOZZLE', 'className="text-[#1E3A8A] font-bold text-[9.5px]">JUMLAH NOZZLE')
# Revert description uppercase
before_biphase = before_biphase.replace('className="font-bold text-[13px] text-[#0078D4] mb-[4px] uppercase"', 'className="font-bold text-[13px] text-[#0078D4] mb-[4px] uppercase"')

after_duo = after_duo.replace('text-[9.5px]', 'text-[13px]')

content = before_biphase + content[idx_biphase:idx_normal] + after_duo

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done fixing global replacements and duo row!")
