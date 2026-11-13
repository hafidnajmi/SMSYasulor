import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix subtitle
content = content.replace(
    '<p className="text-[9px] text-[#333333] leading-relaxed">',
    '<p className="text-[13px] text-[#333333] leading-relaxed">'
)

# Fix button 1
content = content.replace(
    'className="px-4 py-1.5 bg-white border border-[#CCCCCC] text-[#333333] hover:bg-[#E5E5E5] text-[9px] transition-colors"',
    'className="px-6 py-2 bg-white border border-[#CCCCCC] text-[#333333] hover:bg-[#E5E5E5] text-[12px] font-medium transition-colors"'
)

# Fix button 2
content = content.replace(
    'className="px-4 py-1.5 bg-white border border-[#0078D4] text-[#0078D4] hover:bg-[#E5F1FB] font-semibold text-[9px] transition-colors focus:ring-1 focus:ring-[#0078D4] focus:outline-none"',
    'className="px-6 py-2 bg-white border border-[#0078D4] text-[#0078D4] hover:bg-[#E5F1FB] font-semibold text-[12px] transition-colors focus:ring-1 focus:ring-[#0078D4] focus:outline-none"'
)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated web frontend modal font sizes!")
