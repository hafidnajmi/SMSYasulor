const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

// The issue might be that qcResult.type === 'Biphase' is strictly checked, but LIP EYE MAKE UP REMOVER also needs this.
// I will replace all instances of "qcResult.type === 'Biphase'" with "(qcResult.type === 'Biphase' || qcResult.type === 'LIP EYE MAKE UP REMOVER')"
// And all instances of "qcResult.type !== 'Biphase'" with "(qcResult.type !== 'Biphase' && qcResult.type !== 'LIP EYE MAKE UP REMOVER')"

c = c.replace(/qcResult\.type === 'Biphase'/g, "(qcResult.type === 'Biphase' || qcResult.type === 'LIP EYE MAKE UP REMOVER')");
c = c.replace(/qcResult\.type !== 'Biphase'/g, "(qcResult.type !== 'Biphase' && qcResult.type !== 'LIP EYE MAKE UP REMOVER')");

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed Biphase checks!');
