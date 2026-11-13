const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const match = c.match(/\{\(\(\) => \{\s*if \(qcResult && qcResult\.type === 'Duo'\) \{/);

if (match) {
  const startIndex = match.index;
  const endIndex = c.indexOf('})()}', startIndex);

  if (endIndex !== -1) {
    let block = c.substring(startIndex, endIndex);

    // Replace all limits ? limits.xxx.toFixed(...) : '' with limits?.xxx?.toFixed(...) ?? ''
    block = block.replace(/limits \? limits\.([a-zA-Z0-9_]+)\.toFixed\((.*?)\) : ''/g, "limits?.$1?.toFixed($2) ?? ''");
    
    // also for syaratLegal which has .replace
    block = block.replace(/limits \? limits\.syaratLegal\.toFixed\((.*?)\)\.replace\((.*?)\) : ''/g, "limits?.syaratLegal?.toFixed($1).replace($2) ?? ''");

    fs.writeFileSync(p, c.substring(0, startIndex) + block + c.substring(endIndex), 'utf8');
    console.log('Replaced safely');
  } else {
    console.log('endIndex Not found');
  }
} else {
  console.log('startIndex Not found');
}
