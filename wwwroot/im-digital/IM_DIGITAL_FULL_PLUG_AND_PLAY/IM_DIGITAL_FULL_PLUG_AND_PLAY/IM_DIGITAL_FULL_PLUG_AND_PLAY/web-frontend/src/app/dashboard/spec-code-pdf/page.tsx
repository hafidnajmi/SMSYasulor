"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Files,
    Search,
    Download,
    Eye,
    ExternalLink,
    CheckCircle2,
    Boxes,
    X
} from "lucide-react";
import { isUserAdmin, userHasPermission, getDefaultDashboardRoute } from "@/utils/auth";
import { API_BASE } from "@/utils/api";

export interface SpecCodeMaster {
    id?: number;
    specCode: string;
    specName?: string;
    fgCodes?: string;
    a6DataJson?: string;
    a7DataJson?: string;
    palletPdfName?: string;
    palletPdfData?: string;
    fgSpecPdfName?: string;
    fgSpecPdfData?: string;
    createdBy?: string;
    updatedAt?: string;
}

interface ActivePdfViewer {
    title: string;
    specCode: string;
    fileName: string;
    dataUri: string;
}

export default function SpecCodePdfListPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [specMasters, setSpecMasters] = useState<SpecCodeMaster[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Interactive PDF Modal Viewer State
    const [activePdf, setActivePdf] = useState<ActivePdfViewer | null>(null);

    // View All FG Codes State
    const [expandedFgRows, setExpandedFgRows] = useState<Record<string, boolean>>({});
    const [allFgModal, setAllFgModal] = useState<{ specCode: string; specName?: string; fgList: string[] } | null>(null);
    const [fgModalSearch, setFgModalSearch] = useState("");
    const [copySuccess, setCopySuccess] = useState(false);

    // Fetch Spec Code Masters
    const fetchSpecMasters = async () => {
        try {
            setLoading(true);
            let masters: SpecCodeMaster[] = [];

            try {
                const res = await fetch(`${API_BASE}/api/speccode`);
                if (res.ok) {
                    masters = await res.json();
                }
            } catch (err) {
                console.warn("Backend not reachable, reading localStorage", err);
            }

            if (typeof window !== "undefined") {
                const localStr = localStorage.getItem("ppi_spec_code_masters");
                if (localStr) {
                    try {
                        const localMasters: SpecCodeMaster[] = JSON.parse(localStr);
                        localMasters.forEach(lm => {
                            if (!masters.some(m => m.specCode?.toUpperCase() === lm.specCode?.toUpperCase())) {
                                masters.push(lm);
                            }
                        });
                    } catch (e) { }
                }
                // Strip large PDF blob fields before caching — base64 PDF data can be
                // several MB per record and quickly exceeds the ~5 MB localStorage quota.
                // The actual PDF content is always fetched live from the API, so only
                // lightweight metadata needs to be persisted here.
                const mastersForCache = masters.map(({ palletPdfData: _, fgSpecPdfData: __, ...rest }) => rest);
                try {
                    localStorage.setItem("ppi_spec_code_masters", JSON.stringify(mastersForCache));
                } catch (e) {
                    // Quota still exceeded even without blobs — silently ignore.
                    console.warn("localStorage quota exceeded, skipping spec-code cache.", e);
                }
            }

            // Deduplicate masters by specCode to prevent duplicate rows
            const seenSpec = new Set<string>();
            const uniqueMasters = masters.filter(m => {
                const code = (m.specCode || "").trim().toUpperCase();
                if (!code || seenSpec.has(code)) return false;
                seenSpec.add(code);
                return true;
            });

            setSpecMasters(uniqueMasters);
        } catch (e) {
            console.error("Error loading spec masters", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let u: any = null;
        try {
            const uStr = localStorage.getItem("im_user");
            if (uStr) u = JSON.parse(uStr);
        } catch (e) { }

        if (!u) {
            window.location.href = "/im-digital/";
            return;
        }

        const hasAccess = isUserAdmin(u) || userHasPermission(u, "SPEC CODE & PDF");
        if (!hasAccess) {
            setIsAuthorized(false);
            const targetRoute = getDefaultDashboardRoute(u);
            window.location.href = targetRoute;
            return;
        }

        setIsAuthorized(true);
        fetchSpecMasters();
    }, [router]);

    // Filtered Masters
    const filteredMasters = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return specMasters;

        return specMasters.filter(item => {
            return (
                item.specCode?.toLowerCase().includes(q) ||
                item.specName?.toLowerCase().includes(q) ||
                item.fgCodes?.toLowerCase().includes(q) ||
                item.palletPdfName?.toLowerCase().includes(q) ||
                item.fgSpecPdfName?.toLowerCase().includes(q)
            );
        });
    }, [specMasters, search]);

    // Helper: Download PDF
    const handleDownload = (dataUri: string, filename: string) => {
        if (!dataUri) return;
        const a = document.createElement("a");
        a.href = dataUri;
        a.download = filename || "document.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Helper: Open in new tab
    const handleOpenInNewTab = (dataUri: string, filename: string) => {
        if (!dataUri) return;
        try {
            const parts = dataUri.split(",");
            const base64 = parts[1] || parts[0];
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/pdf" });
            const blobUrl = URL.createObjectURL(blob);
            const newWindow = window.open(blobUrl, "_blank");
            if (!newWindow) {
                window.location.href = blobUrl;
            }
        } catch (e) {
            const win = window.open();
            if (win) {
                win.document.write(
                    `<html><head><title>${filename || "Preview PDF"}</title></head><body style="margin:0"><embed width="100%" height="100%" src="${dataUri}" type="application/pdf"></body></html>`
                );
            }
        }
    };

    if (isAuthorized !== true) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white h-full font-sans">
                <div className="w-8 h-8 border-4 border-[#0078D4] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-[13px] text-[#605E5C]">Memeriksa hak akses...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#FFFFFF]" style={{ fontFamily: "'Montserrat', sans-serif, system-ui, sans-serif" }}>
            {/* Header Banner */}
            <div className="bg-[#005A9E] px-[30px] pt-[18px] pb-[14px] shrink-0">
                <h1 className="text-[15px] font-bold text-white flex items-center space-x-2 tracking-wide uppercase">
                    <span>DAFTAR SPEC CODE & DOKUMEN PDF</span>
                    <span className="text-white/60 mx-1">·</span>
                    <span className="font-normal text-white/90 capitalize">Katalog Dokumen Pallet & Spec</span>
                </h1>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-0 overflow-hidden">
                {/* Search Bar */}
                <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                    <div className="flex-1 flex items-center border border-[#EDEBE9] rounded-[4px] px-3 h-[34px] bg-white focus-within:border-[#0078D4] shadow-sm">
                        <Search className="w-4 h-4 text-[#A19F9D] mr-2 shrink-0" />
                        <input
                            type="text"
                            placeholder="Cari berdasarkan Spec Code, Nama Spec, Kode FG, atau nama file PDF..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-[12.5px] text-[#323130] min-w-0"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="text-[#A19F9D] hover:text-[#323130] cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table Spec Code & PDF */}
                <div className="flex-1 overflow-auto border border-[#EDEBE9] rounded-[4px] bg-white shadow-sm">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-[#6B7280] text-[13px]">
                            Memuat daftar dokumen PDF...
                        </div>
                    ) : filteredMasters.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-[#6B7280] space-y-2 p-6 text-center">
                            <Boxes className="w-10 h-10 text-gray-300" />
                            <div className="text-[13px] font-medium text-gray-700">Tidak ada Spec Code ditemukan</div>
                            <div className="text-[11.5px] text-gray-500 max-w-md">
                                Pastikan kata kunci pencarian sesuai dengan Spec Code, Kode FG, atau nama file PDF.
                            </div>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
                            <thead className="sticky top-0 bg-[#FAF9F8] z-10 border-b border-[#EDEBE9]">
                                <tr className="text-[11px] font-semibold text-[#323130]">
                                    <th className="px-3.5 py-2.5 w-[50px] text-center">NO</th>
                                    <th className="px-3.5 py-2.5 w-[160px]">SPEC CODE</th>
                                    <th className="px-3.5 py-2.5 min-w-[300px]">DAFTAR KODE FG TERDAFTAR</th>
                                    <th className="px-3.5 py-2.5 w-[250px]">PALLET PDF</th>
                                    <th className="px-3.5 py-2.5 w-[250px]">FG SPEC PDF</th>
                                    <th className="px-3.5 py-2.5 w-[140px] text-center">STATUS</th>
                                </tr>
                            </thead>
                            <tbody className="text-[12px] text-[#323130]">
                                {filteredMasters.map((item, idx) => {
                                    const fgList = item.fgCodes ? item.fgCodes.split(/[,;\n\r]/).map(x => x.trim()).filter(Boolean) : [];
                                    const hasPallet = !!item.palletPdfData;
                                    const hasFg = !!item.fgSpecPdfData;

                                    return (
                                        <tr
                                            key={`spec-row-${item.specCode || item.id || idx}-${idx}`}
                                            className={`h-[48px] border-b border-[#F3F2F1] hover:bg-[#F0F7FF] transition-colors ${idx % 2 === 1 ? "bg-[#FAF9F8]" : "bg-white"}`}
                                        >
                                            <td className="px-3.5 text-center text-[#6B7280] font-mono text-[11px]">{idx + 1}</td>
                                            <td className="px-3.5 font-bold text-[#005A9E] font-mono">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-[12px] bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                                                    {item.specCode}
                                                </span>
                                            </td>
                                            <td className="px-3.5">
                                                {fgList.length === 0 ? (
                                                    <span className="text-gray-400 italic text-[11px]">Belum ada Kode FG terhubung</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1 max-w-[460px] py-1 items-center">
                                                        {(expandedFgRows[item.specCode] ? fgList : fgList.slice(0, 5)).map((fg, i) => (
                                                            <span
                                                                key={i}
                                                                className="px-1.5 py-0.5 rounded text-[10.5px] font-mono font-medium bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]"
                                                            >
                                                                {fg}
                                                            </span>
                                                        ))}
                                                        {fgList.length > 5 && (
                                                            <div className="inline-flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setExpandedFgRows(prev => ({ ...prev, [item.specCode]: !prev[item.specCode] }))}
                                                                    className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-[#E0F2FE] text-[#0369A1] hover:bg-[#BAE6FD] border border-[#BAE6FD] cursor-pointer transition-colors shadow-2xs"
                                                                    title={expandedFgRows[item.specCode] ? "Sembunyikan sebagian" : "Tampilkan semua Kode FG di baris ini"}
                                                                >
                                                                    {expandedFgRows[item.specCode] ? "▲ Sembunyikan" : `+${fgList.length - 5} lainnya (Lihat Semua)`}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setAllFgModal({ specCode: item.specCode, specName: item.specName, fgList });
                                                                        setFgModalSearch("");
                                                                        setCopySuccess(false);
                                                                    }}
                                                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white text-[#475569] hover:bg-gray-100 border border-[#CBD5E1] cursor-pointer transition-colors inline-flex items-center gap-0.5 shadow-2xs"
                                                                    title="Buka dialog lengkap & salin kode"
                                                                >
                                                                    🔍 Popup ({fgList.length})
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3.5">
                                                {hasPallet ? (
                                                    <div className="flex items-center justify-between gap-2 py-1 max-w-[240px]">
                                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                            <span className="w-5 h-5 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-[8.5px] shrink-0 border border-red-200">
                                                                PDF
                                                            </span>
                                                            <span className="text-[11.5px] font-medium text-[#1E293B] truncate" title={item.palletPdfName || "Pallet PDF"}>
                                                                {item.palletPdfName || "Pallet PDF"}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setActivePdf({
                                                                    title: "Pallet PDF",
                                                                    specCode: item.specCode,
                                                                    fileName: item.palletPdfName || `Pallet_${item.specCode}.pdf`,
                                                                    dataUri: item.palletPdfData!
                                                                })}
                                                                className="px-2 py-1 text-[11px] font-semibold text-white bg-[#005A9E] hover:bg-[#004A83] rounded-[3px] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                                                title="Lihat / Preview PDF"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                <span>Lihat</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDownload(item.palletPdfData!, item.palletPdfName || `Pallet_${item.specCode}.pdf`)}
                                                                className="p-1 text-[#334155] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-[3px] transition-colors cursor-pointer"
                                                                title="Download PDF"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[11px]">Belum diunggah</span>
                                                )}
                                            </td>
                                            <td className="px-3.5">
                                                {hasFg ? (
                                                    <div className="flex items-center justify-between gap-2 py-1 max-w-[240px]">
                                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                            <span className="w-5 h-5 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-[8.5px] shrink-0 border border-red-200">
                                                                PDF
                                                            </span>
                                                            <span className="text-[11.5px] font-medium text-[#1E293B] truncate" title={item.fgSpecPdfName || "FG Spec PDF"}>
                                                                {item.fgSpecPdfName || "FG Spec PDF"}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setActivePdf({
                                                                    title: "FG Spec PDF",
                                                                    specCode: item.specCode,
                                                                    fileName: item.fgSpecPdfName || `FGSpec_${item.specCode}.pdf`,
                                                                    dataUri: item.fgSpecPdfData!
                                                                })}
                                                                className="px-2 py-1 text-[11px] font-semibold text-white bg-[#107C41] hover:bg-[#0E6A37] rounded-[3px] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                                                title="Lihat / Preview PDF"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                <span>Lihat</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDownload(item.fgSpecPdfData!, item.fgSpecPdfName || `FGSpec_${item.specCode}.pdf`)}
                                                                className="p-1 text-[#334155] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-[3px] transition-colors cursor-pointer"
                                                                title="Download PDF"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[11px]">Belum diunggah</span>
                                                )}
                                            </td>
                                            <td className="px-3.5 text-center">
                                                {hasPallet && hasFg ? (
                                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>2 PDF Lengkap</span>
                                                    </span>
                                                ) : hasPallet || hasFg ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                                                        1 PDF Terisi
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] bg-gray-100 text-gray-500">
                                                        Belum Ada PDF
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Footer - Sama persis dengan tema halaman lain */}
            <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] py-1.5 px-6 text-[10.5px] text-[#6B7280] flex justify-between shrink-0 font-sans">
                <span>Total Master: {filteredMasters.length} Spec Code</span>
                <span>IM DIGITAL VERSI 1.8</span>
            </div>

            {/* Built-in Interactive PDF Viewer Modal */}
            {activePdf && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-150">
                    <div className="bg-white w-[950px] max-w-full h-[90vh] rounded-[8px] shadow-2xl flex flex-col overflow-hidden border border-[#CBD5E1]">
                        {/* Modal Header */}
                        <div className="bg-[#005A9E] px-4 py-2.5 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center space-x-2.5 min-w-0">
                                <div className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-[9px] shrink-0 border border-red-200">
                                    PDF
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-[13px] tracking-wide uppercase">
                                            {activePdf.title}
                                        </span>
                                        <span className="px-2 py-0.2 bg-white/20 rounded font-mono text-[11px]">
                                            {activePdf.specCode}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-white/80 truncate max-w-md" title={activePdf.fileName}>
                                        {activePdf.fileName}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0">
                                <button
                                    onClick={() => handleDownload(activePdf.dataUri, activePdf.fileName)}
                                    className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded text-[11.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-white/20"
                                    title="Download File PDF"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Unduh</span>
                                </button>
                                <button
                                    onClick={() => handleOpenInNewTab(activePdf.dataUri, activePdf.fileName)}
                                    className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded text-[11.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-white/20"
                                    title="Buka di Tab Baru"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Tab Baru</span>
                                </button>
                                <button
                                    onClick={() => setActivePdf(null)}
                                    className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded cursor-pointer transition-colors"
                                    title="Tutup Preview"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Embedded PDF View */}
                        <div className="flex-1 bg-gray-900 overflow-hidden relative">
                            <iframe
                                src={activePdf.dataUri}
                                className="w-full h-full border-0"
                                title={activePdf.fileName}
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-[#F8FAFC] px-4 py-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
                            <span>Spesifikasi Dokumen Master Spec Code: {activePdf.specCode}</span>
                            <button
                                onClick={() => setActivePdf(null)}
                                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded text-[11px] cursor-pointer"
                            >
                                Tutup Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: View All FG Codes */}
            {allFgModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="bg-[#0078D4] text-white px-5 py-3.5 flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                                <Boxes className="w-5 h-5 text-white" />
                                <div>
                                    <h3 className="font-bold text-[14px] leading-tight">
                                        Daftar Kode FG — {allFgModal.specCode}
                                    </h3>
                                    {allFgModal.specName && (
                                        <p className="text-[11px] text-white/80">{allFgModal.specName}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAllFgModal(null)}
                                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search & Actions */}
                        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Cari Kode FG di dalam daftar ini..."
                                    value={fgModalSearch}
                                    onChange={e => setFgModalSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#CBD5E1] rounded text-[12px] font-mono outline-none focus:border-[#0078D4]"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(allFgModal.fgList.join("\n"));
                                    setCopySuccess(true);
                                    setTimeout(() => setCopySuccess(false), 2000);
                                }}
                                className="px-3 py-1.5 bg-[#F0F7FF] hover:bg-[#E0F2FE] text-[#0369A1] font-semibold text-[11.5px] rounded border border-[#BAE6FD] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                            >
                                <span>{copySuccess ? "✓ Berhasil Disalin!" : `📋 Salin Semua (${allFgModal.fgList.length})`}</span>
                            </button>
                        </div>

                        {/* Body List */}
                        <div className="p-4 flex-1 overflow-y-auto">
                            <div className="text-[11.5px] text-[#64748B] mb-2 font-medium flex items-center justify-between">
                                <span>Total terdaftar: <strong>{allFgModal.fgList.length}</strong> Kode FG</span>
                                {fgModalSearch && (
                                    <span className="text-[#0078D4]">
                                        Menampilkan {allFgModal.fgList.filter(x => x.toLowerCase().includes(fgModalSearch.toLowerCase())).length} hasil
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[45vh] overflow-y-auto p-1">
                                {allFgModal.fgList
                                    .filter(x => !fgModalSearch || x.toLowerCase().includes(fgModalSearch.toLowerCase()))
                                    .map((fg, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between px-2.5 py-2 bg-white border border-[#E2E8F0] hover:border-[#0078D4] hover:bg-[#F0F7FF] rounded text-[12px] font-mono font-medium text-[#1E293B] shadow-2xs transition-colors"
                                        >
                                            <span className="text-[10px] text-gray-400 select-none mr-1 font-sans">{i + 1}.</span>
                                            <span className="font-bold truncate" title={fg}>{fg}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-[#F8FAFC] px-5 py-2.5 border-t border-[#E2E8F0] flex justify-end">
                            <button
                                type="button"
                                onClick={() => setAllFgModal(null)}
                                className="px-4 py-1.5 bg-[#0078D4] hover:bg-[#005A9E] text-white rounded text-[12px] font-semibold transition-colors cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
