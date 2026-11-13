file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Replace the modal state definitions and openPoleModal / handleSavePoleResult / Canvas JSX
old_state_block = """  // POLE Modal Canvas Editor State
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
  };"""

new_state_block = """  // POLE Modal Canvas Editor State
  const [modalImageState, setModalImageState] = useState<{
    src: string | null;
    left: number;
    top: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
    cropLeft: number;
    cropTop: number;
    cropRight: number;
    cropBottom: number;
  }>({
    src: null,
    left: 40,
    top: 20,
    width: 320,
    height: 180,
    naturalWidth: 320,
    naturalHeight: 180,
    cropLeft: 0,
    cropTop: 0,
    cropRight: 0,
    cropBottom: 0
  });

  const [modalRotation, setModalRotation] = useState<number>(0);
  const [modalAnnotations, setModalAnnotations] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [paletloadOuterBox, setPaletloadOuterBox] = useState<string>('');
  const [paletloadLayers, setPaletloadLayers] = useState<string>('');
  const [paletloadFg, setPaletloadFg] = useState<string>('');

  // Dragging & Resizing & Cropping Interaction State
  const [dragState, setDragState] = useState<{
    mode: 'drag-image' | 'scale-image' | 'crop-image' | 'drag-annotation' | null;
    handle?: string;
    startX: number;
    startY: number;
    initLeft: number;
    initTop: number;
    initWidth: number;
    initHeight: number;
    initCropL: number;
    initCropT: number;
    initCropR: number;
    initCropB: number;
    initItem?: any;
  } | null>(null);

  const openPoleModal = (sectionKey: string, sectionTitle: string, isPaletload: boolean = false) => {
    const existing = poleData[sectionKey] || {};
    const scene = existing.sceneState || {};
    const imgSrc = scene.imageSrc || existing.imageDataUrl || null;
    
    const canvasW = 640;
    const canvasH = isPaletload ? 240 : 210;

    if (scene.imageState) {
      setModalImageState({ ...scene.imageState });
    } else if (imgSrc) {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min((canvasW * 0.8) / (img.naturalWidth || 400), (canvasH * 0.8) / (img.naturalHeight || 200), 1);
        const w = Math.round((img.naturalWidth || 400) * scale);
        const h = Math.round((img.naturalHeight || 200) * scale);
        setModalImageState({
          src: imgSrc,
          left: Math.round((canvasW - w) / 2),
          top: Math.round((canvasH - h) / 2),
          width: w,
          height: h,
          naturalWidth: img.naturalWidth || w,
          naturalHeight: img.naturalHeight || h,
          cropLeft: 0,
          cropTop: 0,
          cropRight: 0,
          cropBottom: 0
        });
      };
      img.src = imgSrc;
    } else {
      setModalImageState({
        src: null,
        left: 40,
        top: 20,
        width: 320,
        height: 180,
        naturalWidth: 320,
        naturalHeight: 180,
        cropLeft: 0,
        cropTop: 0,
        cropRight: 0,
        cropBottom: 0
      });
    }

    setModalRotation(scene.rotation || 0);
    setModalAnnotations(scene.annotations || []);
    setSelectedItemId(imgSrc ? 'image' : null);
    setEditingTextId(null);
    setPaletloadOuterBox(existing.outerBox || scene.outerBox || '');
    setPaletloadLayers(existing.layers || scene.layers || '');
    setPaletloadFg(existing.fg || scene.fg || '');
    setActivePoleModal({ sectionKey, sectionTitle, isPaletload });
  };"""

code = code.replace(old_state_block, new_state_block, 1)

# Replace handleSavePoleResult
old_save_block = """  const handleSavePoleResult = async () => {
    if (!activePoleModal) return;
    const { sectionKey, isPaletload } = activePoleModal;

    const dims = getCanvasDimensions(sectionKey, isPaletload);
    const width = dims.width;
    const height = dims.height;
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
    };"""

new_save_block = """  const handleSavePoleResult = async () => {
    if (!activePoleModal) return;
    const { sectionKey, isPaletload } = activePoleModal;

    const dims = getCanvasDimensions(sectionKey, isPaletload);
    const width = dims.width;
    const height = dims.height;
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
              ctx.beginPath();
              ctx.moveTo(item.x1, item.y1);
              ctx.lineTo(item.x1 + headlen * Math.cos(angle - Math.PI / 6), item.y1 + headlen * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(item.x1 + headlen * Math.cos(angle + Math.PI / 6), item.y1 + headlen * Math.sin(angle + Math.PI / 6));
              ctx.closePath();
              ctx.fill();
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

        if (modalImageState.src) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.save();
            const { left, top, width: imgW, height: imgH, naturalWidth, naturalHeight, cropLeft, cropTop, cropRight, cropBottom } = modalImageState;
            const destX = left + cropLeft;
            const destY = top + cropTop;
            const destW = Math.max(1, imgW - cropLeft - cropRight);
            const destH = Math.max(1, imgH - cropTop - cropBottom);

            const scaleX = naturalWidth / imgW;
            const scaleY = naturalHeight / imgH;
            const srcX = cropLeft * scaleX;
            const srcY = cropTop * scaleY;
            const srcW = destW * scaleX;
            const srcH = destH * scaleY;

            ctx.translate(destX + destW / 2, destY + destH / 2);
            ctx.rotate((modalRotation * Math.PI) / 180);
            ctx.drawImage(img, srcX, srcY, srcW, srcH, -destW / 2, -destH / 2, destW, destH);
            ctx.restore();
            drawOverlayAndAnnotations();
          };
          img.onerror = () => drawOverlayAndAnnotations();
          img.src = modalImageState.src;
        } else {
          drawOverlayAndAnnotations();
        }
      });
    };

    const finalDataUrl = await renderComposite();
    const updatedSectionData = {
      imageDataUrl: finalDataUrl,
      sceneState: {
        imageSrc: modalImageState.src,
        imageState: modalImageState,
        rotation: modalRotation,
        annotations: modalAnnotations,
        outerBox: paletloadOuterBox,
        layers: paletloadLayers,
        fg: paletloadFg
      },
      outerBox: paletloadOuterBox,
      layers: paletloadLayers,
      fg: paletloadFg
    };"""

code = code.replace(old_save_block, new_save_block, 1)

# Also update DELETE button and uploader in POLE Modal JSX
modal_jsx_old_search = """                  {/* Hidden File Input */}
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
                  />"""

modal_jsx_new_uploader = """                  {/* Hidden File Input */}
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
                          const dataUrl = evt.target?.result as string;
                          const img = new Image();
                          img.onload = () => {
                            const canvasW = 640;
                            const canvasH = activePoleModal?.isPaletload ? 240 : 210;
                            const scale = Math.min((canvasW * 0.8) / (img.naturalWidth || 400), (canvasH * 0.8) / (img.naturalHeight || 200), 1);
                            const w = Math.round((img.naturalWidth || 400) * scale);
                            const h = Math.round((img.naturalHeight || 200) * scale);
                            setModalImageState({
                              src: dataUrl,
                              left: Math.round((canvasW - w) / 2),
                              top: Math.round((canvasH - h) / 2),
                              width: w,
                              height: h,
                              naturalWidth: img.naturalWidth || w,
                              naturalHeight: img.naturalHeight || h,
                              cropLeft: 0,
                              cropTop: 0,
                              cropRight: 0,
                              cropBottom: 0
                            });
                            setSelectedItemId('image');
                          };
                          img.src = dataUrl;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />"""

code = code.replace(modal_jsx_old_search, modal_jsx_new_uploader, 1)

# Replace DELETE button handler
del_btn_old = """                  {/* DELETE */}
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
                    }}"""

del_btn_new = """                  {/* DELETE */}
                  <button
                    onClick={() => {
                      if (selectedItemId === 'image') {
                        if (confirm('Hapus gambar?')) {
                          setModalImageState((prev) => ({ ...prev, src: null }));
                          setSelectedItemId(null);
                        }
                      } else if (selectedItemId) {
                        setModalAnnotations(modalAnnotations.filter((a) => a.id !== selectedItemId));
                        setSelectedItemId(null);
                      } else if (modalImageState.src) {
                        if (confirm('Hapus gambar?')) {
                          setModalImageState((prev) => ({ ...prev, src: null }));
                        }
                      }
                    }}"""

code = code.replace(del_btn_old, del_btn_new, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Applied state and saving updates for image manipulation!")
