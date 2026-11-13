const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const search = `                      {(() => {
                      const getPhaseTitle = (index: number, defaultName: string) => {
                        if (!openDoc || !openDoc.rawDocument || !openDoc.rawDocument.noFla) return \`(\${defaultName})\`;
                        const parts = openDoc.rawDocument.noFla.split(/[\\r\\n,]+/).map((p: string) => p.trim()).filter((p: string) => p);
                        if (parts.length > index) {
                          return \`\${parts[index]} (\${parts[index]} \${defaultName})\`;
                        }
                        return \`(\${defaultName})\`;
                      };`;

const endIndexStr = `                          {cfg.density !== null && (
                            <div className="bg-[#EAEFE3] border-b border-black h-[20px] px-[6px] flex items-center text-[10px] font-bold text-black">
                              Density : {(parseFloat(cfg.density) || 0).toFixed(3)}
                            </div>
                          )}
                        </div>
                      ));
                    })()}`;

const startIndex = c.indexOf('{(() => {\n                      const getPhaseTitle');
const endIndex = c.indexOf('})()}', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replaceStr = `                      {(() => {
                      if (qcResult && qcResult.type === 'Duo') {
                        const getPhaseTitle = (index: number, defaultName: string) => {
                          if (!openDoc || !openDoc.rawDocument || !openDoc.rawDocument.noFla) return \`(\${defaultName})\`;
                          const parts = openDoc.rawDocument.noFla.split(/[\\r\\n,]+/).map((p: string) => p.trim()).filter((p: string) => p);
                          if (parts.length > index) {
                            const p1 = parts[index];
                            if (p1.includes('(') && p1.includes(')')) return \`: \${p1.replace(/^:\\s*/, '')}\`;
                            return \`: \${p1.replace(/^:\\s*/, '')} (\${openDoc.rawDocument.description || ''} \${defaultName})\`;
                          }
                          return \`(\${defaultName})\`;
                        };
                        
                        const renderDuoRow = (title: string, limits: any, density: string, isTotal: boolean) => (
                          <div className="flex flex-col border-b border-black w-full">
                            {/* Title Row */}
                            <div className="bg-[#C0CBE1] border-b border-black h-[18px] flex items-center px-1 font-semibold text-[10px] text-black">
                              {title}
                            </div>
                            
                            {/* Syarat Legal Row */}
                            {!isTotal && (
                              <div className="h-[12px] border-b border-black bg-[#EAEFE3] flex justify-between px-1 text-[7.5px] text-[#555] relative">
                                <span>. Syarat legal</span>
                                <span className="absolute left-[36%]">{limits ? limits.syaratLegal.toFixed(3).replace(/0$/, '') : ''}</span>
                                <span></span>
                              </div>
                            )}

                            {/* Color Headers */}
                            <div className="grid grid-cols-5 text-center text-[8px] font-bold border-b border-black h-[14px]">
                              <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black">STOP</div>
                              <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                              <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black tracking-widest">RUNNING</div>
                              <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                              <div className="bg-[#C00000] text-white flex items-center justify-center">STOP</div>
                            </div>
                            
                            {/* Limits Row */}
                            <div className="grid grid-cols-5 text-center text-[11px] bg-white h-[35px] relative">
                              <div className="flex flex-col items-start justify-start pt-[2px] px-1 font-bold">
                                <span className="text-[#003366] leading-none mb-[2px] text-[14px]">{limits ? limits.stopMin.toFixed(1) : ''}</span>
                                <span className="text-black font-normal text-[8.5px] leading-none ml-[25px]">min</span>
                              </div>
                              <div className="flex flex-col items-center justify-start pt-[2px]">
                                <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits ? limits.adjMin.toFixed(1) : ''}</span>
                              </div>
                              <div className="flex items-start justify-center pt-[2px] relative w-full h-full">
                                <div className="absolute left-[-20px] flex flex-col items-center font-bold">
                                  <span className="text-[#003366] leading-none mb-[1px] text-[14px]">{limits ? limits.nominal.toFixed(1) : ''}</span>
                                  <span className="text-black font-normal text-[8.5px] leading-none">nominal</span>
                                </div>
                                <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center text-[8px] font-bold w-[45px] mx-auto absolute left-[50%] -translate-x-[50%] h-[35px] top-0 z-10">
                                  <span className="text-black text-[13px] font-normal leading-none mb-1 mt-1">{limits ? limits.linkBom.toFixed(1) : ''}</span>
                                  <span className="leading-none text-[6.5px] text-[#555] font-normal">LINK BOM</span>
                                </div>
                                <div className="absolute right-[-20px] flex flex-col items-center font-normal">
                                  <span className="text-black leading-none mb-[1px] text-[13px] mt-[1px]">{limits ? limits.runMax.toFixed(1) : ''}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-center justify-start pt-[2px] relative">
                                <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits ? limits.adjMax.toFixed(1) : ''}</span>
                                <span className="text-black font-bold text-[8px] leading-none absolute bottom-[1px] right-[10px]">max</span>
                                <span className="text-black font-bold text-[7px] leading-none absolute bottom-[-9px] right-[12px]">2/3</span>
                              </div>
                              <div className="flex flex-col items-end justify-start pt-[2px] px-1 font-bold relative">
                                <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits ? limits.stopMax.toFixed(1) : ''}</span>
                                {!isTotal && <span className="text-[#C00000] font-bold text-[7px] leading-none absolute bottom-[-9px] right-[10px]">50.0</span>}
                              </div>
                            </div>
                            
                            {/* Density Row */}
                            <div className="h-[18px] bg-white flex items-center px-1 text-[8.5px] font-bold justify-between">
                              {!isTotal ? <span>Density &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;<span className="text-[#0078D4]">{density}</span></span> : <span>&nbsp;</span>}
                            </div>
                          </div>
                        );

                        return (
                          <div className="flex flex-col w-full">
                            {renderDuoRow(getPhaseTitle(0, 'PHASE 1'), qcResult.phase1.limitsGram, (parseFloat(qcFillingData.denPhase1) || 1).toFixed(3).replace(/0+$/, ''), false)}
                            {renderDuoRow(getPhaseTitle(1, 'PHASE 2'), qcResult.phase2.limitsGram, (parseFloat(qcFillingData.denPhase2) || 1).toFixed(3).replace(/0+$/, ''), false)}
                            {renderDuoRow(\`BERAT TOTAL (\${getPhaseTitle(0, 'PHASE 1').replace(/^:\\s*/, '').split(' ')[0]} + \${getPhaseTitle(1, 'PHASE 2').replace(/^:\\s*/, '').split(' ')[0]})\`, qcResult.total.limitsGram, "", true)}
                            {/* Extra Density for Total to match spacing */}
                            <div className="h-[18px] bg-[#EAEFE3] flex items-center px-1 text-[8.5px] font-bold justify-between border-t border-black">
                                <span>Density : {(parseFloat(qcFillingData.denPhase1) || 1).toFixed(3).replace(/0+$/, '')}</span>
                            </div>
                          </div>
                        );
                      }

                      // Normal / Sachet layout
                      const a4Configs = [
                        { title: "Berat : (gram)", limits: qcResult ? (qcResult.limitsGram || qcResult.total?.limitsGram) : null, density: null }
                      ];

                      return a4Configs.map((cfg, idx) => (
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
                                    <span className="absolute left-full ml-2 text-black whitespace-nowrap">Gram</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="absolute right-full mr-2 text-black font-bold whitespace-nowrap">LINK BOM</span>
                                    <span className="text-black font-bold text-[11px]">{cfg.limits.linkBom.toFixed(1)}</span>
                                    <span className="absolute left-full ml-2 text-black font-normal whitespace-nowrap">Gram</span>
                                  </>
                                )
                              ) : (
                                <>LINK BOM &nbsp;&nbsp;<span className="text-black font-semibold">&nbsp;</span>&nbsp;&nbsp; Gram</>
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
                          
                          {cfg.density !== null && (
                            <div className="bg-[#EAEFE3] border-b border-black h-[20px] px-[6px] flex items-center text-[10px] font-bold text-black">
                              Density : {(parseFloat(cfg.density) || 0).toFixed(3)}
                            </div>
                          )}
                        </div>
                      ));
                    })()}`;

  fs.writeFileSync(p, c.substring(0, startIndex) + replaceStr + c.substring(endIndex + 5), 'utf8');
  console.log('Replaced successfully');
} else {
  console.log('Not found');
}
