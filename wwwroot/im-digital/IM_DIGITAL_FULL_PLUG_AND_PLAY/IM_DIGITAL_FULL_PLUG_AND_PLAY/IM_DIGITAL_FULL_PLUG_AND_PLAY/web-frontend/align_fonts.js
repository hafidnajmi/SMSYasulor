const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const replacementA4 = `                                {/* Limits Row - white bg like reference */}
                                <div className="grid grid-cols-5 text-center text-[11px] bg-white h-[35px] relative">
                                  <div className="flex flex-col items-start justify-center px-1 font-bold h-full">
                                    <span className="text-[#003366] leading-none text-[10.5px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-normal text-[7.5px] leading-none ml-[25px] mt-[2px]">min</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-center h-full">
                                    <span className="text-black font-normal leading-none text-[10.5px] mb-[7px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                  </div>
                                  <div className="flex items-center justify-center relative w-full h-full">
                                    <div className="absolute left-[-20px] flex flex-col items-center font-bold">
                                      <span className="text-[#003366] leading-none text-[10.5px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                      <span className="text-black font-normal text-[7.5px] leading-none mt-[2px]">nominal</span>
                                    </div>
                                    <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center text-[8px] font-bold w-[45px] mx-auto absolute left-[50%] -translate-x-[50%] h-[35px] top-0 z-10">
                                      <span className="text-black text-[10.5px] font-normal leading-none mb-[2px]">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                      <span className="leading-none text-[6.5px] text-[#555] font-normal">LINK BOM</span>
                                    </div>
                                    <div className="absolute right-[10px] flex flex-col items-center font-normal">
                                      <span className="text-black leading-none text-[10.5px] mb-[7px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-center relative h-full">
                                    <span className="text-black font-normal leading-none text-[10.5px] mb-[7px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-bold text-[7.5px] leading-none absolute bottom-[3px] right-[10px]">max</span>
                                  </div>
                                  <div className="flex flex-col items-end justify-center px-1 font-bold relative h-full">
                                    <span className="text-black font-normal leading-none text-[10.5px] mb-[7px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                  </div>
                                </div>`;

const s1 = c.indexOf('{/* Limits Row - white bg like reference */}');
let e1 = c.indexOf('</div>\n                              </div>', s1);
if (e1 !== -1) {
    c = c.substring(0, s1) + replacementA4 + c.substring(e1 + 6);
}

// For A.5 Vol row (it's similar, let's find it)
const s2 = c.indexOf('{/* Limits Row - white bg like reference */}', e1 + 10);
let e2 = c.indexOf('</div>\n                                  </div>', s2);
if (e2 !== -1) {
    c = c.substring(0, s2) + replacementA4 + c.substring(e2 + 6);
}

// And also replace Duo Row (just in case they check Duo)
const s3 = c.indexOf('{/* Limits Row - white bg like reference */}', e1 + 10);
// actually renderDuoRow is before Biphase. Let me just replace ALL instances of this block.

// Instead of string indexOf which is brittle, I'll write a regex to replace the whole Limits Row block.
const regex = /\{\/\* Limits Row - white bg like reference \*\/\}.*?(?=<div className="h-\[|\<\/div\>\n\s*<\/(div|div\>))/gs;
// Wait, regex match is too risky. Let's write an exact script.
