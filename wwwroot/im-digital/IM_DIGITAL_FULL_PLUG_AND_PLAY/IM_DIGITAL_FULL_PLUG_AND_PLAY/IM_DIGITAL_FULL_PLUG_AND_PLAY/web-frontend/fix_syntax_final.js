const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Clean up nested IIFE
// Because JS replace might be finicky with whitespace, we'll use a regex
c = c.replace(/\{\(\(\) => \{\s*return \(\s*<>\s*\{\(\(\) => \{\s*const appearanceHeight = /g, `{(() => {
  const appearanceHeight = `);

// Also remove the extra closing tags at the end of the left column
// We have:
//   </>
// );
// })()}
// 
// 
// {/* Right Column (Flex-1) */}
c = c.replace(/<\/>\s*\);\s*\}\)\(\)\}\s*<\/>\s*\);\s*\}\)\(\)\}/g, `</>\n                );\n              })()}`);

// 2. Fix A.1 height
// A.1 currently has h-[75px] right after its header
const a1Search = `A.1. Appearance Filling</div>
                      <div className="bg-[#EAEFE3] border-b border-black h-[75px]"></div>`;
const a1Replace = `A.1. Appearance Filling</div>
                      <div className="bg-[#EAEFE3] border-b border-black" style={{ height: appearanceHeight }}></div>`;
c = c.replace(a1Search, a1Replace);

// 3. Fix A.7 height
// A.7 currently has appearanceHeight instead of h-[75px]
const a7Search = `A.7. VACCUM / JACOMEX / TORSI</div>

                  {/* A.7 Green Body */}
                  <div className="bg-[#EAEFE3] border-b border-black" style={{ height: appearanceHeight }}></div>`;
const a7Replace = `A.7. VACCUM / JACOMEX / TORSI</div>

                  {/* A.7 Green Body */}
                  <div className="bg-[#EAEFE3] border-b border-black h-[75px]"></div>`;
c = c.replace(a7Search, a7Replace);

fs.writeFileSync(p, c, 'utf8');
console.log('Fixed syntax using precise replacement');
