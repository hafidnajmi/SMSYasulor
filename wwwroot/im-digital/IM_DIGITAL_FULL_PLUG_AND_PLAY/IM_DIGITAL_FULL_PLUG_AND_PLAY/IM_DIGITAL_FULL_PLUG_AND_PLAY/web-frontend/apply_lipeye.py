import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the submit handler to set 'LipEye'
# The block currently looks like:
# } else if (qcFillingData.templateIm === 'Biphase' || qcFillingData.templateIm === 'LIP EYE MAKE UP REMOVER') {
old_handler = "} else if (qcFillingData.templateIm === 'Biphase' || qcFillingData.templateIm === 'LIP EYE MAKE UP REMOVER') {"
new_handler = """} else if (qcFillingData.templateIm === 'Biphase') {
      const v1 = parseFloat(qcFillingData.volPhase1) || 0;
      const d1 = parseFloat(qcFillingData.denPhase1) || 0;
      const v2 = parseFloat(qcFillingData.volPhase2) || 0;
      const d2 = parseFloat(qcFillingData.denPhase2) || 0;

      const p1 = calculateNormalLimits(v1, d1);
      const p2 = calculateNormalLimits(v2, d2);

      const volTot = v1 + v2;
      const denTot = volTot > 0 ? ((v1 * d1) + (v2 * d2)) / volTot : 1.0;
      const totalSummary = calculateNormalLimits(volTot, denTot);

      setQcResult({
        type: 'Biphase',
        isSachet: false,
        phase1: p1,
        phase2: p2,
        total: totalSummary
      });
    } else if (qcFillingData.templateIm === 'LIP EYE MAKE UP REMOVER') {
      const v1 = parseFloat(qcFillingData.volPhase1) || 0;
      const d1 = parseFloat(qcFillingData.denPhase1) || 0;
      const v2 = parseFloat(qcFillingData.volPhase2) || 0;
      const d2 = parseFloat(qcFillingData.denPhase2) || 0;

      const p1 = calculateNormalLimits(v1, d1);
      const p2 = calculateNormalLimits(v2, d2);

      const volTot = v1 + v2;
      const denTot = volTot > 0 ? ((v1 * d1) + (v2 * d2)) / volTot : 1.0;
      const totalSummary = calculateNormalLimits(volTot, denTot);

      setQcResult({
        type: 'LipEye',
        isSachet: false,
        phase1: p1,
        phase2: p2,
        total: totalSummary
      });"""
content = content.replace(old_handler, new_handler)

# 2. Find the rendering block.
# We look for where it renders Biphase: qcResult && (qcResult.type === 'Biphase' || qcResult.type === 'LIP EYE MAKE UP REMOVER')
# Let's replace 'LIP EYE MAKE UP REMOVER' with 'LipEye' in the rendering checks.
content = content.replace("qcResult.type === 'LIP EYE MAKE UP REMOVER'", "qcResult.type === 'LipEye'")

# 3. Add the render functions for LipEye just above renderBiphaseRow.
biphase_render_idx = content.find('const renderBiphaseRow = ')

lip_eye_functions = """const renderLipEyeBeratBlock = (
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
    <div className="flex flex-col border border-black w-full mb-1">
      <div className="bg-[#4a2311] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">
        {headerText}
      </div>
      <div className="bg-[#F8F9FA] flex justify-between px-2 py-[2px] text-[10px] font-bold border-b border-black text-black">
        <span className="w-[150px]">{titleLeft}</span>
        <span className="flex-1 text-center">Syarat legal : {syaratLegal}</span>
        <span className="w-[150px] text-right">density : {density}</span>
      </div>
      <div className="grid grid-cols-5 text-center text-[8.5px] font-bold border-b border-black h-[14px] items-center">
        <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black h-full">STOP</div>
        <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
        <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
        <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
        <div className="bg-[#C00000] text-white flex items-center justify-center h-full">STOP</div>
      </div>
      <div className="flex flex-col bg-[#EAEFE3] relative">
        <div className="grid grid-cols-5 text-center h-[28px] relative items-center">
          <div className="relative flex items-center justify-start h-full w-full">
            <div className="flex flex-col items-start font-bold ml-1 relative z-20">
              <span className="text-[#003366] leading-none text-[10px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
              <span className="text-black font-normal text-[7px] leading-none ml-[10px]">min</span>
            </div>
            <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
              <span className="text-[#003366] font-bold leading-none text-[10px] bg-white px-[2px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
            </div>
          </div>
          <div className="relative flex items-center justify-start h-full w-full">
            <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
              <span className="text-[#003366] font-bold leading-none text-[10px] bg-white px-[2px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
              <span className="text-black font-normal text-[7px] leading-none bg-white px-[2px]">nominal</span>
            </div>
          </div>
          <div className="relative flex items-center justify-center h-full w-full">
            <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center w-[40px] h-full z-10">
              <span className="text-black font-normal text-[10px] leading-none mb-[1px] mt-[1px]">{limits?.linkBom?.toFixed(1) ?? ''}</span>
              <span className="text-[#555] font-normal text-[6.5px] leading-none">LINK BOM</span>
            </div>
            <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
              <span className="text-black font-normal leading-none text-[10px] bg-white px-[2px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
            </div>
          </div>
          <div className="relative flex items-center justify-start h-full w-full">
            <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
              <span className="text-black font-normal leading-none text-[10px] bg-white px-[2px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
              <span className="text-black font-bold text-[7px] leading-none bg-white px-[2px] mt-[1px]">max</span>
            </div>
          </div>
          <div className="relative flex items-center justify-end h-full w-full pr-1">
            <div className="flex flex-col items-end font-normal relative z-20">
              <span className="text-black leading-none text-[10px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-end px-1 pb-[1px] text-[8.5px] text-black mt-1">
          <span className="w-[120px]">Vol : {volText}</span>
          <span className="w-[80px] text-center">{pctText}</span>
          <span className="flex-1 text-center">{midText}</span>
          <span className="w-[120px] text-right">stat error : {statError}</span>
        </div>
      </div>
    </div>
  );
};

const renderLipEyeVolumeBlock = (headerText: string, limits: any) => {
  if (!limits) return null;
  return (
    <div className="flex flex-col border border-black w-full mb-1">
      <div className="bg-[#4a2311] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">
        {headerText}
      </div>
      <div className="grid grid-cols-5 text-center text-[8.5px] font-bold border-b border-black h-[14px] items-center">
        <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black h-full">STOP</div>
        <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
        <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
        <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
        <div className="bg-[#C00000] text-white flex items-center justify-center h-full">STOP</div>
      </div>
      <div className="grid grid-cols-5 text-center bg-[#EAEFE3] h-[28px] relative items-center">
          <div className="relative flex items-center justify-start h-full w-full">
            <div className="flex flex-col items-start font-bold ml-1 relative z-20">
              <span className="text-[#003366] leading-none text-[10px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
              <span className="text-black font-normal text-[7px] leading-none ml-[10px]">min</span>
            </div>
            <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
              <span className="text-[#003366] font-bold leading-none text-[10px] bg-white px-[2px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
            </div>
          </div>
          <div className="relative flex items-center justify-start h-full w-full">
            <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
              <span className="text-[#003366] font-bold leading-none text-[10px] bg-white px-[2px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
              <span className="text-black font-normal text-[7px] leading-none bg-white px-[2px]">nominal</span>
            </div>
          </div>
          <div className="relative flex items-center justify-center h-full w-full">
            <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center w-[40px] h-full z-10">
              <span className="text-black font-normal text-[10px] leading-none mb-[1px] mt-[1px]">{limits?.linkBom?.toFixed(1) ?? ''}</span>
              <span className="text-[#555] font-normal text-[6.5px] leading-none">LINK BOM</span>
            </div>
            <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
              <span className="text-black font-normal leading-none text-[10px] bg-white px-[2px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
            </div>
          </div>
          <div className="relative flex items-center justify-start h-full w-full">
            <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
              <span className="text-black font-normal leading-none text-[10px] bg-white px-[2px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
              <span className="text-black font-bold text-[7px] leading-none bg-white px-[2px] mt-[1px]">max</span>
            </div>
          </div>
          <div className="relative flex items-center justify-end h-full w-full pr-1">
            <div className="flex flex-col items-end font-normal relative z-20">
              <span className="text-black leading-none text-[10px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
            </div>
          </div>
      </div>
    </div>
  );
};

"""
content = content[:biphase_render_idx] + lip_eye_functions + content[biphase_render_idx:]

# 4. Now handle the actual rendering logic
# Wait, currently the rendering says: (qcResult && (qcResult.type === 'Biphase' || qcResult.type === 'LipEye'))
# And inside it returns:
# <>
#   <div className="bg-[#4C2322] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">A.4. Berat</div>
#   ...
#   {renderBiphaseRow(...)}
# </>
# We need to fork the rendering block inside that!

# The easiest way is to find where Biphase renders.
# It starts around: <div className="bg-[#4C2322] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">A.4. Berat</div>
# Let's use python regex to replace the inner content.
import re

old_biphase_render_code = """return (
                              <>
                                <div className="bg-[#4C2322] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">A.4. Berat</div>
                                {renderBiphaseRow("OIL", qcResult.phase1, "Phase Oil : 50%", "Density Oil :", (d1 > 0 ? d1.toFixed(3) : "1.000"), false)}
                                {renderBiphaseRow("AQUEOUS", qcResult.phase2, "Phase Aqueous : 50%", "Density Water :", (d2 > 0 ? d2.toFixed(3) : "1.000"), false)}
                                {renderBiphaseRow("BiPhase", qcResult.total, "BiPhase : 100%", "Density BiPhase :", (denTot > 0 ? denTot.toFixed(3) : "1.000"), "Berat: (gram)")}

                                <div className="bg-[#4C2322] text-white font-bold px-2 py-[2px] text-[11px] border-b border-t border-black">A.5. Volume</div>
                                {renderBiphaseVolRow("OIL", qcResult.phase1, "Phase Oil", "50%", "Volume : (ml)")}
                                {renderBiphaseVolRow("AQUEOUS", qcResult.phase2, "Phase Aqueous", "50%", "Volume : (ml)")}
                                {renderBiphaseVolRow("BiPhase", qcResult.total, "BiPhase", "100%", "Volume : (ml)")}
                              </>
                            );"""

new_rendering_code = """if (qcResult.type === 'LipEye') {
                              const d1 = parseFloat(qcFillingData.denPhase1) || 0;
                              const d2 = parseFloat(qcFillingData.denPhase2) || 0;
                              const denTot = 1.0; 
                              return (
                                <>
                                  {renderLipEyeBeratBlock("A.4. Berat (OILY)", "Berat filling oily phase", "4.500", d1 > 0 ? d1.toFixed(3) : "1.000", qcResult.phase1, "200", "30%", "100", "0.262")}
                                  {renderLipEyeBeratBlock("A.4.1 Berat (AQUA)", "Berat filling aqua phase", "4.500", d2 > 0 ? d2.toFixed(3) : "1.000", qcResult.phase2, "200", "70%", "100", "0.262")}
                                  {renderLipEyeBeratBlock("A.5. Berat Total", "Berat filling Total", "0.045", denTot > 0 ? denTot.toFixed(3) : "1.000", qcResult.total, "200", "100%", "200.0", "0.213")}
                                  
                                  {renderLipEyeVolumeBlock("A.6. Volume OILY (ML) >> REFERENSI di FLEXNET", qcResult.phase1)}
                                  {renderLipEyeVolumeBlock("A.6.1 Volume AQUA (ML) >> REFERENSI di FLEXNET", qcResult.phase2)}
                                  {renderLipEyeVolumeBlock("A.7. Volume Total (ML) >> REFERENSI di FLEXNET", qcResult.total)}
                                </>
                              );
                            }

                            return (
                              <>
                                <div className="bg-[#4C2322] text-white font-bold px-2 py-[2px] text-[11px] border-b border-black">A.4. Berat</div>
                                {renderBiphaseRow("OIL", qcResult.phase1, "Phase Oil : 50%", "Density Oil :", (d1 > 0 ? d1.toFixed(3) : "1.000"), false)}
                                {renderBiphaseRow("AQUEOUS", qcResult.phase2, "Phase Aqueous : 50%", "Density Water :", (d2 > 0 ? d2.toFixed(3) : "1.000"), false)}
                                {renderBiphaseRow("BiPhase", qcResult.total, "BiPhase : 100%", "Density BiPhase :", (denTot > 0 ? denTot.toFixed(3) : "1.000"), "Berat: (gram)")}

                                <div className="bg-[#4C2322] text-white font-bold px-2 py-[2px] text-[11px] border-b border-t border-black">A.5. Volume</div>
                                {renderBiphaseVolRow("OIL", qcResult.phase1, "Phase Oil", "50%", "Volume : (ml)")}
                                {renderBiphaseVolRow("AQUEOUS", qcResult.phase2, "Phase Aqueous", "50%", "Volume : (ml)")}
                                {renderBiphaseVolRow("BiPhase", qcResult.total, "BiPhase", "100%", "Volume : (ml)")}
                              </>
                            );"""
content = content.replace(old_biphase_render_code, new_rendering_code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied Lip Eye logic successfully!")
