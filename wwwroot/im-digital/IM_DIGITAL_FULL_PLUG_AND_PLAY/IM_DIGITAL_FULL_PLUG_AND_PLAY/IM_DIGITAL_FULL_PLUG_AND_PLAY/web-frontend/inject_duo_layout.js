const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startSearch5 = "{/* A.5 Row 1 */}";
const endSearch5 = "{/* Density Header Update */}";

const startIdx5 = content.indexOf(startSearch5);
const endIdx5 = content.indexOf(endSearch5);

if (startIdx5 !== -1 && endIdx5 !== -1) {
    const replacement5 = `
                    {(() => {
                      const a5Configs = (qcResult && qcResult.type === 'Duo') ? [
                        { title: \`\${qcFillingData.volPhase1 || 0} (\${qcFillingData.volPhase1 || 0} PHASE 1)\`, limits: qcResult.phase1.limitsMl },
                        { title: \`\${qcFillingData.volPhase2 || 0} (\${qcFillingData.volPhase2 || 0} PHASE 2)\`, limits: qcResult.phase2.limitsMl },
                        { title: \`VOLUME TOTAL (\${qcFillingData.volPhase1 || 0} + \${qcFillingData.volPhase2 || 0})\`, limits: qcResult.total.limitsMl }
                      ] : [
                        { title: "Volume (ml) :", limits: qcResult ? (qcResult.limitsMl || qcResult.total?.limitsMl) : null }
                      ];

                      return a5Configs.map((cfg, idx) => (
                        <div key={idx}>
                          {/* Row 1 */}
                          <div className="bg-[#EAEFE3] border-b border-black flex justify-between px-[6px] items-center h-[20px] text-[10.5px] font-bold relative">
                            <div className="text-black w-[150px]">{cfg.title}</div>
                            
                            <div className="absolute left-[50%] -translate-x-[50%] flex items-center justify-center">
                              {cfg.limits ? (
                                (qcResult && qcResult.type === 'Sachet') ? (
                                  <>
                                    <span className="absolute right-full mr-2 text-black whitespace-nowrap">Nominal</span>
                                    <span className="text-black font-extrabold">{cfg.limits.nominal.toFixed(1)}</span>
                                    <span className="absolute left-full ml-2 text-black whitespace-nowrap">ML</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="absolute right-full mr-2 text-black font-bold whitespace-nowrap">LINK BOM</span>
                                    <span className="text-black font-bold text-[11px]">{cfg.limits.linkBom.toFixed(1)}</span>
                                    <span className="absolute left-full ml-2 text-black font-normal whitespace-nowrap">ML</span>
                                  </>
                                )
                              ) : (
                                <>LINK BOM &nbsp;&nbsp;<span className="text-black font-semibold">&nbsp;</span>&nbsp;&nbsp; ML</>
                              )}
                            </div>

                            <div className="text-black w-[120px] text-right z-10">
                              Syarat Legal &nbsp;&nbsp;<span className="text-black font-semibold">{cfg.limits ? cfg.limits.syaratLegal.toFixed(3).replace(/0$/, '') : ''}</span>
                            </div>
                          </div>
                          
                          {/* Row 2 (Colors) */}
                          <div className="grid grid-cols-5 text-center text-[8px] font-bold border-b border-black h-[14px]">
                            <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black">STOP</div>
                            <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                            <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black">RUNNING</div>
                            <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                            <div className="bg-[#C00000] text-white flex items-center justify-center">STOP</div>
                          </div>

                          {/* Data Row */}
                          <div className="grid grid-cols-5 text-center text-[11px] bg-[#EAEFE3] border-b border-black h-[35px] relative">
                            {cfg.limits ? (
                              (qcResult && qcResult.type === 'Sachet') ? (
                                <>
                                  <div className="flex flex-col items-start justify-start pt-[2px] px-1">
                                    <span className="text-[#0078D4] leading-none mb-[2px]">{cfg.limits.stopMin.toFixed(1)}</span>
                                    <span className="text-black font-normal text-[8.5px] leading-none">min</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px]">
                                  </div>
                                  <div className="flex items-start justify-center pt-[2px] relative w-full">
                                    <div className="absolute left-[-20px] flex flex-col items-center">
                                      <span className="text-[#0078D4] leading-none mb-[2px]">{cfg.limits.runMin ? cfg.limits.runMin.toFixed(1) : cfg.limits.adjMin.toFixed(1)}</span>
                                      <span className="text-black font-normal text-[8.5px] leading-none">nomina</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                      <span className="text-[#0078D4] leading-none mb-[2px]">{cfg.limits.nominal.toFixed(1)}</span>
                                      <span className="text-black font-normal text-[8.5px] leading-none">nominal</span>
                                    </div>
                                    <div className="absolute right-[-20px] flex flex-col items-center">
                                      <span className="text-[#0078D4] leading-none mb-[2px]">{cfg.limits.runMax ? cfg.limits.runMax.toFixed(1) : cfg.limits.adjMax.toFixed(1)}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px]">
                                  </div>
                                  <div className="flex flex-col items-end justify-start pt-[2px] px-1">
                                    <span className="text-[#0078D4] leading-none mb-[2px]">{cfg.limits.stopMax.toFixed(1)}</span>
                                    <span className="text-black font-normal text-[8.5px] leading-none">max</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex flex-col items-start justify-start pt-[2px] px-1">
                                    <span className="text-[#0078D4] leading-none mb-[2px]">{cfg.limits.stopMin.toFixed(1)}</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px]">
                                    <span className="text-[#0078D4] leading-none mb-[2px]">{cfg.limits.adjMin.toFixed(1)}</span>
                                    <span className="text-black font-normal text-[8.5px] leading-none">min</span>
                                  </div>
                                  <div className="flex items-start justify-center pt-[2px] relative w-full h-full">
                                    <div className="absolute left-[-15px] flex flex-col items-center">
                                      <span className="text-[#0078D4] leading-none mb-[1px]">{cfg.limits.nominal.toFixed(1)}</span>
                                      <span className="text-black font-normal text-[9px] leading-none">nominal</span>
                                    </div>
                                    <div className="bg-[#FFCC00] border-l border-r border-black flex flex-col items-center justify-center text-[8px] font-bold w-[45px] mx-auto absolute left-[50%] -translate-x-[50%] h-[35px] top-[-1px] shadow-sm z-10">
                                      <span className="text-[#000000] text-[11px] font-normal leading-none mb-1">{cfg.limits.linkBom.toFixed(1)}</span>
                                      <span className="leading-none text-[8.5px]">LINK BOM</span>
                                    </div>
                                    <div className="absolute right-[-15px] flex flex-col items-center">
                                      <span className="text-[#0078D4] leading-none mb-[1px]">{cfg.limits.runMax.toFixed(1)}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px]">
                                    <span className="text-[#0078D4] leading-none mb-[2px]">{cfg.limits.adjMax.toFixed(1)}</span>
                                    <span className="text-black font-normal text-[8.5px] leading-none">max</span>
                                  </div>
                                  <div className="flex flex-col items-end justify-start pt-[2px] px-1">
                                    <span className="text-[#0078D4] leading-none mb-[2px]">{cfg.limits.stopMax.toFixed(1)}</span>
                                  </div>
                                </>
                              )
                            ) : (
                              <>
                                <div className="flex flex-col items-center justify-start pt-[2px]">
                                  <span className="text-[#0078D4] leading-none mb-[2px]">&nbsp;</span>
                                  <span className="text-black font-normal text-[8.5px] leading-none">min</span>
                                </div>
                                <div className="flex flex-col items-center justify-start pt-[2px]">
                                  <span className="text-[#0078D4] leading-none mb-[2px]">&nbsp;</span>
                                  <span className="text-black font-normal text-[8.5px] leading-none">nominal</span>
                                </div>
                                <div className="bg-[#FFB300] border-l border-r border-black flex flex-col items-center justify-center text-[7px] font-bold w-[35px] mx-auto absolute left-[50%] -translate-x-[50%] h-full top-0">
                                  <span>LINK</span><span>BOM</span>
                                </div>
                                <div className="flex flex-col items-center justify-start pt-[2px]">
                                  <span className="text-[#0078D4] leading-none mb-[2px]">&nbsp;</span>
                                  <span className="text-black font-normal text-[8.5px] leading-none">max</span>
                                </div>
                                <div className="flex items-start justify-end px-[2px] pt-[2px] text-[#0078D4]">
                                  &nbsp;
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                    
                    `;
                    
    content = content.substring(0, startIdx5) + replacement5 + content.substring(endIdx5);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Successfully injected Duo 3-section layout for A.5!");
} else {
    console.log("Could not find the injection points for A.5");
}
