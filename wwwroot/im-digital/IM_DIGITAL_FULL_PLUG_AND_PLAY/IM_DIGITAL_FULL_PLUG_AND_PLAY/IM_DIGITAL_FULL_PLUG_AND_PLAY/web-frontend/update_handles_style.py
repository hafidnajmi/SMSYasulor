import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Replace handles and selection frame with pixel-perfect replica of user screenshot
old_handles_block = """                            {/* Selection Frame (Solid Blue Border around active cropped box) */}
                            <div
                              className="absolute border-2 border-[#2563EB] pointer-events-none shadow-sm"
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
                              className="absolute w-3.5 h-3.5 bg-white border-2 border-[#2563EB] rounded-full shadow-md cursor-nwse-resize z-30 -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform"
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
                              className="absolute w-3.5 h-3.5 bg-white border-2 border-[#2563EB] rounded-full shadow-md cursor-nesw-resize z-30 translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform"
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
                              className="absolute w-3.5 h-3.5 bg-white border-2 border-[#2563EB] rounded-full shadow-md cursor-nesw-resize z-30 -translate-x-1/2 translate-y-1/2 hover:scale-125 transition-transform"
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
                              className="absolute w-3.5 h-3.5 bg-white border-2 border-[#2563EB] rounded-full shadow-md cursor-nwse-resize z-30 translate-x-1/2 translate-y-1/2 hover:scale-125 transition-transform"
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
                              className="absolute h-2 w-7 bg-white border-[1.5px] border-[#2563EB] rounded-full shadow-md cursor-ns-resize z-25 -translate-x-1/2 -translate-y-1/2 hover:bg-[#2563EB] transition-colors"
                              title="Tarik untuk memotong (crop) atas"
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
                              className="absolute h-2 w-7 bg-white border-[1.5px] border-[#2563EB] rounded-full shadow-md cursor-ns-resize z-25 -translate-x-1/2 translate-y-1/2 hover:bg-[#2563EB] transition-colors"
                              title="Tarik untuk memotong (crop) bawah"
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
                              className="absolute w-2 h-7 bg-white border-[1.5px] border-[#2563EB] rounded-full shadow-md cursor-ew-resize z-25 -translate-x-1/2 -translate-y-1/2 hover:bg-[#2563EB] transition-colors"
                              title="Tarik untuk memotong (crop) kiri"
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
                              className="absolute w-2 h-7 bg-white border-[1.5px] border-[#2563EB] rounded-full shadow-md cursor-ew-resize z-25 translate-x-1/2 -translate-y-1/2 hover:bg-[#2563EB] transition-colors"
                              title="Tarik untuk memotong (crop) kanan"
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
                            />"""

new_handles_block = """                            {/* Selection Frame (Exact match: 2px solid blue border) */}
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
                              className="absolute w-[13px] h-[13px] bg-white border-2 border-[#2563EB] rounded-full cursor-nwse-resize z-30 -translate-x-1/2 -translate-y-1/2"
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
                              className="absolute w-[13px] h-[13px] bg-white border-2 border-[#2563EB] rounded-full cursor-nesw-resize z-30 translate-x-1/2 -translate-y-1/2"
                              style={{ left: `${modalImageState.width - modalImageState.cropRight - 13}px`, top: `${modalImageState.cropTop}px` }}
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
                              className="absolute w-[13px] h-[13px] bg-white border-2 border-[#2563EB] rounded-full cursor-nesw-resize z-30 -translate-x-1/2 translate-y-1/2"
                              style={{ left: `${modalImageState.cropLeft}px`, top: `${modalImageState.height - modalImageState.cropBottom - 13}px` }}
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
                              className="absolute w-[13px] h-[13px] bg-white border-2 border-[#2563EB] rounded-full cursor-nwse-resize z-30 translate-x-1/2 translate-y-1/2"
                              style={{ left: `${modalImageState.width - modalImageState.cropRight - 13}px`, top: `${modalImageState.height - modalImageState.cropBottom - 13}px` }}
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
                              className="absolute w-[22px] h-[6px] bg-white border-2 border-[#2563EB] rounded-full cursor-ns-resize z-25 -translate-x-1/2 -translate-y-1/2"
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
                              className="absolute w-[22px] h-[6px] bg-white border-2 border-[#2563EB] rounded-full cursor-ns-resize z-25 -translate-x-1/2 translate-y-1/2"
                              style={{
                                left: `${modalImageState.cropLeft + (modalImageState.width - modalImageState.cropLeft - modalImageState.cropRight) / 2}px`,
                                top: `${modalImageState.height - modalImageState.cropBottom - 6}px`
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
                              className="absolute w-[6px] h-[22px] bg-white border-2 border-[#2563EB] rounded-full cursor-ew-resize z-25 -translate-x-1/2 -translate-y-1/2"
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
                              className="absolute w-[6px] h-[22px] bg-white border-2 border-[#2563EB] rounded-full cursor-ew-resize z-25 translate-x-1/2 -translate-y-1/2"
                              style={{
                                left: `${modalImageState.width - modalImageState.cropRight - 6}px`,
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
                            />"""

if old_handles_block in code:
    code = code.replace(old_handles_block, new_handles_block, 1)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Exact icon design applied successfully!")
else:
    print("ERROR: old_handles_block not found in code")
