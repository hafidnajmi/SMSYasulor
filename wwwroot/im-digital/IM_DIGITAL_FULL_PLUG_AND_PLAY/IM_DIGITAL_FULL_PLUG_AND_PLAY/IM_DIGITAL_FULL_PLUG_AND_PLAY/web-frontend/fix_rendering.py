import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """if (isBiphaseMode) {
                              return (
                                <div className="flex flex-col w-full">
                                  {renderBiphaseRow("OIL", qcResult.phase1.limitsGram, qcResult.phase1.limitsGram?.syaratLegal?.toFixed(3) ?? '', "Density Oil :", d1Str, "Berat: (gram)")}
                                  {renderBiphaseRow("AQUEOUS", qcResult.phase2.limitsGram, qcResult.phase2.limitsGram?.syaratLegal?.toFixed(3) ?? '', "Density Water  :", d2Str, "Berat: (gram)")}
                                  {renderBiphaseRow("BiPhase", qcResult.total.limitsGram, qcResult.total.limitsGram?.syaratLegal?.toFixed(3) ?? '', "Density BiPhase :", totDenStr, "Berat: (gram)")}

                                </div>
                              );
                            }"""

new_block = """if (isBiphaseMode) {
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

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed Biphase/LipEye mode rendering successfully!")
else:
    print("Error: Could not find the old block to replace.")
