const fs = require('fs');
const lines = fs.readFileSync('c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx', 'utf8').split('\n');

const s1 = lines.findIndex(l => l.includes("if (qcResult && qcResult.type === 'Duo') {"));
const e1 = lines.findIndex((l, i) => i > s1 && l.includes("// Normal / Sachet layout"));
console.log("A.4 Block:", s1 + 1, e1 + 1);

const s2 = lines.findIndex(l => l.includes("{(!qcResult || qcResult.type !== 'Duo') && ("));
const e2 = lines.findIndex((l, i) => i > s2 && l.includes("A.5 Header"));
console.log("A.5 Block:", s2 + 1, e2 + 1);
