const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update `calculateNormalLimits` to include all the missing fields
const oldCalculateNormalLimitsStr = `  const calculateNormalLimits = (volume: number, density: number) => {
    let pct = 0.045;
    if (volume <= 50) pct = 0.09;
    else if (volume <= 100) pct = 4.5;
    else if (volume <= 200) pct = 0.045;
    else if (volume <= 500) pct = 0.03;

    const s_ml = getStatisticalError(volume);
    const n_g = volume * density;
    const n_ml = volume;

    let l_ml = 15.0;
    let l_g = 15.0;
    if (volume <= 50) { l_ml = volume * 0.09; l_g = n_g * 0.09; }
    else if (volume <= 100) { l_ml = 4.5; l_g = 4.5; }
    else if (volume <= 200) { l_ml = volume * 0.045; l_g = n_g * 0.045; }
    else if (volume <= 300) { l_ml = 9.0; l_g = 9.0; }
    else if (volume <= 500) { l_ml = volume * 0.03; l_g = n_g * 0.03; }

    const limitsGram = {
      stopMin: excelRound(n_g - l_g, 1),
      adjMin: excelRound(n_g - (2.0 / 3.0 * l_g), 1),
      runMin: null,
      nominal: excelRound(n_g, 1),
      runMax: null,
      adjMax: excelRound(n_g + (2.0 / 3.0 * l_g), 1),
      stopMax: excelRound(n_g + l_g, 1),
      syaratLegal: pct
    };

    const limitsMl = {
      stopMin: excelRound(n_ml - l_ml, 1),
      adjMin: excelRound(n_ml - (2.0 / 3.0 * l_ml), 1),
      runMin: null,
      nominal: excelRound(n_ml, 1),
      runMax: null,
      adjMax: excelRound(n_ml + (2.0 / 3.0 * l_ml), 1),
      stopMax: excelRound(n_ml + l_ml, 1),
      syaratLegal: pct
    };

    return { limitsGram, limitsMl };
  };`;

const newCalculateNormalLimitsStr = `  const calculateNormalLimits = (volume: number, density: number) => {
    let pct = 0.045;
    if (volume <= 50) pct = 0.09;
    else if (volume <= 100) pct = 4.5;
    else if (volume <= 200) pct = 0.045;
    else if (volume <= 500) pct = 0.03;

    const s_ml = getStatisticalError(volume);
    const n_g = volume * density;
    const n_ml = volume;

    let l_ml = 15.0;
    let l_g = 15.0;
    if (volume <= 50) { l_ml = volume * 0.09; l_g = n_g * 0.09; }
    else if (volume <= 100) { l_ml = 4.5; l_g = 4.5; }
    else if (volume <= 200) { l_ml = volume * 0.045; l_g = n_g * 0.045; }
    else if (volume <= 300) { l_ml = 9.0; l_g = 9.0; }
    else if (volume <= 500) { l_ml = volume * 0.03; l_g = n_g * 0.03; }

    const link_bom_ml_exact = n_ml + s_ml;
    const link_bom_g_exact = link_bom_ml_exact * density;
    
    const linkBomGram = excelRound(link_bom_g_exact, 1);
    const roundedDensity = Math.round(density * 1000) / 1000;
    const linkBomMl = roundedDensity === 0 ? 0 : excelRound(linkBomGram / roundedDensity, 1);

    const limitsGram = {
      stopMin: excelRound(n_g - l_g, 1),
      adjMin: excelRound(n_g - (2.0 / 3.0 * l_g), 1),
      runMin: null,
      nominal: excelRound(n_g, 1),
      linkBom: linkBomGram,
      runMax: excelRound(n_g + (1.0 / 3.0 * l_g), 1),
      adjMax: excelRound(n_g + (2.0 / 3.0 * l_g), 1),
      stopMax: excelRound(n_g + l_g, 1),
      syaratLegal: pct
    };

    const limitsMl = {
      stopMin: excelRound(n_ml - l_ml, 1),
      adjMin: excelRound(n_ml - (2.0 / 3.0 * l_ml), 1),
      runMin: null,
      nominal: excelRound(n_ml, 1),
      linkBom: linkBomMl,
      runMax: excelRound(n_ml + (1.0 / 3.0 * l_ml), 1),
      adjMax: excelRound(n_ml + (2.0 / 3.0 * l_ml), 1),
      stopMax: excelRound(n_ml + l_ml, 1),
      syaratLegal: pct
    };

    return { limitsGram, limitsMl, type: 'Normal' };
  };`;

content = content.replace(oldCalculateNormalLimitsStr, newCalculateNormalLimitsStr);
content = content.replace(
  "return { limitsGram, limitsMl };", 
  "return { limitsGram, limitsMl, type: 'Sachet' };"
);

// 2. Replace the Data Row layout for A.4 and A.5.
// We need to differentiate the display based on qcResult.type === 'Sachet' vs 'Normal'
const oldDataRowGram = `{/* A.4 Row 1 */}
                    <div className="bg-[#EAEFE3] border-b border-black flex justify-between px-[6px] items-center h-[20px] text-[10.5px] font-bold">
                      <div className="text-black w-[150px]">Berat : (gram)</div>
                      <div className="text-black flex-1 flex justify-center items-center">
                        {qcResult ? (
                          <>
                            <span className="mr-2">Nominal</span>
                            <span className="text-black font-extrabold mr-2">{qcResult.limitsGram.nominal.toFixed(1)}</span>
                            <span>Gram</span>
                          </>
                        ) : (
                          <>LINK BOM &nbsp;&nbsp;<span className="text-black font-semibold">&nbsp;</span>&nbsp;&nbsp; Gram</>
                        )}
                      </div>
                      <div className="text-black w-[120px] text-right">
                        Syarat Legal &nbsp;&nbsp;<span className="text-black font-semibold">{qcResult ? qcResult.limitsGram.syaratLegal.toFixed(2) : ''}</span>
                      </div>
                    </div>`;

// Wait, I didn't have .toFixed(2) in the previous code.
// I will just use string replacement on the whole A.4 and A.5 blocks.

const buildDataRow = (title, unit, isMl) => \`
                    {/* \${title} Header */}
                    <div className="bg-[#4C1D1D] text-white px-[4px] font-bold text-[10px] h-[16px] flex items-center border-b border-black \${isMl ? 'mt-[-1px]' : ''}">
                      \${title === 'A.4' ? 'A.4. Berat (gram) di timbangan' : 'A.5. Volume (ML) di FLEXNET'}
                    </div>
                    
                    {/* Row 1 */}
                    <div className="bg-[#EAEFE3] border-b border-black flex justify-between px-[6px] items-center h-[20px] text-[10.5px] font-bold">
                      <div className="text-black w-[150px]">\${title === 'A.4' ? 'Berat : (gram)' : 'Volume (ml) :'}</div>
                      <div className="text-black flex-1 flex justify-center items-center">
                        {qcResult ? (
                          qcResult.type === 'Sachet' ? (
                            <>
                              <span className="mr-2">Nominal</span>
                              <span className="text-black font-extrabold mr-2">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.nominal.toFixed(1)}</span>
                              <span>\${unit}</span>
                            </>
                          ) : (
                            <>
                              <span className="mr-2">LINK BOM</span>
                              <span className="text-black font-extrabold mr-2">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.linkBom.toFixed(1)}</span>
                              <span>\${unit}</span>
                            </>
                          )
                        ) : (
                          <>LINK BOM &nbsp;&nbsp;<span className="text-black font-semibold">&nbsp;</span>&nbsp;&nbsp; \${unit}</>
                        )}
                      </div>
                      <div className="text-black w-[120px] text-right">
                        Syarat Legal &nbsp;&nbsp;<span className="text-black font-semibold">{qcResult ? qcResult.limits\${isMl ? 'Ml' : 'Gram'}.syaratLegal.toFixed(2) : ''}</span>
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
                      {qcResult ? (
                        qcResult.type === 'Sachet' ? (
                          <>
                            <div className="flex flex-col items-start justify-start pt-[2px] px-1">
                              <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.stopMin.toFixed(1)}</span>
                              <span className="text-black font-normal text-[8.5px] leading-none">min</span>
                            </div>
                            <div className="flex flex-col items-center justify-start pt-[2px]">
                            </div>
                            <div className="flex items-start justify-center pt-[2px] relative w-full">
                              <div className="absolute left-[-20px] flex flex-col items-center">
                                <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.runMin ? qcResult.limits\${isMl ? 'Ml' : 'Gram'}.runMin.toFixed(1) : qcResult.limits\${isMl ? 'Ml' : 'Gram'}.adjMin.toFixed(1)}</span>
                                <span className="text-black font-normal text-[8.5px] leading-none">nomina</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.nominal.toFixed(1)}</span>
                                <span className="text-black font-normal text-[8.5px] leading-none">nominal</span>
                              </div>
                              <div className="absolute right-[-20px] flex flex-col items-center">
                                <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.runMax ? qcResult.limits\${isMl ? 'Ml' : 'Gram'}.runMax.toFixed(1) : qcResult.limits\${isMl ? 'Ml' : 'Gram'}.adjMax.toFixed(1)}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-center justify-start pt-[2px]">
                            </div>
                            <div className="flex flex-col items-end justify-start pt-[2px] px-1">
                              <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.stopMax.toFixed(1)}</span>
                              <span className="text-black font-normal text-[8.5px] leading-none">max</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex flex-col items-start justify-start pt-[2px] px-1">
                              <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.stopMin.toFixed(1)}</span>
                            </div>
                            <div className="flex flex-col items-center justify-start pt-[2px]">
                              <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.adjMin.toFixed(1)}</span>
                              <span className="text-black font-normal text-[8.5px] leading-none">min</span>
                            </div>
                            <div className="flex items-start justify-center pt-[2px] relative w-full">
                              <div className="absolute left-[-20px] flex flex-col items-center">
                                <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.nominal.toFixed(1)}</span>
                                <span className="text-black font-normal text-[8.5px] leading-none">nominal</span>
                              </div>
                              <div className="bg-[#FFB300] border-l border-r border-black flex flex-col items-center justify-center text-[7px] font-bold w-[35px] mx-auto absolute left-[50%] -translate-x-[50%] h-full top-0 -mt-[2px]">
                                <span className="text-[#000000] text-[9.5px]">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.linkBom.toFixed(1)}</span>
                                <span>LINK</span><span>BOM</span>
                              </div>
                              <div className="absolute right-[-20px] flex flex-col items-center">
                                <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.runMax.toFixed(1)}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-center justify-start pt-[2px]">
                              <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.adjMax.toFixed(1)}</span>
                              <span className="text-black font-normal text-[8.5px] leading-none">max</span>
                            </div>
                            <div className="flex flex-col items-end justify-start pt-[2px] px-1">
                              <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limits\${isMl ? 'Ml' : 'Gram'}.stopMax.toFixed(1)}</span>
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
\``;

const A4_A5_START = "{/* A.4 Header */}";
const DENSITY_START = "{/* Density Header Update */}";
const startIndex = content.indexOf(A4_A5_START);
const endIndex = content.indexOf(DENSITY_START);

if (startIndex !== -1 && endIndex !== -1) {
  const newBlocks = 
    eval(buildDataRow('A.4', 'Gram', false)) + "\n                    " + 
    eval(buildDataRow('A.5', 'ML', true)) + "\n                    ";
  
  content = content.substring(0, startIndex) + newBlocks + content.substring(endIndex);
}

// 3. Fix Syarat Legal text formatting in case qcResult is null
content = content.replace(
  "{qcResult ? qcResult.limitsGram.syaratLegal : ''}",
  "{qcResult ? qcResult.limitsGram.syaratLegal.toFixed(2) : ''}"
);
content = content.replace(
  "{qcResult ? qcResult.limitsMl.syaratLegal : ''}",
  "{qcResult ? qcResult.limitsMl.syaratLegal.toFixed(2) : ''}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done injecting Normal logic!');
