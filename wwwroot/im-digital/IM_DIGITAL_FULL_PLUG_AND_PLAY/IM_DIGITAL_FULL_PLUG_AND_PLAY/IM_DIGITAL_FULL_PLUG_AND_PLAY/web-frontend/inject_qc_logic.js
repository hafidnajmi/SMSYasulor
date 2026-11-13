const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add QcResult state
if (!content.includes('const [qcResult, setQcResult] = useState<any>(null);')) {
    content = content.replace(
        "const [warningMessage, setWarningMessage] = useState('');",
        "const [warningMessage, setWarningMessage] = useState('');\n  const [qcResult, setQcResult] = useState<any>(null);"
    );
}

// 2. Add Math & QC logic functions
const qcLogic = `
  const excelRound = (val: number, ndigits: number = 1) => {
    const multiplier = Math.pow(10, ndigits);
    return Math.floor(val * multiplier + 0.5) / multiplier;
  };

  const doubleRound = (val: number) => {
    const v2 = Math.floor(val * 100.0 + 0.5) / 100.0;
    return Math.floor(v2 * 10.0 + 0.5) / 10.0;
  };

  const getStatisticalError = (volume: number) => {
    const statTable = [
      [0.0, 0.379], [50.0, 0.379], [60.0, 0.344], [70.0, 0.317],
      [80.0, 0.295], [90.0, 0.277], [100.0, 0.262], [110.0, 0.249],
      [120.0, 0.238], [130.0, 0.229], [140.0, 0.220], [150.0, 0.213]
    ];
    let res = 0.379;
    for (const [thresh, err] of statTable) {
      if (volume >= thresh) res = err;
      else break;
    }
    return res;
  };

  const calculateSachetLimits = (volume: number, density: number) => {
    let pct = 0.045;
    if (volume <= 50) pct = 0.09;
    else if (volume <= 500) pct = 0.03;

    const s_ml = getStatisticalError(volume);
    const n_ml = volume;
    const l_ml = s_ml;

    const mlStopMin = excelRound(n_ml - l_ml, 1);
    const mlAdjMin = excelRound(n_ml - (2.0 / 3.0 * l_ml), 1);
    const mlRunMin = excelRound(n_ml - (1.0 / 3.0 * l_ml), 1);
    const mlNominal = excelRound(n_ml, 1);
    const mlRunMax = excelRound(n_ml + (1.0 / 3.0 * l_ml), 1);
    const mlAdjMax = excelRound(n_ml + (2.0 / 3.0 * l_ml), 1);
    const mlStopMax = excelRound(n_ml + l_ml, 1);

    const limitsMl = {
      stopMin: mlStopMin,
      adjMin: mlAdjMin,
      runMin: mlRunMin,
      nominal: mlNominal,
      runMax: mlRunMax,
      adjMax: mlAdjMax,
      stopMax: mlStopMax,
      syaratLegal: pct
    };

    const limitsGram = {
      stopMin: doubleRound(mlStopMin * density),
      adjMin: doubleRound(mlAdjMin * density),
      runMin: doubleRound(mlRunMin * density),
      nominal: doubleRound(mlNominal * density),
      runMax: doubleRound(mlRunMax * density),
      adjMax: doubleRound(mlAdjMax * density),
      stopMax: doubleRound(mlStopMax * density),
      syaratLegal: pct
    };

    return { limitsGram, limitsMl };
  };

  const calculateNormalLimits = (volume: number, density: number) => {
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
  };

  const handleQcSubmit = () => {
    const vol = parseFloat(qcFillingData.volumeFg) || 0;
    const den = parseFloat(qcFillingData.density) || 0;
    
    // As observed, Sachet line always uses sachet limits
    if (upFormData.lineType === 'SACHET LINE' || qcFillingData.templateIm === 'Normal') {
      const res = calculateSachetLimits(vol, den);
      setQcResult(res);
    } else {
      const res = calculateNormalLimits(vol, den);
      setQcResult(res);
    }
    setShowQcFillingModal(false);
  };
`;

// Insert the logic functions before handleLineTypeChange
content = content.replace(
    "const handleLineTypeChange = (newLineType: string) => {",
    qcLogic + "\n  const handleLineTypeChange = (newLineType: string) => {"
);

// Modify HITUNG SIMPAN button
content = content.replace(
    "alert('Data disimpan: ' + JSON.stringify(qcFillingData));\n                    setShowQcFillingModal(false);",
    "handleQcSubmit();"
);

// 3. Update UI A.4 and A.5 blocks to show data
const a4a5StartStr = "{/* A.4 Header */}";
const a4a5EndStr = "{/* Density */}";
const startIndex = content.indexOf(a4a5StartStr);
const endIndex = content.indexOf(a4a5EndStr);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `
                    {/* A.4 Header */}
                    <div className="bg-[#4C1D1D] text-white px-[4px] font-bold text-[10px] h-[16px] flex items-center border-b border-black">
                      A.4. Berat (gram) di timbangan
                    </div>
                    
                    {/* A.4 Row 1 */}
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
                        Syarat Legal &nbsp;&nbsp;<span className="text-black font-semibold">{qcResult ? qcResult.limitsGram.syaratLegal : ''}</span>
                      </div>
                    </div>
                    
                    {/* A.4 Row 2 (Colors) */}
                    <div className="grid grid-cols-5 text-center text-[8px] font-bold border-b border-black h-[14px]">
                      <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black">STOP</div>
                      <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                      <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black">RUNNING</div>
                      <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                      <div className="bg-[#C00000] text-white flex items-center justify-center">STOP</div>
                    </div>
                    
                    {/* A.4 Data Row */}
                    <div className="grid grid-cols-5 text-center text-[11px] bg-[#EAEFE3] border-b border-black h-[35px] relative">
                      {qcResult ? (
                        <>
                          <div className="flex flex-col items-start justify-start pt-[2px] px-1">
                            <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limitsGram.stopMin.toFixed(1)}</span>
                            <span className="text-black font-normal text-[8.5px] leading-none">min</span>
                          </div>
                          <div className="flex flex-col items-center justify-start pt-[2px]">
                          </div>
                          <div className="flex items-start justify-center pt-[2px] relative w-full">
                            <div className="absolute left-[-20px] flex flex-col items-center">
                              <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limitsGram.runMin ? qcResult.limitsGram.runMin.toFixed(1) : qcResult.limitsGram.adjMin.toFixed(1)}</span>
                              <span className="text-black font-normal text-[8.5px] leading-none">nomina</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limitsGram.nominal.toFixed(1)}</span>
                              <span className="text-black font-normal text-[8.5px] leading-none">nominal</span>
                            </div>
                            <div className="absolute right-[-20px] flex flex-col items-center">
                              <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limitsGram.runMax ? qcResult.limitsGram.runMax.toFixed(1) : qcResult.limitsGram.adjMax.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-start pt-[2px]">
                          </div>
                          <div className="flex flex-col items-end justify-start pt-[2px] px-1">
                            <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limitsGram.stopMax.toFixed(1)}</span>
                            <span className="text-black font-normal text-[8.5px] leading-none">max</span>
                          </div>
                        </>
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
                    
                    {/* A.5 Header */}
                    <div className="bg-[#4C1D1D] text-white px-[4px] font-bold text-[10px] h-[16px] flex items-center border-b border-black mt-[-1px]">
                      A.5. Volume (ML) di FLEXNET
                    </div>
                    
                    {/* A.5 Row 1 */}
                    <div className="bg-[#EAEFE3] border-b border-black flex justify-between px-[6px] items-center h-[20px] text-[10.5px] font-bold">
                      <div className="text-black w-[150px]">Volume (ml) :</div>
                      <div className="text-black flex-1 flex justify-center items-center">
                        {qcResult ? (
                          <>
                            <span className="mr-2">Nominal</span>
                            <span className="text-black font-extrabold mr-2">{qcResult.limitsMl.nominal.toFixed(1)}</span>
                            <span>ML</span>
                          </>
                        ) : (
                          <>LINK BOM &nbsp;&nbsp;<span className="text-black font-semibold">&nbsp;</span>&nbsp;&nbsp; ML</>
                        )}
                      </div>
                      <div className="text-black w-[120px] text-right">
                        Syarat Legal &nbsp;&nbsp;<span className="text-black font-semibold">{qcResult ? qcResult.limitsMl.syaratLegal : ''}</span>
                      </div>
                    </div>
                    
                    {/* A.5 Row 2 (Colors) */}
                    <div className="grid grid-cols-5 text-center text-[8px] font-bold border-b border-black h-[14px]">
                      <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black">STOP</div>
                      <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                      <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black">RUNNING</div>
                      <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                      <div className="bg-[#C00000] text-white flex items-center justify-center">STOP</div>
                    </div>

                    {/* A.5 Data Row */}
                    <div className="grid grid-cols-5 text-center text-[11px] bg-[#EAEFE3] border-b border-black h-[35px] relative">
                      {qcResult ? (
                        <>
                          <div className="flex flex-col items-start justify-start pt-[2px] px-1">
                            <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limitsMl.stopMin.toFixed(1)}</span>
                            <span className="text-black font-normal text-[8.5px] leading-none">min</span>
                          </div>
                          <div className="flex flex-col items-center justify-start pt-[2px]">
                          </div>
                          <div className="flex items-start justify-center pt-[2px] relative w-full">
                            <div className="absolute left-[-20px] flex flex-col items-center">
                              <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limitsMl.runMin ? qcResult.limitsMl.runMin.toFixed(1) : qcResult.limitsMl.adjMin.toFixed(1)}</span>
                              <span className="text-black font-normal text-[8.5px] leading-none">nomina</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limitsMl.nominal.toFixed(1)}</span>
                              <span className="text-black font-normal text-[8.5px] leading-none">nominal</span>
                            </div>
                            <div className="absolute right-[-20px] flex flex-col items-center">
                              <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limitsMl.runMax ? qcResult.limitsMl.runMax.toFixed(1) : qcResult.limitsMl.adjMax.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-start pt-[2px]">
                          </div>
                          <div className="flex flex-col items-end justify-start pt-[2px] px-1">
                            <span className="text-[#0078D4] leading-none mb-[2px]">{qcResult.limitsMl.stopMax.toFixed(1)}</span>
                            <span className="text-black font-normal text-[8.5px] leading-none">max</span>
                          </div>
                        </>
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

                    {/* Density Header Update */}
                    <div className="bg-[#EAEFE3] border-b border-black px-[6px] text-[11px] font-bold h-[24px] flex items-center">
                      <span className="text-black w-[80px]">Density</span><span className="text-black mr-2">:</span>
                      <span className="text-[#0078D4] font-normal">{qcResult ? qcFillingData.density : ''}</span>
                    </div>

                    {/* Top Volume FG display update */}
`;
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex + 190);
    // Note: I also need to update the top Volume FG text
    content = content.replace(
      '<span>Volume FG</span>',
      '<span>Volume FG {qcResult ? <span className="text-black font-normal ml-2">{qcFillingData.volumeFg}.0</span> : ""}</span>'
    );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done injecting QC logic!');
