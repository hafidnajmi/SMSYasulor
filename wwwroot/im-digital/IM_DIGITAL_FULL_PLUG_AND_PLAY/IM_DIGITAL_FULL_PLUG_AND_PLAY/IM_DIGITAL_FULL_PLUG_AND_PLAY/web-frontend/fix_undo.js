const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Remove h-[745px]
c = c.replace('<div className="border border-black flex flex-col h-[745px]">', '<div className="border border-black">');

// 2. Remove flex-1 from form sections
c = c.replace('<div className="flex w-full flex-1 min-h-0">', '<div className="flex w-full">');
c = c.replace('<div className="w-[670px] shrink-0 border-r border-black flex flex-col h-full">', '<div className="w-[670px] shrink-0 border-r border-black flex flex-col">');

// 3. Restore right column
c = c.replace('<div className="flex-1 flex flex-col h-full">', '<div className="flex-1 flex flex-col justify-between">\n<div>');

// 4. We removed the extra </div>, let's add it back above VALIDATION BLOCK
const valBlockSearch = `{/* VALIDATION BLOCK AT BOTTOM */}`;
const valBlockReplace = `</div>\n{/* VALIDATION BLOCK AT BOTTOM */}`;
c = c.replace(valBlockSearch, valBlockReplace);

// 5. Restore right column fixed heights
c = c.replace('<div className="bg-[#EAEFE3] border-b border-black flex-[3] min-h-0"></div>', '<div className="bg-[#EAEFE3] border-b border-black h-[140px]"></div>');
c = c.replace('<div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>', '<div className="bg-[#EAEFE3] border-b border-black h-[75px]"></div>');

// 6. Restore appearanceHeight for Left Column
// We replace the A.1, A.2, A.3 bodies
c = c.replaceAll('<div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>', '<div className="bg-[#EAEFE3] border-b border-black" style={{ height: appearanceHeight }}></div>');

// Now we need to inject the appearanceHeight calculation
const leftColStart = `{/* Left Column (Spesifikasi FG) - Fixed Width 670px */}`;
const calcWrapStart = `{(() => {
  const appearanceHeight = (qcResult && (qcResult.type === 'Duo' || qcResult.type === 'Biphase' || qcResult.type === 'LIP EYE MAKE UP REMOVER')) ? '120px' : '170px';
  return (
    <>
      {/* Left Column (Spesifikasi FG) - Fixed Width 670px */}`;
c = c.replace(leftColStart, calcWrapStart);

// We need to close the `})()` after the left column ends!
// The left column ends at `{/* Top Volume FG display update */}` ... `</div>`
const leftColEnd = `{/* Top Volume FG display update */}
                  </div>`;
const calcWrapEnd = `{/* Top Volume FG display update */}
                  </div>
    </>
  );
})()}`;
c = c.replace(leftColEnd, calcWrapEnd);

fs.writeFileSync(p, c, 'utf8');
console.log('Restored correctly');
