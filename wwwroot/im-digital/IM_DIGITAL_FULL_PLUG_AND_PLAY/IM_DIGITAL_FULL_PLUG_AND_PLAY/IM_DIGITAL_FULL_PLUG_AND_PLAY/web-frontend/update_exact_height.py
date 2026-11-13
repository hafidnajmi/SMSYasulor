file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update getCanvasDimensions
dims_old = """  const getCanvasDimensions = (sectionKey: string, isPaletload?: boolean) => {
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
  };"""

dims_new = """  const getCanvasDimensions = (sectionKey: string, isPaletload?: boolean) => {
    const isLipEye = (qcFillingData.templateIm || '').toUpperCase().includes('LIP EYE');
    const isDuo = (qcFillingData.templateIm || '').toUpperCase() === 'DUO';
    
    if (sectionKey === 'A.7') {
      return { width: 670, height: 85 };
    }
    if (isPaletload || sectionKey === 'A.6') {
      return { width: 670, height: isLipEye ? 154 : (isDuo ? 162 : 175) };
    }
    if ((sectionKey === 'A.2' || sectionKey === 'A.3') && isLipEye) {
      return { width: 334, height: 154 };
    }
    if (sectionKey === 'A.1' && isLipEye) {
      return { width: 670, height: 154 };
    }
    if (isDuo) {
      return { width: 670, height: 164 };
    }
    // Standard Normal / Biphase (Exact 670 x 214 matching Image 2!)
    return { width: 670, height: 214 };
  };"""

code = code.replace(dims_old, dims_new, 1)

# 2. Update sections in document view
sections_old = """                      {qcResult?.type === 'LipEye' ? (
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

sections_new = """                      {qcResult?.type === 'LipEye' ? (
                        <div className="flex flex-col flex-1 min-h-0">
                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.1. Appearance Filling</div>
                          {renderPoleSection('A.1', 'A.1. Appearance Filling', false, 'min-h-[154px] h-[154px] border-b border-black')}
                          
                          <div className="flex flex-row flex-1 min-h-0 border-b border-black">
                            <div className="flex flex-col flex-1 min-h-0 border-r border-black">
                              <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center justify-center text-center">A.2. Appearance Packing</div>
                              {renderPoleSection('A.2', 'A.2. Appearance Packing', false, 'min-h-[154px] h-[154px]')}
                            </div>
                            
                            <div className="flex flex-col flex-1 min-h-0">
                              <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center justify-center text-center">A.3 Appearance Assembly</div>
                              {renderPoleSection('A.3', 'A.3 Appearance Assembly', false, 'min-h-[154px] h-[154px]')}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.1. Appearance Filling</div>
                          {renderPoleSection('A.1', 'A.1. Appearance Filling', false, 'min-h-[214px] h-[214px] border-b border-black')}

                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.2. Appearance Assembly</div>
                          {renderPoleSection('A.2', 'A.2. Appearance Assembly', false, 'min-h-[214px] h-[214px] border-b border-black')}

                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.3. Appearance Packing</div>
                          {renderPoleSection('A.3', 'A.3. Appearance Packing', false, 'min-h-[214px] h-[214px] border-b border-black')}
                        </>
                      )}"""

code = code.replace(sections_old, sections_new, 1)

# 3. Update right column A.6 and A.7
rc_old = """                <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.6. Paletisasi</div>
                {renderPoleSection('A.6', 'A.6. Paletisasi', true, 'h-[140px] border-b border-black')}

                <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center uppercase">A.7. VACCUM / JACOMEX / TORSI</div>
                {renderPoleSection('A.7', 'A.7. VACCUM / JACOMEX / TORSI', false, 'h-[75px] border-b border-black')}"""

rc_new = """                <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.6. Paletisasi</div>
                {renderPoleSection('A.6', 'A.6. Paletisasi', true, 'h-[175px] border-b border-black')}

                <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center uppercase">A.7. VACCUM / JACOMEX / TORSI</div>
                {renderPoleSection('A.7', 'A.7. VACCUM / JACOMEX / TORSI', false, 'h-[85px] border-b border-black')}"""

code = code.replace(rc_old, rc_new, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Updated height to 214px matching actual document!")
