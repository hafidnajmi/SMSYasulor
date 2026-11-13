import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Remove the dimmed background ghost completely
old_dimmed = """                        {/* Dimmed Background of the Full Uncropped Image (Visible during crop) */}
                        {(modalImageState.cropLeft > 0 || modalImageState.cropTop > 0 || modalImageState.cropRight > 0 || modalImageState.cropBottom > 0) && (
                          <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
                            <img
                              src={modalImageState.src}
                              alt="Pole Image Dimmed"
                              draggable={false}
                              style={{
                                width: `${modalImageState.width}px`,
                                height: `${modalImageState.height}px`,
                                maxWidth: 'none',
                                maxHeight: 'none',
                                minWidth: `${modalImageState.width}px`,
                                minHeight: `${modalImageState.height}px`,
                                transform: `rotate(${modalRotation}deg)`,
                                transformOrigin: 'center center'
                              }}
                            />
                          </div>
                        )}"""

new_dimmed = """                        {/* Clean Crop - No ghost or dimmed uncropped portion */}"""

if old_dimmed in code:
    code = code.replace(old_dimmed, new_dimmed, 1)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Cleaned up crop ghost successfully!")
else:
    print("ERROR: old_dimmed not found")
