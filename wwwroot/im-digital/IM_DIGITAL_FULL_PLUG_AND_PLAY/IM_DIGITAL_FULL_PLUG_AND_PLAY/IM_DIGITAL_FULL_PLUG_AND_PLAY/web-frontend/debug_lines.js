const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let lines = fs.readFileSync(p, 'utf8').split('\n');

// Find the A.4 block for Biphase
const s1 = lines.findIndex(l => l.includes("if (qcResult && (qcResult.type === 'Duo' || qcResult.type === 'Biphase')) {"));
const e1 = lines.findIndex((l, i) => i > s1 && l.includes("// Normal / Sachet layout"));
console.log("A.4 Duo/Biphase block:", s1 + 1, "to", e1 + 1);

// Find the Biphase A.5 block
const s2 = lines.findIndex(l => l.includes("qcResult && qcResult.type === 'Biphase' && ("));
const e2 = lines.findIndex((l, i) => i > s2 && l.includes("{(!qcResult || (qcResult.type !== 'Duo' && qcResult.type !== 'Biphase'))"));
console.log("A.5 Biphase block:", s2 + 1, "to", e2 + 1);

// Print lines around s1 and e1 to confirm context
console.log("\n--- A.4 start context ---");
console.log(lines.slice(s1-2, s1+3).map((l, i) => `${s1-2+i+1}: ${l}`).join('\n'));
console.log("\n--- A.4 end context ---");
console.log(lines.slice(e1-2, e1+3).map((l, i) => `${e1-2+i+1}: ${l}`).join('\n'));

console.log("\n--- A.5 start context ---");
console.log(lines.slice(s2-2, s2+3).map((l, i) => `${s2-2+i+1}: ${l}`).join('\n'));
console.log("\n--- A.5 end context ---");
console.log(lines.slice(e2-2, e2+3).map((l, i) => `${e2-2+i+1}: ${l}`).join('\n'));
