import re

p = 'c:/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/IM DIGITAL NEW REV 1.8.8/web-frontend/src/app/dashboard/divisions/[division]/page.tsx'

with open(p, 'r', encoding='utf8') as f:
    c = f.read()

# Replace renderBiphaseRow completely
biphaseRowReplacement = """                            const renderBiphaseRow = (title: string, limits: any, pctStr: string, title2: string, density: string, isTotal: boolean) => {
                              if (!limits) return null;
                              return (
                                <div className="flex flex-col border-b border-black w-full">
                                  <div className="bg-[#C0CBE1] border-b border-black h-[18px] flex items-center px-1 font-semibold text-[10px] text-black">
                                    <span className="w-[80px]">{title}</span>
                                    <span className="flex-1 text-center">. Syarat legal</span>
                                    <span className="flex-1 text-center font-normal">{pctStr}</span>
                                    <span className="flex-1 text-right">{title2}</span>
                                    <span className="flex-1 text-center text-[#0078D4] font-normal">{density}</span>
                                  </div>
                                  <div className="grid grid-cols-5 text-center text-[8px] font-bold border-b border-black h-[14px]">
                                    <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black">STOP</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                    <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black">RUNNING</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                    <div className="bg-[#C00000] text-white flex items-center justify-center">STOP</div>
                                  </div>

                                  {/* Limits Row - white bg like reference */}
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
                                  </div>
                                </div>
                              );
                            }"""

biphaseVolRowReplacement = """                            const renderBiphaseVolRow = (title: string, limits: any, density: string, pctStr: string, title2: string) => {
                              if (!limits) return null;
                              return (
                                <div className="flex flex-col border-b border-black w-full">
                                  <div className="bg-[#C0CBE1] border-b border-black h-[18px] flex items-center px-1 font-semibold text-[10px] text-black">
                                    <span className="w-[80px]">{title}</span>
                                    <span className="flex-1 text-center">. Syarat legal</span>
                                    <span className="flex-1 text-center font-normal">{pctStr}</span>
                                    <span className="flex-1 text-right">{title2}</span>
                                    <span className="flex-1 text-center font-normal"></span>
                                  </div>
                                  <div className="grid grid-cols-5 text-center text-[8px] font-bold border-b border-black h-[14px]">
                                    <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black">STOP</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                    <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black">RUNNING</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                    <div className="bg-[#C00000] text-white flex items-center justify-center">STOP</div>
                                  </div>

                                  {/* Limits Row - white bg like reference */}
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
                                  </div>
                                </div>
                              );
                            }"""

s1 = c.find('const renderBiphaseRow = (title:')
e1 = c.find('// Duo row (unchanged)')

if s1 != -1 and e1 != -1:
    c = c[:s1] + biphaseRowReplacement + '\n\n                            ' + c[e1:]

s2 = c.find('const renderBiphaseVolRow = (title:')
e2 = c.find('const v1 = parseFloat(qcFillingData.volPhase1) || 0;', s2)

if s2 != -1 and e2 != -1:
    c = c[:s2] + biphaseVolRowReplacement + '\n\n                                ' + c[e2:]

with open(p, 'w', encoding='utf8') as f:
    f.write(c)

print('Syntax repaired!')
