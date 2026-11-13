import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update onMouseMove in Canvas Container to handle arrow resize start and end
old_drag_handlers = """                      } else if (dragState.mode === 'drag-annotation' && dragState.initItem) {
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
                      }"""

new_drag_handlers = """                      } else if (dragState.mode === 'drag-annotation' && dragState.initItem) {
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

if old_drag_handlers in code:
    code = code.replace(old_drag_handlers, new_drag_handlers, 1)
    print("Updated onMouseMove for arrow stretch/shorten/move!")
else:
    print("ERROR: old_drag_handlers not found")

# 2. Update Arrow & Dimension SVG Elements
old_svg_block = """                    {/* Annotations Layer */}
                    <svg
                      className="absolute inset-0 w-full h-full"
                      style={{ pointerEvents: 'none' }}
                    >
                      {modalAnnotations.map((item) => {
                        const isSelected = selectedItemId === item.id;
                        if (item.type === 'arrow') {
                          const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                          const headlen = 10;
                          const p1x = item.x2 - headlen * Math.cos(angle - Math.PI / 6);
                          const p1y = item.y2 - headlen * Math.sin(angle - Math.PI / 6);
                          const p2x = item.x2 - headlen * Math.cos(angle + Math.PI / 6);
                          const p2y = item.y2 - headlen * Math.sin(angle + Math.PI / 6);

                          return (
                            <g
                              key={item.id}
                              style={{ pointerEvents: 'auto', cursor: 'move' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(item.id);
                              }}
                            >
                              <line
                                x1={item.x1}
                                y1={item.y1}
                                x2={item.x2}
                                y2={item.y2}
                                stroke={item.color || '#DC2626'}
                                strokeWidth={isSelected ? 3.5 : 2.5}
                              />
                              <polygon
                                points={`${item.x2},${item.y2} ${p1x},${p1y} ${p2x},${p2y}`}
                                fill={item.color || '#DC2626'}
                              />
                              {isSelected && (
                                <>
                                  <circle cx={item.x1} cy={item.y1} r="4" fill="#2563EB" />
                                  <circle cx={item.x2} cy={item.y2} r="4" fill="#2563EB" />
                                </>
                              )}
                            </g>
                          );
                        } else if (item.type === 'dimension') {
                          return (
                            <g
                              key={item.id}
                              style={{ pointerEvents: 'auto', cursor: 'move' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(item.id);
                              }}
                            >
                              <line
                                x1={item.x1}
                                y1={item.y1}
                                x2={item.x2}
                                y2={item.y2}
                                stroke={item.color || '#DC2626'}
                                strokeWidth={isSelected ? 2.5 : 1.5}
                              />
                              {isSelected && (
                                <>
                                  <circle cx={item.x1} cy={item.y1} r="4" fill="#2563EB" />
                                  <circle cx={item.x2} cy={item.y2} r="4" fill="#2563EB" />
                                </>
                              )}
                            </g>
                          );
                        } else if (item.type === 'circle') {
                          return (
                            <circle
                              key={item.id}
                              cx={item.x}
                              cy={item.y}
                              r={item.radius || 25}
                              fill="none"
                              stroke={item.color || '#DC2626'}
                              strokeWidth={isSelected ? 3.5 : 2.5}
                              style={{ pointerEvents: 'auto', cursor: 'move' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(item.id);
                              }}
                            />
                          );
                        }
                        return null;
                      })}
                    </svg>"""

new_svg_block = """                    {/* Annotations Layer */}
                    <svg
                      className="absolute inset-0 w-full h-full"
                      style={{ pointerEvents: 'none' }}
                    >
                      {modalAnnotations.map((item) => {
                        const isSelected = selectedItemId === item.id;
                        if (item.type === 'arrow') {
                          const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                          const headlen = 12;
                          const p1x = item.x2 - headlen * Math.cos(angle - Math.PI / 6.5);
                          const p1y = item.y2 - headlen * Math.sin(angle - Math.PI / 6.5);
                          const p2x = item.x2 - headlen * Math.cos(angle + Math.PI / 6.5);
                          const p2y = item.y2 - headlen * Math.sin(angle + Math.PI / 6.5);

                          return (
                            <g key={item.id}>
                              {/* Invisible broader hit area for easy grabbing and moving */}
                              <line
                                x1={item.x1}
                                y1={item.y1}
                                x2={item.x2}
                                y2={item.y2}
                                stroke="transparent"
                                strokeWidth={16}
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />

                              {/* Visible Arrow Line */}
                              <line
                                x1={item.x1}
                                y1={item.y1}
                                x2={item.x2}
                                y2={item.y2}
                                stroke={item.color || '#DC2626'}
                                strokeWidth={isSelected ? 3 : 2.2}
                                strokeLinecap="round"
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />

                              {/* Arrowhead Polygon */}
                              <polygon
                                points={`${item.x2},${item.y2} ${p1x},${p1y} ${p2x},${p2y}`}
                                fill={item.color || '#DC2626'}
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />

                              {/* Control Handles when Selected (Tail & Head for stretch, lengthen, shorten, rotate) */}
                              {isSelected && (
                                <>
                                  {/* Tail Handle (x1, y1) */}
                                  <circle
                                    cx={item.x1}
                                    cy={item.y1}
                                    r={5.5}
                                    fill="#FFFFFF"
                                    stroke="#2563EB"
                                    strokeWidth={2}
                                    style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-arrow-start',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* Head Handle (x2, y2) */}
                                  <circle
                                    cx={item.x2}
                                    cy={item.y2}
                                    r={5.5}
                                    fill="#FFFFFF"
                                    stroke="#2563EB"
                                    strokeWidth={2}
                                    style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-arrow-end',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                </>
                              )}
                            </g>
                          );
                        } else if (item.type === 'dimension') {
                          return (
                            <g key={item.id}>
                              {/* Invisible broader hit area */}
                              <line
                                x1={item.x1}
                                y1={item.y1}
                                x2={item.x2}
                                y2={item.y2}
                                stroke="transparent"
                                strokeWidth={16}
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />

                              {/* Dimension Line */}
                              <line
                                x1={item.x1}
                                y1={item.y1}
                                x2={item.x2}
                                y2={item.y2}
                                stroke={item.color || '#DC2626'}
                                strokeWidth={isSelected ? 2.5 : 1.8}
                                strokeLinecap="round"
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />
                              {isSelected && (
                                <>
                                  {/* Start point handle */}
                                  <circle
                                    cx={item.x1}
                                    cy={item.y1}
                                    r={5}
                                    fill="#FFFFFF"
                                    stroke="#2563EB"
                                    strokeWidth={2}
                                    style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-arrow-start',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* End point handle */}
                                  <circle
                                    cx={item.x2}
                                    cy={item.y2}
                                    r={5}
                                    fill="#FFFFFF"
                                    stroke="#2563EB"
                                    strokeWidth={2}
                                    style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-arrow-end',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                </>
                              )}
                            </g>
                          );
                        } else if (item.type === 'circle') {
                          return (
                            <circle
                              key={item.id}
                              cx={item.x}
                              cy={item.y}
                              r={item.radius || 25}
                              fill="none"
                              stroke={item.color || '#DC2626'}
                              strokeWidth={isSelected ? 3.5 : 2.5}
                              style={{ pointerEvents: 'auto', cursor: 'move' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(item.id);
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(item.id);
                                const rect = e.currentTarget.closest('.select-none')?.getBoundingClientRect();
                                if (!rect) return;
                                setDragState({
                                  mode: 'drag-annotation',
                                  startX: e.clientX - rect.left,
                                  startY: e.clientY - rect.top,
                                  initLeft: 0,
                                  initTop: 0,
                                  initWidth: 0,
                                  initHeight: 0,
                                  initCropL: 0,
                                  initCropT: 0,
                                  initCropR: 0,
                                  initCropB: 0,
                                  initItem: { ...item }
                                });
                              }}
                            />
                          );
                        }
                        return null;
                      })}
                    </svg>"""

if old_svg_block in code:
    code = code.replace(old_svg_block, new_svg_block, 1)
    print("Updated SVG Arrow & Dimension with interactive handles and smooth dragging!")
else:
    print("ERROR: old_svg_block not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Applied update_flexible_arrow successfully!")
