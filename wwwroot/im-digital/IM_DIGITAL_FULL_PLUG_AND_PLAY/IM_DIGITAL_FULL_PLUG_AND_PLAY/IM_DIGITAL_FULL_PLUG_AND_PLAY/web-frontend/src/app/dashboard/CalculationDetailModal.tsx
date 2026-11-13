"use client";
import React, { useState } from "react";
import { X, Calculator, Info, CheckCircle2, Layers, HelpCircle } from "lucide-react";

interface CalculationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  qcFillingData?: any;
  qcResult?: any;
  productName?: string;
  imCode?: string;
}

export default function CalculationDetailModal({
  isOpen,
  onClose,
  qcFillingData,
  qcResult,
  productName,
  imCode
}: CalculationDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"current" | "formulas" | "statTable">("current");
  const [duoTarget, setDuoTarget] = useState<"p1" | "p2" | "total">("p1");

  if (!isOpen) return null;

  // Safe helper to extract property regardless of camelCase / PascalCase
  const getProp = (obj: any, ...keys: string[]): any => {
    if (!obj) return undefined;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
  };

  const toNum = (val: any, fallback = 0): number => {
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
  };

  // Helper statistical error
  const getStatisticalError = (volume: number): number => {
    const statTable = [
      { thresh: 0.0, err: 0.379 },
      { thresh: 50.0, err: 0.379 },
      { thresh: 60.0, err: 0.344 },
      { thresh: 70.0, err: 0.317 },
      { thresh: 80.0, err: 0.295 },
      { thresh: 90.0, err: 0.277 },
      { thresh: 100.0, err: 0.262 },
      { thresh: 110.0, err: 0.249 },
      { thresh: 120.0, err: 0.238 },
      { thresh: 130.0, err: 0.229 },
      { thresh: 140.0, err: 0.220 },
      { thresh: 150.0, err: 0.213 }
    ];
    let res = 0.379;
    for (const item of statTable) {
      if (volume >= item.thresh) res = item.err;
      else break;
    }
    return res;
  };

  const getLegalTolerance = (volume: number, nominalG: number): { label: string; lG: number; isFlat: boolean } => {
    if (volume <= 50) return { label: "9% dari Nominal", lG: nominalG * 0.09, isFlat: false };
    if (volume <= 100) return { label: "4.5 g (Tetap / Flat)", lG: 4.5, isFlat: true };
    if (volume <= 200) return { label: "4.5% dari Nominal", lG: nominalG * 0.045, isFlat: false };
    if (volume <= 300) return { label: "9.0 g (Tetap / Flat)", lG: 9.0, isFlat: true };
    if (volume < 500) return { label: "3.0% dari Nominal", lG: nominalG * 0.03, isFlat: false };
    if (volume < 1000) return { label: "15.0 g (Tetap / Flat)", lG: 15.0, isFlat: true };
    return { label: "1.5% dari Nominal", lG: nominalG * 0.015, isFlat: false };
  };

  // On-the-fly single phase calculator for guaranteed data display
  const computeSinglePhase = (vol: number, den: number) => {
    const nG = vol * den;
    const tol = getLegalTolerance(vol, nG);
    const sMl = getStatisticalError(vol);
    const lG = tol.lG;
    const linkBomExact = (vol + sMl) * den;

    return {
      nominal: nG,
      lG: lG,
      sMl: sMl,
      label: tol.label,
      stopMin: nG - lG,
      adjMin: nG - (2.0 / 3.0) * lG,
      runMax: nG + (1.0 / 3.0) * lG,
      adjMax: nG + (2.0 / 3.0) * lG,
      stopMax: nG + lG,
      linkBom: linkBomExact
    };
  };

  const templateType = getProp(qcResult, "type", "Type") || getProp(qcFillingData, "templateIm", "TemplateIm") || "Normal";
  const isDuo = templateType === "Duo" || !!(getProp(qcResult, "phase1", "Phase1"));

  // Resolve Phase 1 values
  const rawP1 = getProp(qcResult, "phase1", "Phase1");
  const p1Limits = getProp(rawP1, "limitsGram", "LimitsGram");
  const rawV1 = toNum(getProp(qcFillingData, "volPhase1", "VolPhase1", "vol_phase1") ?? getProp(qcResult, "volPhase1", "VolPhase1"), 0);
  const rawD1 = toNum(getProp(qcFillingData, "denPhase1", "DenPhase1", "density_phase1") ?? getProp(qcResult, "denPhase1", "DenPhase1"), 0);
  const v1 = rawV1 > 0 ? rawV1 : 75;
  const d1 = rawD1 > 0 ? rawD1 : 1.03;
  const calcP1 = computeSinglePhase(v1, d1);

  const p1StopMin = toNum(getProp(p1Limits, "stopMin", "StopMin"), calcP1.stopMin);
  const p1AdjMin = toNum(getProp(p1Limits, "adjMin", "AdjMin"), calcP1.adjMin);
  const p1Nominal = toNum(getProp(p1Limits, "nominal", "Nominal"), calcP1.nominal);
  const p1LinkBom = toNum(getProp(p1Limits, "linkBom", "LinkBom"), calcP1.linkBom);
  const p1RunMax = toNum(getProp(p1Limits, "runMax", "RunMax"), calcP1.runMax);
  const p1AdjMax = toNum(getProp(p1Limits, "adjMax", "AdjMax"), calcP1.adjMax);
  const p1StopMax = toNum(getProp(p1Limits, "stopMax", "StopMax"), calcP1.stopMax);

  // Resolve Phase 2 values
  const rawP2 = getProp(qcResult, "phase2", "Phase2");
  const p2Limits = getProp(rawP2, "limitsGram", "LimitsGram");
  const rawV2 = toNum(getProp(qcFillingData, "volPhase2", "VolPhase2", "vol_phase2") ?? getProp(qcResult, "volPhase2", "VolPhase2"), 0);
  const rawD2 = toNum(getProp(qcFillingData, "denPhase2", "DenPhase2", "density_phase2") ?? getProp(qcResult, "denPhase2", "DenPhase2"), 0);
  const v2 = rawV2 > 0 ? rawV2 : 75;
  const d2 = rawD2 > 0 ? rawD2 : 0.999;
  const calcP2 = computeSinglePhase(v2, d2);

  const p2StopMin = toNum(getProp(p2Limits, "stopMin", "StopMin"), calcP2.stopMin);
  const p2AdjMin = toNum(getProp(p2Limits, "adjMin", "AdjMin"), calcP2.adjMin);
  const p2Nominal = toNum(getProp(p2Limits, "nominal", "Nominal"), calcP2.nominal);
  const p2LinkBom = toNum(getProp(p2Limits, "linkBom", "LinkBom"), calcP2.linkBom);
  const p2RunMax = toNum(getProp(p2Limits, "runMax", "RunMax"), calcP2.runMax);
  const p2AdjMax = toNum(getProp(p2Limits, "adjMax", "AdjMax"), calcP2.adjMax);
  const p2StopMax = toNum(getProp(p2Limits, "stopMax", "StopMax"), calcP2.stopMax);

  // Total
  const rawTot = getProp(qcResult, "total", "Total");
  const totLimits = getProp(rawTot, "limitsGram", "LimitsGram");
  const totStopMin = toNum(getProp(totLimits, "stopMin", "StopMin"), p1StopMin + p2StopMin);
  const totAdjMin = toNum(getProp(totLimits, "adjMin", "AdjMin"), p1AdjMin + p2AdjMin);
  const totNominal = toNum(getProp(totLimits, "nominal", "Nominal"), p1Nominal + p2Nominal);
  const totLinkBom = toNum(getProp(totLimits, "linkBom", "LinkBom"), p1LinkBom + p2LinkBom);
  const totRunMax = toNum(getProp(totLimits, "runMax", "RunMax"), p1RunMax + p2RunMax);
  const totAdjMax = toNum(getProp(totLimits, "adjMax", "AdjMax"), p1AdjMax + p2AdjMax);
  const totStopMax = toNum(getProp(totLimits, "stopMax", "StopMax"), p1StopMax + p2StopMax);

  // Normal Single Phase
  const rawVSingle = toNum(getProp(qcFillingData, "volumeFg", "VolumeFg", "volume", "Volume", "vol_fg") ?? getProp(qcResult, "volume", "Volume", "volumeFg"), 0);
  const rawDSample = toNum(getProp(qcFillingData, "density", "Density", "densitas", "Densitas") ?? getProp(qcResult, "density", "Density"), 0);
  const vSingle = rawVSingle > 0 ? rawVSingle : 100;
  const dSample = rawDSample > 0 ? rawDSample : 1.0;
  const rawSingleLimits = getProp(qcResult, "limitsGram", "LimitsGram");
  const calcSingle = computeSinglePhase(vSingle, dSample);
  const sStopMin = toNum(getProp(rawSingleLimits, "stopMin", "StopMin"), calcSingle.stopMin);
  const sAdjMin = toNum(getProp(rawSingleLimits, "adjMin", "AdjMin"), calcSingle.adjMin);
  const sNominal = toNum(getProp(rawSingleLimits, "nominal", "Nominal"), calcSingle.nominal);
  const sLinkBom = toNum(getProp(rawSingleLimits, "linkBom", "LinkBom"), calcSingle.linkBom);
  const sRunMax = toNum(getProp(rawSingleLimits, "runMax", "RunMax"), calcSingle.runMax);
  const sAdjMax = toNum(getProp(rawSingleLimits, "adjMax", "AdjMax"), calcSingle.adjMax);
  const sStopMax = toNum(getProp(rawSingleLimits, "stopMax", "StopMax"), calcSingle.stopMax);

  // Dynamic active volume for highlighting in Tab 2 and Tab 3
  const activeVolumeForTable = isDuo
    ? (duoTarget === "p1" ? (rawV1 > 0 ? rawV1 : v1) : duoTarget === "p2" ? (rawV2 > 0 ? rawV2 : v2) : ((rawV1 > 0 || rawV2 > 0) ? (rawV1 + rawV2) : (v1 + v2)))
    : (rawVSingle > 0 ? rawVSingle : vSingle);

  const legalTolTable = [
    { range: "0 s/d 50 ml", tol: "9% dari Nominal", type: "Persentase Dinamis", match: (v: number) => v > 0 && v <= 50 },
    { range: "51 s/d 100 ml", tol: "4.5 g (Tetap)", type: "Nilai Flat Baku", match: (v: number) => v > 50 && v <= 100 },
    { range: "101 s/d 200 ml", tol: "4.5% dari Nominal", type: "Persentase Dinamis", match: (v: number) => v > 100 && v <= 200 },
    { range: "201 s/d 300 ml", tol: "9.0 g (Tetap)", type: "Nilai Flat Baku", match: (v: number) => v > 200 && v <= 300 },
    { range: "301 s/d 500 ml", tol: "3.0% dari Nominal", type: "Persentase Dinamis", match: (v: number) => v > 300 && v <= 500 },
    { range: "501 s/d 999 ml", tol: "15.0 g (Tetap)", type: "Nilai Flat Baku", match: (v: number) => v > 500 && v < 1000 },
    { range: "≥ 1000 ml", tol: "1.5% dari Nominal", type: "Persentase Dinamis", match: (v: number) => v >= 1000 },
  ];

  const statErrorTable = [
    { range: "< 50 ml", err: "0.379 ml", desc: "Kompensasi sachet / travel size", match: (v: number) => v > 0 && v < 50 },
    { range: "50 - 59 ml", err: "0.379 ml", desc: "Kompensasi botol kecil", match: (v: number) => v >= 50 && v < 60 },
    { range: "60 - 69 ml", err: "0.344 ml", desc: "Kompensasi standar medium", match: (v: number) => v >= 60 && v < 70 },
    { range: "70 - 79 ml", err: "0.317 ml", desc: "Standar toleransi kategori volume 70-79 ml", match: (v: number) => v >= 70 && v < 80 },
    { range: "80 - 89 ml", err: "0.295 ml", desc: "Standar kemasan 80 ml", match: (v: number) => v >= 80 && v < 90 },
    { range: "90 - 99 ml", err: "0.277 ml", desc: "Standar kemasan 90 ml", match: (v: number) => v >= 90 && v < 100 },
    { range: "100 - 109 ml", err: "0.262 ml", desc: "Standar botol 100 ml", match: (v: number) => v >= 100 && v < 110 },
    { range: "110 - 119 ml", err: "0.249 ml", desc: "Standar kemasan 110 ml", match: (v: number) => v >= 110 && v < 120 },
    { range: "120 - 129 ml", err: "0.238 ml", desc: "Standar botol 120 ml", match: (v: number) => v >= 120 && v < 130 },
    { range: "130 - 139 ml", err: "0.229 ml", desc: "Standar kemasan 130 ml", match: (v: number) => v >= 130 && v < 140 },
    { range: "140 - 149 ml", err: "0.220 ml", desc: "Standar botol 140 ml", match: (v: number) => v >= 140 && v < 150 },
    { range: "≥ 150 ml", err: "0.213 ml", desc: "Standar botol besar", match: (v: number) => v >= 150 },
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(5px)"
      }}
      className="font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl flex flex-col w-[920px] max-w-[96vw] max-h-[92vh] overflow-hidden border border-[#CBD5E1]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header - Unified Corporate Navy Theme */}
        <div className="bg-[#004578] text-white px-6 py-3.5 flex items-center justify-between shrink-0 shadow-sm border-b border-[#003861]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-[15px] font-bold text-white tracking-wide">
                  Rincian Rumus &amp; Metodologi Perhitungan A.4
                </h2>
                <span className="bg-[#FFB300] text-[#1F2937] font-black text-[9.5px] px-2 py-0.5 rounded uppercase tracking-wider">
                  QC Filling
                </span>
              </div>
              <p className="text-[11px] text-[#E0E7FF] opacity-90 mt-0.5">
                Standar Toleransi Metrologi Legal, Kompensasi Statistical Error, dan Pembagian 5 Zona Mesin Timbangan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-[14px] cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs - Unified Corporate Navy Tone */}
        <div className="bg-[#FAF9F8] border-b border-[#E2E8F0] px-6 flex space-x-6 text-[12px] font-semibold shrink-0">
          <button
            onClick={() => setActiveTab("current")}
            className={`py-2.5 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "current"
                ? "border-[#004578] text-[#004578] font-bold"
                : "border-transparent text-[#64748B] hover:text-[#004578]"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kalkulasi Dokumen Aktif</span>
          </button>
          <button
            onClick={() => setActiveTab("formulas")}
            className={`py-2.5 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "formulas"
                ? "border-[#004578] text-[#004578] font-bold"
                : "border-transparent text-[#64748B] hover:text-[#004578]"
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Panduan Rumus 5 Zona &amp; Metrologi Legal</span>
          </button>
          <button
            onClick={() => setActiveTab("statTable")}
            className={`py-2.5 flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "statTable"
                ? "border-[#004578] text-[#004578] font-bold"
                : "border-transparent text-[#64748B] hover:text-[#004578]"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Tabel Statistical Error (Link BOM)</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-[#1E293B] text-[12px] bg-[#F8FAFC]">
          {/* TAB 1: KALKULASI DOKUMEN AKTIF */}
          {activeTab === "current" && (
            <div className="space-y-4">
              {/* Product Context Banner */}
              <div className="bg-white p-3.5 rounded border border-[#CBD5E1] shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] font-bold uppercase text-[#64748B] tracking-wider">
                    Dokumen Sedang Ditampilkan:
                  </span>
                  <div className="text-[13.5px] font-bold text-[#004578] mt-0.5">
                    {productName || "Instruksi Mutu Digital"} {imCode && imCode.trim().toLowerCase() !== (productName || "").trim().toLowerCase() ? `(${imCode})` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10.5px] font-bold uppercase text-[#64748B] tracking-wider">
                    Tipe Template:
                  </span>
                  <div className="inline-block ml-2 px-2.5 py-0.5 bg-[#EFF6FC] text-[#004578] font-bold rounded text-[11px] border border-[#C7D2FE]">
                    {templateType}
                  </div>
                </div>
              </div>

              {/* DUO / MULTI PHASE VIEW - SATU NADA */}
              {isDuo ? (
                <div className="space-y-4">
                  {/* Phase 1 Card */}
                  <div className="bg-white rounded border border-[#CBD5E1] shadow-xs overflow-hidden">
                    <div className="bg-[#004578] text-white px-4 py-2 flex justify-between items-center text-[11.5px] font-bold">
                      <div className="flex items-center space-x-2">
                        <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[9.5px] font-extrabold">PHASE 1</span>
                        <span>{productName ? `${productName} (PHASE 1)` : "PHASE 1 (UTAMA)"}</span>
                      </div>
                      <span className="text-[11px] font-normal text-white/90">
                        Volume: <b>{v1} ml</b> &nbsp;|&nbsp; Density: <b>{d1.toFixed(3)}</b>
                      </span>
                    </div>
                    <div className="p-3.5 space-y-3">
                      <div className="grid grid-cols-4 gap-2 text-[11px] bg-[#FAF9F8] p-2.5 rounded border border-[#EDEBE9]">
                        <div>
                          <span className="text-[#64748B] block text-[10px] font-semibold">1. Nominal (g):</span>
                          <span className="text-[#0F172A]">{v1} × {d1.toFixed(3)} = </span>
                          <span className="font-bold text-[#004578]">{calcP1.nominal.toFixed(2)} → {p1Nominal.toFixed(1)} g</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[10px] font-semibold">2. Legal Tolerance (L):</span>
                          <span className="text-[#0F172A]">{calcP1.label}</span>
                          <span className="font-bold text-[#004578] block">L = {calcP1.lG.toFixed(2)} g</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[10px] font-semibold">3. Stat Error (Sml):</span>
                          <span className="text-[#0F172A]">Vol {v1} ml → {calcP1.sMl} ml</span>
                          <span className="font-bold text-[#004578] block">S = {calcP1.sMl} ml</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[10px] font-semibold">4. Link BOM (g):</span>
                          <span className="text-[#0F172A]">({v1} + {calcP1.sMl}) × {d1.toFixed(3)}</span>
                          <span className="font-bold text-[#B45309] block">= {p1LinkBom.toFixed(1)} g</span>
                        </div>
                      </div>

                      {/* 5 Colors Machine Limits */}
                      <div>
                        <div className="text-[10px] font-bold text-[#475569] mb-1 flex items-center justify-between">
                          <span>5 Batas Zona Toleransi Mesin:</span>
                          <span className="text-[9.5px] font-normal text-[#64748B]">Rumus: Nominal ± Fraksi L</span>
                        </div>
                        <div className="grid grid-cols-7 text-center rounded border border-[#CBD5E1] overflow-hidden text-[10.5px]">
                          <div className="bg-[#FEE2E2] p-2 border-r border-[#CBD5E1]">
                            <span className="block text-[8.5px] font-bold text-[#991B1B]">STOP MIN</span>
                            <span className="font-extrabold text-[#B91C1C] text-[12px]">{p1StopMin.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#7F1D1D] mt-0.5">N - L</span>
                          </div>
                          <div className="bg-[#FEF9C3] p-2 border-r border-[#CBD5E1]">
                            <span className="block text-[8.5px] font-bold text-[#854D0E]">ADJUST MIN</span>
                            <span className="font-extrabold text-[#A16207] text-[12px]">{p1AdjMin.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#713F12] mt-0.5">N - ⅔L</span>
                          </div>
                          <div className="bg-[#DCFCE7] p-2 border-r border-[#CBD5E1]">
                            <span className="block text-[8.5px] font-bold text-[#166534]">NOMINAL</span>
                            <span className="font-extrabold text-[#15803D] text-[12px]">{p1Nominal.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#14532D] mt-0.5">V × ρ</span>
                          </div>
                          <div className="bg-[#FEF08A] p-2 border-r border-[#CBD5E1] border-2 border-[#D97706]">
                            <span className="block text-[8.5px] font-black text-[#B45309]">LINK BOM</span>
                            <span className="font-extrabold text-[#B45309] text-[12px]">{p1LinkBom.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#78350F] mt-0.5">(V+S) × ρ</span>
                          </div>
                          <div className="bg-[#F0FDF4] p-2 border-r border-[#CBD5E1]">
                            <span className="block text-[8.5px] font-bold text-[#166534]">RUNNING MAX</span>
                            <span className="font-extrabold text-[#15803D] text-[12px]">{p1RunMax.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#14532D] mt-0.5">N + ⅓L</span>
                          </div>
                          <div className="bg-[#FEF9C3] p-2 border-r border-[#CBD5E1]">
                            <span className="block text-[8.5px] font-bold text-[#854D0E]">ADJUST MAX</span>
                            <span className="font-extrabold text-[#A16207] text-[12px]">{p1AdjMax.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#713F12] mt-0.5">N + ⅔L</span>
                          </div>
                          <div className="bg-[#FEE2E2] p-2">
                            <span className="block text-[8.5px] font-bold text-[#991B1B]">STOP MAX</span>
                            <span className="font-extrabold text-[#B91C1C] text-[12px]">{p1StopMax.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#7F1D1D] mt-0.5">N + L</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phase 2 Card - SATU NADA DENGAN PHASE 1 */}
                  <div className="bg-white rounded border border-[#CBD5E1] shadow-xs overflow-hidden">
                    <div className="bg-[#004578] text-white px-4 py-2 flex justify-between items-center text-[11.5px] font-bold">
                      <div className="flex items-center space-x-2">
                        <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[9.5px] font-extrabold">PHASE 2</span>
                        <span>{productName ? `${productName} (PHASE 2)` : "PHASE 2 (KEDUA)"}</span>
                      </div>
                      <span className="text-[11px] font-normal text-white/90">
                        Volume: <b>{v2} ml</b> &nbsp;|&nbsp; Density: <b>{d2.toFixed(3)}</b>
                      </span>
                    </div>
                    <div className="p-3.5 space-y-3">
                      <div className="grid grid-cols-4 gap-2 text-[11px] bg-[#FAF9F8] p-2.5 rounded border border-[#EDEBE9]">
                        <div>
                          <span className="text-[#64748B] block text-[10px] font-semibold">1. Nominal (g):</span>
                          <span className="text-[#0F172A]">{v2} × {d2.toFixed(3)} = </span>
                          <span className="font-bold text-[#004578]">{calcP2.nominal.toFixed(2)} → {p2Nominal.toFixed(1)} g</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[10px] font-semibold">2. Legal Tolerance (L):</span>
                          <span className="text-[#0F172A]">{calcP2.label}</span>
                          <span className="font-bold text-[#004578] block">L = {calcP2.lG.toFixed(2)} g</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[10px] font-semibold">3. Stat Error (Sml):</span>
                          <span className="text-[#0F172A]">Vol {v2} ml → {calcP2.sMl} ml</span>
                          <span className="font-bold text-[#004578] block">S = {calcP2.sMl} ml</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[10px] font-semibold">4. Link BOM (g):</span>
                          <span className="text-[#0F172A]">({v2} + {calcP2.sMl}) × {d2.toFixed(3)}</span>
                          <span className="font-bold text-[#B45309] block">= {p2LinkBom.toFixed(1)} g</span>
                        </div>
                      </div>

                      {/* 5 Colors Machine Limits */}
                      <div>
                        <div className="text-[10px] font-bold text-[#475569] mb-1 flex items-center justify-between">
                          <span>5 Batas Zona Toleransi Mesin:</span>
                          <span className="text-[9.5px] font-normal text-[#64748B]">Rumus: Nominal ± Fraksi L</span>
                        </div>
                        <div className="grid grid-cols-7 text-center rounded border border-[#CBD5E1] overflow-hidden text-[10.5px]">
                          <div className="bg-[#FEE2E2] p-2 border-r border-[#CBD5E1]">
                            <span className="block text-[8.5px] font-bold text-[#991B1B]">STOP MIN</span>
                            <span className="font-extrabold text-[#B91C1C] text-[12px]">{p2StopMin.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#7F1D1D] mt-0.5">N - L</span>
                          </div>
                          <div className="bg-[#FEF9C3] p-2 border-r border-[#CBD5E1]">
                            <span className="block text-[8.5px] font-bold text-[#854D0E]">ADJUST MIN</span>
                            <span className="font-extrabold text-[#A16207] text-[12px]">{p2AdjMin.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#713F12] mt-0.5">N - ⅔L</span>
                          </div>
                          <div className="bg-[#DCFCE7] p-2 border-r border-[#CBD5E1]">
                            <span className="block text-[8.5px] font-bold text-[#166534]">NOMINAL</span>
                            <span className="font-extrabold text-[#15803D] text-[12px]">{p2Nominal.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#14532D] mt-0.5">V × ρ</span>
                          </div>
                          <div className="bg-[#FEF08A] p-2 border-r border-[#CBD5E1] border-2 border-[#D97706]">
                            <span className="block text-[8.5px] font-black text-[#B45309]">LINK BOM</span>
                            <span className="font-extrabold text-[#B45309] text-[12px]">{p2LinkBom.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#78350F] mt-0.5">(V+S) × ρ</span>
                          </div>
                          <div className="bg-[#F0FDF4] p-2 border-r border-[#CBD5E1]">
                            <span className="block text-[8.5px] font-bold text-[#166534]">RUNNING MAX</span>
                            <span className="font-extrabold text-[#15803D] text-[12px]">{p2RunMax.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#14532D] mt-0.5">N + ⅓L</span>
                          </div>
                          <div className="bg-[#FEF9C3] p-2 border-r border-[#CBD5E1]">
                            <span className="block text-[8.5px] font-bold text-[#854D0E]">ADJUST MAX</span>
                            <span className="font-extrabold text-[#A16207] text-[12px]">{p2AdjMax.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#713F12] mt-0.5">N + ⅔L</span>
                          </div>
                          <div className="bg-[#FEE2E2] p-2">
                            <span className="block text-[8.5px] font-bold text-[#991B1B]">STOP MAX</span>
                            <span className="font-extrabold text-[#B91C1C] text-[12px]">{p2StopMax.toFixed(1)}</span>
                            <span className="block text-[7.5px] text-[#7F1D1D] mt-0.5">N + L</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TOTAL CARD - SATU NADA DENGAN HEADER & KARTU LAINNYA */}
                  <div className="bg-white rounded border-2 border-[#004578] shadow-sm overflow-hidden">
                    <div className="bg-[#004578] text-white px-4 py-2 flex justify-between items-center text-[11.5px] font-bold">
                      <div className="flex items-center space-x-2">
                        <span className="bg-[#FFB300] text-[#1F2937] px-1.5 py-0.5 rounded text-[9.5px] font-black">∑ TOTAL</span>
                        <span>BERAT TOTAL (PHASE 1 + PHASE 2)</span>
                      </div>
                      <span className="text-[10.5px] font-normal text-white/90">
                        Penjumlahan matematis masing-masing batas toleransi
                      </span>
                    </div>
                    <div className="p-3.5 space-y-2">
                      <div className="text-[10px] font-bold text-[#475569] flex items-center justify-between">
                        <span>Hasil Akumulasi 5 Zona Toleransi:</span>
                        <span className="text-[9.5px] font-normal text-[#64748B]">Phase 1 + Phase 2</span>
                      </div>
                      <div className="grid grid-cols-7 text-center rounded border border-[#CBD5E1] overflow-hidden text-[10.5px]">
                        <div className="bg-[#FEE2E2] p-2 border-r border-[#CBD5E1]">
                          <span className="block text-[8.5px] font-bold text-[#991B1B]">STOP MIN</span>
                          <span className="font-extrabold text-[#B91C1C] text-[12px]">{totStopMin.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#7F1D1D] mt-0.5">{p1StopMin.toFixed(1)} + {p2StopMin.toFixed(1)}</span>
                        </div>
                        <div className="bg-[#FEF9C3] p-2 border-r border-[#CBD5E1]">
                          <span className="block text-[8.5px] font-bold text-[#854D0E]">ADJUST MIN</span>
                          <span className="font-extrabold text-[#A16207] text-[12px]">{totAdjMin.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#713F12] mt-0.5">{p1AdjMin.toFixed(1)} + {p2AdjMin.toFixed(1)}</span>
                        </div>
                        <div className="bg-[#DCFCE7] p-2 border-r border-[#CBD5E1]">
                          <span className="block text-[8.5px] font-bold text-[#166534]">NOMINAL</span>
                          <span className="font-extrabold text-[#15803D] text-[12px]">{totNominal.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#14532D] mt-0.5">{p1Nominal.toFixed(1)} + {p2Nominal.toFixed(1)}</span>
                        </div>
                        <div className="bg-[#FEF08A] p-2 border-r border-[#CBD5E1] border-2 border-[#D97706]">
                          <span className="block text-[8.5px] font-black text-[#B45309]">LINK BOM</span>
                          <span className="font-extrabold text-[#B45309] text-[12px]">{totLinkBom.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#78350F] mt-0.5">{p1LinkBom.toFixed(1)} + {p2LinkBom.toFixed(1)}</span>
                        </div>
                        <div className="bg-[#F0FDF4] p-2 border-r border-[#CBD5E1]">
                          <span className="block text-[8.5px] font-bold text-[#166534]">RUNNING MAX</span>
                          <span className="font-extrabold text-[#15803D] text-[12px]">{totRunMax.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#14532D] mt-0.5">{p1RunMax.toFixed(1)} + {p2RunMax.toFixed(1)}</span>
                        </div>
                        <div className="bg-[#FEF9C3] p-2 border-r border-[#CBD5E1]">
                          <span className="block text-[8.5px] font-bold text-[#854D0E]">ADJUST MAX</span>
                          <span className="font-extrabold text-[#A16207] text-[12px]">{totAdjMax.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#713F12] mt-0.5">{p1AdjMax.toFixed(1)} + {p2AdjMax.toFixed(1)}</span>
                        </div>
                        <div className="bg-[#FEE2E2] p-2">
                          <span className="block text-[8.5px] font-bold text-[#991B1B]">STOP MAX</span>
                          <span className="font-extrabold text-[#B91C1C] text-[12px]">{totStopMax.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#7F1D1D] mt-0.5">{p1StopMax.toFixed(1)} + {p2StopMax.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* NORMAL SINGLE PHASE VIEW */
                <div className="bg-white rounded border border-[#CBD5E1] shadow-xs overflow-hidden">
                  <div className="bg-[#004578] text-white px-4 py-2 flex justify-between items-center text-[11.5px] font-bold">
                    <span>PERHITUNGAN BERAT NORMAL</span>
                    <span className="text-[11px] font-normal text-white/90">
                      Volume: <b>{vSingle} ml</b> &nbsp;|&nbsp; Density: <b>{dSample.toFixed(3)}</b>
                    </span>
                  </div>
                  <div className="p-3.5 space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-[11px] bg-[#FAF9F8] p-2.5 rounded border border-[#EDEBE9]">
                      <div>
                        <span className="text-[#64748B] block text-[10px] font-semibold">1. Nominal (g):</span>
                        <span className="text-[#0F172A]">{vSingle} × {dSample} = </span>
                        <span className="font-bold text-[#004578]">{calcSingle.nominal.toFixed(2)} → {sNominal.toFixed(1)} g</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block text-[10px] font-semibold">2. Legal Tolerance (L):</span>
                        <span className="text-[#0F172A]">{calcSingle.label}</span>
                        <span className="font-bold text-[#004578] block">L = {calcSingle.lG.toFixed(2)} g</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block text-[10px] font-semibold">3. Stat Error (Sml):</span>
                        <span className="text-[#0F172A]">Vol {vSingle} ml → {calcSingle.sMl} ml</span>
                        <span className="font-bold text-[#004578] block">S = {calcSingle.sMl} ml</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block text-[10px] font-semibold">4. Link BOM (g):</span>
                        <span className="text-[#0F172A]">({vSingle} + {calcSingle.sMl}) × {dSample}</span>
                        <span className="font-bold text-[#B45309] block">= {sLinkBom.toFixed(1)} g</span>
                      </div>
                    </div>

                    {/* 5 Colors Machine Limits */}
                    <div>
                      <div className="text-[10px] font-bold text-[#475569] mb-1 flex items-center justify-between">
                        <span>5 Batas Zona Toleransi Mesin:</span>
                        <span className="text-[9.5px] font-normal text-[#64748B]">Rumus: Nominal ± Fraksi L</span>
                      </div>
                      <div className="grid grid-cols-7 text-center rounded border border-[#CBD5E1] overflow-hidden text-[10.5px]">
                        <div className="bg-[#FEE2E2] p-2 border-r border-[#CBD5E1]">
                          <span className="block text-[8.5px] font-bold text-[#991B1B]">STOP MIN</span>
                          <span className="font-extrabold text-[#B91C1C] text-[12px]">{sStopMin.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#7F1D1D] mt-0.5">N - L</span>
                        </div>
                        <div className="bg-[#FEF9C3] p-2 border-r border-[#CBD5E1]">
                          <span className="block text-[8.5px] font-bold text-[#854D0E]">ADJUST MIN</span>
                          <span className="font-extrabold text-[#A16207] text-[12px]">{sAdjMin.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#713F12] mt-0.5">N - ⅔L</span>
                        </div>
                        <div className="bg-[#DCFCE7] p-2 border-r border-[#CBD5E1]">
                          <span className="block text-[8.5px] font-bold text-[#166534]">NOMINAL</span>
                          <span className="font-extrabold text-[#15803D] text-[12px]">{sNominal.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#14532D] mt-0.5">V × ρ</span>
                        </div>
                        <div className="bg-[#FEF08A] p-2 border-r border-[#CBD5E1] border-2 border-[#D97706]">
                          <span className="block text-[8.5px] font-black text-[#B45309]">LINK BOM</span>
                          <span className="font-extrabold text-[#B45309] text-[12px]">{sLinkBom.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#78350F] mt-0.5">(V+S) × ρ</span>
                        </div>
                        <div className="bg-[#F0FDF4] p-2 border-r border-[#CBD5E1]">
                          <span className="block text-[8.5px] font-bold text-[#166534]">RUNNING MAX</span>
                          <span className="font-extrabold text-[#15803D] text-[12px]">{sRunMax.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#14532D] mt-0.5">N + ⅓L</span>
                        </div>
                        <div className="bg-[#FEF9C3] p-2 border-r border-[#CBD5E1]">
                          <span className="block text-[8.5px] font-bold text-[#854D0E]">ADJUST MAX</span>
                          <span className="font-extrabold text-[#A16207] text-[12px]">{sAdjMax.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#713F12] mt-0.5">N + ⅔L</span>
                        </div>
                        <div className="bg-[#FEE2E2] p-2">
                          <span className="block text-[8.5px] font-bold text-[#991B1B]">STOP MAX</span>
                          <span className="font-extrabold text-[#B91C1C] text-[12px]">{sStopMax.toFixed(1)}</span>
                          <span className="block text-[7.5px] text-[#7F1D1D] mt-0.5">N + L</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PANDUAN RUMUS LENGKAP */}
          {activeTab === "formulas" && (
            <div className="space-y-4">
              {/* Box 1: Rumus Dasar */}
              <div className="bg-white p-4 rounded border border-[#CBD5E1] shadow-xs space-y-2">
                <div className="flex items-center space-x-2 text-[#004578] font-bold text-[12.5px]">
                  <CheckCircle2 className="w-4 h-4 text-[#004578]" />
                  <span>1. Perhitungan Berat Nominal (g)</span>
                </div>
                <div className="bg-[#FAF9F8] p-2.5 rounded border border-[#EDEBE9] font-mono text-[11.5px] text-[#004578] font-semibold">
                  Berat Nominal (g) = Volume Kemasan (ml) × Density (Massa Jenis g/ml)
                </div>
                <p className="text-[11px] text-[#475569] leading-relaxed">
                  Hasil perkalian ini merupakan titik tengah ideal pengisian sebelum dikompensasikan dengan toleransi dan statistical error mesin.
                </p>
              </div>

              {/* Box 2: Toleransi Legal */}
              <div className="bg-white p-4 rounded border border-[#CBD5E1] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[#004578] font-bold text-[12.5px]">
                    <CheckCircle2 className="w-4 h-4 text-[#004578]" />
                    <span>2. Tabel Baku Metrologi Legal (Toleransi Legal L)</span>
                  </div>
                  {activeVolumeForTable > 0 && (
                    <span className="text-[10.5px] text-[#004578] bg-[#EFF6FC] border border-[#BFDBFE] px-2 py-0.5 rounded font-bold">
                      Kategori Aktif: {activeVolumeForTable} ml
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#475569]">
                  Berdasarkan standar legal metrologi untuk barang dalam keadaan terbungkus (BDKT), nilai toleransi legal <b>L</b> ditentukan oleh rentang volume isi netto:
                </p>

                {isDuo && (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F1F5F9] border border-[#CBD5E1] p-2 rounded text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[#475569] font-semibold text-[10.5px]">Pilih Acuan Duo:</span>
                      <button
                        type="button"
                        onClick={() => setDuoTarget("p1")}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          duoTarget === "p1"
                            ? "bg-[#004578] text-white shadow-xs"
                            : "bg-white text-[#475569] border border-[#CBD5E1] hover:bg-slate-100"
                        }`}
                      >
                        Phase 1 ({rawV1 > 0 ? `${rawV1} ml` : `${v1} ml`})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuoTarget("p2")}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          duoTarget === "p2"
                            ? "bg-[#004578] text-white shadow-xs"
                            : "bg-white text-[#475569] border border-[#CBD5E1] hover:bg-slate-100"
                        }`}
                      >
                        Phase 2 ({rawV2 > 0 ? `${rawV2} ml` : `${v2} ml`})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuoTarget("total")}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          duoTarget === "total"
                            ? "bg-[#004578] text-white shadow-xs"
                            : "bg-white text-[#475569] border border-[#CBD5E1] hover:bg-slate-100"
                        }`}
                      >
                        Total ({(rawV1 > 0 || rawV2 > 0) ? `${rawV1 + rawV2} ml` : `${v1 + v2} ml`})
                      </button>
                    </div>
                    <span className="text-[10px] text-[#64748B]">
                      Tabel otomatis menyorot baris sesuai pilihan di atas
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto border border-[#EDEBE9] rounded">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-[#FAF9F8] text-[#334155] font-semibold border-b border-[#EDEBE9]">
                      <tr>
                        <th className="p-2 border-r border-[#EDEBE9]">Rentang Volume Kemasan</th>
                        <th className="p-2 border-r border-[#EDEBE9]">Persentase / Nilai Toleransi Legal (L)</th>
                        <th className="p-2">Tipe Batas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDEBE9] text-[#334155]">
                      {legalTolTable.map((row, idx) => {
                        const isSelected = row.match(activeVolumeForTable);
                        return (
                          <tr
                            key={idx}
                            className={isSelected ? "bg-[#EFF6FC] font-semibold" : "hover:bg-[#F8FAFC]"}
                          >
                            <td className={`p-2 font-mono border-r border-[#EDEBE9] ${isSelected ? "text-[#004578]" : ""}`}>
                              <div className="flex items-center justify-between">
                                <span>{row.range}</span>
                                {isSelected && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-[#004578] text-white rounded text-[9px] font-bold tracking-tight">
                                    Kategori Aktif ({activeVolumeForTable} ml)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 font-bold text-[#004578] border-r border-[#EDEBE9]">
                              {row.tol}
                            </td>
                            <td className={`p-2 ${isSelected ? "text-[#004578] font-bold" : "text-[#64748B]"}`}>
                              {row.type}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Box 3: 5 Zona Toleransi */}
              <div className="bg-white p-4 rounded border border-[#CBD5E1] shadow-xs space-y-2">
                <div className="flex items-center space-x-2 text-[#004578] font-bold text-[12.5px]">
                  <CheckCircle2 className="w-4 h-4 text-[#004578]" />
                  <span>3. Pembagian 5 Zona Pengisian Mesin (SOP Quality Control)</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-[10.5px] font-semibold">
                  <div className="bg-[#FEE2E2] border border-[#FCA5A5] p-2 rounded">
                    <span className="font-extrabold text-[#991B1B] block">STOP MIN</span>
                    <span className="font-mono text-[9.5px] text-[#7F1D1D] mt-0.5 block">Nominal - L</span>
                    <span className="text-[9px] text-[#991B1B] font-normal mt-0.5 block">Mesin STOP &amp; Reject</span>
                  </div>
                  <div className="bg-[#FEF9C3] border border-[#FDE047] p-2 rounded">
                    <span className="font-extrabold text-[#854D0E] block">ADJUST MIN</span>
                    <span className="font-mono text-[9.5px] text-[#713F12] mt-0.5 block">Nominal - ⅔L</span>
                    <span className="text-[9px] text-[#854D0E] font-normal mt-0.5 block">Naikkan setting nozzle</span>
                  </div>
                  <div className="bg-[#DCFCE7] border border-[#86EFAC] p-2 rounded">
                    <span className="font-extrabold text-[#166534] block">RUNNING</span>
                    <span className="font-mono text-[9.5px] text-[#14532D] mt-0.5 block">Nominal ± ⅓L</span>
                    <span className="text-[9px] text-[#166534] font-normal mt-0.5 block">Zona Optimal mesin</span>
                  </div>
                  <div className="bg-[#FEF9C3] border border-[#FDE047] p-2 rounded">
                    <span className="font-extrabold text-[#854D0E] block">ADJUST MAX</span>
                    <span className="font-mono text-[9.5px] text-[#713F12] mt-0.5 block">Nominal + ⅔L</span>
                    <span className="text-[9px] text-[#854D0E] font-normal mt-0.5 block">Turunkan setting nozzle</span>
                  </div>
                  <div className="bg-[#FEE2E2] border border-[#FCA5A5] p-2 rounded">
                    <span className="font-extrabold text-[#991B1B] block">STOP MAX</span>
                    <span className="font-mono text-[9.5px] text-[#7F1D1D] mt-0.5 block">Nominal + L</span>
                    <span className="text-[9px] text-[#991B1B] font-normal mt-0.5 block">Mesin STOP</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TABEL STATISTICAL ERROR */}
          {activeTab === "statTable" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded border border-[#CBD5E1] shadow-xs space-y-2">
                <div className="flex items-center space-x-2 text-[#004578] font-bold text-[12.5px]">
                  <Info className="w-4 h-4 text-[#004578]" />
                  <span>Mengapa Ada LINK BOM dan Statistical Error?</span>
                </div>
                <p className="text-[11px] text-[#475569] leading-relaxed">
                  Pada proses produksi riil, selalu terdapat variasi alami mesin filling. 
                  Untuk menjamin bahwa <b>rata-rata populasi botol yang keluar dari pabrik selalu memenuhi syarat netto legal</b>, nilai acuan BOM diatur sedikit di atas nominal murni dengan menambahkan faktor <b>Statistical Error (Sml)</b>.
                </p>
                <div className="bg-[#FAF9F8] p-2.5 rounded border border-[#EDEBE9] font-mono text-[11px] text-[#004578] font-bold">
                  Link BOM (ml) = Volume (ml) + Statistical Error (Sml)
                  <br />
                  Link BOM (g) = Link BOM (ml) × Density
                </div>
              </div>

              <div className="bg-white p-4 rounded border border-[#CBD5E1] shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-[#004578] text-[11.5px]">
                    Tabel Baku Statistical Error Berdasarkan Volume:
                  </h3>
                  {activeVolumeForTable > 0 && (
                    <span className="text-[10.5px] text-[#004578] bg-[#EFF6FC] border border-[#BFDBFE] px-2 py-0.5 rounded font-bold">
                      Kategori Aktif: {activeVolumeForTable} ml
                    </span>
                  )}
                </div>

                {isDuo && (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F1F5F9] border border-[#CBD5E1] p-2 rounded text-[11px] mb-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[#475569] font-semibold text-[10.5px]">Pilih Acuan Duo:</span>
                      <button
                        type="button"
                        onClick={() => setDuoTarget("p1")}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          duoTarget === "p1"
                            ? "bg-[#004578] text-white shadow-xs"
                            : "bg-white text-[#475569] border border-[#CBD5E1] hover:bg-slate-100"
                        }`}
                      >
                        Phase 1 ({rawV1 > 0 ? `${rawV1} ml` : `${v1} ml`})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuoTarget("p2")}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          duoTarget === "p2"
                            ? "bg-[#004578] text-white shadow-xs"
                            : "bg-white text-[#475569] border border-[#CBD5E1] hover:bg-slate-100"
                        }`}
                      >
                        Phase 2 ({rawV2 > 0 ? `${rawV2} ml` : `${v2} ml`})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuoTarget("total")}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          duoTarget === "total"
                            ? "bg-[#004578] text-white shadow-xs"
                            : "bg-white text-[#475569] border border-[#CBD5E1] hover:bg-slate-100"
                        }`}
                      >
                        Total ({(rawV1 > 0 || rawV2 > 0) ? `${rawV1 + rawV2} ml` : `${v1 + v2} ml`})
                      </button>
                    </div>
                    <span className="text-[10px] text-[#64748B]">
                      Tabel otomatis menyorot baris sesuai pilihan di atas
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto border border-[#EDEBE9] rounded">
                  <table className="w-full text-left border-collapse text-[10.5px]">
                    <thead className="bg-[#FAF9F8] text-[#475569] font-semibold border-b border-[#EDEBE9]">
                      <tr>
                        <th className="p-2 border-r border-[#EDEBE9]">Kategori Volume (ml)</th>
                        <th className="p-2 border-r border-[#EDEBE9]">Statistical Error (Sml)</th>
                        <th className="p-2">Keterangan Aplikasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDEBE9] text-[#334155]">
                      {statErrorTable.map((row, idx) => {
                        const isSelected = row.match(activeVolumeForTable);
                        return (
                          <tr
                            key={idx}
                            className={isSelected ? "bg-[#EFF6FC] font-semibold" : "hover:bg-[#F8FAFC]"}
                          >
                            <td className={`p-2 font-mono border-r border-[#EDEBE9] ${isSelected ? "text-[#004578]" : ""}`}>
                              <div className="flex items-center justify-between">
                                <span>{row.range}</span>
                                {isSelected && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-[#004578] text-white rounded text-[9px] font-bold tracking-tight">
                                    Kategori Aktif ({activeVolumeForTable} ml)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className={`p-2 border-r border-[#EDEBE9] ${isSelected ? "font-black text-[#004578]" : "font-bold text-[#B45309]"}`}>
                              {row.err}
                            </td>
                            <td className={`p-2 ${isSelected ? "text-[#004578] font-bold" : "text-[#64748B]"}`}>
                              {row.desc}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer - Unified Corporate Navy Button */}
        <div className="bg-[#FAF9F8] border-t border-[#E2E8F0] px-6 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-[10.5px] text-[#64748B]">
            <span className="w-2 h-2 rounded-full bg-[#107C41]"></span>
            <span>Standar Validasi Kualitas PT Yasulor Indonesia &amp; Metrologi Legal</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-1.5 bg-[#004578] hover:bg-[#003861] text-white text-[12px] font-semibold rounded-none transition-colors shadow-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
