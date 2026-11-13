import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Canvas Container: clicking anywhere on the canvas background deselects and hides icons
old_canvas_click = """                    className="relative bg-[#EAEFE3] border border-[#CBD5E1] rounded overflow-hidden select-none"
                    style={{ width: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).width}px`, height: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).height}px` }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        setSelectedItemId(null);
                      }
                    }}"""

new_canvas_click = """                    className="relative bg-[#EAEFE3] border border-[#CBD5E1] rounded overflow-hidden select-none"
                    style={{ width: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).width}px`, height: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).height}px` }}
                    onClick={() => setSelectedItemId(null)}"""

if old_canvas_click in code:
    code = code.replace(old_canvas_click, new_canvas_click, 1)
    print("Updated canvas onClick to deselect on background click!")
else:
    print("ERROR: old_canvas_click not found")

# 2. Change handles condition to strictly selectedItemId === 'image'
old_handles_condition = "{(selectedItemId === 'image' || selectedItemId === null) && ("
new_handles_condition = "{selectedItemId === 'image' && ("

if old_handles_condition in code:
    code = code.replace(old_handles_condition, new_handles_condition, 1)
    print("Updated handle condition to strictly selectedItemId === 'image'!")
else:
    print("ERROR: old_handles_condition not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Applied perfect selection toggle!")
