import sys

path = r'c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find("const calculateNormalLimits = (volume: number, density: number) => {")
end_idx = content.find("return { limitsGram, limitsMl, type: 'Normal' };", start_idx) + len("return { limitsGram, limitsMl, type: 'Normal' };\n  };\n")

new_func = """  const calculateNormalLimits = (volume: number, density: number) => {
    let pct = 0.045;
    if (volume <= 50) pct = 0.09;
    else if (volume <= 100) pct = 4.5;
    else if (volume <= 200) pct = 0.045;
    else if (volume <= 500) pct = 0.03;

    const s_ml = getStatisticalError(volume);
    const n_g = volume * density;
    const n_ml = volume;

    let l_ml = 15.0;
    let l_g = 15.0; 
    
    // Exact Excel Logic:
    if (volume <= 50) { l_ml = volume * 0.09; l_g = n_g * 0.09; }
    else if (volume <= 100) { l_ml = 4.5; l_g = 4.5; }
    else if (volume <= 200) { l_ml = volume * 0.045; l_g = n_g * 0.045; }
    else if (volume <= 300) { l_ml = 9.0; l_g = 9.0; }
    else if (volume < 500) { l_ml = volume * 0.03; l_g = n_g * 0.03; } 
    // Notice: < 500 instead of <= 500, so exactly 500 falls to the 15.0 default!

    const link_bom_ml_exact = n_ml + s_ml;
    const link_bom_g_exact = link_bom_ml_exact * density;

    const linkBomGram = excelRound(link_bom_g_exact, 1);
    const roundedDensity = Math.round(density * 1000) / 1000;
    const linkBomMl = roundedDensity === 0 ? 0 : excelRound(linkBomGram / roundedDensity, 1);

    // Calculate EXACT unrounded gram limits for Volume conversion
    const exactGram = {
      stopMin: n_g - l_g,
      adjMin: n_g - (2.0 / 3.0 * l_g),
      runMax: n_g + (1.0 / 3.0 * l_g),
      adjMax: n_g + (2.0 / 3.0 * l_g),
      stopMax: n_g + l_g
    };

    const limitsGram = {
      stopMin: excelRound(exactGram.stopMin, 1),
      adjMin: excelRound(exactGram.adjMin, 1),
      runMin: null,
      nominal: excelRound(n_g, 1),
      linkBom: linkBomGram,
      runMax: excelRound(exactGram.runMax, 1),
      adjMax: excelRound(exactGram.adjMax, 1),
      stopMax: excelRound(exactGram.stopMax, 1),
      syaratLegal: pct
    };

    const limitsMl = {
      stopMin: roundedDensity === 0 ? 0 : excelRound(exactGram.stopMin / density, 1),
      adjMin: roundedDensity === 0 ? 0 : excelRound(exactGram.adjMin / density, 1),
      runMin: null,
      nominal: roundedDensity === 0 ? 0 : excelRound(n_g / density, 1),
      linkBom: linkBomMl,
      runMax: roundedDensity === 0 ? 0 : excelRound(exactGram.runMax / density, 1),
      adjMax: roundedDensity === 0 ? 0 : excelRound(exactGram.adjMax / density, 1),
      stopMax: roundedDensity === 0 ? 0 : excelRound(exactGram.stopMax / density, 1),
      syaratLegal: pct
    };

    return { limitsGram, limitsMl, type: 'Normal' };
  };
"""

content = content[:start_idx] + new_func + content[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Grand unified theory implemented!")
