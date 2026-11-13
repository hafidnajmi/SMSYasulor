const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let lines = fs.readFileSync(p, 'utf8').split('\n');

const s1 = lines.findIndex(l => l.includes("if (qcResult && qcResult.type === 'Duo') {"));
const e1 = lines.findIndex((l, i) => i > s1 && l.includes("// Normal / Sachet layout"));

const newA4BlockLines = `                          if (qcResult && (qcResult.type === 'Duo' || qcResult.type === 'Biphase')) {
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

                            const renderMultiRow = (title: string, limits: any, densityLabel: string, densityVal: string, isTotal: boolean, isBiphase: boolean, biphaseUnitText: string = "", biphaseCenterLabel: string = "") => (
                              <div className="flex flex-col border-b border-black w-full">
                                {/* Title Row */}
                                {isBiphase ? (
                                  <div className="bg-white border-b border-black h-[18px] flex items-center justify-between px-1 font-semibold text-[9px] text-[#555]">
                                    <span className="w-[80px] text-black font-bold">{biphaseUnitText}</span>
                                    <span>{limits?.syaratLegal ? limits.syaratLegal.toFixed(3).replace(/0$/, '') : ''}</span>
                                    <span className="font-bold text-black uppercase mx-auto absolute left-[50%] -translate-x-[50%]">{title}</span>
                                    <span>{densityLabel} <span className="text-[#0078D4] ml-1">{densityVal}</span></span>
                                  </div>
                                ) : (
                                  <div className="bg-[#C0CBE1] border-b border-black h-[18px] flex items-center px-1 font-semibold text-[10px] text-black">
                                    {title}
                                  </div>
                                )}

                                {/* Syarat Legal Row (Duo only) */}
                                {(!isTotal && !isBiphase) && (
                                  <div className="h-[12px] border-b border-black bg-[#EAEFE3] flex justify-between px-1 text-[7.5px] text-[#555] relative">
                                    <span>. Syarat legal</span>
                                    <span className="absolute left-[36%]">{limits?.syaratLegal?.toFixed(3).replace(/0$/, '') ?? ''}</span>
                                    <span></span>
                                  </div>
                                )}

                                {/* Color Headers */}
                                <div className="grid grid-cols-5 text-center text-[8px] font-bold border-b border-black h-[14px]">
                                  <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black">STOP</div>
                                  <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                  <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black tracking-widest">{isBiphase ? biphaseCenterLabel || 'RUNNING' : 'RUNNING'}</div>
                                  <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                  <div className="bg-[#C00000] text-white flex items-center justify-center">STOP</div>
                                </div>

                                {/* Limits Row */}
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

                                {/* Density Row (Duo only) */}
                                {(!isBiphase && !isTotal) && (
                                  <div className="h-[18px] bg-white flex items-center px-1 text-[8.5px] font-bold justify-between">
                                    <span>Density &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;<span className="text-[#0078D4]">{densityVal}</span></span>
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

                            const isBiphase = qcResult.type === 'Biphase';
                            const d1Str = (parseFloat(qcFillingData.denPhase1) || 1).toFixed(3).replace(/0+$/, '');
                            const d2Str = (parseFloat(qcFillingData.denPhase2) || 1).toFixed(3).replace(/0+$/, '');
                            
                            const v1 = parseFloat(qcFillingData.volPhase1) || 0;
                            const v2 = parseFloat(qcFillingData.volPhase2) || 0;
                            const vTot = v1 + v2;
                            const d1 = parseFloat(qcFillingData.denPhase1) || 0;
                            const d2 = parseFloat(qcFillingData.denPhase2) || 0;
                            const totDenStr = (vTot > 0 ? ((v1 * d1 + v2 * d2) / vTot) : 1).toFixed(3);

                            if (isBiphase) {
                              return (
                                <div className="flex flex-col w-full">
                                  {renderMultiRow("OIL", qcResult.phase1.limitsGram, "Density Oil :", d1Str, false, true, "Berat : (gram)")}
                                  {renderMultiRow("AQUEOUS", qcResult.phase2.limitsGram, "Density Water :", d2Str, false, true, "Berat : (gram)")}
                                  {renderMultiRow("BiPhase", qcResult.total.limitsGram, "Density BiPhase :", totDenStr, true, true, "Berat : (gram)")}
                                </div>
                              );
                            }

                            return (
                              <div className="flex flex-col w-full">
                                {renderMultiRow(getPhaseTitle(0, 'PHASE 1'), qcResult.phase1.limitsGram, "Density :", d1Str, false, false)}
                                {renderMultiRow(getPhaseTitle(1, 'PHASE 2'), qcResult.phase2.limitsGram, "Density :", d2Str, false, false)}
                                {renderMultiRow(\`BERAT TOTAL (PHASE \${getShortPhaseName(0)} + \${getShortPhaseName(1)})\`, qcResult.total.limitsGram, "", "", true, false)}
                              </div>
                            );
                          }`.split('\n');

lines.splice(s1, e1 - s1, ...newA4BlockLines);

const s2 = lines.findIndex(l => l.includes("{(!qcResult || qcResult.type !== 'Duo') && ("));
lines[s2] = `                        {(!qcResult || (qcResult.type !== 'Duo' && qcResult.type !== 'Biphase')) && (`;

const biphaseA5Block = `                        {qcResult && qcResult.type === 'Biphase' && (
                          <>
                            {/* A.5 Header */}
                            <div className="bg-[#4C1D1D] text-white px-[4px] font-bold text-[10px] h-[16px] flex items-center border-b border-black mt-[-1px]">
                              A.5. Volume (ML) di FLEXNET
                            </div>
                            <div className="flex flex-col w-full">
                              {(() => {
                                const renderMultiRow = (title: string, limits: any, densityLabel: string, densityVal: string, isTotal: boolean, isBiphase: boolean, biphaseUnitText: string = "", biphaseCenterLabel: string = "") => (
                                  <div className="flex flex-col border-b border-black w-full">
                                    <div className="bg-white border-b border-black h-[18px] flex items-center justify-between px-1 font-semibold text-[9px] text-[#555]">
                                      <span className="w-[80px] text-black font-bold">{biphaseUnitText}</span>
                                      <span className="font-bold text-black uppercase mx-auto absolute left-[50%] -translate-x-[50%]">{title}</span>
                                      <span className="text-black">{densityLabel} <span className="font-bold ml-1">{densityVal}</span></span>
                                    </div>
                                    <div className="grid grid-cols-5 text-center text-[8px] font-bold border-b border-black h-[14px]">
                                      <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black">STOP</div>
                                      <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                      <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black tracking-widest">{biphaseCenterLabel || 'RUNNING'}</div>
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
                                  </div>
                                );

                                const vol = parseFloat(qcFillingData.volumeFg) || 100;
                                const v1 = parseFloat(qcFillingData.volPhase1) || 0;
                                const v2 = parseFloat(qcFillingData.volPhase2) || 0;
                                const pct1 = (vol > 0 && v1 > 0) ? Math.round((v1 / vol) * 100) : 15;
                                const pct2 = (vol > 0 && v2 > 0) ? Math.round((v2 / vol) * 100) : 85;

                                return (
                                  <>
                                    {renderMultiRow("OIL", qcResult.phase1.limitsMl, "Phase Oil", \`\${pct1}%\`, false, true, "Volume : (ml)", "OIL")}
                                    {renderMultiRow("AQUEOUS", qcResult.phase2.limitsMl, "Phase Aqueous", \`\${pct2}%\`, false, true, "Volume : (ml)", "AQUEOUS")}
                                    {renderMultiRow("BiPhase", qcResult.total.limitsMl, "BiPhase", "100%", true, true, "Volume : (ml)", "BiPhase")}
                                  </>
                                )
                              })()}
                            </div>
                          </>
                        )}`;

// Insert Biphase A.5 block before Normal A.5 block
lines.splice(s2, 0, ...biphaseA5Block.split('\n'));

// appearanceHeight logic
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const appearanceHeight = (qcResult && qcResult.type === 'Duo') ? '196px' : '220px';")) {
    lines[i] = lines[i].replace("qcResult.type === 'Duo'", "(qcResult.type === 'Duo' || qcResult.type === 'Biphase')");
  }
}

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('UI updated via absolute line indices!');
