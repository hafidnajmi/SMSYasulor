import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Replace the interactive image rendering structure with full CSS non-squish guarantees and proper layering
old_crop_struct = """                    {/* Interactive Image with Drag, Scale, and Crop */}
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
                        {/* Visible Cropped Image Content */}
                        <div
                          className="absolute overflow-hidden cursor-move"
                          style={{
                            left: `${modalImageState.cropLeft}px`,
                            top: `${modalImageState.cropTop}px`,
                            width: `${Math.max(1, modalImageState.width - modalImageState.cropLeft - modalImageState.cropRight)}px`,
                            height: `${Math.max(1, modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom)}px`
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedItemId('image');
                            const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                            if (!rect) return;
                            setDragState({
                              mode: 'drag-image',
                              startX: e.clientX - rect.left,
                              startY: e.clientY - rect.top,
                              initLeft: modalImageState.left,
                              initTop: modalImageState.top,
                              initWidth: modalImageState.width,
                              initHeight: modalImageState.height,
                              initCropL: modalImageState.cropLeft,
                              initCropT: modalImageState.cropTop,
                              initCropR: modalImageState.cropRight,
                              initCropB: modalImageState.cropBottom
                            });
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            // Reset crop on double click
                            setModalImageState((prev) => ({
                              ...prev,
                              cropLeft: 0,
                              cropTop: 0,
                              cropRight: 0,
                              cropBottom: 0
                            }));
                          }}
                          onWheel={(e) => {
                            e.stopPropagation();
                            const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
                            setModalImageState((prev) => {
                              const newW = Math.max(60, Math.min(1600, prev.width * zoomFactor));
                              const newH = Math.max(40, Math.min(1200, prev.height * zoomFactor));
                              const scaleR = newW / prev.width;
                              return {
                                ...prev,
                                width: Math.round(newW),
                                height: Math.round(newH),
                                cropLeft: Math.round(prev.cropLeft * scaleR),
                                cropTop: Math.round(prev.cropTop * scaleR),
                                cropRight: Math.round(prev.cropRight * scaleR),
                                cropBottom: Math.round(prev.cropBottom * scaleR)
                              };
                            });
                          }}
                        >
                          <img
                            src={modalImageState.src}
                            alt="Pole Image"
                            draggable={false}
                            style={{
                              position: 'absolute',
                              left: `-${modalImageState.cropLeft}px`,
                              top: `-${modalImageState.cropTop}px`,
                              width: `${modalImageState.width}px`,
                              height: `${modalImageState.height}px`,
                              transform: `rotate(${modalRotation}deg)`,
                              transformOrigin: 'center center',
                              pointerEvents: 'none'
                            }}
                          />
                        </div>

                        {/* Crop Mask Overlays and Handles when selected or always active */}
                        {(selectedItemId === 'image' || selectedItemId === null) && (
                          <>
                            {/* Top mask */}
                            {modalImageState.cropTop > 0 && (
                              <div
                                className="absolute bg-black/40 pointer-events-none"
                                style={{
                                  left: 0,
                                  top: 0,
                                  width: `${modalImageState.width}px`,
                                  height: `${modalImageState.cropTop}px`
                                }}
                              />
                            )}
                            {/* Bottom mask */}
                            {modalImageState.cropBottom > 0 && (
                              <div
                                className="absolute bg-black/40 pointer-events-none"
                                style={{
                                  left: 0,
                                  bottom: 0,
                                  width: `${modalImageState.width}px`,
                                  height: `${modalImageState.cropBottom}px`
                                }}
                              />
                            )}
                            {/* Left mask */}
                            {modalImageState.cropLeft > 0 && (
                              <div
                                className="absolute bg-black/40 pointer-events-none"
                                style={{
                                  left: 0,
                                  top: `${modalImageState.cropTop}px`,
                                  width: `${modalImageState.cropLeft}px`,
                                  height: `${modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom}px`
                                }}
                              />
                            )}
                            {/* Right mask */}
                            {modalImageState.cropRight > 0 && (
                              <div
                                className="absolute bg-black/40 pointer-events-none"
                                style={{
                                  right: 0,
                                  top: `${modalImageState.cropTop}px`,
                                  width: `${modalImageState.cropRight}px`,
                                  height: `${modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom}px`
                                }}
                              />
                            )}"""

new_crop_struct = """                    {/* Interactive Image with Drag, Scale, and Crop */}
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
                        {/* Dimmed Background of the Full Uncropped Image (Visible during crop) */}
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
                        )}

                        {/* Visible Cropped Image Content (Crisp, 100% Opacity) */}
                        <div
                          className="absolute overflow-hidden cursor-move z-10"
                          style={{
                            left: `${modalImageState.cropLeft}px`,
                            top: `${modalImageState.cropTop}px`,
                            width: `${Math.max(1, modalImageState.width - modalImageState.cropLeft - modalImageState.cropRight)}px`,
                            height: `${Math.max(1, modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom)}px`
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedItemId('image');
                            const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                            if (!rect) return;
                            setDragState({
                              mode: 'drag-image',
                              startX: e.clientX - rect.left,
                              startY: e.clientY - rect.top,
                              initLeft: modalImageState.left,
                              initTop: modalImageState.top,
                              initWidth: modalImageState.width,
                              initHeight: modalImageState.height,
                              initCropL: modalImageState.cropLeft,
                              initCropT: modalImageState.cropTop,
                              initCropR: modalImageState.cropRight,
                              initCropB: modalImageState.cropBottom
                            });
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            // Reset crop on double click
                            setModalImageState((prev) => ({
                              ...prev,
                              cropLeft: 0,
                              cropTop: 0,
                              cropRight: 0,
                              cropBottom: 0
                            }));
                          }}
                          onWheel={(e) => {
                            e.stopPropagation();
                            const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
                            setModalImageState((prev) => {
                              const newW = Math.max(60, Math.min(1600, prev.width * zoomFactor));
                              const newH = Math.max(40, Math.min(1200, prev.height * zoomFactor));
                              const scaleR = newW / prev.width;
                              return {
                                ...prev,
                                width: Math.round(newW),
                                height: Math.round(newH),
                                cropLeft: Math.round(prev.cropLeft * scaleR),
                                cropTop: Math.round(prev.cropTop * scaleR),
                                cropRight: Math.round(prev.cropRight * scaleR),
                                cropBottom: Math.round(prev.cropBottom * scaleR)
                              };
                            });
                          }}
                        >
                          <img
                            src={modalImageState.src}
                            alt="Pole Image"
                            draggable={false}
                            style={{
                              position: 'absolute',
                              left: `-${modalImageState.cropLeft}px`,
                              top: `-${modalImageState.cropTop}px`,
                              width: `${modalImageState.width}px`,
                              height: `${modalImageState.height}px`,
                              maxWidth: 'none',
                              maxHeight: 'none',
                              minWidth: `${modalImageState.width}px`,
                              minHeight: `${modalImageState.height}px`,
                              transform: `rotate(${modalRotation}deg)`,
                              transformOrigin: `${modalImageState.width / 2}px ${modalImageState.height / 2}px`,
                              pointerEvents: 'none'
                            }}
                          />
                        </div>

                        {/* Handles and Selection Border */}
                        {(selectedItemId === 'image' || selectedItemId === null) && (
                          <>"""

if old_crop_struct in code:
    code = code.replace(old_crop_struct, new_crop_struct, 1)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Fixed crop rendering without image squash!")
else:
    print("ERROR: old_crop_struct not found")
