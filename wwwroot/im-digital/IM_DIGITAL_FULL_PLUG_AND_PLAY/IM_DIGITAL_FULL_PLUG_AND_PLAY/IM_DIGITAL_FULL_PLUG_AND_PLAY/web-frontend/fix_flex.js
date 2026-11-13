const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Lock Main Outer Container to h-[745px]
c = c.replace('<div className="border border-black">', '<div className="border border-black flex flex-col h-[745px]">');

// 2. Make Form Sections flex-1
c = c.replace('<div className="flex w-full">', '<div className="flex w-full flex-1 min-h-0">');

// 3. Left Column h-full
c = c.replace('<div className="w-[670px] shrink-0 border-r border-black flex flex-col">', '<div className="w-[670px] shrink-0 border-r border-black flex flex-col h-full">');

// 4. Replace appearanceHeight logic with flex-1
c = c.replace(/const appearanceHeight =.*?;/g, '');
c = c.replace(/<div className="bg-\[\#EAEFE3\] border-b border-black" style=\{\{ height: appearanceHeight \}\}\><\/div>/g, '<div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>');

// 5. Right column flex changes
c = c.replace('<div className="flex-1 flex flex-col justify-between">', '<div className="flex-1 flex flex-col h-full">');
c = c.replace('<div className="bg-[#EAEFE3] border-b border-black h-[220px]"></div>', '<div className="bg-[#EAEFE3] border-b border-black flex-[3] min-h-0"></div>');
c = c.replace('<div className="bg-[#EAEFE3] border-b border-black h-[75px]"></div>', '<div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>');

// 6. Fix nested div in Right column that prevents flex-1 from working correctly on A.6 and A.7 bodies
// In the original file:
//               <div className="flex-1 flex flex-col justify-between">
//                 <div>
//                   <div className="bg-[#FFB300] ...
// we need to remove that wrapping <div> inside the right column.
// And there is an ending </div> before BATCH NUMBER FORMAT?
// Let's replace the start of right column:
const rightColStart = `{/* Right Column (Flex-1) */}
              <div className="flex-1 flex flex-col justify-between">
                <div>`;
const rightColStartNew = `{/* Right Column (Flex-1) */}
              <div className="flex-1 flex flex-col h-full">`;
c = c.replace(rightColStart, rightColStartNew);

// and the end of that wrapping div before BATCH NUMBER FORMAT
const rightColMid = `                  {/* A.7 Green Body */}
                  <div className="bg-[#EAEFE3] border-b border-black h-[75px]"></div>
                </div>

                {/* BATCH NUMBER FORMAT = fixed 95px according to spec */}`;
const rightColMidNew = `                  {/* A.7 Green Body */}
                  <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>

                {/* BATCH NUMBER FORMAT = fixed 95px according to spec */}`;
c = c.replace(rightColMid, rightColMidNew);

// Also need to make sure we replaced the inner A.1 A.2 A.3 properly, because the replace might have failed if it didn't match perfectly.
// Let's do it explicitly if needed:
c = c.replaceAll('style={{ height: appearanceHeight }}', 'className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"');
c = c.replaceAll('<div className="bg-[#EAEFE3] border-b border-black" className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>', '<div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>');

fs.writeFileSync(p, c, 'utf8');
console.log('Flex layout applied safely');
