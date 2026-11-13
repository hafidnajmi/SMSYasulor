import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find("const renderLipEyeBeratBlock =")
end_idx = content.find("const renderBiphaseRow =", start_idx)

new_functions = """const renderLipEyeBeratBlock = (
  headerText: string, 
  titleLeft: string, 
  syaratLegal: string, 
  density: string, 
  limits: any, 
  volText: string, 
  pctText: string, 
  midText: string, 
  statError: string
) => {
  if (!limits) return null;
  return (
    <div className="flex flex-col border-b border-l border-r border-black w-full text-black">
      <div className="bg-[#A54F4F] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">
        {headerText}
      </div>
      <div className="bg-[#FAEAD6] flex justify-between px-2 py-[2px] text-[10px] font-bold border-b border-black">
        <span className="w-[160px] text-left">{titleLeft}</span>
        <span className="flex-1 text-center font-normal">Syarat legal : {syaratLegal}</span>
        <span className="w-[160px] text-right font-normal">density : {density}</span>
      </div>
      
      <div className="grid grid-cols-5 text-center text-[9px] font-bold border-b border-black h-[16px]">
        <div className="bg-[#C00000] text-white border-r border-black h-full flex items-center justify-center">STOP</div>
        <div className="bg-[#FFFF00] text-black border-r border-black h-full flex items-center justify-center">ADJUST</div>
        <div className="bg-[#00B050] text-white border-r border-black h-full flex items-center justify-center tracking-widest">RUNNING</div>
        <div className="bg-[#FFFF00] text-black border-r border-black h-full flex items-center justify-center">ADJUST</div>
        <div className="bg-[#C00000] text-white h-full flex items-center justify-center">STOP</div>
      </div>

      <div className="flex flex-col bg-[#FAEAD6] pt-[2px] pb-[4px] relative">
        <div className="grid grid-cols-5 text-center relative z-10 text-[10px]">
          <div className="flex flex-col items-center justify-start text-[#003366] font-bold">
            <span>{limits?.stopMin?.toFixed(1) ?? ''}</span>
            <span className="text-black font-normal text-[9px]">min</span>
          </div>
          <div className="flex flex-col items-center justify-start pt-[2px] font-medium">
            <span>{limits?.adjMin?.toFixed(1) ?? ''}</span>
          </div>
          <div className="flex flex-row justify-between items-start px-2 relative">
             <div className="flex flex-col items-center justify-start text-[#003366] font-bold">
               <span>{limits?.nominal?.toFixed(1) ?? ''}</span>
               <span className="text-black font-normal text-[9px]">nominal</span>
             </div>
             
             <div className="bg-[#FFC000] border border-black flex flex-col items-center justify-center w-[48px] absolute top-[-3px] left-1/2 -translate-x-1/2 z-20 shadow-sm" style={{ height: '32px' }}>
               <span className="text-black font-normal text-[10px] leading-[1.1]">{limits?.linkBom?.toFixed(1) ?? ''}</span>
               <span className="text-black font-bold text-[8px] leading-[1.1]">LINK BOM</span>
             </div>
             
             <div className="flex flex-col items-center justify-start pt-[2px] font-medium">
               <span>{limits?.runMax?.toFixed(1) ?? ''}</span>
             </div>
          </div>
          <div className="flex flex-col items-center justify-start pt-[2px] font-medium">
            <span>{limits?.adjMax?.toFixed(1) ?? ''}</span>
          </div>
          <div className="flex flex-col items-center justify-start font-medium">
            <span>{limits?.stopMax?.toFixed(1) ?? ''}</span>
            <span className="text-black font-bold text-[9px]">max</span>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1fr_2fr_1.5fr] text-[10px] mt-1 text-black items-end pl-[20%] pr-[2%]">
          <div className="text-left font-medium">Vol : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{volText}</div>
          <div className="text-center pl-4 font-medium">{pctText}</div>
          <div className="text-center font-medium pr-10">{midText}</div>
          <div className="text-right font-medium">stat error : {statError}</div>
        </div>
      </div>
    </div>
  );
};

const renderLipEyeVolumeBlock = (headerText: string, limits: any) => {
  if (!limits) return null;
  return (
    <div className="flex flex-col border-b border-l border-r border-black w-full text-black">
      <div className="bg-[#A54F4F] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">
        {headerText}
      </div>
      
      <div className="grid grid-cols-5 text-center text-[9px] font-bold border-b border-black h-[16px] mt-1">
        <div className="bg-[#C00000] text-white border-r border-black h-full flex items-center justify-center">STOP</div>
        <div className="bg-[#FFFF00] text-black border-r border-black h-full flex items-center justify-center">ADJUST</div>
        <div className="bg-[#00B050] text-white border-r border-black h-full flex items-center justify-center tracking-widest">RUNNING</div>
        <div className="bg-[#FFFF00] text-black border-r border-black h-full flex items-center justify-center">ADJUST</div>
        <div className="bg-[#C00000] text-white h-full flex items-center justify-center">STOP</div>
      </div>

      <div className="flex flex-col bg-[#FAEAD6] pt-[2px] pb-[10px] relative">
        <div className="grid grid-cols-5 text-center relative z-10 text-[10px]">
          <div className="flex flex-col items-center justify-start text-[#003366] font-bold">
            <span>{limits?.stopMin?.toFixed(1) ?? ''}</span>
            <span className="text-black font-normal text-[9px]">min</span>
          </div>
          <div className="flex flex-col items-center justify-start pt-[2px] font-medium">
            <span>{limits?.adjMin?.toFixed(1) ?? ''}</span>
          </div>
          <div className="flex flex-row justify-between items-start px-2 relative">
             <div className="flex flex-col items-center justify-start text-[#003366] font-bold">
               <span>{limits?.nominal?.toFixed(1) ?? ''}</span>
               <span className="text-black font-normal text-[9px]">nominal</span>
             </div>
             
             <div className="bg-[#FFC000] border border-black flex flex-col items-center justify-center w-[48px] absolute top-[-3px] left-1/2 -translate-x-1/2 z-20 shadow-sm" style={{ height: '32px' }}>
               <span className="text-black font-normal text-[10px] leading-[1.1]">{limits?.linkBom?.toFixed(1) ?? ''}</span>
               <span className="text-black font-bold text-[8px] leading-[1.1]">LINK BOM</span>
             </div>
             
             <div className="flex flex-col items-center justify-start pt-[2px] font-medium">
               <span>{limits?.runMax?.toFixed(1) ?? ''}</span>
             </div>
          </div>
          <div className="flex flex-col items-center justify-start pt-[2px] font-medium">
            <span>{limits?.adjMax?.toFixed(1) ?? ''}</span>
          </div>
          <div className="flex flex-col items-center justify-start font-medium">
            <span>{limits?.stopMax?.toFixed(1) ?? ''}</span>
            <span className="text-black font-bold text-[9px]">max</span>
          </div>
        </div>
      </div>
    </div>
  );
};
"""

content = content[:start_idx] + new_functions + content[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Lip Eye block layouts!")
