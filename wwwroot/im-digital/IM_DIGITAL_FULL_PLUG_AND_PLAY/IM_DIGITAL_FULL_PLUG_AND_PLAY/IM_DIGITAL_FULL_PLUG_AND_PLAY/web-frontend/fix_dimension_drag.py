import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add id="pole-canvas-container" to Canvas Container
old_canvas_tag = """                  {/* Canvas Container */}
                  <div
                    className="relative bg-[#EAEFE3] border border-[#CBD5E1] rounded overflow-hidden select-none"
                    style={{ width: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).width}px`, height: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).height}px` }}"""

new_canvas_tag = """                  {/* Canvas Container */}
                  <div
                    id="pole-canvas-container"
                    className="relative bg-[#EAEFE3] border border-[#CBD5E1] rounded overflow-hidden select-none"
                    style={{ width: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).width}px`, height: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).height}px` }}"""

if old_canvas_tag in code:
    code = code.replace(old_canvas_tag, new_canvas_tag, 1)
    print("Added id=pole-canvas-container to canvas tag!")
else:
    print("ERROR: old_canvas_tag not found")

# 2. Add bulletproof NaN guards in onMouseMove
old_on_mouse_move = """                      } else if (dragState.mode === 'drag-annotation' && dragState.initItem) {
                        const itemId = dragState.initItem.id;
                        setModalAnnotations((prev) =>
                          prev.map((a) => {
                            if (a.id !== itemId) return a;
                            if (a.type === 'arrow' || a.type === 'dimension') {
                              return {
                                ...a,
                                x1: Math.round(dragState.initItem.x1 + dx),
                                y1: Math.round(dragState.initItem.y1 + dy),
                                x2: Math.round(dragState.initItem.x2 + dx),
                                y2: Math.round(dragState.initItem.y2 + dy)
                              };
                            }
                            return {
                              ...a,
                              x: Math.round(dragState.initItem.x + dx),
                              y: Math.round(dragState.initItem.y + dy)
                            };
                          })
                        );
                      } else if (dragState.mode === 'resize-arrow-start' && dragState.initItem) {
                        const itemId = dragState.initItem.id;
                        setModalAnnotations((prev) =>
                          prev.map((a) => {
                            if (a.id !== itemId) return a;
                            return {
                              ...a,
                              x1: Math.round(dragState.initItem.x1 + dx),
                              y1: Math.round(dragState.initItem.y1 + dy)
                            };
                          })
                        );
                      } else if (dragState.mode === 'resize-arrow-end' && dragState.initItem) {
                        const itemId = dragState.initItem.id;
                        setModalAnnotations((prev) =>
                          prev.map((a) => {
                            if (a.id !== itemId) return a;
                            return {
                              ...a,
                              x2: Math.round(dragState.initItem.x2 + dx),
                              y2: Math.round(dragState.initItem.y2 + dy)
                            };
                          })
                        );
                      }"""

new_on_mouse_move = """                      } else if (dragState.mode === 'drag-annotation' && dragState.initItem) {
                        if (isNaN(dx) || isNaN(dy)) return;
                        const itemId = dragState.initItem.id;
                        setModalAnnotations((prev) =>
                          prev.map((a) => {
                            if (a.id !== itemId) return a;
                            if (a.type === 'arrow' || a.type === 'dimension') {
                              return {
                                ...a,
                                x1: Math.round((Number(dragState.initItem.x1) || 0) + dx),
                                y1: Math.round((Number(dragState.initItem.y1) || 0) + dy),
                                x2: Math.round((Number(dragState.initItem.x2) || 0) + dx),
                                y2: Math.round((Number(dragState.initItem.y2) || 0) + dy)
                              };
                            }
                            return {
                              ...a,
                              x: Math.round((Number(dragState.initItem.x) || 0) + dx),
                              y: Math.round((Number(dragState.initItem.y) || 0) + dy)
                            };
                          })
                        );
                      } else if (dragState.mode === 'resize-arrow-start' && dragState.initItem) {
                        if (isNaN(dx) || isNaN(dy)) return;
                        const itemId = dragState.initItem.id;
                        setModalAnnotations((prev) =>
                          prev.map((a) => {
                            if (a.id !== itemId) return a;
                            return {
                              ...a,
                              x1: Math.round((Number(dragState.initItem.x1) || 0) + dx),
                              y1: Math.round((Number(dragState.initItem.y1) || 0) + dy)
                            };
                          })
                        );
                      } else if (dragState.mode === 'resize-arrow-end' && dragState.initItem) {
                        if (isNaN(dx) || isNaN(dy)) return;
                        const itemId = dragState.initItem.id;
                        setModalAnnotations((prev) =>
                          prev.map((a) => {
                            if (a.id !== itemId) return a;
                            return {
                              ...a,
                              x2: Math.round((Number(dragState.initItem.x2) || 0) + dx),
                              y2: Math.round((Number(dragState.initItem.y2) || 0) + dy)
                            };
                          })
                        );
                      }"""

if old_on_mouse_move in code:
    code = code.replace(old_on_mouse_move, new_on_mouse_move, 1)
    print("Added NaN guards and safe number conversion to onMouseMove!")
else:
    print("ERROR: old_on_mouse_move not found")

# 3. Standardize startDrag coordinate measurement using pole-canvas-container
code = code.replace("e.currentTarget.closest('.select-none')?.getBoundingClientRect()", "document.getElementById('pole-canvas-container')?.getBoundingClientRect()")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Applied fix_dimension_drag successfully!")
