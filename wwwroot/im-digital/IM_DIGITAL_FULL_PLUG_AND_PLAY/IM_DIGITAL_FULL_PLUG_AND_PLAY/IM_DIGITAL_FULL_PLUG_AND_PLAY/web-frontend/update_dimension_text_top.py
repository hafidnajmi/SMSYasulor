import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Canvas Export Dimension in handleSavePoleResult
old_save_dim_box = """              // Center text box with red border aligned dynamically with dimension angle
              const midX = (item.x1 + item.x2) / 2;
              const midY = (item.y1 + item.y2) / 2;
              let deg = (angle * 180) / Math.PI;
              if (deg > 90) deg -= 180;
              if (deg < -90) deg += 180;
              const rad = (deg * Math.PI) / 180;"""

new_save_dim_box = """              // Center text box with red border: vertical has "10" always on top (90 deg)
              const midX = (item.x1 + item.x2) / 2;
              const midY = (item.y1 + item.y2) / 2;
              const dx = item.x2 - item.x1;
              const dy = item.y2 - item.y1;
              let deg = Math.abs(dy) > Math.abs(dx) ? 90 : 0;
              const rad = (deg * Math.PI) / 180;"""

if old_save_dim_box in code:
    code = code.replace(old_save_dim_box, new_save_dim_box, 1)
    print("Updated canvas export dimension text orientation!")
else:
    print("ERROR: old_save_dim_box not found")

# 2. HTML overlay Dimension in page.tsx
old_html_dim_box = """                      if (item.type === 'dimension') {
                        const midX = (item.x1 + item.x2) / 2;
                        const midY = (item.y1 + item.y2) / 2;
                        const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                        let deg = (angle * 180) / Math.PI;
                        if (deg > 90) deg -= 180;
                        if (deg < -90) deg += 180;"""

new_html_dim_box = """                      if (item.type === 'dimension') {
                        const midX = (item.x1 + item.x2) / 2;
                        const midY = (item.y1 + item.y2) / 2;
                        const dx = item.x2 - item.x1;
                        const dy = item.y2 - item.y1;
                        const deg = Math.abs(dy) > Math.abs(dx) ? 90 : 0;"""

if old_html_dim_box in code:
    code = code.replace(old_html_dim_box, new_html_dim_box, 1)
    print("Updated HTML dimension text box orientation so 10 is always on top!")
else:
    print("ERROR: old_html_dim_box not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Applied update_dimension_text_top successfully!")
