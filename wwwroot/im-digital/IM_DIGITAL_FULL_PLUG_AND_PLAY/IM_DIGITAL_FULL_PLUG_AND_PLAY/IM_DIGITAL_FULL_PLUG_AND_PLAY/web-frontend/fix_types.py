file_path = r"c:\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\IM DIGITAL NEW REV 1.8.8\web-frontend\src\app\dashboard\divisions\[division]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Fix limitsGram and limitsMl in calculateSachetLimits
sachet_old = """    const limitsMl = {
      stopMin: mlStopMin,
      adjMin: mlAdjMin,
      runMin: mlRunMin,
      nominal: mlNominal,
      runMax: mlRunMax,
      adjMax: mlAdjMax,
      stopMax: mlStopMax,
      syaratLegal: pct
    };

    const limitsGram = {
      stopMin: doubleRound(mlStopMin * density),
      adjMin: doubleRound(mlAdjMin * density),
      runMin: doubleRound(mlRunMin * density),
      nominal: doubleRound(mlNominal * density),
      runMax: doubleRound(mlRunMax * density),
      adjMax: doubleRound(mlAdjMax * density),
      stopMax: doubleRound(mlStopMax * density),
      syaratLegal: pct
    };"""

sachet_new = """    const limitsMl: any = {
      stopMin: mlStopMin,
      adjMin: mlAdjMin,
      runMin: mlRunMin,
      nominal: mlNominal,
      linkBom: mlNominal,
      runMax: mlRunMax,
      adjMax: mlAdjMax,
      stopMax: mlStopMax,
      syaratLegal: pct
    };

    const limitsGram: any = {
      stopMin: doubleRound(mlStopMin * density),
      adjMin: doubleRound(mlAdjMin * density),
      runMin: doubleRound(mlRunMin * density),
      nominal: doubleRound(mlNominal * density),
      linkBom: doubleRound(mlNominal * density),
      runMax: doubleRound(mlRunMax * density),
      adjMax: doubleRound(mlAdjMax * density),
      stopMax: doubleRound(mlStopMax * density),
      syaratLegal: pct
    };"""

code = code.replace(sachet_old, sachet_new, 1)

# 2. Fix limitsGram and limitsMl in calculateNormalLimits
norm_old = """    const limitsGram = {
      stopMin: excelRound(exactGram.stopMin, 1),
      adjMin: excelRound(exactGram.adjMin, 1),
      nominal: doubleRound(n_g),
      linkBom: linkBomGram,
      runMax: excelRound(exactGram.runMax, 1),
      adjMax: excelRound(exactGram.adjMax, 1),
      stopMax: excelRound(exactGram.stopMax, 1),
      syaratLegal: pct
    };

    const limitsMl = {
      stopMin: roundedDensity === 0 ? 0 : excelRound(exactGram.stopMin / roundedDensity, 1),
      adjMin: roundedDensity === 0 ? 0 : excelRound(exactGram.adjMin / roundedDensity, 1),
      nominal: excelRound(n_ml, 1),
      linkBom: linkBomMl,
      runMax: roundedDensity === 0 ? 0 : excelRound(exactGram.runMax / roundedDensity, 1),
      adjMax: roundedDensity === 0 ? 0 : excelRound(exactGram.adjMax / roundedDensity, 1),
      stopMax: roundedDensity === 0 ? 0 : excelRound(exactGram.stopMax / roundedDensity, 1),
      syaratLegal: pct
    };"""

norm_new = """    const limitsGram: any = {
      stopMin: excelRound(exactGram.stopMin, 1),
      adjMin: excelRound(exactGram.adjMin, 1),
      runMin: null,
      nominal: doubleRound(n_g),
      linkBom: linkBomGram,
      runMax: excelRound(exactGram.runMax, 1),
      adjMax: excelRound(exactGram.adjMax, 1),
      stopMax: excelRound(exactGram.stopMax, 1),
      syaratLegal: pct
    };

    const limitsMl: any = {
      stopMin: roundedDensity === 0 ? 0 : excelRound(exactGram.stopMin / roundedDensity, 1),
      adjMin: roundedDensity === 0 ? 0 : excelRound(exactGram.adjMin / roundedDensity, 1),
      runMin: null,
      nominal: excelRound(n_ml, 1),
      linkBom: linkBomMl,
      runMax: roundedDensity === 0 ? 0 : excelRound(exactGram.runMax / roundedDensity, 1),
      adjMax: roundedDensity === 0 ? 0 : excelRound(exactGram.adjMax / roundedDensity, 1),
      stopMax: roundedDensity === 0 ? 0 : excelRound(exactGram.stopMax / roundedDensity, 1),
      syaratLegal: pct
    };"""

code = code.replace(norm_old, norm_new, 1)

# 3. Fix renderBiphaseRow signature
biphase_old = "const renderBiphaseRow = (title: string, limits: any, pctStr: string, title2: string, density: string, isTotal: boolean) => {"
biphase_new = "const renderBiphaseRow = (title: string, limits: any, pctStr: string, title2: string, density: string, isTotal?: any) => {"

code = code.replace(biphase_old, biphase_new, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("TypeScript typing fixes applied successfully!")
