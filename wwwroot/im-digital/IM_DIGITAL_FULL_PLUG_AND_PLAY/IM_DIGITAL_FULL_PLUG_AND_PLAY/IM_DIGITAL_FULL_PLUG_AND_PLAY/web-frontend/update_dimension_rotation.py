import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update Canvas export drawing in handleSavePoleResult
old_save_dim_box = """              // Center text box with red border (exact reference screenshot match)
              const midX = (item.x1 + item.x2) / 2;
              const midY = (item.y1 + item.y2) / 2;
              ctx.font = 'bold 11px Segoe UI, sans-serif';
              const textW = ctx.measureText(item.text || '').width;
              const boxW = textW + 10;
              const boxH = 16;

              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
              ctx.strokeStyle = item.color || '#DC2626';
              ctx.lineWidth = 1;
              ctx.strokeRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);

              ctx.fillStyle = item.color || '#DC2626';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(item.text || '', midX, midY);"""

new_save_dim_box = """              // Center text box with red border aligned dynamically with dimension angle
              const midX = (item.x1 + item.x2) / 2;
              const midY = (item.y1 + item.y2) / 2;
              let deg = (angle * 180) / Math.PI;
              if (deg > 90) deg -= 180;
              if (deg < -90) deg += 180;
              const rad = (deg * Math.PI) / 180;

              ctx.font = 'bold 11px Segoe UI, sans-serif';
              const textW = ctx.measureText(item.text || '').width;
              const boxW = textW + 10;
              const boxH = 16;

              ctx.save();
              ctx.translate(midX, midY);
              ctx.rotate(rad);
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
              ctx.strokeStyle = item.color || '#DC2626';
              ctx.lineWidth = 1;
              ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

              ctx.fillStyle = item.color || '#DC2626';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(item.text || '', 0, 0);
              ctx.restore();"""

if old_save_dim_box in code:
    code = code.replace(old_save_dim_box, new_save_dim_box, 1)
    print("Updated canvas export dimension text rotation!")
else:
    print("ERROR: old_save_dim_box not found")

# 2. Update HTML overlay for Dimension text box
old_html_dim_box = """                      if (item.type === 'dimension') {
                        const midX = (item.x1 + item.x2) / 2;
                        const midY = (item.y1 + item.y2) / 2;
                        return (
                          <div
                            key={item.id}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-0.5 text-[11px] font-bold border border-[#DC2626] rounded-[1px] shadow-sm cursor-move select-none z-20 ${isSelected ? 'ring-2 ring-[#2563EB]' : ''}`}
                            style={{ left: `${midX}px`, top: `${midY}px`, color: item.color || '#DC2626' }}"""

new_html_dim_box = """                      if (item.type === 'dimension') {
                        const midX = (item.x1 + item.x2) / 2;
                        const midY = (item.y1 + item.y2) / 2;
                        const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                        let deg = (angle * 180) / Math.PI;
                        if (deg > 90) deg -= 180;
                        if (deg < -90) deg += 180;

                        return (
                          <div
                            key={item.id}
                            className={`absolute bg-white px-2 py-0.5 text-[11px] font-bold border border-[#DC2626] rounded-[1px] shadow-sm cursor-move select-none z-20 ${isSelected ? 'ring-2 ring-[#2563EB]' : ''}`}
                            style={{
                              left: `${midX}px`,
                              top: `${midY}px`,
                              transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                              transformOrigin: 'center center',
                              color: item.color || '#DC2626'
                            }}"""

if old_html_dim_box in code:
    code = code.replace(old_html_dim_box, new_html_dim_box, 1)
    print("Updated HTML dimension text box rotation to match angle!")
else:
    print("ERROR: old_html_dim_box not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Applied update_dimension_rotation successfully!")
