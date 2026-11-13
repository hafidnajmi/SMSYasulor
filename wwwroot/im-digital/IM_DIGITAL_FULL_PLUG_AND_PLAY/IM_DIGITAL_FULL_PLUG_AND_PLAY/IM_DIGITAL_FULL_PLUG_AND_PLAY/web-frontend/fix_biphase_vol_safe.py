import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find the specific const renderBiphaseVolRow block
start_sig = 'const renderBiphaseVolRow = (title: string, limits: any, density: string, pctStr: string, title2: string) => {'
idx3 = content.find(start_sig)

if idx3 == -1:
    print("Could not find renderBiphaseVolRow")
    sys.exit()

# Find the end of the function. The function ends right before:
# const v1 = parseFloat(qcFillingData.volPhase1) || 0;
# which is the start of the next block. But since there are multiple of those, we find the NEXT one after idx3.
idx4 = content.find('const v1 = parseFloat(qcFillingData.volPhase1)', idx3)

if idx4 == -1:
    print("Could not find the end bound")
    sys.exit()

replacement2 = """const renderBiphaseVolRow = (title: string, limits: any, density: string, pctStr: string, title2: string) => {
                              if (!limits) return null;
                              return (
                                <div className="flex flex-col border-b border-black w-full">
                                  <div className="bg-[#F8F9FA] border-b border-black h-[18px] flex items-center px-1 text-[10px] text-black">
                                    <span className="w-[110px] font-semibold">{title2}</span>
                                    <span className="w-[60px] text-left font-normal"></span>
                                    <span className="flex-1 text-center font-bold">{title}</span>
                                    <span className="w-[180px] text-right font-bold">{density} &nbsp;&nbsp; <span className="text-[#0078D4] font-bold ml-1">{pctStr}</span></span>
                                  </div>
                                  <div className="grid grid-cols-5 text-center text-[10px] font-bold border-b border-black h-[14px] items-center">
                                    <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black h-full">STOP</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                    <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                    <div className="bg-[#C00000] text-white flex items-center justify-center h-full">STOP</div>
                                  </div>
                                  <div className="grid grid-cols-5 text-center bg-white h-[35px] relative items-center">
                                    <div className="relative flex items-center justify-start h-full w-full">
                                      <div className="flex flex-col items-start font-bold ml-1 relative z-20">
                                        <span className="text-[#003366] leading-none text-[14px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-normal text-[8.5px] leading-none mt-[2px] ml-[15px]">min</span>
                                      </div>
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-[#003366] font-bold leading-none text-[13px] bg-white px-[2px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-start h-full w-full">
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-[#003366] font-bold leading-none text-[14px] bg-white px-[2px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-normal text-[8.5px] leading-none bg-white px-[2px] mt-[1px]">nominal</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-center h-full w-full">
                                      <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center w-[45px] h-[35px] z-10">
                                        <span className="text-black font-normal text-[13px] leading-none mb-1 mt-1">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                        <span className="text-[#555] font-normal text-[6.5px] leading-none">LINK BOM</span>
                                      </div>
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-black font-normal leading-none text-[13px] bg-white px-[2px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-start h-full w-full">
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-black font-normal leading-none text-[13px] bg-white px-[2px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-bold text-[8px] leading-none bg-white px-[2px] mt-[2px]">max</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-end h-full w-full pr-1">
                                      <div className="flex flex-col items-end font-normal relative z-20">
                                        <span className="text-black leading-none text-[13px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                                """

content = content[:idx3] + replacement2 + content[idx4:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Safely replaced Biphase Vol!")
