import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Fix canvas container onClick so it only deselects when clicking directly on the canvas background
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

# 2. Make handles keep selection, stop propagation, and have generous touch/click hitboxes
old_handles_render = """                        {/* Handles and Selection Border */}
                        {selectedItemId === 'image' && (
                          <>

                            {/* Selection Frame (Exact match: 2px solid blue border) */}
                            <div
                              className="absolute border-2 border-[#2563EB] pointer-events-none"
                              style={{
                                left: `${modalImageState.cropLeft}px`,
                                top: `${modalImageState.cropTop}px`,
                                width: `${Math.max(1, modalImageState.width - modalImageState.cropLeft - modalImageState.cropRight)}px`,
                                height: `${Math.max(1, modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom)}px`
                              }}
                            />

                            {/* 4 Corner Resize Handles (White circles with 2px blue ring border) */}
                            {/* Top-Left */}
                            <div
                              className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nwse-resize z-30 -translate-x-1/2 -translate-y-1/2"
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
                              className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nesw-resize z-30 -translate-x-1/2 -translate-y-1/2"
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
                              className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nesw-resize z-30 -translate-x-1/2 -translate-y-1/2"
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
                              className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nwse-resize z-30 -translate-x-1/2 -translate-y-1/2"
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

                            {/* 4 Edge Crop Handles (Pill capsules with 2px blue border matching screenshot) */}
                            {/* Top Edge Pill */}
                            <div
                              className="absolute w-[24px] h-[7px] bg-white border-2 border-[#2563EB] rounded-full cursor-ns-resize z-25 -translate-x-1/2 -translate-y-1/2"
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
                            {/* Bottom Edge Pill */}
                            <div
                              className="absolute w-[24px] h-[7px] bg-white border-2 border-[#2563EB] rounded-full cursor-ns-resize z-25 -translate-x-1/2 -translate-y-1/2"
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
                            {/* Left Edge Pill */}
                            <div
                              className="absolute w-[7px] h-[24px] bg-white border-2 border-[#2563EB] rounded-full cursor-ew-resize z-25 -translate-x-1/2 -translate-y-1/2"
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
                            {/* Right Edge Pill */}
                            <div
                              className="absolute w-[7px] h-[24px] bg-white border-2 border-[#2563EB] rounded-full cursor-ew-resize z-25 -translate-x-1/2 -translate-y-1/2"
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
                        )}"""

new_handles_render = """                        {/* Handles and Selection Border */}
                        {(selectedItemId === 'image' || selectedItemId === null) && (
                          <div
                            className="absolute inset-0 pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Selection Frame (Exact match: 2px solid blue border) */}
                            <div
                              className="absolute border-2 border-[#2563EB] pointer-events-none"
                              style={{
                                left: `${modalImageState.cropLeft}px`,
                                top: `${modalImageState.cropTop}px`,
                                width: `${Math.max(1, modalImageState.width - modalImageState.cropLeft - modalImageState.cropRight)}px`,
                                height: `${Math.max(1, modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom)}px`
                              }}
                            />

                            {/* 4 Corner Resize Handles (White circles with 2px blue ring border) */}
                            {/* Top-Left */}
                            <div
                              className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nwse-resize z-30 -translate-x-1/2 -translate-y-1/2"
                              style={{ left: `${modalImageState.cropLeft}px`, top: `${modalImageState.cropTop}px` }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedItemId('image');
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
                              className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nesw-resize z-30 -translate-x-1/2 -translate-y-1/2"
                              style={{ left: `${modalImageState.width - modalImageState.cropRight}px`, top: `${modalImageState.cropTop}px` }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedItemId('image');
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
                              className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nesw-resize z-30 -translate-x-1/2 -translate-y-1/2"
                              style={{ left: `${modalImageState.cropLeft}px`, top: `${modalImageState.height - modalImageState.cropBottom}px` }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedItemId('image');
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
                              className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nwse-resize z-30 -translate-x-1/2 -translate-y-1/2"
                              style={{ left: `${modalImageState.width - modalImageState.cropRight}px`, top: `${modalImageState.height - modalImageState.cropBottom}px` }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedItemId('image');
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

                            {/* 4 Edge Crop Handles (Pill capsules with 2px blue border matching screenshot) */}
                            {/* Top Edge Pill */}
                            <div
                              className="absolute w-[24px] h-[7px] bg-white border-2 border-[#2563EB] rounded-full cursor-ns-resize z-25 -translate-x-1/2 -translate-y-1/2"
                              style={{
                                left: `${modalImageState.cropLeft + (modalImageState.width - modalImageState.cropLeft - modalImageState.cropRight) / 2}px`,
                                top: `${modalImageState.cropTop}px`
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedItemId('image');
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
                            {/* Bottom Edge Pill */}
                            <div
                              className="absolute w-[24px] h-[7px] bg-white border-2 border-[#2563EB] rounded-full cursor-ns-resize z-25 -translate-x-1/2 -translate-y-1/2"
                              style={{
                                left: `${modalImageState.cropLeft + (modalImageState.width - modalImageState.cropLeft - modalImageState.cropRight) / 2}px`,
                                top: `${modalImageState.height - modalImageState.cropBottom}px`
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedItemId('image');
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
                            {/* Left Edge Pill */}
                            <div
                              className="absolute w-[7px] h-[24px] bg-white border-2 border-[#2563EB] rounded-full cursor-ew-resize z-25 -translate-x-1/2 -translate-y-1/2"
                              style={{
                                left: `${modalImageState.cropLeft}px`,
                                top: `${modalImageState.cropTop + (modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom) / 2}px`
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedItemId('image');
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
                            {/* Right Edge Pill */}
                            <div
                              className="absolute w-[7px] h-[24px] bg-white border-2 border-[#2563EB] rounded-full cursor-ew-resize z-25 -translate-x-1/2 -translate-y-1/2"
                              style={{
                                left: `${modalImageState.width - modalImageState.cropRight}px`,
                                top: `${modalImageState.cropTop + (modalImageState.height - modalImageState.cropTop - modalImageState.cropBottom) / 2}px`
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedItemId('image');
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
                          </div>
                        )}"""

if old_handles_render in code:
    code = code.replace(old_handles_render, new_handles_render, 1)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Fixed handle interaction and ensured handles stay permanently accessible!")
else:
    print("ERROR: old_handles_render not found")
