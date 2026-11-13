const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'divisions', '[division]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Update State
content = content.replace(
  "const [qcFillingData, setQcFillingData] = useState({ templateIm: 'Normal', volumeFg: '', density: '' });",
  "const [qcFillingData, setQcFillingData] = useState({ templateIm: 'Normal', volumeFg: '', density: '', volPhase1: '', denPhase1: '', volPhase2: '', denPhase2: '' });"
);

content = content.replace(
  /setQcFillingData\(\{\s*templateIm:\s*'Normal',\s*volumeFg:\s*'',\s*density:\s*''\s*\}\);/g,
  "setQcFillingData({ templateIm: 'Normal', volumeFg: '', density: '', volPhase1: '', denPhase1: '', volPhase2: '', denPhase2: '' });"
);

// Step 2: Modal UI
const modalReplaceStr = `<div className="flex flex-col space-y-4">
                <div className="flex items-center">
                  <span className="w-[120px] text-right pr-4 text-[11.5px] text-[#475569]">Template IM :</span>
                  <select 
                    className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 outline-none rounded-[3px]"
                    value={qcFillingData.templateIm}
                    onChange={(e) => setQcFillingData({...qcFillingData, templateIm: e.target.value})}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Duo">Duo</option>
                    <option value="Biphase">Biphase</option>
                    <option value="LIP EYE MAKE UP REMOVER">LIP EYE MAKE UP REMOVER</option>
                  </select>
                </div>
                
                {qcFillingData.templateIm !== 'Duo' ? (
                  <>
                    <div className="flex items-center">
                      <span className="w-[120px] text-right pr-4 text-[11.5px] text-[#475569]">Volume FG (ml) :</span>
                      <input type="text" placeholder="Contoh: 100" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]" value={qcFillingData.volumeFg} onChange={(e) => setQcFillingData({...qcFillingData, volumeFg: e.target.value})} />
                    </div>
                    <div className="flex items-center">
                      <span className="w-[120px] text-right pr-4 text-[11.5px] text-[#475569]">Density :</span>
                      <input type="text" placeholder="Contoh: 1.05" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]" value={qcFillingData.density} onChange={(e) => setQcFillingData({...qcFillingData, density: e.target.value})} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="w-[120px] text-right pr-2 text-[11.5px] text-[#475569]">Phase 1 (Vol & Den):</span>
                      <input type="text" placeholder="Vol" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]" value={qcFillingData.volPhase1} onChange={(e) => setQcFillingData({...qcFillingData, volPhase1: e.target.value})} />
                      <input type="text" placeholder="Den" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]" value={qcFillingData.denPhase1} onChange={(e) => setQcFillingData({...qcFillingData, denPhase1: e.target.value})} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-[120px] text-right pr-2 text-[11.5px] text-[#475569]">Phase 2 (Vol & Den):</span>
                      <input type="text" placeholder="Vol" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]" value={qcFillingData.volPhase2} onChange={(e) => setQcFillingData({...qcFillingData, volPhase2: e.target.value})} />
                      <input type="text" placeholder="Den" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-[3px]" value={qcFillingData.denPhase2} onChange={(e) => setQcFillingData({...qcFillingData, denPhase2: e.target.value})} />
                    </div>
                  </>
                )}`;

const modalRegex = /<div className="flex flex-col space-y-4">[\s\S]*?<\/div>\s*<div className="flex justify-between mt-8 space-x-3">/;
content = content.replace(modalRegex, modalReplaceStr + `\n              </div>\n\n              <div className="flex justify-between mt-8 space-x-3">`);

// Step 3: Calculation Logic
const newLogic = `
  const handleQcSubmit = () => {
    if (qcFillingData.templateIm === 'Duo') {
        const v1 = parseFloat(qcFillingData.volPhase1) || 0;
        const d1 = parseFloat(qcFillingData.denPhase1) || 0;
        const v2 = parseFloat(qcFillingData.volPhase2) || 0;
        const d2 = parseFloat(qcFillingData.denPhase2) || 0;
        const isSachet = upFormData.lineType === 'SACHET LINE';
        
        let p1, p2;
        if (isSachet) {
            p1 = calculateSachetLimits(v1, d1);
            p2 = calculateSachetLimits(v2, d2);
        } else {
            p1 = calculateNormalLimits(v1, d1);
            p2 = calculateNormalLimits(v2, d2);
            p1.limitsGram.syaratLegal = 0.090;
            p1.limitsMl.syaratLegal = 0.090;
            p2.limitsGram.syaratLegal = 0.090;
            p2.limitsMl.syaratLegal = 0.090;
        }
        
        const volTot = v1 + v2;
        const pctTot = volTot <= 50 ? 0.09 : 0.045;
        const totalSyarat = isSachet ? pctTot : 0.090;
        
        const totGram = {
            stopMin: p1.limitsGram.stopMin + p2.limitsGram.stopMin,
            adjMin: p1.limitsGram.adjMin + p2.limitsGram.adjMin,
            runMin: p1.limitsGram.runMin ? p1.limitsGram.runMin + p2.limitsGram.runMin : null,
            nominal: p1.limitsGram.nominal + p2.limitsGram.nominal,
            linkBom: p1.limitsGram.linkBom + p2.limitsGram.linkBom,
            runMax: p1.limitsGram.runMax ? p1.limitsGram.runMax + p2.limitsGram.runMax : null,
            adjMax: p1.limitsGram.adjMax + p2.limitsGram.adjMax,
            stopMax: p1.limitsGram.stopMax + p2.limitsGram.stopMax,
            syaratLegal: totalSyarat
        };
        
        setQcResult({
            type: 'Duo',
            isSachet,
            phase1: p1,
            phase2: p2,
            total: { limitsGram: totGram }
        });
    } else {
        const vol = parseFloat(qcFillingData.volumeFg) || 0;
        const den = parseFloat(qcFillingData.density) || 0;

        if (upFormData.lineType === 'SACHET LINE' || qcFillingData.templateIm === 'Normal') {
            if (upFormData.lineType === 'SACHET LINE') {
                setQcResult(calculateSachetLimits(vol, den));
            } else {
                setQcResult(calculateNormalLimits(vol, den));
            }
        } else {
            setQcResult(null);
        }
    }
    setShowQcFillingModal(false);
`;
const oldLogicRegex = /const handleQcSubmit = \(\) => \{[\s\S]*?setShowQcFillingModal\(false\);/;
content = content.replace(oldLogicRegex, newLogic);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected Duo logic!');
