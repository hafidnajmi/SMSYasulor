import os

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update Canvas export drawing for dimension in handleSavePoleResult
old_save_dim = """            } else if (item.type === 'dimension') {
              ctx.strokeStyle = item.color || '#DC2626';
              ctx.fillStyle = item.color || '#DC2626';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(item.x1, item.y1);
              ctx.lineTo(item.x2, item.y2);
              ctx.stroke();

              const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
              const headlen = 7;
              // Start arrow
              ctx.beginPath();
              ctx.moveTo(item.x1, item.y1);
              ctx.lineTo(item.x1 + headlen * Math.cos(angle - Math.PI / 6), item.y1 + headlen * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(item.x1 + headlen * Math.cos(angle + Math.PI / 6), item.y1 + headlen * Math.sin(angle + Math.PI / 6));
              ctx.closePath();
              ctx.fill();
              // End arrow
              ctx.beginPath();
              ctx.moveTo(item.x2, item.y2);
              ctx.lineTo(item.x2 - headlen * Math.cos(angle - Math.PI / 6), item.y2 - headlen * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(item.x2 - headlen * Math.cos(angle + Math.PI / 6), item.y2 - headlen * Math.sin(angle + Math.PI / 6));
              ctx.closePath();
              ctx.fill();

              const midX = (item.x1 + item.x2) / 2;
              const midY = (item.y1 + item.y2) / 2;
              ctx.font = 'bold 11px Segoe UI, sans-serif';
              const textW = ctx.measureText(item.text || '').width;
              ctx.fillStyle = '#EAEFE3';
              ctx.fillRect(midX - textW / 2 - 4, midY - 7, textW + 8, 14);
              ctx.fillStyle = item.color || '#DC2626';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(item.text || '', midX, midY);"""

new_save_dim = """            } else if (item.type === 'dimension') {
              const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
              const headlen = 11;
              ctx.strokeStyle = item.color || '#DC2626';
              ctx.fillStyle = item.color || '#DC2626';
              ctx.lineWidth = 2;

              // Line connecting ends
              ctx.beginPath();
              ctx.moveTo(item.x1, item.y1);
              ctx.lineTo(item.x2, item.y2);
              ctx.stroke();

              // Left/Start Arrowhead
              ctx.beginPath();
              ctx.moveTo(item.x1, item.y1);
              ctx.lineTo(item.x1 + headlen * Math.cos(angle - Math.PI / 6.5), item.y1 + headlen * Math.sin(angle - Math.PI / 6.5));
              ctx.lineTo(item.x1 + headlen * Math.cos(angle + Math.PI / 6.5), item.y1 + headlen * Math.sin(angle + Math.PI / 6.5));
              ctx.closePath();
              ctx.fill();

              // Right/End Arrowhead
              ctx.beginPath();
              ctx.moveTo(item.x2, item.y2);
              ctx.lineTo(item.x2 - headlen * Math.cos(angle - Math.PI / 6.5), item.y2 - headlen * Math.sin(angle - Math.PI / 6.5));
              ctx.lineTo(item.x2 - headlen * Math.cos(angle + Math.PI / 6.5), item.y2 - headlen * Math.sin(angle + Math.PI / 6.5));
              ctx.closePath();
              ctx.fill();

              // Center text box with red border (exact reference screenshot match)
              const midX = (item.x1 + item.x2) / 2;
              const midY = (item.y1 + item.y2) / 2;
              ctx.font = 'bold 11px Segoe UI, sans-serif';
              const textW = ctx.measureText(item.text || '').width;
              const boxW = textW + 10;
              const boxH = 16;

              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
              ctx.strokeStyle = item.color || '#DC2626';
              ctx.lineWidth = 1;
              ctx.strokeRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);

              ctx.fillStyle = item.color || '#DC2626';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(item.text || '', midX, midY);"""

if old_save_dim in code:
    code = code.replace(old_save_dim, new_save_dim, 1)
    print("Updated canvas save renderer for dimension!")
else:
    print("ERROR: old_save_dim not found")

# 2. Update SVG and HTML Dimension elements in modal canvas
old_svg_dim = """                        } else if (item.type === 'dimension') {
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
                          );"""

new_svg_dim = """                        } else if (item.type === 'dimension') {
                          const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                          const headlen = 12;
                          // Left Arrowhead
                          const l1x = item.x1 + headlen * Math.cos(angle - Math.PI / 6.5);
                          const l1y = item.y1 + headlen * Math.sin(angle - Math.PI / 6.5);
                          const l2x = item.x1 + headlen * Math.cos(angle + Math.PI / 6.5);
                          const l2y = item.y1 + headlen * Math.sin(angle + Math.PI / 6.5);

                          // Right Arrowhead
                          const r1x = item.x2 - headlen * Math.cos(angle - Math.PI / 6.5);
                          const r1y = item.y2 - headlen * Math.sin(angle - Math.PI / 6.5);
                          const r2x = item.x2 - headlen * Math.cos(angle + Math.PI / 6.5);
                          const r2y = item.y2 - headlen * Math.sin(angle + Math.PI / 6.5);

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
                                strokeWidth={isSelected ? 2.8 : 2}
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

                              {/* Left Arrowhead Polygon */}
                              <polygon
                                points={`${item.x1},${item.y1} ${l1x},${l1y} ${l2x},${l2y}`}
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

                              {/* Right Arrowhead Polygon */}
                              <polygon
                                points={`${item.x2},${item.y2} ${r1x},${r1y} ${r2x},${r2y}`}
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

                              {isSelected && (
                                <>
                                  {/* Start point handle (left tip) */}
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
                                  {/* End point handle (right tip) */}
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
                          );"""

if old_svg_dim in code:
    code = code.replace(old_svg_dim, new_svg_dim, 1)
    print("Updated SVG double-arrow dimension!")
else:
    print("ERROR: old_svg_dim not found")

# 3. Update HTML Overlay for Dimension Text Box
old_html_dim = """                      if (item.type === 'dimension') {
                        const midX = (item.x1 + item.x2) / 2;
                        const midY = (item.y1 + item.y2) / 2;
                        return (
                          <div
                            key={item.id}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 bg-[#EAEFE3] px-1 text-[11px] font-bold cursor-pointer select-none ${isSelected ? 'border border-[#2563EB] rounded' : ''}`}
                            style={{ left: `${midX}px`, top: `${midY}px`, color: item.color || '#DC2626' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemId(item.id);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              const val = prompt('Edit dimensi teks:', item.text);
                              if (val !== null) {
                                setModalAnnotations(modalAnnotations.map((a) => (a.id === item.id ? { ...a, text: val } : a)));
                              }
                            }}
                          >
                            {item.text}
                          </div>
                        );"""

new_html_dim = """                      if (item.type === 'dimension') {
                        const midX = (item.x1 + item.x2) / 2;
                        const midY = (item.y1 + item.y2) / 2;
                        return (
                          <div
                            key={item.id}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-0.5 text-[11px] font-bold border border-[#DC2626] rounded-[1px] shadow-sm cursor-move select-none z-20 ${isSelected ? 'ring-2 ring-[#2563EB]' : ''}`}
                            style={{ left: `${midX}px`, top: `${midY}px`, color: item.color || '#DC2626' }}
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
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              const val = prompt('Edit dimensi teks:', item.text);
                              if (val !== null) {
                                setModalAnnotations(modalAnnotations.map((a) => (a.id === item.id ? { ...a, text: val } : a)));
                              }
                            }}
                            title="Tarik untuk geser, double-click untuk edit teks"
                          >
                            {item.text}
                          </div>
                        );"""

if old_html_dim in code:
    code = code.replace(old_html_dim, new_html_dim, 1)
    print("Updated HTML dimension text box with red border and white bg!")
else:
    print("ERROR: old_html_dim not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Applied update_dimension_style successfully!")
