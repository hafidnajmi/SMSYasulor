const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let lines = fs.readFileSync(p, 'utf8').split('\n');

// Find the A.4 block
const s1 = lines.findIndex(l => l.includes("const renderBiphaseRow = (title: string"));
const e1 = lines.findIndex((l, i) => i > s1 && l.includes("// Normal / Sachet layout"));
console.log("A.4 block:", s1 + 1, "to", e1);

// Find A.5 Biphase block
const s2 = lines.findIndex(l => l.includes("qcResult && qcResult.type === 'Biphase' && ("));
const e2 = lines.findIndex((l, i) => i > s2 && l.includes("{(!qcResult || (qcResult.type !== 'Duo' && qcResult.type !== 'Biphase'))"));
console.log("A.5 block:", s2 + 1, "to", e2);

const newBlock = `                            const renderBiphaseRow = (title: string, limits: any, syaratVal: string, densityLabel: string, densityVal: string, biphaseUnitText: string = "") => (
                              <div className="flex flex-col border-b border-black w-full">
                                {/* Info Row */}
                                <div className="bg-[#EAEFE3] border-b border-black h-[18px] flex items-center px-1 text-[9px]">
                                  <span className="text-black font-bold w-[90px] shrink-0">{biphaseUnitText}</span>
                                  <span className="text-[#555] w-[40px] shrink-0 text-center">{syaratVal}</span>
                                  <span className="font-bold text-black uppercase flex-1 text-center">{title}</span>
                                  <span className="text-black shrink-0 whitespace-nowrap">{densityLabel} <span className="font-bold ml-1">{densityVal}</span></span>
                                </div>

                                {/* Color Headers */}
                                <div className="grid grid-cols-5 text-center text-[8px] font-bold border-b border-black h-[14px]">
                                  <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black">STOP</div>
                                  <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                  <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black tracking-widest">RUNNING</div>
                                  <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                  <div className="bg-[#C00000] text-white flex items-center justify-center">STOP</div>
                                </div>

                                {/* Limits Row - white bg like reference */}
                                <div className="grid grid-cols-5 text-center text-[11px] bg-white h-[35px] relative">
                                  <div className="flex flex-col items-start justify-start pt-[2px] px-1 font-bold">
                                    <span className="text-[#003366] leading-none mb-[2px] text-[14px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-normal text-[8.5px] leading-none ml-[25px]">min</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px]">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                  </div>
                                  <div className="flex items-start justify-center pt-[2px] relative w-full h-full">
                                    <div className="absolute left-[-20px] flex flex-col items-center font-bold">
                                      <span className="text-[#003366] leading-none mb-[1px] text-[14px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                      <span className="text-black font-normal text-[8.5px] leading-none">nominal</span>
                                    </div>
                                    <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center text-[8px] font-bold w-[45px] mx-auto absolute left-[50%] -translate-x-[50%] h-[35px] top-0 z-10">
                                      <span className="text-black text-[13px] font-normal leading-none mb-1 mt-1">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                      <span className="leading-none text-[6.5px] text-[#555] font-normal">LINK BOM</span>
                                    </div>
                                    <div className="absolute right-[10px] flex flex-col items-center font-normal">
                                      <span className="text-black leading-none mb-[1px] text-[13px] mt-[1px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px] relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-bold text-[8px] leading-none absolute bottom-[1px] right-[10px]">max</span>
                                  </div>
                                  <div className="flex flex-col items-end justify-start pt-[2px] px-1 font-bold relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                  </div>
                                </div>
                              </div>
                            );

                            // Duo row (unchanged)
                            const renderDuoRow = (title: string, limits: any, density: string, isTotal: boolean) => (
                              <div className="flex flex-col border-b border-black w-full">
                                <div className="bg-[#C0CBE1] border-b border-black h-[18px] flex items-center px-1 font-semibold text-[10px] text-black">
                                  {title}
                                </div>
                                {!isTotal && (
                                  <div className="h-[12px] border-b border-black bg-[#EAEFE3] flex justify-between px-1 text-[7.5px] text-[#555] relative">
                                    <span>. Syarat legal</span>
                                    <span className="absolute left-[36%]">{limits?.syaratLegal?.toFixed(3).replace(/0$/, '') ?? ''}</span>
                                    <span></span>
                                  </div>
                                )}
                                <div className="grid grid-cols-5 text-center text-[8px] font-bold border-b border-black h-[14px]">
                                  <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black">STOP</div>
                                  <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                  <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black tracking-widest">RUNNING</div>
                                  <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                  <div className="bg-[#C00000] text-white flex items-center justify-center">STOP</div>
                                </div>
                                <div className="grid grid-cols-5 text-center text-[11px] bg-white h-[35px] relative">
                                  <div className="flex flex-col items-start justify-start pt-[2px] px-1 font-bold">
                                    <span className="text-[#003366] leading-none mb-[2px] text-[14px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-normal text-[8.5px] leading-none ml-[25px]">min</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px]">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                  </div>
                                  <div className="flex items-start justify-center pt-[2px] relative w-full h-full">
                                    <div className="absolute left-[-20px] flex flex-col items-center font-bold">
                                      <span className="text-[#003366] leading-none mb-[1px] text-[14px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                      <span className="text-black font-normal text-[8.5px] leading-none">nominal</span>
                                    </div>
                                    <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center text-[8px] font-bold w-[45px] mx-auto absolute left-[50%] -translate-x-[50%] h-[35px] top-0 z-10">
                                      <span className="text-black text-[13px] font-normal leading-none mb-1 mt-1">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                      <span className="leading-none text-[6.5px] text-[#555] font-normal">LINK BOM</span>
                                    </div>
                                    <div className="absolute right-[-20px] flex flex-col items-center font-normal">
                                      <span className="text-black leading-none mb-[1px] text-[13px] mt-[1px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px] relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-bold text-[8px] leading-none absolute bottom-[1px] right-[10px]">max</span>
                                  </div>
                                  <div className="flex flex-col items-end justify-start pt-[2px] px-1 font-bold relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                  </div>
                                </div>
                                {!isTotal && (
                                  <div className="h-[18px] bg-white flex items-center px-1 text-[8.5px] font-bold justify-between">
                                    <span>Density &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;<span className="text-[#0078D4]">{density}</span></span>
                                  </div>
                                )}
                              </div>
                            );

                            const getShortPhaseName = (index: number) => {
                              if (!openDoc || !openDoc.rawDocument || !openDoc.rawDocument.noFla) return index === 0 ? "BLACK" : "WHITE";
                              const parts = openDoc.rawDocument.noFla.split(/[\\r\\n,]+/).map((p: string) => p.trim()).filter((p: string) => p);
                              if (parts.length > index) {
                                const p = parts[index];
                                const match = p.match(/PHS\\s+([A-Z]+)/i);
                                if (match) return match[1].toUpperCase();
                                const parenMatch = p.match(/\\((.*?)\\)/);
                                if (parenMatch) {
                                  const words = parenMatch[1].split(' ');
                                  return words[words.length - 1].toUpperCase();
                                }
                              }
                              return index === 0 ? "BLACK" : "WHITE";
                            };

                            const isBiphaseMode = qcResult.type === 'Biphase';
                            const d1Str = (parseFloat(qcFillingData.denPhase1) || 1).toFixed(3);
                            const d2Str = (parseFloat(qcFillingData.denPhase2) || 1).toFixed(3);
                            
                            const v1 = parseFloat(qcFillingData.volPhase1) || 0;
                            const v2 = parseFloat(qcFillingData.volPhase2) || 0;
                            const vTot = v1 + v2;
                            const d1 = parseFloat(qcFillingData.denPhase1) || 0;
                            const d2 = parseFloat(qcFillingData.denPhase2) || 0;
                            const totDenStr = (vTot > 0 ? ((v1 * d1 + v2 * d2) / vTot) : 1).toFixed(3);

                            if (isBiphaseMode) {
                              return (
                                <div className="flex flex-col w-full">
                                  {renderBiphaseRow("OIL", qcResult.phase1.limitsGram, qcResult.phase1.limitsGram?.syaratLegal?.toFixed(3) ?? '', "Density Oil :", d1Str, "Berat: (gram)")}
                                  {renderBiphaseRow("AQUEOUS", qcResult.phase2.limitsGram, qcResult.phase2.limitsGram?.syaratLegal?.toFixed(3) ?? '', "Density Water  :", d2Str, "Berat: (gram)")}
                                  {renderBiphaseRow("BiPhase", qcResult.total.limitsGram, qcResult.total.limitsGram?.syaratLegal?.toFixed(3) ?? '', "Density BiPhase :", totDenStr, "Berat: (gram)")}
                                  {/* Density BiPhase summary row */}
                                  <div className="h-[16px] bg-white flex items-center px-1 text-[8.5px] font-bold justify-start border-b border-black">
                                    <span>Density BiPhase : <span className="text-[#0078D4]">{totDenStr}</span></span>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="flex flex-col w-full">
                                {renderDuoRow(getPhaseTitle(0, 'PHASE 1'), qcResult.phase1.limitsGram, d1Str, false)}
                                {renderDuoRow(getPhaseTitle(1, 'PHASE 2'), qcResult.phase2.limitsGram, d2Str, false)}
                                {renderDuoRow(\`BERAT TOTAL (PHASE \${getShortPhaseName(0)} + \${getShortPhaseName(1)})\`, qcResult.total.limitsGram, "", true)}
                              </div>
                            );
                          }
`;

lines.splice(s1, e1 - s1, ...newBlock.split('\n'));

// Now update Biphase A.5 block
const s2b = lines.findIndex(l => l.includes("qcResult && qcResult.type === 'Biphase' && ("));
const e2b = lines.findIndex((l, i) => i > s2b && l.includes("{(!qcResult || (qcResult.type !== 'Duo' && qcResult.type !== 'Biphase'))"));
console.log("Replacing A.5 block lines", s2b + 1, "to", e2b);

const newA5Block = `                        {qcResult && qcResult.type === 'Biphase' && (
                          <>
                            {/* A.5 Header */}
                            <div className="bg-[#4C1D1D] text-white px-[4px] font-bold text-[10px] h-[16px] flex items-center border-b border-black mt-[-1px]">
                              A.5. Volume
                            </div>
                            <div className="flex flex-col w-full">
                              {(() => {
                                const renderBiphaseVolRow = (title: string, limits: any, rightLabel: string, rightVal: string, biphaseUnitText: string = "") => (
                                  <div className="flex flex-col border-b border-black w-full">
                                    <div className="bg-[#EAEFE3] border-b border-black h-[18px] flex items-center px-1 text-[9px]">
                                      <span className="text-black font-bold w-[90px] shrink-0">{biphaseUnitText}</span>
                                      <span className="font-bold text-black uppercase flex-1 text-center">{title}</span>
                                      <span className="text-black shrink-0 whitespace-nowrap">{rightLabel} <span className="font-bold text-[#00B050] ml-1">{rightVal}</span></span>
                                    </div>
                                    <div className="grid grid-cols-5 text-center text-[8px] font-bold border-b border-black h-[14px]">
                                      <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black">STOP</div>
                                      <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                      <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black tracking-widest">RUNNING</div>
                                      <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                      <div className="bg-[#C00000] text-white flex items-center justify-center">STOP</div>
                                    </div>
                                    <div className="grid grid-cols-5 text-center text-[11px] bg-white h-[35px] relative">
                                      <div className="flex flex-col items-start justify-start pt-[2px] px-1 font-bold">
                                        <span className="text-[#003366] leading-none mb-[2px] text-[14px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-normal text-[8.5px] leading-none ml-[25px]">min</span>
                                      </div>
                                      <div className="flex flex-col items-center justify-start pt-[2px]">
                                        <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                      </div>
                                      <div className="flex items-start justify-center pt-[2px] relative w-full h-full">
                                        <div className="absolute left-[-20px] flex flex-col items-center font-bold">
                                          <span className="text-[#003366] leading-none mb-[1px] text-[14px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                          <span className="text-black font-normal text-[8.5px] leading-none">nominal</span>
                                        </div>
                                        <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center text-[8px] font-bold w-[45px] mx-auto absolute left-[50%] -translate-x-[50%] h-[35px] top-0 z-10">
                                          <span className="text-black text-[13px] font-normal leading-none mb-1 mt-1">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                          <span className="leading-none text-[6.5px] text-[#555] font-normal">LINK BOM</span>
                                        </div>
                                        <div className="absolute right-[10px] flex flex-col items-center font-normal">
                                          <span className="text-black leading-none mb-[1px] text-[13px] mt-[1px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-center justify-start pt-[2px] relative">
                                        <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-bold text-[8px] leading-none absolute bottom-[1px] right-[10px]">max</span>
                                      </div>
                                      <div className="flex flex-col items-end justify-start pt-[2px] px-1 font-bold relative">
                                        <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                  </div>
                                );

                                const v1 = parseFloat(qcFillingData.volPhase1) || 0;
                                const v2 = parseFloat(qcFillingData.volPhase2) || 0;
                                const vTot = v1 + v2;
                                const pct1 = (vTot > 0 && v1 > 0) ? Math.round((v1 / vTot) * 100) : 15;
                                const pct2 = (vTot > 0 && v2 > 0) ? Math.round((v2 / vTot) * 100) : 85;

                                return (
                                  <>
                                    {renderBiphaseVolRow("OIL", qcResult.phase1.limitsMl, "Phase Oil", \`\${pct1}%\`, "Volume : (ml)")}
                                    {renderBiphaseVolRow("AQUEOUS", qcResult.phase2.limitsMl, "Phase Aqueous", \`\${pct2}%\`, "Volume : (ml)")}
                                    {renderBiphaseVolRow("BiPhase", qcResult.total.limitsMl, "BiPhase", "100%", "Volume : (ml)")}
                                  </>
                                )
                              })()}
                            </div>
                          </>
                        )}
`;

lines.splice(s2b, e2b - s2b, ...newA5Block.split('\n'));

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('Done! Fixed Biphase layout to match reference.');
