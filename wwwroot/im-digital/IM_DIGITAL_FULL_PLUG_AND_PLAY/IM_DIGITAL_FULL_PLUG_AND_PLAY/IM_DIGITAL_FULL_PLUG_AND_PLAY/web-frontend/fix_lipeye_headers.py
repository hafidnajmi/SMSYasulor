import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Outer A.4 Header
old_a4_header = """                      {/* A.4 Header */}
                      <div className="bg-[#4C1D1D] text-white px-[4px] font-bold text-[10px] h-[16px] flex items-center border-b border-black">
                        {(qcResult && (qcResult.type === 'Biphase' || qcResult.type === 'LipEye')) ? 'A.4. Berat' : 'A.4. Berat (gram) di timbangan'}
                      </div>"""

new_a4_header = """                      {/* A.4 Header */}
                      {(!qcResult || qcResult.type !== 'LipEye') && (
                        <div className="bg-[#4C1D1D] text-white px-[4px] font-bold text-[10px] h-[16px] flex items-center border-b border-black">
                          {(qcResult && qcResult.type === 'Biphase') ? 'A.4. Berat' : 'A.4. Berat (gram) di timbangan'}
                        </div>
                      )}"""

content = content.replace(old_a4_header, new_a4_header)

# Fix 2: A.4 block logic (revert Biphase back to normal, keep LipEye)
old_a4_logic = """if (isBiphaseMode) {
                              if (qcResult.type === 'LipEye') {
                                return (
                                  <div className="flex flex-col w-full">
                                    {renderLipEyeBeratBlock("A.4. Berat (OILY)", "Berat filling oily phase", "4.500", d1Str, qcResult.phase1.limitsGram, "200", "30%", "100", "0.262")}
                                    {renderLipEyeBeratBlock("A.4.1 Berat (AQUA)", "Berat filling aqua phase", "4.500", d2Str, qcResult.phase2.limitsGram, "200", "70%", "100", "0.262")}
                                    {renderLipEyeBeratBlock("A.5. Berat Total", "Berat filling Total", "0.045", totDenStr, qcResult.total.limitsGram, "200", "100%", "200.0", "0.213")}
                                    
                                    {renderLipEyeVolumeBlock("A.6. Volume OILY (ML) >> REFERENSI di FLEXNET", qcResult.phase1.limitsMl)}
                                    {renderLipEyeVolumeBlock("A.6.1 Volume AQUA (ML) >> REFERENSI di FLEXNET", qcResult.phase2.limitsMl)}
                                    {renderLipEyeVolumeBlock("A.7. Volume Total (ML) >> REFERENSI di FLEXNET", qcResult.total.limitsMl)}
                                  </div>
                                );
                              }

                              return (
                                <div className="flex flex-col w-full">
                                  <div className="bg-[#4C2322] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">A.4. Berat</div>
                                  {renderBiphaseRow("OIL", qcResult.phase1.limitsGram, "Phase Oil : 50%", "Density Oil :", d1Str, "Berat: (gram)")}
                                  {renderBiphaseRow("AQUEOUS", qcResult.phase2.limitsGram, "Phase Aqueous : 50%", "Density Water :", d2Str, "Berat: (gram)")}
                                  {renderBiphaseRow("BiPhase", qcResult.total.limitsGram, "BiPhase : 100%", "Density BiPhase :", totDenStr, "Berat: (gram)")}

                                  <div className="bg-[#4C2322] text-white font-bold px-2 py-[2px] text-[11px] border-b border-t border-black">A.5. Volume</div>
                                  {renderBiphaseVolRow("OIL", qcResult.phase1.limitsMl, "Phase Oil", "50%", "Volume : (ml)")}
                                  {renderBiphaseVolRow("AQUEOUS", qcResult.phase2.limitsMl, "Phase Aqueous", "50%", "Volume : (ml)")}
                                  {renderBiphaseVolRow("BiPhase", qcResult.total.limitsMl, "BiPhase", "100%", "Volume : (ml)")}
                                </div>
                              );
                            }"""

new_a4_logic = """if (isBiphaseMode) {
                              if (qcResult.type === 'LipEye') {
                                return (
                                  <div className="flex flex-col w-full">
                                    {renderLipEyeBeratBlock("A.4. Berat (OILY)", "Berat filling oily phase", "4.500", d1Str, qcResult.phase1.limitsGram, "200", "30%", "100", "0.262")}
                                    {renderLipEyeBeratBlock("A.4.1 Berat (AQUA)", "Berat filling aqua phase", "4.500", d2Str, qcResult.phase2.limitsGram, "200", "70%", "100", "0.262")}
                                    {renderLipEyeBeratBlock("A.5. Berat Total", "Berat filling Total", "0.045", totDenStr, qcResult.total.limitsGram, "200", "100%", "200.0", "0.213")}
                                    
                                    {renderLipEyeVolumeBlock("A.6. Volume OILY (ML) >> REFERENSI di FLEXNET", qcResult.phase1.limitsMl)}
                                    {renderLipEyeVolumeBlock("A.6.1 Volume AQUA (ML) >> REFERENSI di FLEXNET", qcResult.phase2.limitsMl)}
                                    {renderLipEyeVolumeBlock("A.7. Volume Total (ML) >> REFERENSI di FLEXNET", qcResult.total.limitsMl)}
                                  </div>
                                );
                              }

                              return (
                                <div className="flex flex-col w-full">
                                  {renderBiphaseRow("OIL", qcResult.phase1.limitsGram, qcResult.phase1.limitsGram?.syaratLegal?.toFixed(3) ?? '', "Density Oil :", d1Str, "Berat: (gram)")}
                                  {renderBiphaseRow("AQUEOUS", qcResult.phase2.limitsGram, qcResult.phase2.limitsGram?.syaratLegal?.toFixed(3) ?? '', "Density Water  :", d2Str, "Berat: (gram)")}
                                  {renderBiphaseRow("BiPhase", qcResult.total.limitsGram, qcResult.total.limitsGram?.syaratLegal?.toFixed(3) ?? '', "Density BiPhase :", totDenStr, "Berat: (gram)")}
                                </div>
                              );
                            }"""

content = content.replace(old_a4_logic, new_a4_logic)

# Fix 3: Outer A.5 Volume Block
old_a5_outer = """{qcResult && (qcResult.type === 'Biphase' || qcResult.type === 'LipEye') && ("""
new_a5_outer = """{qcResult && qcResult.type === 'Biphase' && ("""
content = content.replace(old_a5_outer, new_a5_outer)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Applied fixes successfully!")
