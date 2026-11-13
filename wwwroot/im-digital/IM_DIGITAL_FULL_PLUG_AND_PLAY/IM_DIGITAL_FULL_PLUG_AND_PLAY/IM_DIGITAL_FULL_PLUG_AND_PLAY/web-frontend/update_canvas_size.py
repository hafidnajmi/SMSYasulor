file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# Add getCanvasDimensions helper function
dims_helper = """  const getCanvasDimensions = (sectionKey: string, isPaletload?: boolean) => {
    const isLipEye = (qcFillingData.templateIm || '').toUpperCase().includes('LIP EYE');
    if (sectionKey === 'A.7') {
      return { width: 670, height: 75 };
    }
    if (isPaletload || sectionKey === 'A.6') {
      return { width: 670, height: 140 };
    }
    if ((sectionKey === 'A.2' || sectionKey === 'A.3') && isLipEye) {
      return { width: 334, height: 100 };
    }
    if (sectionKey === 'A.1' && isLipEye) {
      return { width: 670, height: 100 };
    }
    // Standard Normal / Duo / Biphase A.1, A.2, A.3
    return { width: 670, height: 120 };
  };

  const handleSavePoleResult = async () => {"""

code = code.replace("  const handleSavePoleResult = async () => {", dims_helper, 1)

# Update handleSavePoleResult width & height
save_dims_old = """    const width = 640;
    const height = isPaletload ? 240 : 200;"""

save_dims_new = """    const dims = getCanvasDimensions(sectionKey, isPaletload);
    const width = dims.width;
    const height = dims.height;"""

code = code.replace(save_dims_old, save_dims_new, 1)

# Update renderPoleSection image display
render_img_old = """<img src={item.imageDataUrl} alt={sectionTitle} className="max-w-full max-h-full object-contain" />"""
render_img_new = """<img src={item.imageDataUrl} alt={sectionTitle} className="w-full h-full object-fill" />"""
code = code.replace(render_img_old, render_img_new, 1)

# Update modal canvas dimensions
modal_canvas_old = """style={{ width: '640px', height: activePoleModal.isPaletload ? '240px' : '210px' }}"""
modal_canvas_new = """style={{ width: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).width}px`, height: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).height}px` }}"""
code = code.replace(modal_canvas_old, modal_canvas_new, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Updated canvas dimensions to match actual document section size!")
