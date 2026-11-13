const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/<div className="bg-\[\#EAEFE3\] border-b border-black" style=\{\{ height: appearanceHeight \}\}\><\/div>/g, (match, offset) => {
    // Check if this match is inside the Right Column
    if (offset > c.indexOf('{/* Right Column (Flex-1) */}')) {
        return '<div className="bg-[#EAEFE3] border-b border-black h-[75px]"></div>';
    }
    return match;
});

fs.writeFileSync(p, c, 'utf8');
console.log('Replaced successfully');
