const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const startIndex = c.indexOf('{(() => {');
const endIndex = c.indexOf('})()}', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const codeBlock = c.substring(startIndex, endIndex + 5);
  // I will replace only the inside of this block
}
