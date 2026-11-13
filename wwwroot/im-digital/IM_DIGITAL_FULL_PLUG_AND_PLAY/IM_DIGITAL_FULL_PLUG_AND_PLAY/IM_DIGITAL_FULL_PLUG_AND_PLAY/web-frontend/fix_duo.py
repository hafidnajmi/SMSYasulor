import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx_duo = content.find('const renderDuoRow = (title: string, limits: any, density: string, isTotal: boolean) => (')
idx_normal = content.find('const getShortPhaseName')

exact_original_duo = """const renderDuoRow = (title: string, limits: any, density: string, isTotal: boolean) => (
                              <div className="flex flex-col border-b border-black w-full">
                                <div className="bg-[#C0CBE1] border-b border-black h-[18px] flex items-center px-1 font-semibold text-[10px] text-black">
                                  {title}
                                </div>
                                {!isTotal && (
                                  <div className="h-[12px] border-b border-black bg-[#EAEFE3] flex justify-between px-1 text-[7.5px] text-[#555] relative">
                                    <span>. Syarat legal</span>
                                    <span className="absolute left-[36%]">{limits?.syaratLegal?.toFixed(3).replace(/0$/, '') ?? ''}</span>
                                    <span></span>
                                  </div>
                                )}
                                <div className="grid grid-cols-5 text-center text-[8px] font-bold border-b border-black h-[14px]">
                                  <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black">STOP</div>
                                  <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                  <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black tracking-widest">RUNNING</div>
                                  <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black">ADJUST</div>
                                  <div className="bg-[#C00000] text-white flex items-center justify-center">STOP</div>
                                </div>
                                <div className="grid grid-cols-5 text-center text-[11px] bg-white h-[35px] relative">
                                  <div className="flex flex-col items-start justify-start pt-[2px] px-1 font-bold">
                                    <span className="text-[#003366] leading-none mb-[2px] text-[14px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-normal text-[8.5px] leading-none ml-[25px]">min</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px]">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                  </div>
                                  <div className="flex items-start justify-center pt-[2px] relative w-full h-full">
                                    <div className="absolute left-[-20px] flex flex-col items-center font-bold">
                                      <span className="text-[#003366] leading-none mb-[1px] text-[14px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                      <span className="text-black font-normal text-[8.5px] leading-none">nominal</span>
                                    </div>
                                    <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center text-[8px] font-bold w-[45px] mx-auto absolute left-[50%] -translate-x-[50%] h-[35px] top-0 z-10">
                                      <span className="text-black text-[13px] font-normal leading-none mb-1 mt-1">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                      <span className="leading-none text-[6.5px] text-[#555] font-normal">LINK BOM</span>
                                    </div>
                                    <div className="absolute right-[-20px] flex flex-col items-center font-normal">
                                      <span className="text-black leading-none mb-[1px] text-[13px] mt-[1px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-start pt-[2px] relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                    <span className="text-black font-bold text-[8px] leading-none absolute bottom-[1px] right-[10px]">max</span>
                                  </div>
                                  <div className="flex flex-col items-end justify-start pt-[2px] px-1 font-bold relative">
                                    <span className="text-black font-normal leading-none mb-[2px] text-[13px] mt-[1px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                  </div>
                                </div>
                                {!isTotal && (
                                  <div className="h-[18px] bg-white flex items-center px-1 text-[8.5px] font-bold justify-between">
                                    <span>Density &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;<span className="text-[#0078D4]">{density}</span></span>
                                  </div>
                                )}
                              </div>
                            );

                            """

content = content[:idx_duo] + exact_original_duo + content[idx_normal:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored original Duo Row!")
