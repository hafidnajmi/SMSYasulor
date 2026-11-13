const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const replacementA4 = `                                {/* Limits Row - white bg like reference */}
                                <div className="grid grid-cols-5 text-center text-[11px] bg-white h-[35px] relative">
                                  <div className="flex flex-col items-start justify-center px-1 font-bold h-full">
                                    <div className="flex flex-col items-center justify-center -mt-[2px]">
                                      <span className="text-[#003366] leading-none text-[10.5px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                      <span className="text-black font-normal text-[7px] leading-none mt-[2px] ml-[20px]">min</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-center h-full">
                                    <span className="text-black font-normal leading-none text-[10.5px] -mt-[6px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                  </div>
                                  <div className="flex items-center justify-center relative w-full h-full">
                                    <div className="absolute left-[-20px] flex flex-col items-center font-bold justify-center h-full -mt-[2px]">
                                      <span className="text-[#003366] leading-none text-[10.5px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                      <span className="text-black font-normal text-[7px] leading-none mt-[2px]">nominal</span>
                                    </div>
                                    <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center text-[8px] font-bold w-[45px] mx-auto absolute left-[50%] -translate-x-[50%] h-[35px] top-0 z-10">
                                      <span className="text-black text-[10.5px] font-normal leading-none mt-[1px]">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                      <span className="leading-none text-[6px] text-[#555] font-normal mt-[1px]">LINK BOM</span>
                                    </div>
                                    <div className="absolute right-[10px] flex flex-col items-center font-normal justify-center h-full">
                                      <span className="text-black leading-none text-[10.5px] -mt-[6px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-center relative h-full">
                                    <span className="text-black font-normal leading-none text-[10.5px] -mt-[6px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-bold text-[7px] leading-none absolute bottom-[3px] right-[10px]">max</span>
                                  </div>
                                  <div className="flex flex-col items-end justify-center px-1 font-bold relative h-full">
                                    <span className="text-black font-normal leading-none text-[10.5px] -mt-[6px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                  </div>
                                </div>`;

const parts = c.split('{/* Limits Row - white bg like reference */}');
let out = parts[0];
for (let i = 1; i < parts.length; i++) {
    // Find where the limits row block ends. It's the </div> before the next container.
    // The grid div has 5 child divs. So we can count the closing </div>s, but an easier way is just string matching till we hit the end of the block.
    // In our code, after Limits Row, we either have:
    // a </div> and then `);` or `const` (for Biphase Vol / Duo)
    
    // We can just use string slicing based on `</div>\n                                </div>`
    const nextClosing = parts[i].indexOf('</div>\n                                </div>');
    const nextClosing2 = parts[i].indexOf('</div>\n                                  </div>');
    const nextClosing3 = parts[i].indexOf('</div>\n                                {!isTotal && (');
    
    let endIdx = -1;
    let keepTail = "";
    if (nextClosing !== -1 && (nextClosing < nextClosing2 || nextClosing2 === -1) && (nextClosing < nextClosing3 || nextClosing3 === -1)) {
        endIdx = nextClosing + 6; // index after the closing tag of the limits row container
        keepTail = parts[i].substring(endIdx);
    } else if (nextClosing2 !== -1 && (nextClosing2 < nextClosing3 || nextClosing3 === -1)) {
        endIdx = nextClosing2 + 6;
        keepTail = parts[i].substring(endIdx);
    } else if (nextClosing3 !== -1) {
        endIdx = nextClosing3 + 6;
        keepTail = parts[i].substring(endIdx);
    } else {
        // Fallback
        endIdx = parts[i].indexOf('</div>\n                              </div>');
        if (endIdx !== -1) keepTail = parts[i].substring(endIdx + 6);
    }
    
    if (endIdx !== -1) {
        out += replacementA4 + keepTail;
    } else {
        out += '{/* Limits Row - white bg like reference */}' + parts[i];
    }
}

fs.writeFileSync(p, out, 'utf8');
console.log('Replaced all limit rows successfully!');
