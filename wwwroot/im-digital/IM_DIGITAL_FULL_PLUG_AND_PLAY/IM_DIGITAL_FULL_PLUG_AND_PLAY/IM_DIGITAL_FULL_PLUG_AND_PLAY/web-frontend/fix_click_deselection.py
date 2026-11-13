import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update Canvas Container onClick so it only deselects when explicitly clicking on the background canvas
old_canvas_click = """                    className="relative bg-[#EAEFE3] border border-[#CBD5E1] rounded overflow-hidden select-none"
                    style={{ width: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).width}px`, height: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).height}px` }}
                    onClick={() => setSelectedItemId(null)}"""

new_canvas_click = """                    className="relative bg-[#EAEFE3] border border-[#CBD5E1] rounded overflow-hidden select-none"
                    style={{ width: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).width}px`, height: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).height}px` }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        setSelectedItemId(null);
                      }
                    }}"""

if old_canvas_click in code:
    code = code.replace(old_canvas_click, new_canvas_click, 1)
    print("Fixed canvas background onClick!")
else:
    print("ERROR: old_canvas_click not found")

# 2. Add onClick with stopPropagation and setSelectedItemId('image') to outer image div and cropped content div
old_image_divs = """                    {/* Interactive Image with Drag, Scale, and Crop */}
                    {modalImageState.src && (
                      <div
                        className="absolute"
                        style={{
                          left: `${modalImageState.left}px`,
                          top: `${modalImageState.top}px`,
                          width: `${modalImageState.width}px`,
                          height: `${modalImageState.height}px`
                        }}
                      >
                        {/* Clean Crop - No ghost or dimmed uncropped portion */}

                        {/* Visible Cropped Image Content (Crisp, 100% Opacity) */}
                        <div
                          className="absolute overflow-hidden cursor-move z-10"
                          style={{
                            left: `${modalImageState.cropLeft}px`,
                            top: `${modalImageState.cropTop}px`,
                            width: `${Math.max(1, modalImageState.width - modalImageState.cropLeft - modalImageState.cropRight)}px`,
                            height: `${Math.max(1, modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom)}px`
                          }}"""

new_image_divs = """                    {/* Interactive Image with Drag, Scale, and Crop */}
                    {modalImageState.src && (
                      <div
                        className="absolute"
                        style={{
                          left: `${modalImageState.left}px`,
                          top: `${modalImageState.top}px`,
                          width: `${modalImageState.width}px`,
                          height: `${modalImageState.height}px`
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItemId('image');
                        }}
                      >
                        {/* Clean Crop - No ghost or dimmed uncropped portion */}

                        {/* Visible Cropped Image Content (Crisp, 100% Opacity) */}
                        <div
                          className="absolute overflow-hidden cursor-move z-10"
                          style={{
                            left: `${modalImageState.cropLeft}px`,
                            top: `${modalImageState.cropTop}px`,
                            width: `${Math.max(1, modalImageState.width - modalImageState.cropLeft - modalImageState.cropRight)}px`,
                            height: `${Math.max(1, modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom)}px`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemId('image');
                          }}"""

if old_image_divs in code:
    code = code.replace(old_image_divs, new_image_divs, 1)
    print("Fixed image onClick stopPropagation!")
else:
    print("ERROR: old_image_divs not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Applied fix_click_deselection successfully!")
