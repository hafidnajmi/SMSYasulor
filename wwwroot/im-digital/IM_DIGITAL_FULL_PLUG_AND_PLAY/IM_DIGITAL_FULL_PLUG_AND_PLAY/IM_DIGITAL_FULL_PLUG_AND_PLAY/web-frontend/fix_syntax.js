const fs = require('fs');
const p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const target1 = `                                </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px] relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[11.5px] mt-[1px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-bold text-[8px] leading-none absolute bottom-[1px] right-[10px]">max</span>
                                  </div>
                                  <div className="flex flex-col items-end justify-start pt-[2px] px-1 font-bold relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[11.5px] mt-[1px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                  </div>
                                </div>
                              </div>
                            );`;

const rep1 = `                                </div>
                              </div>
                            );`;

c = c.replace(target1, rep1);

const target2 = `                                </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px] relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[11.5px] mt-[1px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-bold text-[8px] leading-none absolute bottom-[1px] right-[10px]">max</span>
                                  </div>
                                  <div className="flex flex-col items-end justify-start pt-[2px] px-1 font-bold relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[11.5px] mt-[1px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                  </div>
                                </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px] relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[11.5px] mt-[1px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-bold text-[8px] leading-none absolute bottom-[1px] right-[10px]">max</span>
                                  </div>
                                  <div className="flex flex-col items-end justify-start pt-[2px] px-1 font-bold relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[11.5px] mt-[1px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                  </div>
                                </div>
                              </div>`;

// Wait, the easiest way is to just grab the file from git or use multi replace properly.
// The syntax error is at 744. Let's see the lines around 700 to 800 to know what to replace.
