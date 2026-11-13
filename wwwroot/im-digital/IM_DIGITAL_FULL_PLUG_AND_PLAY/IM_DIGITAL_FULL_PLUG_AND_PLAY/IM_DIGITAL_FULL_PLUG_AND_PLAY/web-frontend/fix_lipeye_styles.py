import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the hardcoded LipEye block calls
old_lipeye_calls = """                                    {renderLipEyeBeratBlock("A.4. Berat (OILY)", "Berat filling oily phase", "4.500", d1Str, qcResult.phase1.limitsGram, "200", "30%", "100", "0.262")}
                                    {renderLipEyeBeratBlock("A.4.1 Berat (AQUA)", "Berat filling aqua phase", "4.500", d2Str, qcResult.phase2.limitsGram, "200", "70%", "100", "0.262")}
                                    {renderLipEyeBeratBlock("A.5. Berat Total", "Berat filling Total", "0.045", totDenStr, qcResult.total.limitsGram, "200", "100%", "200.0", "0.213")}"""

new_lipeye_calls = """                                    {renderLipEyeBeratBlock("A.4. Berat (OILY)", "Berat filling oily phase", qcResult.phase1.limitsGram?.syaratLegal?.toFixed(3) ?? '', d1Str, qcResult.phase1.limitsGram, vTot.toFixed(0), vTot > 0 ? (v1 / vTot * 100).toFixed(0) + "%" : "0%", v1.toFixed(1), getStatisticalError(v1).toFixed(3))}
                                    {renderLipEyeBeratBlock("A.4.1 Berat (AQUA)", "Berat filling aqua phase", qcResult.phase2.limitsGram?.syaratLegal?.toFixed(3) ?? '', d2Str, qcResult.phase2.limitsGram, vTot.toFixed(0), vTot > 0 ? (v2 / vTot * 100).toFixed(0) + "%" : "0%", v2.toFixed(1), getStatisticalError(v2).toFixed(3))}
                                    {renderLipEyeBeratBlock("A.5. Berat Total", "Berat filling Total", qcResult.total.limitsGram?.syaratLegal?.toFixed(3) ?? '', totDenStr, qcResult.total.limitsGram, vTot.toFixed(0), "100%", vTot.toFixed(1), getStatisticalError(vTot).toFixed(3))}"""

content = content.replace(old_lipeye_calls, new_lipeye_calls)

# Fix the LipEyeBeratBlock styling
old_berat_header = """      <div className="bg-[#4a2311] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">"""
new_berat_header = """      <div className="bg-[#A54F4F] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">"""
content = content.replace(old_berat_header, new_berat_header)

old_berat_bg = """      <div className="flex flex-col bg-[#EAEFE3] relative">"""
new_berat_bg = """      <div className="flex flex-col bg-[#FAEAD6] relative">"""
content = content.replace(old_berat_bg, new_berat_bg)

old_berat_title = """      <div className="bg-[#F8F9FA] flex justify-between px-2 py-[2px] text-[10px] font-bold border-b border-black text-black">"""
new_berat_title = """      <div className="bg-[#FAEAD6] flex justify-between px-2 py-[2px] text-[10px] font-bold border-b border-black text-black">"""
content = content.replace(old_berat_title, new_berat_title)

# Fix the LipEyeVolumeBlock styling
old_vol_header = """      <div className="bg-[#4a2311] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">"""
new_vol_header = """      <div className="bg-[#A54F4F] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">"""
content = content.replace(old_vol_header, new_vol_header)

old_vol_bg = """      <div className="flex flex-col bg-[#EAEFE3] relative h-[28px]">"""
new_vol_bg = """      <div className="flex flex-col bg-[#FAEAD6] relative h-[28px]">"""
content = content.replace(old_vol_bg, new_vol_bg)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated LipEye dynamic values and colors!")
