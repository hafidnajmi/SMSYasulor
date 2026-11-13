const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const errStr = `                                  <div className="flex flex-col items-center justify-start pt-[2px] relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[11.5px] mt-[1px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-bold text-[8px] leading-none absolute bottom-[1px] right-[10px]">max</span>
                                  </div>
                                  <div className="flex flex-col items-end justify-start pt-[2px] px-1 font-bold relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[11.5px] mt-[1px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                  </div>
                                </div>
                              </div>`;

// We have multiple instances of this trailing junk because my script added it 3 times.
while (c.indexOf(errStr) !== -1) {
    c = c.replace(errStr, '');
}

// But wait, my script also inserted `</div>\n                                  </div>` randomly.
// Let's just fix it properly by using multi_replace_file_content or replacing the whole function block.
