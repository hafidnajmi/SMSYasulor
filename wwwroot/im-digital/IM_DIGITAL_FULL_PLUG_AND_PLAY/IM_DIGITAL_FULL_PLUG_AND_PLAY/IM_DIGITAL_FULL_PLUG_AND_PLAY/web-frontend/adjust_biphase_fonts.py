import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx1 = content.find('const renderBiphaseRow = ')
idx2 = content.find('const renderDuoRow = ')

if idx1 == -1 or idx2 == -1:
    print("Could not find bounds")
    sys.exit()

replacement = """const renderBiphaseRow = (title: string, limits: any, pctStr: string, title2: string, density: string, isTotal: boolean) => {
                              if (!limits) return null;
                              const rowTitle = typeof isTotal === 'string' ? isTotal : "Berat: (gram)";
                              return (
                                <div className="flex flex-col border-b border-black w-full">
                                  <div className="bg-[#F8F9FA] border-b border-black h-[16px] flex items-center px-1 text-[10px] text-black">
                                    <span className="w-[90px] font-semibold">{rowTitle}</span>
                                    <span className="w-[50px] text-left font-normal">{pctStr}</span>
                                    <span className="flex-1 text-center font-bold">{title}</span>
                                    <span className="w-[150px] text-right font-bold">{title2} <span className="text-[#0078D4] font-bold ml-1">{density}</span></span>
                                  </div>
                                  <div className="grid grid-cols-5 text-center text-[10px] font-bold border-b border-black h-[14px] items-center">
                                    <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black h-full">STOP</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                    <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                    <div className="bg-[#C00000] text-white flex items-center justify-center h-full">STOP</div>
                                  </div>
                                  <div className="grid grid-cols-5 text-center bg-white h-[28px] relative items-center">
                                    <div className="relative flex items-center justify-start h-full w-full">
                                      <div className="flex flex-col items-start font-bold ml-1 relative z-20">
                                        <span className="text-[#003366] leading-none text-[11px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-normal text-[8px] leading-none ml-[10px]">min</span>
                                      </div>
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-[#003366] font-bold leading-none text-[11px] bg-white px-[2px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-start h-full w-full">
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-[#003366] font-bold leading-none text-[11px] bg-white px-[2px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-normal text-[8px] leading-none bg-white px-[2px]">nominal</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-center h-full w-full">
                                      <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center w-[40px] h-full z-10">
                                        <span className="text-black font-normal text-[10.5px] leading-none mb-[1px] mt-[1px]">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                        <span className="text-[#555] font-normal text-[7px] leading-none">LINK BOM</span>
                                      </div>
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-black font-normal leading-none text-[10.5px] bg-white px-[2px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-start h-full w-full">
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-black font-normal leading-none text-[10.5px] bg-white px-[2px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-bold text-[8px] leading-none bg-white px-[2px] mt-[1px]">max</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-end h-full w-full pr-1">
                                      <div className="flex flex-col items-end font-normal relative z-20">
                                        <span className="text-black leading-none text-[10.5px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            """

content = content[:idx1] + replacement + content[idx2:]

idx3 = content.find('const renderBiphaseVolRow = ')
idx4 = content.find('const v1 = parseFloat(qcFillingData.volPhase1)', idx3)

if idx3 != -1 and idx4 != -1:
    replacement2 = """const renderBiphaseVolRow = (title: string, limits: any, density: string, pctStr: string, title2: string) => {
                              if (!limits) return null;
                              return (
                                <div className="flex flex-col border-b border-black w-full">
                                  <div className="bg-[#F8F9FA] border-b border-black h-[16px] flex items-center px-1 text-[10px] text-black">
                                    <span className="w-[90px] font-semibold">{title2}</span>
                                    <span className="w-[50px] text-left font-normal"></span>
                                    <span className="flex-1 text-center font-bold">{title}</span>
                                    <span className="w-[150px] text-right font-bold">{density} &nbsp;&nbsp; <span className="text-[#0078D4] font-bold ml-1">{pctStr}</span></span>
                                  </div>
                                  <div className="grid grid-cols-5 text-center text-[10px] font-bold border-b border-black h-[14px] items-center">
                                    <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black h-full">STOP</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                    <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                    <div className="bg-[#C00000] text-white flex items-center justify-center h-full">STOP</div>
                                  </div>
                                  <div className="grid grid-cols-5 text-center bg-white h-[28px] relative items-center">
                                    <div className="relative flex items-center justify-start h-full w-full">
                                      <div className="flex flex-col items-start font-bold ml-1 relative z-20">
                                        <span className="text-[#003366] leading-none text-[11px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-normal text-[8px] leading-none ml-[10px]">min</span>
                                      </div>
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-[#003366] font-bold leading-none text-[11px] bg-white px-[2px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-start h-full w-full">
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-[#003366] font-bold leading-none text-[11px] bg-white px-[2px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-normal text-[8px] leading-none bg-white px-[2px]">nominal</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-center h-full w-full">
                                      <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center w-[40px] h-full z-10">
                                        <span className="text-black font-normal text-[10.5px] leading-none mb-[1px] mt-[1px]">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                        <span className="text-[#555] font-normal text-[7px] leading-none">LINK BOM</span>
                                      </div>
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-black font-normal leading-none text-[10.5px] bg-white px-[2px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-start h-full w-full">
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-black font-normal leading-none text-[10.5px] bg-white px-[2px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-bold text-[8px] leading-none bg-white px-[2px] mt-[1px]">max</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-end h-full w-full pr-1">
                                      <div className="flex flex-col items-end font-normal relative z-20">
                                        <span className="text-black leading-none text-[10.5px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                                """
    content = content[:idx3] + replacement2 + content[idx4:]
    print("Done writing Biphase Vol")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done making everything clear but compact!")
