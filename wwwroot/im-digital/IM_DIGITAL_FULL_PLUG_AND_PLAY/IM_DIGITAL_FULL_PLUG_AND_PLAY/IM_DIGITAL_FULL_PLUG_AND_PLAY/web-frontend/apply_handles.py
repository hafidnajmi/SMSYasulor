file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Replace the Canvas Container in activePoleModal
canvas_search_old = """                  {/* Canvas + Paletload Side Panel Area */}
                  <div className="flex items-start justify-center">
                    {/* Canvas Container */}
                    <div
                      className="relative bg-[#EAEFE3] border border-[#CBD5E1] rounded overflow-hidden select-none"
                      style={{ width: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).width}px`, height: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).height}px` }}
                      onClick={() => setSelectedItemId(null)}
                    >
                      {/* Background Image with Rotation */}
                      {modalImageSrc && (
                        <div className="absolute inset-0 flex items-center justify-center p-3 pointer-events-none">
                          <img
                            src={modalImageSrc}
                            alt="Pole Background"
                            style={{
                              transform: `rotate(${modalRotation}deg)`,
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                      )}

                      {/* Paletload Live Badge Overlay (Top Left) */}
                      {activePoleModal.isPaletload && (
                        <div className="absolute top-2 left-3 text-[11px] font-bold text-[#0F172A] space-y-0.5 pointer-events-none z-10">
                          <div>Outer Boxes per layer &nbsp;~ &nbsp;{paletloadOuterBox || '...'} Box</div>
                          <div>Layers count &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~ &nbsp;{paletloadLayers || '...'} Layers</div>
                          <div>FG per pallet &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~ &nbsp;{paletloadFg || '...'} Pcs</div>
                        </div>
                      )}

                      {/* Annotations Layer */}"""

canvas_replace_new = """                  {/* Canvas + Paletload Side Panel Area */}
                  <div className="flex items-start justify-center">
                    {/* Canvas Container */}
                    <div
                      className="relative bg-[#EAEFE3] border border-[#CBD5E1] rounded overflow-hidden select-none"
                      style={{ width: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).width}px`, height: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).height}px` }}
                      onClick={() => setSelectedItemId(null)}
                      onMouseMove={(e) => {
                        if (!dragState) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const curX = e.clientX - rect.left;
                        const curY = e.clientY - rect.top;
                        const dx = curX - dragState.startX;
                        const dy = curY - dragState.startY;

                        if (dragState.mode === 'drag-image') {
                          setModalImageState((prev) => ({
                            ...prev,
                            left: Math.round(dragState.initLeft + dx),
                            top: Math.round(dragState.initTop + dy)
                          }));
                        } else if (dragState.mode === 'scale-image') {
                          const handle = dragState.handle;
                          const aspect = (dragState.initWidth || 100) / (dragState.initHeight || 100);

                          let newW = dragState.initWidth;
                          let newH = dragState.initHeight;
                          let newL = dragState.initLeft;
                          let newT = dragState.initTop;

                          if (handle === 'br') {
                            newW = Math.max(50, dragState.initWidth + dx);
                            newH = Math.round(newW / aspect);
                          } else if (handle === 'bl') {
                            newW = Math.max(50, dragState.initWidth - dx);
                            newH = Math.round(newW / aspect);
                            newL = dragState.initLeft + (dragState.initWidth - newW);
                          } else if (handle === 'tr') {
                            newW = Math.max(50, dragState.initWidth + dx);
                            newH = Math.round(newW / aspect);
                            newT = dragState.initTop + (dragState.initHeight - newH);
                          } else if (handle === 'tl') {
                            newW = Math.max(50, dragState.initWidth - dx);
                            newH = Math.round(newW / aspect);
                            newL = dragState.initLeft + (dragState.initWidth - newW);
                            newT = dragState.initTop + (dragState.initHeight - newH);
                          }

                          // Maintain proportional crop
                          const scaleRatio = newW / dragState.initWidth;
                          setModalImageState((prev) => ({
                            ...prev,
                            left: Math.round(newL),
                            top: Math.round(newT),
                            width: Math.round(newW),
                            height: Math.round(newH),
                            cropLeft: Math.round(dragState.initCropL * scaleRatio),
                            cropTop: Math.round(dragState.initCropT * scaleRatio),
                            cropRight: Math.round(dragState.initCropR * scaleRatio),
                            cropBottom: Math.round(dragState.initCropB * scaleRatio)
                          }));
                        } else if (dragState.mode === 'crop-image') {
                          const handle = dragState.handle;
                          setModalImageState((prev) => {
                            let cl = dragState.initCropL;
                            let ct = dragState.initCropT;
                            let cr = dragState.initCropR;
                            let cb = dragState.initCropB;

                            if (handle === 'top') {
                              ct = Math.max(0, Math.min(prev.height - cb - 15, dragState.initCropT + dy));
                            } else if (handle === 'bottom') {
                              cb = Math.max(0, Math.min(prev.height - ct - 15, dragState.initCropB - dy));
                            } else if (handle === 'left') {
                              cl = Math.max(0, Math.min(prev.width - cr - 15, dragState.initCropL + dx));
                            } else if (handle === 'right') {
                              cr = Math.max(0, Math.min(prev.width - cl - 15, dragState.initCropR - dx));
                            }

                            return {
                              ...prev,
                              cropLeft: Math.round(cl),
                              cropTop: Math.round(ct),
                              cropRight: Math.round(cr),
                              cropBottom: Math.round(cb)
                            };
                          });
                        } else if (dragState.mode === 'drag-annotation' && dragState.initItem) {
                          const itemId = dragState.initItem.id;
                          setModalAnnotations((prev) =>
                            prev.map((a) => {
                              if (a.id !== itemId) return a;
                              if (a.type === 'arrow' || a.type === 'dimension') {
                                return {
                                  ...a,
                                  x1: dragState.initItem.x1 + dx,
                                  y1: dragState.initItem.y1 + dy,
                                  x2: dragState.initItem.x2 + dx,
                                  y2: dragState.initItem.y2 + dy
                                };
                              }
                              return {
                                ...a,
                                x: dragState.initItem.x + dx,
                                y: dragState.initItem.y + dy
                              };
                            })
                          );
                        }
                      }}
                      onMouseUp={() => setDragState(null)}
                      onMouseLeave={() => setDragState(null)}
                    >
                      {/* Interactive Image with Drag, Scale, and Crop */}
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

                          {/* Crop Mask Overlays when selected */}
                          {selectedItemId === 'image' && (
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
                              )}

                              {/* Selection Frame (Solid Blue Border around active cropped box) */}
                              <div
                                className="absolute border-2 border-[#2563EB] pointer-events-none"
                                style={{
                                  left: `${modalImageState.cropLeft}px`,
                                  top: `${modalImageState.cropTop}px`,
                                  width: `${Math.max(1, modalImageState.width - modalImageState.cropLeft - modalImageState.cropRight)}px`,
                                  height: `${Math.max(1, modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom)}px`
                                }}
                              />

                              {/* 4 Corner Resize Handles (Circles for Proportional Scaling) */}
                              {/* Top-Left */}
                              <div
                                className="absolute w-3 h-3 bg-white border-2 border-[#2563EB] rounded-full shadow cursor-nwse-resize z-30 -translate-x-1/2 -translate-y-1/2"
                                style={{ left: `${modalImageState.cropLeft}px`, top: `${modalImageState.cropTop}px` }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'scale-image',
                                    handle: 'tl',
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
                              />
                              {/* Top-Right */}
                              <div
                                className="absolute w-3 h-3 bg-white border-2 border-[#2563EB] rounded-full shadow cursor-nesw-resize z-30 translate-x-1/2 -translate-y-1/2"
                                style={{ left: `${modalImageState.width - modalImageState.cropRight}px`, top: `${modalImageState.cropTop}px` }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'scale-image',
                                    handle: 'tr',
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
                              />
                              {/* Bottom-Left */}
                              <div
                                className="absolute w-3 h-3 bg-white border-2 border-[#2563EB] rounded-full shadow cursor-nesw-resize z-30 -translate-x-1/2 translate-y-1/2"
                                style={{ left: `${modalImageState.cropLeft}px`, top: `${modalImageState.height - modalImageState.cropBottom}px` }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'scale-image',
                                    handle: 'bl',
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
                              />
                              {/* Bottom-Right */}
                              <div
                                className="absolute w-3 h-3 bg-white border-2 border-[#2563EB] rounded-full shadow cursor-nwse-resize z-30 translate-x-1/2 translate-y-1/2"
                                style={{ left: `${modalImageState.width - modalImageState.cropRight}px`, top: `${modalImageState.height - modalImageState.cropBottom}px` }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'scale-image',
                                    handle: 'br',
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
                              />

                              {/* 4 Edge Crop Handles (Rounded Pills for Cropping) */}
                              {/* Top Edge */}
                              <div
                                className="absolute h-1.5 w-5 bg-white border-[1.5px] border-[#2563EB] rounded-full shadow cursor-ns-resize z-25 -translate-x-1/2 -translate-y-1/2"
                                style={{
                                  left: `${modalImageState.cropLeft + (modalImageState.width - modalImageState.cropLeft - modalImageState.cropRight) / 2}px`,
                                  top: `${modalImageState.cropTop}px`
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'crop-image',
                                    handle: 'top',
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
                              />
                              {/* Bottom Edge */}
                              <div
                                className="absolute h-1.5 w-5 bg-white border-[1.5px] border-[#2563EB] rounded-full shadow cursor-ns-resize z-25 -translate-x-1/2 translate-y-1/2"
                                style={{
                                  left: `${modalImageState.cropLeft + (modalImageState.width - modalImageState.cropLeft - modalImageState.cropRight) / 2}px`,
                                  top: `${modalImageState.height - modalImageState.cropBottom}px`
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'crop-image',
                                    handle: 'bottom',
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
                              />
                              {/* Left Edge */}
                              <div
                                className="absolute w-1.5 h-5 bg-white border-[1.5px] border-[#2563EB] rounded-full shadow cursor-ew-resize z-25 -translate-x-1/2 -translate-y-1/2"
                                style={{
                                  left: `${modalImageState.cropLeft}px`,
                                  top: `${modalImageState.cropTop + (modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom) / 2}px`
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'crop-image',
                                    handle: 'left',
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
                              />
                              {/* Right Edge */}
                              <div
                                className="absolute w-1.5 h-5 bg-white border-[1.5px] border-[#2563EB] rounded-full shadow cursor-ew-resize z-25 translate-x-1/2 -translate-y-1/2"
                                style={{
                                  left: `${modalImageState.width - modalImageState.cropRight}px`,
                                  top: `${modalImageState.cropTop + (modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom) / 2}px`
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'crop-image',
                                    handle: 'right',
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
                              />
                            </>
                          )}
                        </div>
                      )}

                      {/* Paletload Live Badge Overlay (Top Left) */}
                      {activePoleModal.isPaletload && (
                        <div className="absolute top-2 left-3 text-[11px] font-bold text-[#0F172A] space-y-0.5 pointer-events-none z-10">
                          <div>Outer Boxes per layer &nbsp;~ &nbsp;{paletloadOuterBox || '...'} Box</div>
                          <div>Layers count &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~ &nbsp;{paletloadLayers || '...'} Layers</div>
                          <div>FG per pallet &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~ &nbsp;{paletloadFg || '...'} Pcs</div>
                        </div>
                      )}

                      {/* Annotations Layer */}"""

code = code.replace(canvas_search_old, canvas_replace_new, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Applied interactive image controls successfully!")
