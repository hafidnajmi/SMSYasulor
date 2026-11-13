const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const s1 = c.indexOf('const renderBiphaseRow');
const e1 = c.indexOf('const getShortPhaseName', s1);

if (s1 !== -1 && e1 !== -1) {
    let block = c.substring(s1, e1);
    
    // Replace text-[14px] with text-[12px]
    block = block.replace(/text-\[14px\]/g, 'text-[12px]');
    // Replace text-[13px] with text-[11.5px]
    block = block.replace(/text-\[13px\]/g, 'text-[11.5px]');

    c = c.substring(0, s1) + block + c.substring(e1);
}

const s2 = c.indexOf('const renderBiphaseVolRow');
const e2 = c.indexOf('const v1 = parseFloat', s2);

if (s2 !== -1 && e2 !== -1) {
    let block2 = c.substring(s2, e2);
    
    // Replace text-[14px] with text-[12px]
    block2 = block2.replace(/text-\[14px\]/g, 'text-[12px]');
    // Replace text-[13px] with text-[11.5px]
    block2 = block2.replace(/text-\[13px\]/g, 'text-[11.5px]');

    c = c.substring(0, s2) + block2 + c.substring(e2);
}

fs.writeFileSync(p, c, 'utf8');
console.log('Done adjusting font sizes!');
