"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, Eye, X, FileSpreadsheet, ChevronDown, ChevronRight } from "lucide-react";
import { isUserAdmin, userHasPermission, getDefaultDashboardRoute } from "@/utils/auth";
import { API_BASE } from "@/utils/api";

export interface SubDivisionItem {
  code: string;
  division: string;
  isFilled: boolean;
  status: string;
  filledBy?: string;
  submissionTime: string;
  comments?: string;
}

interface TimelineItem {
  division: string;
  isFilled: boolean;
  status: string;
  filledBy?: string;
  submissionTime: string;
  comments: string;
  subDivisions?: SubDivisionItem[];
}

interface ImDocumentHistory {
  id: number;
  productName: string;
  fgCode: string;
  sfCode: string;
  flaNo: string;
  issueDate: string;
  alasanRevisi: string;
  status: string;
  filledCount: number;
  totalDivisions: number;
  timeline?: TimelineItem[];
  steps?: Record<string, boolean>;
}

export default function FillingHistoryPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [docs, setDocs] = useState<ImDocumentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDocHistory, setSelectedDocHistory] = useState<ImDocumentHistory | null>(null);
  const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({ POLE: true });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/im/filling-history`);
      if (res.ok) {
        const data: ImDocumentHistory[] = await res.json();
        setDocs(data);
      }
    } catch (err) {
      console.warn("Failed to fetch filling history", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let u: any = null;
    try {
      const uStr = localStorage.getItem("im_user");
      if (uStr) u = JSON.parse(uStr);
    } catch (e) {}

    if (!u) {
      window.location.href = "/im-digital/";
      return;
    }

    const hasAccess = isUserAdmin(u) || userHasPermission(u, "HISTORI PENGISIAN");
    if (!hasAccess) {
      setIsAuthorized(false);
      const targetRoute = getDefaultDashboardRoute(u);
      window.location.href = targetRoute;
      return;
    }

    setIsAuthorized(true);
    fetchData();
    const interval = setInterval(fetchData, 5000);
    const handleRefresh = () => fetchData();
    window.addEventListener("refresh_im_data", handleRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("refresh_im_data", handleRefresh);
    };
  }, [fetchData, router]);

  // Keep modal data updated in real-time when auto-refresh triggers
  useEffect(() => {
    if (selectedDocHistory) {
      const updated = docs.find((d) => d.id === selectedDocHistory.id);
      if (updated) setSelectedDocHistory(updated);
    }
  }, [docs]);

  const filtered = docs.filter((d) => {
    const q = search.toLowerCase();
    return (
      !q ||
      d.productName?.toLowerCase().includes(q) ||
      d.fgCode?.toLowerCase().includes(q) ||
      d.sfCode?.toLowerCase().includes(q) ||
      d.flaNo?.toLowerCase().includes(q) ||
      d.alasanRevisi?.toLowerCase().includes(q)
    );
  });

  const getProgressColor = (count: number, total: number) => {
    const pct = count / total;
    if (pct === 1) return "#107C41";
    if (pct >= 0.66) return "#0078D4";
    if (pct >= 0.33) return "#D97706";
    return "#FF4500";
  };

  const handleDownloadExcel = (doc: ImDocumentHistory) => {
    const title = `Division Filling History: ${doc.productName || ""} (${doc.fgCode || ""})`;
    const headers = ["Division", "Status", "Filled / Signed By", "Submission Time", "Comments"];
    const rows: string[][] = [];
    (doc.timeline || []).forEach((t) => {
      rows.push([
        t.division,
        t.status,
        t.filledBy && t.filledBy !== "-" ? t.filledBy : "-",
        t.submissionTime || "-",
        t.comments || "-",
      ]);
      if (t.subDivisions && t.subDivisions.length > 0) {
        t.subDivisions.forEach((sub) => {
          rows.push([
            `   ↳ ${sub.division}`,
            sub.status,
            sub.filledBy && sub.filledBy !== "-" ? sub.filledBy : "-",
            sub.submissionTime || "-",
            sub.comments || "-",
          ]);
        });
      }
    });

    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Montserrat" ss:Size="10" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Montserrat" ss:Size="13" ss:Bold="1" ss:Color="#201F1E"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Montserrat" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#107C41" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
  </Style>
  <Style ss:ID="CellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
   </Borders>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
   </Borders>
  </Style>
  <Style ss:ID="CellFilled">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Montserrat" ss:Bold="1" ss:Color="#107C41"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
   </Borders>
  </Style>
  <Style ss:ID="CellNotFilled">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Montserrat" ss:Bold="1" ss:Color="#FF4500"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EDEBE9"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="History">
  <Table>
   <Column ss:Width="160"/>
   <Column ss:Width="100"/>
   <Column ss:Width="170"/>
   <Column ss:Width="150"/>
   <Column ss:Width="240"/>
   <Row ss:Height="24">
    <Cell ss:MergeAcross="4" ss:StyleID="Title"><Data ss:Type="String">${title}</Data></Cell>
   </Row>
   <Row ss:Height="12"/>
   <Row ss:Height="24">
    ${headers.map((h) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${h}</Data></Cell>`).join("")}
   </Row>
   ${rows
     .map(
       (r) => `
   <Row ss:Height="22">
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${r[0]}</Data></Cell>
    <Cell ss:StyleID="${r[1] === "Filled" ? "CellFilled" : "CellNotFilled"}"><Data ss:Type="String">${r[1]}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${r[2]}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${r[3]}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${r[4]}</Data></Cell>
   </Row>`
     )
     .join("")}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeFg = (doc.fgCode || "-").replace(/[\\/*?:"<>|]/g, "");
    const safeProd = (doc.productName || "-").replace(/[\\/*?:"<>|]/g, "");
    link.download = `Division Filling History ${safeFg} ${safeProd}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isAuthorized !== true) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white h-full" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="w-8 h-8 border-4 border-[#005A9E] border-t-transparent rounded-none animate-spin mb-3"></div>
        <p className="text-[13px] text-[#6B7280]">Memeriksa hak akses...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* Header Banner */}
      <div className="bg-[#EAB308] px-[30px] pt-[18px] pb-[14px] shrink-0">
        <h1 className="text-[15px] font-bold text-[#1F2937] flex items-center space-x-2 tracking-wide uppercase">
          <span>FILLING HISTORY</span>
          <span className="text-[#374151] mx-1">·</span>
          <span className="font-normal text-[#374151] capitalize">Daftar Instruksi Mutu</span>
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 px-6 pt-4 pb-0 overflow-hidden">
        {/* Search Bar */}
        <div className="flex items-center border border-[#D1D5DB] rounded-none px-3 h-[36px] mb-4 bg-white shrink-0 focus-within:border-[#005A9E]">
          <svg className="w-4 h-4 text-[#9CA3AF] mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search product name, FG code, SF code, or FLA no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[12px] text-[#1F2937] placeholder-[#9CA3AF]"
          />
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto border border-[#E5E7EB] rounded-none bg-[#FFFFFF]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-[#6B7280] text-[13px]">
              Memuat data dokumen...
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
              <thead className="sticky top-0 bg-[#F9FAFB] z-10">
                <tr className="border-b border-[#E5E7EB]">
                  <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#374151]">Product Name</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#374151]">FG Code</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#374151]">SF Code</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#374151]">FLA No.</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#374151]">Issue Date</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#374151]">Revision Reason</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#374151]">Progress</th>
                  <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#374151] w-[90px]">Action</th>
                </tr>
              </thead>
              <tbody className="text-[12px] text-[#1F2937] bg-white">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[#6B7280]">
                      Tidak ada dokumen ditemukan.
                    </td>
                  </tr>
                ) : (
                  filtered.map((doc, index) => {
                    const progressColor = getProgressColor(doc.filledCount, doc.totalDivisions);
                    return (
                      <tr
                        key={doc.id}
                        className={`h-[42px] border-b border-[#F3F4F6] hover:bg-[#F8F9FA] transition-colors ${
                          index % 2 === 1 ? "bg-[#FAFAFA]" : "bg-[#FFFFFF]"
                        }`}
                      >
                        <td className="px-3.5 truncate max-w-[150px] uppercase font-medium" title={doc.productName}>
                          {doc.productName || "-"}
                        </td>
                        <td className="px-3.5 uppercase font-medium">{doc.fgCode || "-"}</td>
                        <td className="px-3.5 uppercase font-medium">{doc.sfCode || "-"}</td>
                        <td className="px-3.5 truncate max-w-[180px] uppercase font-medium" title={doc.flaNo}>
                          {doc.flaNo || "-"}
                        </td>
                        <td className="px-3.5">{doc.issueDate || "-"}</td>
                        <td className="px-3.5 truncate max-w-[120px]" title={doc.alasanRevisi}>
                          {doc.alasanRevisi || "-"}
                        </td>
                        <td className="px-3.5">
                          <span
                            className="text-[11px] font-bold cursor-default"
                            style={{ color: progressColor }}
                            title={`${doc.filledCount} dari ${doc.totalDivisions} divisi sudah diisi`}
                          >
                            {doc.filledCount} / {doc.totalDivisions} Divisions
                          </span>
                        </td>
                        <td className="px-3.5">
                          <button
                            onClick={() => setSelectedDocHistory(doc)}
                            className="bg-white border border-[#D1D5DB] hover:border-[#1F2937] text-[#1F2937] text-[11px] font-bold uppercase tracking-wider h-[28px] px-3 rounded-none flex items-center gap-1.5 hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0 text-[#4B5563]" /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] py-2 px-6 text-[11px] font-medium text-[#6B7280] flex justify-between shrink-0">
        <span>{filtered.length} documents</span>
        <span>IM DIGITAL VERSI 1.8</span>
      </div>

      {/* Modal Detail History Timeline - Clean Flat Enterprise UI */}
      {selectedDocHistory && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedDocHistory(null)}
        >
          <div
            className="w-[920px] max-w-[96vw] bg-white rounded-none border border-[#CCCCCC] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {/* Modal Content */}
            <div className="p-6 flex flex-col">
              {/* Header: Title + Download Excel Button + Close Button */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-[16px] font-bold text-[#111827] tracking-tight">
                    Division Filling History Timeline
                  </h2>
                  <div className="flex items-center space-x-6 text-[12px] font-medium text-[#4B5563] mt-1.5">
                    <span>
                      <strong className="text-[#111827]">FG Code:</strong> {selectedDocHistory.fgCode || "-"}
                    </span>
                    <span>
                      <strong className="text-[#111827]">Product Name:</strong> {selectedDocHistory.productName || "-"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownloadExcel(selectedDocHistory)}
                    className="bg-[#107C41] hover:bg-[#0B5A2F] text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-none flex items-center gap-1.5 transition-colors cursor-pointer border border-[#0B5A2F] shrink-0"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download Excel</span>
                  </button>
                  <button
                    onClick={() => setSelectedDocHistory(null)}
                    className="text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-none p-1.5 transition-colors cursor-pointer border border-[#D1D5DB]"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-white border border-[#E5E7EB] rounded-none overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-[#E5E7EB]">
                    <tr>
                      <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[#374151] text-[10.5px] w-[210px]">
                        Division
                      </th>
                      <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[#374151] text-[10.5px] w-[120px]">
                        Status
                      </th>
                      <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[#374151] text-[10.5px] w-[180px]">
                        Filled / Signed By
                      </th>
                      <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[#374151] text-[10.5px] w-[160px]">
                        Submission Time
                      </th>
                      <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[#374151] text-[10.5px]">
                        Comments
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {(selectedDocHistory.timeline || []).map((item, idx) => {
                      const hasSub = !!(item.subDivisions && item.subDivisions.length > 0);
                      const isExpanded = expandedDivisions[item.division] !== false;

                      return (
                        <React.Fragment key={idx}>
                          <tr className={`h-[44px] hover:bg-[#F9FAFB] transition-colors ${hasSub ? "bg-[#FAFAFA]" : "bg-white"}`}>
                            <td className="px-4 py-2 text-[#1F2937]">
                              {hasSub ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedDivisions((prev) => ({
                                      ...prev,
                                      [item.division]: !isExpanded,
                                    }))
                                  }
                                  className="flex items-center gap-1.5 font-bold text-[#1F2937] hover:text-[#005A9E] cursor-pointer text-left focus:outline-none"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-[#005A9E] shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
                                  )}
                                  <span>{item.division}</span>
                                  <span className="text-[10px] font-bold text-[#005A9E] border border-[#005A9E] px-1.5 py-0.5 rounded-none ml-2">
                                    {item.subDivisions?.filter((s) => s.isFilled).length}/{item.subDivisions?.length} Bagian
                                  </span>
                                </button>
                              ) : (
                                <span className="font-semibold text-[#1F2937]">{item.division}</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {item.isFilled ? (
                                <span className="text-[#107C41] font-bold text-[11.5px]">Filled</span>
                              ) : hasSub && item.subDivisions?.some((s) => s.isFilled) ? (
                                <span className="text-[#D97706] font-bold text-[11.5px]">Partially Filled</span>
                              ) : (
                                <span className="text-[#FF4500] font-bold text-[11.5px]">Not Filled</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-[#1F2937]">
                              {item.filledBy && item.filledBy !== "-" ? (
                                <div className="flex items-center gap-1.5 font-medium text-[#1F2937]">
                                  <span className="w-1.5 h-1.5 bg-[#107C41] shrink-0"></span>
                                  <span className="truncate max-w-[260px]" title={item.filledBy}>
                                    {item.filledBy}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[#9CA3AF]">–</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-[#4B5563] text-[11.5px]">
                              {item.submissionTime || "-"}
                            </td>
                            <td className="px-4 py-2 text-[#4B5563] text-[11.5px]">
                              {item.comments && item.comments !== "-" ? item.comments : "–"}
                            </td>
                          </tr>

                          {/* Render Sub-Divisions if expanded */}
                          {hasSub &&
                            isExpanded &&
                            item.subDivisions?.map((sub, sIdx) => (
                              <tr
                                key={`${idx}-sub-${sIdx}`}
                                className="h-[36px] bg-[#FFFFFF] hover:bg-[#F9FAFB] transition-colors border-t border-[#F3F4F6]"
                              >
                                <td className="pl-8 pr-4 py-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[#005A9E] font-bold text-[12px]">↳</span>
                                    <span className="text-[#374151] font-medium text-[11.5px]">{sub.division}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-1.5">
                                  {sub.isFilled ? (
                                    <span className="text-[#107C41] font-bold text-[11px]">Filled</span>
                                  ) : (
                                    <span className="text-[#FF4500] font-bold text-[11px]">Not Filled</span>
                                  )}
                                </td>
                                <td className="px-4 py-1.5 text-[#1F2937] text-[11.5px]">
                                  {sub.filledBy && sub.filledBy !== "-" ? (
                                    <div className="flex items-center gap-1.5 font-medium text-[#1F2937]">
                                      <span className="w-1.5 h-1.5 bg-[#107C41] shrink-0"></span>
                                      <span className="truncate max-w-[260px]" title={sub.filledBy}>
                                        {sub.filledBy}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[#9CA3AF]">–</span>
                                  )}
                                </td>
                                <td className="px-4 py-1.5 text-[#4B5563] text-[11px] font-mono">
                                  {sub.submissionTime || "-"}
                                </td>
                                <td className="px-4 py-1.5 text-[#6B7280] text-[11px]">
                                  {sub.comments && sub.comments !== "-" ? sub.comments : "–"}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Action: Close Button */}
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setSelectedDocHistory(null)}
                  className="bg-[#F3F4F6] hover:bg-[#E5E7EB] border border-[#D1D5DB] text-[#1F2937] text-[11px] font-bold uppercase tracking-wider px-6 h-[34px] rounded-none transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
