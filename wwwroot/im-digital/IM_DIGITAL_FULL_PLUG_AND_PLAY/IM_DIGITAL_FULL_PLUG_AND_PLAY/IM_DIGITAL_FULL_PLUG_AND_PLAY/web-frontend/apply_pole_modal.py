import re

file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add poleData and modal states
state_search = "  const [showBackConfirmation, setShowBackConfirmation] = useState(false);"
state_replace = """  const [showBackConfirmation, setShowBackConfirmation] = useState(false);

  // POLE / MSC ADM Section Data State
  const [poleData, setPoleData] = useState<Record<string, any>>({});
  const [activePoleModal, setActivePoleModal] = useState<{
    sectionKey: string;
    sectionTitle: string;
    isPaletload?: boolean;
  } | null>(null);

  // POLE Modal Canvas Editor State
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [modalRotation, setModalRotation] = useState<number>(0);
  const [modalAnnotations, setModalAnnotations] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [paletloadOuterBox, setPaletloadOuterBox] = useState<string>('');
  const [paletloadLayers, setPaletloadLayers] = useState<string>('');
  const [paletloadFg, setPaletloadFg] = useState<string>('');

  const openPoleModal = (sectionKey: string, sectionTitle: string, isPaletload: boolean = false) => {
    const existing = poleData[sectionKey] || {};
    const scene = existing.sceneState || {};
    setModalImageSrc(scene.imageSrc || existing.imageDataUrl || null);
    setModalRotation(scene.rotation || 0);
    setModalAnnotations(scene.annotations || []);
    setSelectedItemId(null);
    setEditingTextId(null);
    setPaletloadOuterBox(existing.outerBox || scene.outerBox || '');
    setPaletloadLayers(existing.layers || scene.layers || '');
    setPaletloadFg(existing.fg || scene.fg || '');
    setActivePoleModal({ sectionKey, sectionTitle, isPaletload });
  };

  const deletePoleSection = (sectionKey: string) => {
    if (confirm(`Hapus data ${sectionKey}?`)) {
      const updated = { ...poleData };
      delete updated[sectionKey];
      setPoleData(updated);
      if (openDoc) {
        try {
          const localSync = localStorage.getItem(`im_sync_${openDoc.id}`);
          const parsed = localSync ? JSON.parse(localSync) : {};
          parsed.poleData = updated;
          parsed.savedPoleData = updated;
          localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsed));
          fetch(`http://localhost:5268/api/im/${openDoc.id}/division/${encodeURIComponent(divisionName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataJson: JSON.stringify(parsed) })
          }).catch(() => {});
        } catch (e) {}
      }
    }
  };

  const handleSavePoleResult = async () => {
    if (!activePoleModal) return;
    const { sectionKey, isPaletload } = activePoleModal;

    const width = 640;
    const height = isPaletload ? 240 : 200;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const renderComposite = (): Promise<string> => {
      return new Promise((resolve) => {
        if (!ctx) return resolve('');

        ctx.fillStyle = '#EAEFE3';
        ctx.fillRect(0, 0, width, height);

        const drawOverlayAndAnnotations = () => {
          if (isPaletload) {
            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 11px Segoe UI, sans-serif';
            ctx.fillText(`Outer Boxes per layer  ~ ${paletloadOuterBox || '...'} Box`, 12, 22);
            ctx.fillText(`Layers count           ~ ${paletloadLayers || '...'} Layers`, 12, 40);
            ctx.fillText(`FG per pallet          ~ ${paletloadFg || '...'} Pcs`, 12, 58);
          }

          modalAnnotations.forEach((item) => {
            if (item.type === 'arrow') {
              ctx.strokeStyle = item.color || '#DC2626';
              ctx.fillStyle = item.color || '#DC2626';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.moveTo(item.x1, item.y1);
              ctx.lineTo(item.x2, item.y2);
              ctx.stroke();

              const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
              const headlen = 10;
              ctx.beginPath();
              ctx.moveTo(item.x2, item.y2);
              ctx.lineTo(item.x2 - headlen * Math.cos(angle - Math.PI / 6), item.y2 - headlen * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(item.x2 - headlen * Math.cos(angle + Math.PI / 6), item.y2 - headlen * Math.sin(angle + Math.PI / 6));
              ctx.closePath();
              ctx.fill();
            } else if (item.type === 'dimension') {
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
              ctx.fillText(item.text || '', midX, midY);
            } else if (item.type === 'text') {
              ctx.fillStyle = item.color || '#DC2626';
              ctx.font = `${item.isBold ? 'bold' : 'normal'} ${item.fontSize || 13}px Segoe UI, sans-serif`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              ctx.fillText(item.text || '', item.x, item.y);
            } else if (item.type === 'note') {
              ctx.fillStyle = item.bg || '#FFFBEB';
              ctx.strokeStyle = item.border || '#D97706';
              ctx.lineWidth = 1;
              ctx.fillRect(item.x, item.y, item.width || 140, item.height || 60);
              ctx.strokeRect(item.x, item.y, item.width || 140, item.height || 60);
              ctx.fillStyle = '#1E293B';
              ctx.font = '11px Segoe UI, sans-serif';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              const lines = (item.text || '').split('\\n');
              lines.forEach((l: string, idx: number) => {
                ctx.fillText(l, item.x + 6, item.y + 6 + idx * 14);
              });
            } else if (item.type === 'circle') {
              ctx.strokeStyle = item.color || '#DC2626';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(item.x, item.y, item.radius || 25, 0, Math.PI * 2);
              ctx.stroke();
            }
          });

          resolve(canvas.toDataURL('image/png'));
        };

        if (modalImageSrc) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.rotate((modalRotation * Math.PI) / 180);
            const scale = Math.min((width - 40) / img.width, (height - 40) / img.height, 1);
            const dw = img.width * scale;
            const dh = img.height * scale;
            ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
            ctx.restore();
            drawOverlayAndAnnotations();
          };
          img.onerror = () => drawOverlayAndAnnotations();
          img.src = modalImageSrc;
        } else {
          drawOverlayAndAnnotations();
        }
      });
    };

    const finalDataUrl = await renderComposite();
    const updatedSectionData = {
      imageDataUrl: finalDataUrl,
      sceneState: {
        imageSrc: modalImageSrc,
        rotation: modalRotation,
        annotations: modalAnnotations,
        outerBox: paletloadOuterBox,
        layers: paletloadLayers,
        fg: paletloadFg
      },
      outerBox: paletloadOuterBox,
      layers: paletloadLayers,
      fg: paletloadFg
    };

    const updatedPoleData = {
      ...poleData,
      [sectionKey]: updatedSectionData
    };
    setPoleData(updatedPoleData);

    if (openDoc) {
      try {
        const localSync = localStorage.getItem(`im_sync_${openDoc.id}`);
        const parsed = localSync ? JSON.parse(localSync) : {};
        parsed.poleData = updatedPoleData;
        parsed.savedPoleData = updatedPoleData;
        if (sectionKey === 'A.1') parsed.A1ImageData = finalDataUrl;
        if (sectionKey === 'A.2') parsed.A2ImageData = finalDataUrl;
        if (sectionKey === 'A.3') parsed.A3PoleImageData = finalDataUrl;
        if (sectionKey === 'A.3_MSC') parsed.A3MscImageData = finalDataUrl;
        if (sectionKey === 'A.6') {
          parsed.PaletloadImageData = finalDataUrl;
          parsed.PaletloadOuterBox = paletloadOuterBox;
          parsed.PaletloadLayers = paletloadLayers;
          parsed.PaletloadFg = paletloadFg;
        }
        if (sectionKey === 'A.7') parsed.A7ImageData = finalDataUrl;

        localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsed));
        await fetch(`http://localhost:5268/api/im/${openDoc.id}/division/${encodeURIComponent(divisionName)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataJson: JSON.stringify(parsed) })
        });
      } catch (e) {
        console.warn('Failed to auto-save pole data', e);
      }
    }

    setActivePoleModal(null);
  };

  const renderPoleSection = (sectionKey: string, sectionTitle: string, isPaletload: boolean = false, containerClassName: string = "min-h-[120px]") => {
    const item = poleData[sectionKey];
    const canEdit = divUpper === 'POLE' || (divUpper === 'MSC ADM' && (sectionKey === 'A.1' || sectionKey === 'A.2' || sectionKey === 'A.3' || sectionKey === 'A.3_MSC'));
    const btnLabel = divUpper === 'MSC ADM' ? '+ ADD DATA BY MSC ADM' : '+ ADD DATA BY POLE';

    if (item && item.imageDataUrl) {
      return (
        <div className={`bg-[#EAEFE3] flex-1 ${containerClassName} relative group flex items-center justify-center p-1 overflow-hidden`}>
          <img src={item.imageDataUrl} alt={sectionTitle} className="max-w-full max-h-full object-contain" />
          {canEdit && (
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1.5 bg-black/60 p-1 rounded backdrop-blur-sm z-20">
              <button
                onClick={() => openPoleModal(sectionKey, sectionTitle, isPaletload)}
                className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow"
                title="Edit Data"
              >
                ✏️ EDIT
              </button>
              <button
                onClick={() => deletePoleSection(sectionKey)}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow"
                title="Hapus Data"
              >
                🗑 DELETE
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`bg-[#EAEFE3] flex-1 ${containerClassName} flex items-center justify-center`}>
        {canEdit && (
          <button
            onClick={() => openPoleModal(sectionKey, sectionTitle, isPaletload)}
            className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2 rounded-[4px] text-[12px] font-bold shadow-md flex items-center justify-center transition-colors"
          >
            {btnLabel}
          </button>
        )}
      </div>
    );
  };"""

content = content.replace(state_search, state_replace, 1)

# 2. In handleOpenDoc, load poleData
pole_load_search = """      if (parsed.savedQcResult) {"""
pole_load_replace = """      let reconstructedPoleData: Record<string, any> = {};
      if (parsed.poleData) {
        reconstructedPoleData = { ...parsed.poleData };
      } else if (parsed.savedPoleData) {
        reconstructedPoleData = { ...parsed.savedPoleData };
      }
      if (parsed.A1ImageData && !reconstructedPoleData['A.1']) {
        reconstructedPoleData['A.1'] = { imageDataUrl: parsed.A1ImageData.startsWith('data:') ? parsed.A1ImageData : `data:image/png;base64,${parsed.A1ImageData}` };
      }
      if (parsed.A2ImageData && !reconstructedPoleData['A.2']) {
        reconstructedPoleData['A.2'] = { imageDataUrl: parsed.A2ImageData.startsWith('data:') ? parsed.A2ImageData : `data:image/png;base64,${parsed.A2ImageData}` };
      }
      if (parsed.A3PoleImageData && !reconstructedPoleData['A.3']) {
        reconstructedPoleData['A.3'] = { imageDataUrl: parsed.A3PoleImageData.startsWith('data:') ? parsed.A3PoleImageData : `data:image/png;base64,${parsed.A3PoleImageData}` };
      }
      if (parsed.A3MscImageData && !reconstructedPoleData['A.3_MSC']) {
        reconstructedPoleData['A.3_MSC'] = { imageDataUrl: parsed.A3MscImageData.startsWith('data:') ? parsed.A3MscImageData : `data:image/png;base64,${parsed.A3MscImageData}` };
      }
      if (parsed.PaletloadImageData && !reconstructedPoleData['A.6']) {
        reconstructedPoleData['A.6'] = {
          imageDataUrl: parsed.PaletloadImageData.startsWith('data:') ? parsed.PaletloadImageData : `data:image/png;base64,${parsed.PaletloadImageData}`,
          outerBox: parsed.PaletloadOuterBox || '',
          layers: parsed.PaletloadLayers || '',
          fg: parsed.PaletloadFg || ''
        };
      }
      if (parsed.A7ImageData && !reconstructedPoleData['A.7']) {
        reconstructedPoleData['A.7'] = { imageDataUrl: parsed.A7ImageData.startsWith('data:') ? parsed.A7ImageData : `data:image/png;base64,${parsed.A7ImageData}` };
      }
      setPoleData(reconstructedPoleData);

      if (parsed.savedQcResult) {"""

content = content.replace(pole_load_search, pole_load_replace, 1)

# 3. In Save & Close button payload, add poleData
payload_search = """              const payload = {
                // Web app states
                savedUpFormData: upFormData,
                savedQcFillingData: qcFillingData,
                savedQcResult: qcResult,"""

payload_replace = """              const payload = {
                // Web app states
                savedUpFormData: upFormData,
                savedQcFillingData: qcFillingData,
                savedQcResult: qcResult,
                poleData: poleData,
                savedPoleData: poleData,
                A1ImageData: poleData['A.1']?.imageDataUrl,
                A2ImageData: poleData['A.2']?.imageDataUrl,
                A3PoleImageData: poleData['A.3']?.imageDataUrl,
                A3MscImageData: poleData['A.3_MSC']?.imageDataUrl,
                PaletloadImageData: poleData['A.6']?.imageDataUrl,
                PaletloadOuterBox: poleData['A.6']?.outerBox,
                PaletloadLayers: poleData['A.6']?.layers,
                PaletloadFg: poleData['A.6']?.fg,
                A7ImageData: poleData['A.7']?.imageDataUrl,"""

content = content.replace(payload_search, payload_replace, 1)

# 4. Replace A.1, A.2, A.3 in LipEye and Normal
a1_a3_search = """                      {qcResult?.type === 'LipEye' ? (
                        <div className="flex flex-col flex-1 min-h-0">
                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.1. Appearance Filling</div>
                          <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-[100px] flex items-center justify-center">
                            {divUpper === 'POLE' && (
                              <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2 rounded-[4px] text-[12px] font-bold shadow-md flex items-center justify-center transition-colors">
                                + ADD DATA BY POLE
                              </button>
                            )}
                            {divUpper === 'MSC ADM' && (
                              <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2 rounded-[4px] text-[12px] font-bold shadow-md flex items-center justify-center transition-colors">
                                + ADD DATA BY MSC ADM
                              </button>
                            )}
                          </div>
                          
                          <div className="flex flex-row flex-1 min-h-0 border-b border-black">
                            <div className="flex flex-col flex-1 min-h-0 border-r border-black">
                              <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center justify-center text-center">A.2. Appearance Packing</div>
                              <div className="bg-[#EAEFE3] flex-1 min-h-[100px] flex items-center justify-center">
                                {divUpper === 'POLE' && (
                                  <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-[4px] text-[11px] font-bold shadow-md flex items-center justify-center transition-colors">
                                    + ADD DATA BY POLE
                                  </button>
                                )}
                                {divUpper === 'MSC ADM' && (
                                  <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-[4px] text-[11px] font-bold shadow-md flex items-center justify-center transition-colors">
                                    + ADD DATA BY MSC ADM
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col flex-1 min-h-0">
                              <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center justify-center text-center">A.3 Appearance Assembly</div>
                              <div className="bg-[#EAEFE3] flex-1 min-h-[100px] flex items-center justify-center">
                                {divUpper === 'POLE' && (
                                  <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-[4px] text-[11px] font-bold shadow-md flex items-center justify-center transition-colors">
                                    + ADD DATA BY POLE
                                  </button>
                                )}
                                {divUpper === 'MSC ADM' && (
                                  <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-[4px] text-[11px] font-bold shadow-md flex items-center justify-center transition-colors">
                                    + ADD DATA BY MSC ADM
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.1. Appearance Filling</div>
                          <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-[120px] flex items-center justify-center">
                            {divUpper === 'POLE' && (
                              <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2.5 rounded-[4px] text-[13px] font-bold shadow-md flex items-center justify-center transition-colors">
                                + ADD DATA BY POLE
                              </button>
                            )}
                            {divUpper === 'MSC ADM' && (
                              <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2.5 rounded-[4px] text-[13px] font-bold shadow-md flex items-center justify-center transition-colors">
                                + ADD DATA BY MSC ADM
                              </button>
                            )}
                          </div>

                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.2. Appearance Assembly</div>
                          <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-[120px] flex items-center justify-center">
                            {divUpper === 'POLE' && (
                              <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2.5 rounded-[4px] text-[13px] font-bold shadow-md flex items-center justify-center transition-colors">
                                + ADD DATA BY POLE
                              </button>
                            )}
                            {divUpper === 'MSC ADM' && (
                              <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2.5 rounded-[4px] text-[13px] font-bold shadow-md flex items-center justify-center transition-colors">
                                + ADD DATA BY MSC ADM
                              </button>
                            )}
                          </div>

                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.3. Appearance Packing</div>
                          <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-[120px] flex items-center justify-center">
                            {divUpper === 'POLE' && (
                              <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2.5 rounded-[4px] text-[13px] font-bold shadow-md flex items-center justify-center transition-colors">
                                + ADD DATA BY POLE
                              </button>
                            )}
                            {divUpper === 'MSC ADM' && (
                              <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2.5 rounded-[4px] text-[13px] font-bold shadow-md flex items-center justify-center transition-colors">
                                + ADD DATA BY MSC ADM
                              </button>
                            )}
                          </div>
                        </>
                      )}"""

a1_a3_replace = """                      {qcResult?.type === 'LipEye' ? (
                        <div className="flex flex-col flex-1 min-h-0">
                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.1. Appearance Filling</div>
                          {renderPoleSection('A.1', 'A.1. Appearance Filling', false, 'min-h-[100px] border-b border-black')}
                          
                          <div className="flex flex-row flex-1 min-h-0 border-b border-black">
                            <div className="flex flex-col flex-1 min-h-0 border-r border-black">
                              <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center justify-center text-center">A.2. Appearance Packing</div>
                              {renderPoleSection('A.2', 'A.2. Appearance Packing', false, 'min-h-[100px]')}
                            </div>
                            
                            <div className="flex flex-col flex-1 min-h-0">
                              <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center justify-center text-center">A.3 Appearance Assembly</div>
                              {renderPoleSection('A.3', 'A.3 Appearance Assembly', false, 'min-h-[100px]')}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.1. Appearance Filling</div>
                          {renderPoleSection('A.1', 'A.1. Appearance Filling', false, 'min-h-[120px] border-b border-black')}

                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.2. Appearance Assembly</div>
                          {renderPoleSection('A.2', 'A.2. Appearance Assembly', false, 'min-h-[120px] border-b border-black')}

                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.3. Appearance Packing</div>
                          {renderPoleSection('A.3', 'A.3. Appearance Packing', false, 'min-h-[120px] border-b border-black')}
                        </>
                      )}"""

content = content.replace(a1_a3_search, a1_a3_replace, 1)

# 5. Replace A.6 and A.7 in Right Column
a6_a7_search = """                <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.6. Paletisasi</div>

                {/* A.6 Green Body */}
                <div className="bg-[#EAEFE3] border-b border-black h-[140px] flex items-center justify-center">
                  {divUpper === 'POLE' && (
                    <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2.5 rounded-[4px] text-[13px] font-bold shadow-md flex items-center justify-center transition-colors">
                      + ADD DATA BY POLE
                    </button>
                  )}
                </div>

                <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center uppercase">A.7. VACCUM / JACOMEX / TORSI</div>

                {/* A.7 Green Body */}
                <div className="bg-[#EAEFE3] border-b border-black h-[75px] flex items-center justify-center">
                  {divUpper === 'POLE' && (
                    <button className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2 rounded-[4px] text-[12px] font-bold shadow-md flex items-center justify-center transition-colors">
                      + ADD DATA BY POLE
                    </button>
                  )}
                </div>"""

a6_a7_replace = """                <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.6. Paletisasi</div>
                {renderPoleSection('A.6', 'A.6. Paletisasi', true, 'h-[140px] border-b border-black')}

                <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center uppercase">A.7. VACCUM / JACOMEX / TORSI</div>
                {renderPoleSection('A.7', 'A.7. VACCUM / JACOMEX / TORSI', false, 'h-[75px] border-b border-black')}"""

content = content.replace(a6_a7_search, a6_a7_replace, 1)

# 6. Add PoleInputDialogModal component rendering before end of openDoc view
modal_mount_search = """          {/* Warning Modal */}"""
modal_mount_replace = """          {/* POLE DATA INPUT MODAL (Matching User Screenshot Exactly) */}
          {activePoleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-lg shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col max-w-[950px] w-auto">
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
                    className="text-[#64748B] hover:text-[#0F172A] text-sm font-bold px-2 py-0.5 rounded"
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
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors"
                    >
                      <span>📁</span>
                      <span>UPLOAD IMAGE</span>
                    </button>

                    {/* ROTATE */}
                    <button
                      onClick={() => setModalRotation((prev) => (prev + 90) % 360)}
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors"
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
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors"
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
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors"
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
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors"
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
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors"
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
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors"
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
                      className="bg-[#EF6D6D] hover:bg-[#DC2626] text-white text-[11px] font-bold px-3 py-1.5 rounded-[4px] flex items-center space-x-1 shadow-sm transition-colors ml-auto"
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
                            const midX = (item.x1 + item.x2) / 2;
                            const midY = (item.y1 + item.y2) / 2;
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
                      className="bg-white border border-[#CBD5E1] text-[#475569] font-semibold text-[12px] w-[95px] h-[36px] rounded hover:bg-[#F1F5F9] transition-colors"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleSavePoleResult}
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-bold text-[12px] w-[130px] h-[36px] rounded shadow-md transition-colors"
                    >
                      SAVE RESULT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning Modal */}"""

content = content.replace(modal_mount_search, modal_mount_replace, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully applied POLE modal and section updates!")
