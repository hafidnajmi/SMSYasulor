import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

old_block = """                            {/* 4 Corner Resize Handles (White circles with 2px blue ring border) */}
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

new_block = """                            {/* 4 Corner Resize Handles (White circles with 2px blue ring border) */}
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
                            />"""

if old_block in code:
    code = code.replace(old_block, new_block, 1)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Coordinates and exact handle designs updated perfectly!")
else:
    print("ERROR: old_block not found")
