const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  `                              {/* Density Row */}
                              <div className="h-[18px] bg-white flex items-center px-1 text-[8.5px] font-bold justify-between">
                                {!isTotal ? <span>Density &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;<span className="text-[#0078D4]">{density}</span></span> : <span>&nbsp;</span>}
                              </div>
                            </div>
                          );`,
  `                              {/* Density Row */}
                              {!isTotal && (
                                <div className="h-[18px] bg-white flex items-center px-1 text-[8.5px] font-bold justify-between">
                                  <span>Density &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;<span className="text-[#0078D4]">{density}</span></span>
                                </div>
                              )}
                            </div>
                          );`
);

fs.writeFileSync(p, c, 'utf8');
console.log('Replaced');
