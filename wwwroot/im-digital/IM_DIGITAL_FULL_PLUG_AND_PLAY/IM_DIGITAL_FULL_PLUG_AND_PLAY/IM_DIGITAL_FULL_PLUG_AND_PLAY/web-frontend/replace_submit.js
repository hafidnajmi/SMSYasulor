const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const targetStr = `      } else {
      const vol = parseFloat(qcFillingData.volumeFg) || 0;
      const den = parseFloat(qcFillingData.density) || 0;`;

const newStr = `      } else if (qcFillingData.templateIm === 'Biphase' || qcFillingData.templateIm === 'LIP EYE MAKE UP REMOVER') {
      const v1 = parseFloat(qcFillingData.volPhase1) || 0;
      const d1 = parseFloat(qcFillingData.denPhase1) || 0;
      const v2 = parseFloat(qcFillingData.volPhase2) || 0;
      const d2 = parseFloat(qcFillingData.denPhase2) || 0;

      const p1 = calculateNormalLimits(v1, d1);
      const p2 = calculateNormalLimits(v2, d2);

      const volTot = v1 + v2;
      const denTot = volTot > 0 ? ((v1 * d1) + (v2 * d2)) / volTot : 1.0;
      const totalSummary = calculateNormalLimits(volTot, denTot);

      setQcResult({
        type: 'Biphase',
        isSachet: false,
        phase1: p1,
        phase2: p2,
        total: totalSummary
      });
    } else {
      const vol = parseFloat(qcFillingData.volumeFg) || 0;
      const den = parseFloat(qcFillingData.density) || 0;`;

// Cleanly format regex search and replace
c = c.replace(/      } else \{\s*const vol = parseFloat\(qcFillingData\.volumeFg\) \|\| 0;\s*const den = parseFloat\(qcFillingData\.density\) \|\| 0;/g, newStr);

fs.writeFileSync(p, c, 'utf8');
console.log('Replaced handleQcSubmit');
