file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

target = """        {/* Back Confirmation Modal */}"""

replacement = """        {/* POLE DATA INPUT MODAL (Matching User Screenshot Exactly) */}
        {activePoleModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col max-w-[950px] w-auto font-['Segoe_UI']">
              {/* Title Bar */}
              <div className="bg-[#F0FDF4] border-b border-[#E2E8F0] px-4 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">🖼</span>
                  <span className="text-[13px] font-semibold text-[#1E293B]">
                    POLE DATA INPUT ({activePoleModal.sectionTitle})
                  </span>
                </div>
                <button
                  onClick={() => setActivePoleModal(null)}
                  className="text-[#64748B] hover:text-[#0F172A] text-sm font-bold px-2 py-0.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 flex flex-col bg-white">
                {/* Header Title */}
                <h2 className="text-[14px] font-extrabold text-[#1E3A8A] uppercase tracking-wide mb-3">
                  POLE DATA INPUT ({activePoleModal.sectionTitle})
                </h2>

                {/* Toolbar Row */}
                <div className="flex items-center space-x-1.5 mb-3 flex-wrap">
                  {/* Hidden File Input */}
                  <input
                    type="file"
                    id="pole-image-uploader"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setModalImageSrc(evt.target?.result as string);
                          setModalRotation(0);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                  {/* UPLOAD IMAGE */}
                  <button
                    onClick={() => document.getElementById('pole-image-uploader')?.click()}
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>📁</span>
                    <span>UPLOAD IMAGE</span>
                  </button>

                  {/* ROTATE */}
                  <button
                    onClick={() => setModalRotation((prev) => (prev + 90) % 360)}
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <span className="text-[12px] font-bold">↻</span>
                    <span>ROTATE</span>
                  </button>

                  {/* ARROW */}
                  <button
                    onClick={() => {
                      const newItem = {
                        id: 'arrow_' + Date.now(),
                        type: 'arrow',
                        x1: 80,
                        y1: 100,
                        x2: 200,
                        y2: 100,
                        color: '#DC2626'
                      };
                      setModalAnnotations([...modalAnnotations, newItem]);
                      setSelectedItemId(newItem.id);
                    }}
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>➔</span>
                    <span>ARROW</span>
                  </button>

                  {/* DIMENSION */}
                  <button
                    onClick={() => {
                      const newItem = {
                        id: 'dim_' + Date.now(),
                        type: 'dimension',
                        x1: 60,
                        y1: 120,
                        x2: 220,
                        y2: 120,
                        text: '10 mm',
                        color: '#DC2626'
                      };
                      setModalAnnotations([...modalAnnotations, newItem]);
                      setSelectedItemId(newItem.id);
                    }}
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>↔</span>
                    <span>DIMENSION</span>
                  </button>

                  {/* TEXT */}
                  <button
                    onClick={() => {
                      const newItem = {
                        id: 'text_' + Date.now(),
                        type: 'text',
                        x: 100,
                        y: 80,
                        text: 'Sample Text',
                        fontSize: 13,
                        isBold: true,
                        color: '#DC2626'
                      };
                      setModalAnnotations([...modalAnnotations, newItem]);
                      setSelectedItemId(newItem.id);
                    }}
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <span className="font-serif font-bold">A</span>
                    <span>TEXT</span>
                  </button>

                  {/* NOTE */}
                  <button
                    onClick={() => {
                      const newItem = {
                        id: 'note_' + Date.now(),
                        type: 'note',
                        x: 90,
                        y: 70,
                        width: 140,
                        height: 60,
                        text: 'Catatan penting',
                        bg: '#FFFBEB',
                        border: '#D97706'
                      };
                      setModalAnnotations([...modalAnnotations, newItem]);
                      setSelectedItemId(newItem.id);
                    }}
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>📝</span>
                    <span>NOTE</span>
                  </button>

                  {/* CIRCLE */}
                  <button
                    onClick={() => {
                      const newItem = {
                        id: 'circle_' + Date.now(),
                        type: 'circle',
                        x: 150,
                        y: 110,
                        radius: 25,
                        color: '#DC2626'
                      };
                      setModalAnnotations([...modalAnnotations, newItem]);
                      setSelectedItemId(newItem.id);
                    }}
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>●</span>
                    <span>CIRCLE</span>
                  </button>

                  {/* DELETE */}
                  <button
                    onClick={() => {
                      if (selectedItemId) {
                        setModalAnnotations(modalAnnotations.filter((a) => a.id !== selectedItemId));
                        setSelectedItemId(null);
                      } else if (modalImageSrc) {
                        if (confirm('Hapus gambar background?')) {
                          setModalImageSrc(null);
                        }
                      }
                    }}
                    className="bg-[#EF6D6D] hover:bg-[#DC2626] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors ml-auto cursor-pointer"
                  >
                    <span>🗑</span>
                    <span>DELETE</span>
                  </button>
                </div>

                {/* Canvas + Paletload Side Panel Area */}
                <div className="flex items-start justify-center">
                  {/* Canvas Container */}
                  <div
                    className="relative bg-[#EAEFE3] border border-[#CBD5E1] rounded overflow-hidden select-none"
                    style={{ width: '640px', height: activePoleModal.isPaletload ? '240px' : '210px' }}
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

                    {/* Annotations Layer */}
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
                    </svg>

                    {/* HTML Overlay for Text, Dimension Labels, and Notes */}
                    {modalAnnotations.map((item) => {
                      const isSelected = selectedItemId === item.id;
                      if (item.type === 'dimension') {
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
                        );
                      } else if (item.type === 'text') {
                        return (
                          <div
                            key={item.id}
                            className={`absolute cursor-move select-none ${isSelected ? 'outline outline-2 outline-[#2563EB] p-0.5 rounded' : ''}`}
                            style={{
                              left: `${item.x}px`,
                              top: `${item.y}px`,
                              color: item.color || '#DC2626',
                              fontSize: `${item.fontSize || 13}px`,
                              fontWeight: item.isBold ? 'bold' : 'normal'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemId(item.id);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              const val = prompt('Edit teks:', item.text);
                              if (val !== null) {
                                setModalAnnotations(modalAnnotations.map((a) => (a.id === item.id ? { ...a, text: val } : a)));
                              }
                            }}
                          >
                            {item.text}
                          </div>
                        );
                      } else if (item.type === 'note') {
                        return (
                          <div
                            key={item.id}
                            className={`absolute p-2 rounded shadow-sm text-[11px] cursor-move ${isSelected ? 'ring-2 ring-[#2563EB]' : ''}`}
                            style={{
                              left: `${item.x}px`,
                              top: `${item.y}px`,
                              width: `${item.width || 140}px`,
                              minHeight: `${item.height || 60}px`,
                              backgroundColor: item.bg || '#FFFBEB',
                              border: `1px solid ${item.border || '#D97706'}`,
                              color: '#1E293B'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemId(item.id);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              const val = prompt('Edit catatan:', item.text);
                              if (val !== null) {
                                setModalAnnotations(modalAnnotations.map((a) => (a.id === item.id ? { ...a, text: val } : a)));
                              }
                            }}
                          >
                            <div className="whitespace-pre-wrap">{item.text}</div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {/* Paletload Side Panel (Only for A.6 Paletisasi) */}
                  {activePoleModal.isPaletload && (
                    <div className="w-[220px] ml-5 flex flex-col space-y-3 self-center">
                      <div>
                        <input
                          type="text"
                          placeholder="Outer Box (e.g. 45)"
                          value={paletloadOuterBox}
                          onChange={(e) => setPaletloadOuterBox(e.target.value)}
                          className="w-full h-[32px] px-3 border border-[#CBD5E1] rounded text-[12px] text-[#0F172A] bg-white outline-none focus:border-[#2563EB]"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Layers (e.g. 5)"
                          value={paletloadLayers}
                          onChange={(e) => setPaletloadLayers(e.target.value)}
                          className="w-full h-[32px] px-3 border border-[#CBD5E1] rounded text-[12px] text-[#0F172A] bg-white outline-none focus:border-[#2563EB]"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="FG (e.g. 2700)"
                          value={paletloadFg}
                          onChange={(e) => setPaletloadFg(e.target.value)}
                          className="w-full h-[32px] px-3 border border-[#CBD5E1] rounded text-[12px] text-[#0F172A] bg-white outline-none focus:border-[#2563EB]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pro Tip Footer Text */}
                <div className="text-[10.5px] italic text-[#64748B] mt-2 mb-4">
                  Pro tip: Select an item and press Delete/Backspace or click DELETE to remove. Double-click text to edit.
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setActivePoleModal(null)}
                    className="bg-white border border-[#CBD5E1] text-[#475569] font-semibold text-[12px] w-[95px] h-[36px] rounded hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleSavePoleResult}
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-bold text-[12px] w-[130px] h-[36px] rounded shadow-md transition-colors cursor-pointer"
                  >
                    SAVE RESULT
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back Confirmation Modal */}"""

if target in code:
    code = code.replace(target, replacement, 1)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Mounted POLE modal successfully!")
else:
    print("Target not found!")
