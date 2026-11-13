const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const startIndex = c.indexOf('{(() => {\n                      if (qcResult && qcResult.type === \'Duo\') {');
const endIndex = c.indexOf('})()}', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  let block = c.substring(startIndex, endIndex);

  // Replace all limits ? limits.xxx.toFixed(...) : '' with limits?.xxx?.toFixed(...) ?? ''
  block = block.replace(/\{limits \? limits\.(\w+)\.toFixed\((.*?)\) : ''\}/g, "{limits?.$1?.toFixed($2) ?? ''}");
  
  // also for syaratLegal which has .replace
  block = block.replace(/\{limits \? limits\.syaratLegal\.toFixed\((.*?)\)\.replace\((.*?)\) : ''\}/g, "{limits?.syaratLegal?.toFixed($1).replace($2) ?? ''}");

  fs.writeFileSync(p, c.substring(0, startIndex) + block + c.substring(endIndex), 'utf8');
  console.log('Replaced safely');
} else {
  console.log('Not found');
}
