const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Calculate appearanceHeight
if (!content.includes('const appearanceHeight =')) {
    const addHeightVar = `
                {/* Form Sections Flex Layout */}
                <div className="flex w-full">
                  {(() => {
                    const appearanceHeight = (qcResult && qcResult.type === 'Duo') ? '191px' : '220px';
                    return (
                      <>
                  {/* Left Column (Spesifikasi FG) - Fixed Width 670px */}
                  <div className="w-[670px] shrink-0 border-r border-black flex flex-col">
                    <div className="font-bold text-center border-b border-black flex items-center justify-center h-[20px] text-[11px] bg-[#FFB300]">A. Spesifikasi FG</div>
                    
                    <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.1. Appearance Filling</div>
                    <div className="bg-[#EAEFE3] border-b border-black" style={{ height: appearanceHeight }}></div>
                    
                    <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.2. Appearance Assembly</div>
                    <div className="bg-[#EAEFE3] border-b border-black" style={{ height: appearanceHeight }}></div>
                    
                    <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.3. Appearance Packing</div>
                    <div className="bg-[#EAEFE3] border-b border-black" style={{ height: appearanceHeight }}></div>
`;
    // We need to replace the static block with this.
    const searchBlock = `{/* Form Sections Flex Layout */}
                <div className="flex w-full">
                  
                  {/* Left Column (Spesifikasi FG) - Fixed Width 670px */}
                  <div className="w-[670px] shrink-0 border-r border-black flex flex-col">
                    <div className="font-bold text-center border-b border-black flex items-center justify-center h-[20px] text-[11px] bg-[#FFB300]">A. Spesifikasi FG</div>
                    
                    <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.1. Appearance Filling</div>
                    <div className="bg-[#EAEFE3] border-b border-black h-[220px]"></div>
                    
                    <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.2. Appearance Assembly</div>
                    <div className="bg-[#EAEFE3] border-b border-black h-[220px]"></div>
                    
                    <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.3. Appearance Packing</div>
                    <div className="bg-[#EAEFE3] border-b border-black h-[220px]"></div>`;
                    
    content = content.replace(searchBlock, addHeightVar);
    
    // also we need to close the `return (<>` block for Left Column, which ends at:
    // `{/* Top Volume FG display update */}`
    // `</div>`
    const closeBlockSearch = `{/* Top Volume FG display update */}
                  </div>`;
    const closeBlockReplace = `{/* Top Volume FG display update */}
                  </div>
                  </>
                    );
                  })()}
                  `;
    content = content.replace(closeBlockSearch, closeBlockReplace);
}

// 2. Hide Density Header for Duo
const densitySearch = `{/* Density Header Update */}
                    <div className="bg-[#EAEFE3] border-b border-black px-[6px] text-[11px] font-bold h-[24px] flex items-center">
                      <span className="text-black w-[80px]">Density</span><span className="text-black mr-2">:</span>
                      <span className="text-[#0078D4] font-normal">{qcResult ? qcFillingData.density : ''}</span>
                    </div>`;
                    
const densityReplace = `{/* Density Header Update */}
                    {(!qcResult || qcResult.type !== 'Duo') && (
                      <div className="bg-[#EAEFE3] border-b border-black px-[6px] text-[11px] font-bold h-[24px] flex items-center">
                        <span className="text-black w-[80px]">Density</span><span className="text-black mr-2">:</span>
                        <span className="text-[#0078D4] font-normal">{qcResult ? qcFillingData.density : ''}</span>
                      </div>
                    )}`;
content = content.replace(densitySearch, densityReplace);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully adjusted A.1-A.3 heights and hid Density Header!");
