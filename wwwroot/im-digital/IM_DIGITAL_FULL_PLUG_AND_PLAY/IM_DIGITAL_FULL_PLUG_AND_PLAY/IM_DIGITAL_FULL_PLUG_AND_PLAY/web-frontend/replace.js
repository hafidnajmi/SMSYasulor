const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const search = `                      {(() => {
                        const a4Configs = (qcResult && qcResult.type === 'Duo') ? [
                          { title: \`\${qcFillingData.volPhase1 || 0} (\${qcFillingData.volPhase1 || 0} PHASE 1)\`, limits: qcResult.phase1.limitsGram, density: qcFillingData.denPhase1 },
                          { title: \`\${qcFillingData.volPhase2 || 0} (\${qcFillingData.volPhase2 || 0} PHASE 2)\`, limits: qcResult.phase2.limitsGram, density: qcFillingData.denPhase2 },
                          { title: \`BERAT TOTAL (\${qcFillingData.volPhase1 || 0} + \${qcFillingData.volPhase2 || 0})\`, limits: qcResult.total.limitsGram, density: (parseFloat(qcFillingData.denPhase1) || 1).toFixed(3) }
                        ] : [`;

const replace = `                      {(() => {
                        const getPhaseTitle = (index, defaultName) => {
                          if (!openDoc || !openDoc.rawDocument || !openDoc.rawDocument.noFla) return \`(\${defaultName})\`;
                          const parts = openDoc.rawDocument.noFla.split(/[\\r\\n,]+/).map(p => p.trim()).filter(p => p);
                          if (parts.length > index) {
                            return \`\${parts[index]} (\${parts[index]} \${defaultName})\`;
                          }
                          return \`(\${defaultName})\`;
                        };

                        const a4Configs = (qcResult && qcResult.type === 'Duo') ? [
                          { title: getPhaseTitle(0, 'PHASE 1'), limits: qcResult.phase1.limitsGram, density: qcFillingData.denPhase1 },
                          { title: getPhaseTitle(1, 'PHASE 2'), limits: qcResult.phase2.limitsGram, density: qcFillingData.denPhase2 },
                          { title: \`BERAT TOTAL (\${getPhaseTitle(0, 'PHASE 1').split(' ')[0]} + \${getPhaseTitle(1, 'PHASE 2').split(' ')[0]})\`, limits: qcResult.total.limitsGram, density: (parseFloat(qcFillingData.denPhase1) || 1).toFixed(3) }
                        ] : [`;

if(c.includes(search)) {
  fs.writeFileSync(p, c.replace(search, replace), 'utf8');
  console.log('Replaced successfully');
} else {
  console.log('Search string not found');
}
