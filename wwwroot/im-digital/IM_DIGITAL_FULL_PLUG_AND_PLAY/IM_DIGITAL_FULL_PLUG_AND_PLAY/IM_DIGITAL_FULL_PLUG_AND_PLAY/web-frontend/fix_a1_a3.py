import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """                      <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.1. Appearance Filling</div>
                      <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>

                      <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.2. Appearance Assembly</div>
                      <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>

                      <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.3. Appearance Packing</div>
                      <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>"""

new_block = """                      {qcResult?.type === 'LipEye' ? (
                        <div className="flex flex-col flex-1 min-h-0">
                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.1. Appearance Filling</div>
                          <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>
                          
                          <div className="flex flex-row flex-1 min-h-0 border-b border-black">
                            <div className="flex flex-col flex-1 min-h-0 border-r border-black">
                              <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center justify-center text-center">A.2. Appearance Packing</div>
                              <div className="bg-[#EAEFE3] flex-1 min-h-0"></div>
                            </div>
                            
                            <div className="flex flex-col flex-1 min-h-0">
                              <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center justify-center text-center">A.3 Appearance Assembly</div>
                              <div className="bg-[#EAEFE3] flex-1 min-h-0"></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.1. Appearance Filling</div>
                          <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>

                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.2. Appearance Assembly</div>
                          <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>

                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center">A.3. Appearance Packing</div>
                          <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>
                        </>
                      )}"""

content = content.replace(old_block, new_block)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated A.1-A.3 layout for Lip Eye!")
