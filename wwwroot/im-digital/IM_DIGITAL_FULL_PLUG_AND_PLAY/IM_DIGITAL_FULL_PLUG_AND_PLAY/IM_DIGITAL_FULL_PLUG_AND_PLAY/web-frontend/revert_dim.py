import os
import re

file_path = r"c:\Users\FACTIDLocal\Downloads\IM_DIGITAL_WEB_ONLY\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. HTML Overlay
html_target = """                            <div
                              key={item.id}
                              className={`absolute bg-white text-[10px] font-bold border border-[#DC2626] rounded-[1px] cursor-move select-none z-20 leading-none pointer-events-auto ${isSelected ? 'ring-2 ring-[#2563EB]' : ''}`}"""
html_repl = """                            <div
                              key={item.id}
                              className={`absolute bg-[#EAEFE3] text-[11px] font-bold cursor-pointer select-none z-20 leading-none pointer-events-auto ${isSelected ? 'border border-[#2563EB] rounded-[1px]' : ''}`}"""

if html_target in code:
    code = code.replace(html_target, html_repl)
    print("Replaced HTML")
else:
    print("HTML not found")

# 2. SVG logic - we need to replace the arrow heads with T-bars
svg_arrows_target = r"""                          const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
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
                          const r2y = item.y2 - headlen * Math.sin(angle + Math.PI / 6.5);"""

svg_tbars_repl = r"""                          const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                          const tlen = 6;
                          // Left T-bar
                          const l1x = item.x1 + tlen * Math.cos(angle + Math.PI / 2);
                          const l1y = item.y1 + tlen * Math.sin(angle + Math.PI / 2);
                          const l2x = item.x1 + tlen * Math.cos(angle - Math.PI / 2);
                          const l2y = item.y1 + tlen * Math.sin(angle - Math.PI / 2);

                          // Right T-bar
                          const r1x = item.x2 + tlen * Math.cos(angle + Math.PI / 2);
                          const r1y = item.y2 + tlen * Math.sin(angle + Math.PI / 2);
                          const r2x = item.x2 + tlen * Math.cos(angle - Math.PI / 2);
                          const r2y = item.y2 + tlen * Math.sin(angle - Math.PI / 2);"""

if svg_arrows_target in code:
    code = code.replace(svg_arrows_target, svg_tbars_repl)
    print("Replaced SVG arrows variables")
else:
    print("SVG arrows variables not found")

left_poly_target = r"""                              {/* Left Arrowhead Polygon */}
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
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
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
                              />"""
left_tbar_repl = r"""                              {/* Left T-Bar */}
                              <line
                                x1={l1x}
                                y1={l1y}
                                x2={l2x}
                                y2={l2y}
                                stroke={item.color || '#DC2626'}
                                strokeWidth={isSelected ? 2 : 1.2}
                                strokeLinecap="round"
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
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
                              />"""
if left_poly_target in code:
    code = code.replace(left_poly_target, left_tbar_repl)
    print("Replaced left poly")
else:
    print("Left poly not found")

right_poly_target = r"""                              {/* Right Arrowhead Polygon */}
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
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
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
                              />"""
right_tbar_repl = r"""                              {/* Right T-Bar */}
                              <line
                                x1={r1x}
                                y1={r1y}
                                x2={r2x}
                                y2={r2y}
                                stroke={item.color || '#DC2626'}
                                strokeWidth={isSelected ? 2 : 1.2}
                                strokeLinecap="round"
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
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
                              />"""
if right_poly_target in code:
    code = code.replace(right_poly_target, right_tbar_repl)
    print("Replaced right poly")
else:
    print("Right poly not found")

# 3. Canvas Export
canvas_target = r"""              // Left/Start Arrowhead
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
              ctx.fill();"""
canvas_repl = r"""              const tlen = 6;
              // Left/Start T-bar
              ctx.beginPath();
              ctx.moveTo(item.x1 + tlen * Math.cos(angle + Math.PI / 2), item.y1 + tlen * Math.sin(angle + Math.PI / 2));
              ctx.lineTo(item.x1 + tlen * Math.cos(angle - Math.PI / 2), item.y1 + tlen * Math.sin(angle - Math.PI / 2));
              ctx.stroke();

              // Right/End T-bar
              ctx.beginPath();
              ctx.moveTo(item.x2 + tlen * Math.cos(angle + Math.PI / 2), item.y2 + tlen * Math.sin(angle + Math.PI / 2));
              ctx.lineTo(item.x2 + tlen * Math.cos(angle - Math.PI / 2), item.y2 + tlen * Math.sin(angle - Math.PI / 2));
              ctx.stroke();"""
if canvas_target in code:
    code = code.replace(canvas_target, canvas_repl)
    print("Replaced Canvas Arrows with T-Bars")
else:
    print("Canvas arrows not found")

box_target = r"""              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
              ctx.strokeStyle = item.color || '#DC2626';
              ctx.lineWidth = 1;
              ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);"""
box_repl = r"""              ctx.fillStyle = '#EAEFE3';
              ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);"""
if box_target in code:
    code = code.replace(box_target, box_repl)
    print("Replaced Canvas Box")
else:
    print("Canvas Box not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)
