"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, FileText, Calendar, Rocket, Upload, AlertTriangle } from "lucide-react";
import CalculationDetailModal from "./CalculationDetailModal";
import { isUserAdmin, userHasPermission, getDefaultDashboardRoute } from "@/utils/auth";
import { API_BASE } from "@/utils/api";
const getTodayDate = () => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // User & Role State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCalculationDetailModal, setShowCalculationDetailModal] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"Create" | "Edit">("Create");
  const [currentDoc, setCurrentDoc] = useState<any>({});
  const [flaList, setFlaList] = useState<string[]>(['']);

  // Import Excel Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importDragOver, setImportDragOver] = useState(false);

  // Warning Modal State (Custom Alert)
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningTitle, setWarningTitle] = useState('');
  const [warningMessage, setWarningMessage] = useState('');

  // Tab State
  const [currentTab, setCurrentTab] = useState<"Draft" | "Launched">("Launched");

  // Launch Confirm State
  const [launchConfirmDoc, setLaunchConfirmDoc] = useState<any>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<any>(null);
  const [formError, setFormError] = useState<string>('');

  // Preview State
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const fetchDocuments = async () => {
    let apiDocs: any[] | null = null;
    try {
      // Fetch all IM documents (including Drafts & Launched)
      const res = await fetch(`${API_BASE}/api/im`);
      if (res.ok) {
        apiDocs = await res.json();
      } else {
        // Fallback to active endpoint if /api/im is not available
        const resActive = await fetch(`${API_BASE}/api/im/active`);
        if (resActive.ok) apiDocs = await resActive.json();
      }
    } catch (err) {
      console.warn("Backend API not reachable, loading local documents", err);
    } finally {
      setLoading(false);
    }

    const savedLocal = typeof window !== "undefined" ? localStorage.getItem("local_im_docs") : null;
    let localDocs: any[] = [];
    if (savedLocal) {
      try { localDocs = JSON.parse(savedLocal); } catch (e) { }
    }

    if (apiDocs && Array.isArray(apiDocs)) {
      const combinedMap = new Map();
      localDocs.forEach(d => combinedMap.set(d.id || d.imCode, d));
      apiDocs.forEach(d => combinedMap.set(d.id || d.imCode, d));
      const combined = Array.from(combinedMap.values());
      setDocuments(combined);
      if (typeof window !== "undefined") {
        localStorage.setItem("local_im_docs", JSON.stringify(combined));
      }
    } else {
      setDocuments(localDocs);
    }
  };

  useEffect(() => {
    let u: any = null;
    try {
      const uStr = typeof window !== "undefined" ? localStorage.getItem("im_user") : null;
      if (uStr) {
        u = JSON.parse(uStr);
      }
    } catch (e) { }

    if (!u) {
      window.location.href = "/im-digital/";
      return;
    }

    const hasLaunchAccess = isUserAdmin(u) || userHasPermission(u, "LAUNCH CO");
    if (!hasLaunchAccess) {
      setIsAuthorized(false);
      const targetRoute = getDefaultDashboardRoute(u);
      window.location.href = targetRoute;
      return;
    }

    setIsAuthorized(true);
    setCurrentUser(u);
    setIsAdmin(isUserAdmin(u));

    fetchDocuments();

    const handleRefresh = () => {
      setLoading(true);
      fetchDocuments();
    };

    window.addEventListener('refresh_im_data', handleRefresh);

    const intervalId = setInterval(() => {
      if (!showModal) {
        fetchDocuments();
      }
    }, 3000);

    return () => {
      window.removeEventListener('refresh_im_data', handleRefresh);
      clearInterval(intervalId);
    };
  }, [showModal, router]);

  // Load SheetJS XLSX library once from CDN
  useEffect(() => {
    if (typeof window === 'undefined' || (window as any).XLSX) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const draftDocs = documents.filter(d => d.status === "Draft");
  const launchedDocs = documents.filter(d => d.status !== "Draft");

  const tabDocs = currentTab === "Draft" ? draftDocs : launchedDocs;

  const filteredDocs = tabDocs.filter(d =>
    (d.imCode && d.imCode.toLowerCase().includes(search.toLowerCase())) ||
    (d.description && d.description.toLowerCase().includes(search.toLowerCase())) ||
    search === ""
  );

  // ── Import Excel helpers ──────────────────────────────────────────────
  const parseExcelFile = (file: File) => {
    setImportError('');
    setImportRows([]);
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const XLSX = (window as any).XLSX;
        if (!XLSX) { setImportError('Library XLSX belum dimuat, coba refresh halaman.'); return; }
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // ── Auto-detect header row (scan baris 1–6 untuk kolom NAMA PRODUK dan KODE FG) ──
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(raw.length, 6); i++) {
          const rowStr = raw[i].map((c: any) => String(c).toUpperCase().trim());
          // Pastikan sel KEDUA header wajib ini ada secara persis (exact match), 
          // bukan sekadar mengandung (includes) agar tidak salah baca baris instruksi.
          if (rowStr.some((c: string) => c === 'NAMA PRODUK') &&
            rowStr.some((c: string) => c === 'KODE FG')) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          setImportError('Format tidak valid. Pastikan ada baris header dengan sel persis bernama "NAMA PRODUK" dan "KODE FG".');
          return;
        }

        // Build header map from detected header row
        const headerRow: string[] = raw[headerRowIndex].map((c: any) => String(c).trim());
        const normalize = (s: string) => s.toUpperCase().replace(/\s+/g, ' ').trim();

        const rows: any[] = [];
        for (let i = headerRowIndex + 1; i < raw.length; i++) {
          const obj: any = {};
          headerRow.forEach((h, ci) => { obj[normalize(h)] = String(raw[i][ci] ?? '').trim(); });
          rows.push(obj);
        }

        if (rows.length === 0) { setImportError('File Excel kosong atau tidak ada data.'); return; }

        const mapped = rows.map((r: any) => ({
          description: (r['NAMA PRODUK'] || r['NAMA PRODUK '] || '').trim(),
          imCode: (r['KODE FG'] || r['KODE FG '] || '').trim(),
          kodeSf: (r['KODE SF'] || r['KODE SF '] || '').trim(),
          noFla: (r['NO. FLA'] || r['NO FLA'] || r['NO.FLA'] || '').trim(),
          tglIssue: (r['TANGGAL ISSUE'] || r['TGL ISSUE'] || '').trim(),
          alasanRevisi: (r['ALASAN REVISI'] || r['ALASAN REVISI '] || '').trim(),
          status: 'Draft',
        })).filter((r: any) => r.imCode || r.description);

        if (mapped.length === 0) { setImportError('Tidak ada data valid. Pastikan kolom NAMA PRODUK dan KODE FG ada.'); return; }
        setImportRows(mapped);
      } catch (err) {
        setImportError('Gagal membaca file Excel. Pastikan formatnya .xlsx atau .xls.');
      }
    };
    reader.readAsArrayBuffer(file);
  };


  const handleImportDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setImportDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseExcelFile(file);
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcelFile(file);
    e.target.value = '';
  };

  const downloadImportTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'PPI IM Digital System';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Template IM', {
        views: [{ state: 'frozen', ySplit: 3 }],
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      });

      // ── Title row ──────────────────────────────────────────────────────────
      sheet.mergeCells('A1:F1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'TEMPLATE IMPORT MASSAL DRAFT IM — PPI IM Digital System';
      titleCell.font = { name: 'Montserrat', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 32;

      // ── Subtitle / instruction row ─────────────────────────────────────────
      sheet.mergeCells('A2:F2');
      const subCell = sheet.getCell('A2');
      subCell.value = '⚠  Kolom wajib: NAMA PRODUK, KODE FG, NO. FLA, TANGGAL ISSUE, ALASAN REVISI  |  Format tanggal: dd-MM-yyyy  |  Hapus baris contoh sebelum upload';
      subCell.font = { name: 'Montserrat', size: 9, italic: true, color: { argb: 'FF7F6000' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
      subCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
      sheet.getRow(2).height = 20;

      // ── Column headers ─────────────────────────────────────────────────────
      const headers = [
        { key: 'namaProduk', header: 'NAMA PRODUK', width: 40 },
        { key: 'kodeFg', header: 'KODE FG', width: 18 },
        { key: 'kodeSf', header: 'KODE SF', width: 16 },
        { key: 'noFla', header: 'NO. FLA', width: 22 },
        { key: 'tglIssue', header: 'TANGGAL ISSUE', width: 20 },
        { key: 'alasanRevisi', header: 'ALASAN REVISI', width: 36 },
      ];

      sheet.columns = headers.map(h => ({ key: h.key, width: h.width }));

      const headerRow = sheet.getRow(3);
      headers.forEach((h, i) => {
        const col = i + 1;
        const cell = headerRow.getCell(col);
        cell.value = h.header;
        cell.font = { name: 'Montserrat', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E4C7E' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF1F3864' } },
          bottom: { style: 'medium', color: { argb: 'FF1F3864' } },
          left: { style: 'thin', color: { argb: 'FF4472C4' } },
          right: { style: 'thin', color: { argb: 'FF4472C4' } },
        };
      });
      headerRow.height = 26;

      // ── Sample data rows ───────────────────────────────────────────────────
      const samples = [
        { namaProduk: 'OAP DEX MAKEUP REMOVER 125ML ENG', kodeFg: 'G0900002', kodeSf: 'SF-MR-001', noFla: 'FLA-2025-001', tglIssue: '01-01-2025', alasanRevisi: 'New launch — revisi formulasi' },
        { namaProduk: 'EXAMPLE PRODUCT 250ML', kodeFg: 'G0900003', kodeSf: '', noFla: 'FLA-2025-002', tglIssue: '15-03-2025', alasanRevisi: 'Perubahan packaging' },
        { namaProduk: 'SAMPLE ITEM 50G', kodeFg: 'G0900004', kodeSf: 'SF-EX-002', noFla: 'FLA-2025-003', tglIssue: '01-06-2025', alasanRevisi: '' },
      ];

      const rowBgEven = 'FFF2F7FF';
      const rowBgOdd = 'FFFFFFFF';
      const borderThin = { style: 'thin' as const, color: { argb: 'FFD9E1F2' } };

      samples.forEach((s, idx) => {
        const row = sheet.addRow(s);
        row.height = 20;
        const bg = idx % 2 === 0 ? rowBgEven : rowBgOdd;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { name: 'Montserrat', size: 10, color: { argb: colNumber === 1 ? 'FF1F3864' : 'FF333333' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.alignment = { horizontal: colNumber <= 2 ? 'left' : 'center', vertical: 'middle' };
          cell.border = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };
        });
        // Mark sample rows with light italic style
        row.getCell(1).font = { name: 'Montserrat', size: 10, italic: true, color: { argb: 'FF6B7EB8' } };
      });

      // ── 15 empty data rows ─────────────────────────────────────────────────
      for (let i = 0; i < 15; i++) {
        const row = sheet.addRow({});
        row.height = 20;
        const bg = i % 2 === 0 ? rowBgEven : rowBgOdd;
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.border = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };
        });
        // Force cells to render even if empty
        for (let c = 1; c <= 6; c++) {
          const cell = row.getCell(c);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.border = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };
        }
      }

      // ── Download ───────────────────────────────────────────────────────────
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Template_Import_IM_PPI.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Template download error:', err);
      alert('Gagal membuat template. Silakan coba lagi.');
    }
  };


  const handleConfirmImport = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    let successCount = 0;
    const newDocs: any[] = [];
    for (const row of importRows) {
      try {
        const res = await fetch(`${API_BASE}/api/im`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...row, id: 0 }),
        });
        if (res.ok) {
          const data = await res.json();
          newDocs.push({ ...row, id: data.id || data.Id || Date.now() + successCount });
          successCount++;
        }
      } catch { /* skip failed rows */ }
    }
    setDocuments(prev => {
      const updated = [...newDocs, ...prev];
      if (typeof window !== 'undefined') localStorage.setItem('local_im_docs', JSON.stringify(updated));
      return updated;
    });
    setImportLoading(false);
    setShowImportModal(false);
    setImportRows([]);
    setImportFileName('');
    setCurrentTab('Draft');

    setWarningTitle('Informasi Import');
    setWarningMessage(`Import selesai: ${successCount} berhasil, ${importRows.length - successCount} gagal.`);
    setShowWarningModal(true);

    fetchDocuments(); // Refresh list to fetch real IDs
  };
  // ─────────────────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setModalMode("Create");
    setCurrentDoc({ description: "", imCode: "", kodeSf: "", noFla: "", tglIssue: getTodayDate(), alasanRevisi: "" });
    setFlaList(['']);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (e: React.MouseEvent, doc: any) => {
    e.stopPropagation();
    setModalMode("Edit");
    setCurrentDoc(doc);
    setFlaList(doc.noFla ? doc.noFla.split(',').map((s: string) => s.trim()) : ['']);
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (!currentDoc.description || currentDoc.description.trim() === '') {
        setFormError("Nama produk wajib diisi!");
        return;
      }
      if (!currentDoc.imCode || currentDoc.imCode.trim() === '') {
        setFormError("Kode FG wajib diisi!");
        return;
      }
      const finalFlaList = flaList.filter(f => f.trim() !== '');
      if (finalFlaList.length === 0) {
        setFormError("Nomor FLA wajib diisi!");
        return;
      }

      const activeUser = currentUser?.username || currentUser?.fullName || "admin";
      const payload = {
        ...currentDoc,
        id: modalMode === "Create" ? 0 : currentDoc.id,
        noFla: finalFlaList.join(', '),
        createdBy: currentDoc.createdBy || activeUser
      };
      if (modalMode === "Create") {
        payload.status = "Draft";
        payload.createdBy = activeUser;
      }

      // Try sending to backend API if available
      try {
        const url = modalMode === "Create"
          ? `${API_BASE}/api/im`
          : `${API_BASE}/api/im/${currentDoc.id}`;
        const method = modalMode === "Create" ? "POST" : "PUT";

        const res = await fetch(url, {
          method,
          headers: { 
            "Content-Type": "application/json",
            "X-Username": activeUser
          },
          body: JSON.stringify(payload),
        });

        if (res.ok && modalMode === "Create") {
          const data = await res.json();
          if (data && (data.id || data.Id)) {
            payload.id = data.id || data.Id;
          }
        } else if (!res.ok) {
          const errorText = await res.text();
          // Check for duplicate key error
          if (errorText.includes('UNIQUE') || errorText.includes('duplicate')) {
            setFormError(`Kode FG '${payload.imCode}' sudah terdaftar dalam sistem!`);
            return;
          }
          let errorMsg = "Gagal menyimpan ke server.";
          try {
            const parsed = JSON.parse(errorText);
            if (parsed.message) errorMsg = parsed.message;
            if (parsed.error && typeof parsed.error === 'string') errorMsg += `: ${parsed.error}`;
          } catch {
            if (errorText) errorMsg = errorText;
          }
          setFormError(errorMsg);
          console.error("Backend error:", errorText);
          return;
        }
      } catch (err) {
        console.warn("Backend API call failed, saved to local state", err);
        if (modalMode === "Create" && payload.id === 0) {
          payload.id = Date.now(); // Fallback ID for local storage
        }
      }

      // Always update state & localStorage
      setDocuments(prev => {
        let updated;
        if (modalMode === "Create") {
          updated = [payload, ...prev.filter(d => (d.id || d.imCode) !== (payload.id || payload.imCode))];
        } else {
          updated = prev.map(d => (d.id || d.imCode) === (payload.id || payload.imCode) ? payload : d);
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("local_im_docs", JSON.stringify(updated));
        }
        return updated;
      });

      setShowModal(false);

      if (modalMode === "Create") {
        setCurrentTab("Draft");
      }
    } catch (err) {
      setWarningTitle('Peringatan');
      setWarningMessage('Gagal menyimpan dokumen.');
      setShowWarningModal(true);
    }
  };

  const confirmDeleteAction = async () => {
    if (!isAdmin) {
      setWarningTitle('Akses Ditolak');
      setWarningMessage('Hanya Admin yang berhak menghapus Instruksi Mutu (IM).');
      setShowWarningModal(true);
      setDeleteConfirmDoc(null);
      return;
    }
    if (deleteConfirmDoc) {
      try {
        try {
          const uName = currentUser?.username || currentUser?.Username || 'admin';
          const uRole = currentUser?.role || currentUser?.Role || 'ADMIN';
          const res = await fetch(`${API_BASE}/api/im/${deleteConfirmDoc.id}?username=${encodeURIComponent(uName)}`, {
            method: "DELETE",
            headers: {
              "X-Username": uName,
              "X-User-Role": uRole
            }
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => null);
            setWarningTitle('Peringatan');
            setWarningMessage(errData?.message || errData?.Message || 'Gagal menghapus dokumen.');
            setShowWarningModal(true);
            setDeleteConfirmDoc(null);
            return;
          }
        } catch (err) {
          console.warn("Backend API delete failed", err);
        }

        setDocuments(prev => {
          const updated = prev.filter(d => d.id !== deleteConfirmDoc.id);
          if (typeof window !== "undefined") {
            localStorage.setItem("local_im_docs", JSON.stringify(updated));
          }
          return updated;
        });
      } catch (err) {
        setWarningTitle('Kesalahan');
        setWarningMessage('Gagal menghapus dokumen.');
        setShowWarningModal(true);
      } finally {
        setDeleteConfirmDoc(null);
      }
    }
  };

  const handlePreview = (e: React.MouseEvent, doc: any) => {
    e.stopPropagation();
    setPreviewDoc(doc);
  };

  const handleLaunch = (e: React.MouseEvent, doc: any) => {
    e.stopPropagation();
    setLaunchConfirmDoc(doc);
  };

  const confirmLaunchAction = async () => {
    if (!launchConfirmDoc) return;
    try {
      const activeUser = currentUser?.username || currentUser?.fullName || "admin";
      let updatedDoc = { 
        ...launchConfirmDoc, 
        status: "Launched",
        createdBy: launchConfirmDoc.createdBy || activeUser
      };
      try {
        let res = await fetch(`${API_BASE}/api/im/${launchConfirmDoc.id}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "X-Username": activeUser
          },
          body: JSON.stringify(updatedDoc),
        });

        // If PUT failed (e.g. not in DB yet), fallback to create on backend
        if (!res.ok) {
          const createRes = await fetch(`${API_BASE}/api/im`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "X-Username": activeUser
            },
            body: JSON.stringify({ ...updatedDoc, id: 0 }),
          });
          if (createRes.ok) {
            const createData = await createRes.json();
            const realId = createData.id || createData.Id;
            if (realId) {
              updatedDoc.id = realId;
              await fetch(`${API_BASE}/api/im/${realId}`, {
                method: "PUT",
                headers: { 
                  "Content-Type": "application/json",
                  "X-Username": activeUser
                },
                body: JSON.stringify(updatedDoc),
              });
            }
          }
        }
      } catch (err) {
        console.warn("Backend API launch failed", err);
      }

      setDocuments(prev => {
        const updated = prev.map(d => (d.id || d.imCode) === (launchConfirmDoc.id || launchConfirmDoc.imCode) ? updatedDoc : d);
        if (typeof window !== "undefined") {
          localStorage.setItem("local_im_docs", JSON.stringify(updated));
        }
        return updated;
      });

      setLaunchConfirmDoc(null);
      setCurrentTab("Launched");
      fetchDocuments();
    } catch (err) {
      setWarningTitle('Peringatan');
      setWarningMessage('Gagal melakukan launch dokumen.');
      setShowWarningModal(true);
    }
  };

  const handlePrint = (e: React.MouseEvent, doc: any) => {
    e.stopPropagation();
    setPreviewDoc(doc);
    const sfCode = (doc.kodeSf || doc.rawDocument?.kodeSf || '').trim();
    const fgCode = (doc.imCode || doc.fgCode || doc.rawDocument?.imCode || '').trim();
    const desc = (doc.description || doc.rawDocument?.description || '').trim();
    const parts = [];
    if (sfCode) parts.push(sfCode);
    if (fgCode) parts.push(fgCode);
    if (desc) parts.push(desc);
    let finalName = parts.length > 0 ? parts.join(' ') : 'IM_Document';
    finalName = finalName.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    document.title = finalName.replace(/[/\\?%*:|"<>]/g, '_');
    setTimeout(() => window.print(), 500);
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
    <div className="flex flex-col h-full bg-[#FFFFFF] relative print:h-auto print:block">
      {/* 1. Top Dynamic Header Banner - GOLD/YELLOW */}
      {!previewDoc && (
        <div className="bg-[#EAB308] px-[30px] pt-[18px] pb-[14px] shrink-0 print:hidden">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-[15px] font-bold text-[#1F2937] flex items-center space-x-2 tracking-wide uppercase">
                <span>LAUNCH CO</span>
                <span className="text-[#374151] mx-1">·</span>
                <span className="font-normal text-[#374151] capitalize">Daftar Instruksi Mutu</span>
              </h1>
              <p className="text-[11.5px] text-[#4B5563] mt-1 leading-snug">
                Klik <b>+ Buat Baru</b> untuk membuat Instruksi Mutu baru. Gunakan <b>Launch</b> untuk mempublikasikan IM, atau <b>Preview</b> untuk melihat hasilnya.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => { setImportRows([]); setImportFileName(''); setImportError(''); setShowImportModal(true); }}
                className="flex items-center space-x-2 bg-white hover:bg-gray-50 text-[#005A9E] px-4 py-1.5 rounded-none border border-[#005A9E]/20 font-semibold text-[13px] shadow-sm transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-[#107C41]" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M5.884 6.68a.5.5 0 1 0-.768.64L7.349 10l-2.233 2.68a.5.5 0 0 0 .768.64L8 10.748l2.116 2.572a.5.5 0 0 0 .768-.64L8.651 10l2.233-2.68a.5.5 0 0 0-.768-.64L8 9.252 5.884 6.68z"/>
                  <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                </svg>
                <span>Import Excel</span>
              </button>
              <button
                onClick={openCreateModal}
                className="flex items-center space-x-2 bg-[#0078D4] hover:bg-[#1A86D9] text-white px-4 py-1.5 rounded-none font-semibold text-[13px] shadow-sm transition-colors"
              >
                <span>+</span>
                <span>Buat Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area OR Preview Area */}
      {previewDoc ? (
        <div className="flex-1 flex flex-col min-h-0 bg-[#F3F4F6] p-6 overflow-auto print:p-0 print:bg-white print:overflow-visible print:block">
          <button
            onClick={() => setPreviewDoc(null)}
            className="self-start mb-6 bg-white border border-[#D1D5DB] px-4 py-1.5 rounded-[4px] text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] flex items-center space-x-2 shadow-sm print:hidden"
          >
            <span>← Back</span>
          </button>

          {/* Document Preview Container (A4-like) */}
          {/* Document Preview Container (Exact Desktop App Clone) */}
          <div id="im-print-area" className="bg-white mx-auto w-[1400px] max-w-[1400px] h-[1020px] flex flex-col shrink-0 shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-black font-sans text-[12px] text-black p-[30px]">

            {/* Main Outer Container matching Desktop App */}
            <div className="border border-black flex flex-col flex-1 min-h-0 relative">

              {/* Header Grid (10 Columns) */}
              <div className="grid grid-cols-10 text-center text-[11px] font-bold">
                <div className="col-span-2 border-r border-black p-[2px] bg-white flex items-center justify-center">PT YASULOR INDONESIA</div>
                <div className="col-span-6 border-r border-black p-[2px] bg-[#CCECFF] flex items-center justify-center">INSTRUKSI MUTU</div>
                <div className="col-span-1 border-r border-black p-[2px] uppercase flex items-center justify-center">{previewDoc.imCode || ''}</div>
                <div className="col-span-1 p-[2px] flex items-center justify-center">TUBE LINE</div>
              </div>

              {/* Doc Info Grid (10 Columns) */}
              <div className="grid grid-cols-10 border-t border-b border-black">
                <div className="col-span-9 border-r border-black flex flex-col p-[6px_12px] min-h-[65px] justify-center">
                  <div className="font-bold text-[13px] text-[#0078D4] mb-[4px] uppercase">{previewDoc.description || 'N/A'}</div>
                  <div className="flex w-full">
                    <div className="grid grid-cols-[55px_10px_1fr] gap-y-1 text-[12px] font-normal text-black w-1/2">
                      <div>Kode FG</div><div>:</div><div className="uppercase">{previewDoc.imCode || '-'}</div>
                      <div>Kode SF</div><div>:</div><div className="uppercase">{previewDoc.kodeSf || '-'}</div>
                      <div>No. Fla</div>
                      <div>:</div>
                      <div className="uppercase">
                        {previewDoc.noFla ? previewDoc.noFla.split(',').map((f: string, i: number, arr: string[]) => (
                          <React.Fragment key={i}>
                            {f.trim()}
                            {i < arr.length - 1 && <br />}
                          </React.Fragment>
                        )) : '-'}
                      </div>
                    </div>
                    <div className="grid grid-cols-[100px_10px_1fr] gap-y-1 text-[12px] font-normal text-black w-1/2">
                      <div>Tanggal Issue</div><div>:</div><div>{previewDoc.tglIssue || '-'}</div>
                      <div>Alasan Revisi</div><div>:</div><div>{previewDoc.alasanRevisi || '-'}</div>
                    </div>
                  </div>
                </div>
                {/* Empty cell under TUBE LINE */}
                <div className="col-span-1"></div>
              </div>

              {/* Form Sections Flex Layout */}
              <div className="flex flex-1 min-h-0 w-full">

                {/* Left Column (Spesifikasi FG) - Fixed Width 670px */}
                <div className="w-[670px] shrink-0 border-r border-black flex flex-col min-h-0">
                  <div className="font-bold text-center border-b border-black flex items-center justify-center h-[20px] text-[11px] bg-[#FFB300]">A. Spesifikasi FG</div>

                  <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center shrink-0">A.1. Appearance Filling</div>
                  <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>

                  <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center shrink-0">A.2. Appearance Assembly</div>
                  <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>

                  <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center shrink-0">A.3. Appearance Packing</div>
                  <div className="bg-[#EAEFE3] border-b border-black flex-1 min-h-0"></div>

                  {/* Volume FG */}
                  <div className="bg-[#EAEFE3] border-b border-black px-[4px] text-[9px] italic h-[16px] flex items-center text-[#555]">Volume FG</div>

                  {/* A.4 Header */}
                  <div className="bg-[#C0504D] text-white px-[4px] font-bold text-[10px] h-[18px] flex items-center justify-between border-b border-black">
                    <span>A.4. Berat</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowCalculationDetailModal(true); }}
                      className="bg-[#FFE082] hover:bg-[#FFD54F] text-[#3E2723] text-[8px] font-bold px-1.5 py-[1px] rounded-[2px] flex items-center space-x-1 shadow-sm transition-all print:hidden cursor-pointer"
                      title="Klik untuk melihat rumus & rincian perhitungan A.4"
                    >
                      <span>ℹ</span>
                      <span>Rincian Perhitungan</span>
                    </button>
                  </div>

                  {/* Berat Subheader */}
                  <div className="bg-[#FCE9D9] border-b border-black grid grid-cols-[14%_20%_32%_20%_14%] items-center px-[6px] h-[20px] text-[9.5px] font-bold text-black">
                    <div>Berat (gram)</div>
                    <div>Syarat Legal :</div>
                    <div>0.030</div>
                    <div></div>
                    <div></div>
                  </div>

                  {/* Berat Color Bar */}
                  <div className="grid grid-cols-[14%_20%_32%_20%_14%] text-center text-[10px] font-bold border-b border-black h-[14px] items-center">
                    <div className="bg-[#FF0000] text-black font-bold flex items-center justify-center border-r border-black h-full">STOP</div>
                    <div className="bg-[#FFFF00] text-black font-bold flex items-center justify-center border-r border-black h-full">ADJUST</div>
                    <div className="bg-[#00AF50] text-black font-bold flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
                    <div className="bg-[#FFFF00] text-black font-bold flex items-center justify-center border-r border-black h-full">ADJUST</div>
                    <div className="bg-[#FF0000] text-black font-bold flex items-center justify-center h-full">STOP</div>
                  </div>

                  {/* Berat Data Row */}
                  <div className="grid grid-cols-[14%_20%_32%_20%_14%] text-center text-[11px] bg-[#FCE9D9] border-b border-black h-[40px] relative items-center">
                    <div className="flex flex-col justify-between h-full py-1 px-1.5">
                      <span></span>
                      <span className="text-black font-bold text-[9.5px] leading-tight text-right">min</span>
                    </div>
                    <div className="flex flex-col justify-between h-full py-1 px-1">
                      <span></span>
                      <span></span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] h-full items-center">
                      <div className="flex flex-col justify-between h-full py-1 px-1">
                        <span></span>
                        <span className="text-black font-bold text-[9.5px] leading-tight text-left">nominal</span>
                      </div>
                      <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center h-full px-3.5 shadow-sm min-w-[75px]">
                        <span className="text-black font-bold text-[8.5px] leading-tight uppercase tracking-wider">LINK BOM</span>
                      </div>
                      <div className="flex flex-col justify-between h-full py-1 px-1">
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between h-full py-1 px-1">
                      <span></span>
                      <span></span>
                    </div>
                    <div className="flex flex-col justify-between h-full py-1 px-1.5">
                      <span></span>
                      <span className="text-black font-bold text-[9.5px] leading-tight text-left">max</span>
                    </div>
                  </div>

                  {/* Volume Subheader */}
                  <div className="bg-[#FCE9D9] border-b border-black grid grid-cols-[14%_20%_32%_20%_14%] items-center px-[6px] h-[20px] text-[9.5px] font-bold text-black">
                    <div>Volume (ml)</div>
                    <div>Syarat Legal :</div>
                    <div>0.030</div>
                    <div></div>
                    <div></div>
                  </div>

                  {/* Volume Color Bar */}
                  <div className="grid grid-cols-[14%_20%_32%_20%_14%] text-center text-[10px] font-bold border-b border-black h-[14px] items-center">
                    <div className="bg-[#FF0000] text-black font-bold flex items-center justify-center border-r border-black h-full">STOP</div>
                    <div className="bg-[#FFFF00] text-black font-bold flex items-center justify-center border-r border-black h-full">ADJUST</div>
                    <div className="bg-[#00AF50] text-black font-bold flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
                    <div className="bg-[#FFFF00] text-black font-bold flex items-center justify-center border-r border-black h-full">ADJUST</div>
                    <div className="bg-[#FF0000] text-black font-bold flex items-center justify-center h-full">STOP</div>
                  </div>

                  {/* Volume Data Row */}
                  <div className="grid grid-cols-[14%_20%_32%_20%_14%] text-center text-[11px] bg-[#FCE9D9] border-b border-black h-[40px] relative items-center">
                    <div className="flex flex-col justify-between h-full py-1 px-1.5">
                      <span></span>
                      <span className="text-black font-bold text-[9.5px] leading-tight text-right">min</span>
                    </div>
                    <div className="flex flex-col justify-between h-full py-1 px-1">
                      <span></span>
                      <span></span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] h-full items-center">
                      <div className="flex flex-col justify-between h-full py-1 px-1">
                        <span></span>
                        <span className="text-black font-bold text-[9.5px] leading-tight text-left">nominal</span>
                      </div>
                      <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center h-full px-3.5 shadow-sm min-w-[75px]">
                        <span className="text-black font-bold text-[8.5px] leading-tight uppercase tracking-wider">LINK BOM</span>
                      </div>
                      <div className="flex flex-col justify-between h-full py-1 px-1">
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between h-full py-1 px-1">
                      <span></span>
                      <span></span>
                    </div>
                    <div className="flex flex-col justify-between h-full py-1 px-1.5">
                      <span></span>
                      <span className="text-black font-bold text-[9.5px] leading-tight text-left">max</span>
                    </div>
                  </div>

                  {/* Density */}
                  <div className="bg-[#FCE9D9] border-t border-b border-black px-[6px] text-[10.5px] font-bold h-[22px] flex items-center">
                    <span className="text-black w-[80px]">Density</span><span className="text-black mr-2">:</span>
                    <span className="text-[#0000CC] bg-[#E0F2FE]/60 font-bold text-[11px] px-1.5 py-[0.5px] border border-blue-200 rounded-[2px]">&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  </div>
                </div>

                {/* Right Column (Flex-1) */}
                <div className="flex-1 flex flex-col min-h-0 justify-between">
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center shrink-0">A.6. Paletisasi</div>

                    {/* A.6 Green Body */}
                    <div className="bg-[#EAEFE3] border-b border-black flex-[2] min-h-0"></div>

                    <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center uppercase shrink-0">A.7. VACCUM / JACOMEX / TORSI</div>

                    {/* A.7 Green Body */}
                    <div className="bg-[#EAEFE3] border-b border-black flex-[1] min-h-0"></div>

                    {/* BATCH NUMBER FORMAT = fixed 95px according to spec */}
                    <div className="border-b border-black flex bg-white h-[95px]">
                      <div className="flex-1 font-bold text-[13.5px] p-2">BATCH NUMBER FORMAT</div>
                      <div className="bg-[#85D3F2] text-[#1E3A8A] font-bold text-[15px] w-[180px] border-l border-black flex items-center justify-center text-center p-2 leading-tight">
                        PASTIKAN BATCH NO.<br />ADA DAN BENAR
                      </div>
                    </div>

                    {/* No Quality Surveillance */}
                    <div className="flex items-center justify-center text-[#64748B] font-bold text-[12px] bg-white h-[100px] flex-1 min-h-[100px]">
                      No Quality Surveillance data available yet
                    </div>
                  </div>

                  {/* VALIDATION BLOCK AT BOTTOM */}
                  <div>
                    <div className="bg-[#000000] text-[#FFFFFF] text-center font-bold text-[10px] p-[1px_6px] border-b border-t border-black">
                      VALIDATION
                    </div>
                    <div className="grid grid-cols-4 bg-white text-center text-[13px] pt-4 pb-4 px-[20px]">
                      <div className="flex flex-col justify-between h-[60px]">
                        <div className="font-normal">Prepared by</div>
                        <div className="font-normal">UP Filling Spv</div>
                      </div>
                      <div className="flex flex-col justify-between h-[60px]">
                        <div className="font-normal">Prepared by</div>
                        <div><span className="font-bold">(Ari Nugroho)</span><br /><span className="font-normal">UP Filling manager</span></div>
                      </div>
                      <div className="flex flex-col justify-between h-[60px]">
                        <div className="font-normal">Reviewed by</div>
                        <div><span className="font-bold">(Daniel A)</span><br /><span className="font-normal">PACKAGING & POLE</span></div>
                      </div>
                      <div className="flex flex-col justify-between h-[60px]">
                        <div className="font-normal">Approved by</div>
                        <div><span className="font-bold">(Nia Indriyani)</span><br /><span className="font-normal">Quality Lab Manager</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="px-6 md:px-[30px] pt-[10px] border-b border-[#E5E7EB] flex space-x-8 text-[13px] font-medium shrink-0">
            <button
              onClick={() => setCurrentTab("Draft")}
              className={`pb-[8px] transition-colors ${currentTab === "Draft" ? "text-[#0078D4] border-b-[3px] border-[#0078D4]" : "text-[#6B7280] hover:text-[#374151]"}`}
            >
              Draft ({draftDocs.length})
            </button>
            <button
              onClick={() => setCurrentTab("Launched")}
              className={`pb-[8px] transition-colors ${currentTab === "Launched" ? "text-[#0078D4] border-b-[3px] border-[#0078D4]" : "text-[#6B7280] hover:text-[#374151]"}`}
            >
              Launched ({launchedDocs.length})
            </button>
          </div>

          {/* 2. Content Body */}
          <div className="flex-1 flex flex-col mx-4 md:mx-6 lg:mx-[30px] mt-2.5 md:mt-[14px] mb-2 min-h-0">

            {/* Search Box */}
            <div className="bg-[#FFFFFF] border border-[#D1D5DB] rounded-none h-[34px] mb-2.5 md:mb-3 px-[12px] flex items-center shrink-0 w-full focus-within:border-[#0078D4]">
              <svg className="w-4 h-4 text-[#A19F9D] mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-[#374151] font-sans"
              />
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto border border-[#EDEBE9] rounded-[4px] bg-[#FFFFFF] custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-full text-[#6B7280] text-[13px]">
                  Memuat data dokumen...
                </div>
              ) : (
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 bg-[#FAF9F8] z-10">
                    <tr>
                      <th className="px-2 py-0 h-[34px] text-[11px] font-semibold text-[#323130] border-b border-[#EDEBE9]">Nama Produk</th>
                      <th className="px-2 py-0 h-[34px] text-[11px] font-semibold text-[#323130] border-b border-[#EDEBE9]">Kode FG</th>
                      <th className="px-2 py-0 h-[34px] text-[11px] font-semibold text-[#323130] border-b border-[#EDEBE9]">Kode SF</th>
                      <th className="px-2 py-0 h-[34px] text-[11px] font-semibold text-[#323130] border-b border-[#EDEBE9]">No. FLA</th>
                      <th className="px-2 py-0 h-[34px] text-[11px] font-semibold text-[#323130] border-b border-[#EDEBE9]">Tanggal Issue</th>
                      <th className="px-2 py-0 h-[34px] text-[11px] font-semibold text-[#323130] border-b border-[#EDEBE9]">Alasan Revisi</th>
                      <th className="px-2 py-0 h-[34px] text-[11px] font-semibold text-[#323130] border-b border-[#EDEBE9] text-center">Status</th>
                      <th className="px-2 py-0 h-[34px] text-[11px] font-semibold text-[#323130] border-b border-[#EDEBE9] text-center w-[165px] 2xl:w-[240px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px] text-[#323130] font-sans bg-white">
                    {filteredDocs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-[#6B7280]">
                          {currentTab === "Draft" ? "Tidak ada dokumen IM draft." : "Tidak ada dokumen IM aktif."}
                        </td>
                      </tr>
                    ) : (
                      filteredDocs.map((doc: any, index: number) => (
                        <tr
                          key={doc.id}
                          className={`h-[40px] md:h-[42px] border-b border-[#F3F2F1] hover:bg-[#EFF6FC] transition-colors ${index % 2 === 1 ? 'bg-[#FAF9F8]' : 'bg-[#FFFFFF]'}`}
                        >
                          <td className="px-2 truncate max-w-[120px] lg:max-w-[160px] uppercase" title={doc.description}>{doc.description || '-'}</td>
                          <td className="px-2 uppercase">{doc.imCode || '-'}</td>
                          <td className="px-2 uppercase">{doc.kodeSf || '-'}</td>
                          <td className="px-2 truncate max-w-[120px] lg:max-w-[180px] uppercase" title={doc.noFla}>{doc.noFla || '-'}</td>
                          <td className="px-2">{doc.tglIssue || '-'}</td>
                          <td className="px-2 truncate max-w-[95px] lg:max-w-[130px]" title={doc.alasanRevisi}>{doc.alasanRevisi || '-'}</td>
                          <td className="px-2 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-none text-[11px] font-bold ${
                              doc.status === 'Draft' 
                                ? 'bg-[#E5E7EB] text-[#1F2937]' 
                                : 'bg-[#00FF00] text-[#000000]'
                            }`}>
                              {doc.status === 'Running' ? 'Launched' : doc.status}
                            </span>
                          </td>
                          <td className="px-2">
                            <div className="flex items-center justify-center space-x-1">
                              <button onClick={(e) => handlePreview(e, doc)} title="Preview" className="h-[26px] px-2 bg-transparent border border-[#8A8886] rounded-none text-[11px] text-[#323130] flex items-center justify-center hover:bg-[#F3F2F1] transition-colors">Preview</button>
                              {currentTab === 'Launched' && (
                                <button onClick={(e) => handlePrint(e, doc)} title="PDF" className="h-[26px] px-2 bg-transparent border border-[#D13438] rounded-none text-[11px] text-[#D13438] flex items-center justify-center hover:bg-[#FDE7E9] transition-colors">
                                  <FileText className="w-3.5 h-3.5 mr-1 shrink-0" />
                                  <span>PDF</span>
                                </button>
                              )}
                              <button onClick={(e) => openEditModal(e, doc)} title="Edit" className="h-[26px] px-1.5 2xl:px-2 bg-transparent border border-[#0078D4] rounded-none text-[11px] text-[#0078D4] flex items-center justify-center hover:bg-[#EFF6FC] transition-colors">
                                <Pencil className="w-3.5 h-3.5 shrink-0" />
                                <span className="hidden 2xl:inline ml-1">Edit</span>
                              </button>
                              {isAdmin && (
                                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmDoc(doc); }} title="Delete" className="h-[26px] px-1.5 2xl:px-2 bg-transparent border border-[#D13438] rounded-none text-[11px] text-[#D13438] flex items-center justify-center hover:bg-[#FDE7E9] transition-colors">
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                  <span className="hidden 2xl:inline ml-1">Delete</span>
                                </button>
                              )}
                              {currentTab === 'Draft' && (
                                <button onClick={(e) => handleLaunch(e, doc)} title="Launch" className="h-[26px] px-2 bg-[#107C41] border border-[#107C41] rounded-none text-[11px] text-white flex items-center justify-center hover:bg-[#0B5A2F] hover:border-[#0B5A2F] transition-colors font-semibold">
                                  Launch
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Footer bar */}
          <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] py-1.5 px-6 text-[10px] text-[#9CA3AF] flex justify-between shrink-0 font-sans">
            <span>{filteredDocs.length} dokumen di {currentTab}</span>
            <span>IM DIGITAL VERSI 1.8</span>
          </div>
        </>
      )}

      {/* Modal Dialog for Create/Edit IM */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="font-sans">
          <div style={{ backgroundColor: '#F3F4F6', width: '520px' }} className="rounded-none border border-[#CBD5E1] shadow-2xl flex flex-col overflow-hidden">

            {/* Header (Windows Style) */}
            <div className="bg-[#F3F4F6] px-3 py-2 flex justify-between items-center border-b border-[#E5E7EB]">
              <div className="flex items-center space-x-2 text-[12px] text-[#1F2937] font-semibold">
                {modalMode === "Create" ? (
                  <FileText className="w-4 h-4 text-[#0078D4]" />
                ) : (
                  <Pencil className="w-4 h-4 text-[#0078D4]" />
                )}
                <span>{modalMode === "Create" ? "Buat Instruksi Mutu" : "Edit Instruksi Mutu"}</span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#4B5563] hover:bg-[#E81123] hover:text-white w-8 h-8 rounded-none flex items-center justify-center text-[14px] transition-colors cursor-pointer" title="Tutup">
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="bg-white px-10 py-6 flex-1">
              <div className="space-y-4">
                <div className="flex items-center">
                  <label className="w-[110px] text-right pr-3 text-[11px] font-semibold text-[#1E293B]">NAMA PRODUK :</label>
                  <input type="text" className="flex-1 h-[34px] border border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none rounded-none px-2 text-[12px] uppercase"
                    value={currentDoc.description || ''} onChange={e => setCurrentDoc({ ...currentDoc, description: e.target.value.toUpperCase() })} placeholder="Nama produk... (wajib)" />
                </div>

                <div className="flex items-center">
                  <label className="w-[110px] text-right pr-3 text-[11px] font-semibold text-[#1E293B]">KODE FG :</label>
                  <input type="text" className="flex-1 h-[34px] border border-[#CBD5E1] focus:border-[#0078D4] outline-none rounded-none px-2 text-[12px] uppercase"
                    value={currentDoc.imCode || ''} onChange={e => setCurrentDoc({ ...currentDoc, imCode: e.target.value.toUpperCase() })} placeholder="Kode FG... (wajib)" />
                </div>

                <div className="flex items-center">
                  <label className="w-[110px] text-right pr-3 text-[11px] font-semibold text-[#1E293B]">KODE SF :</label>
                  <input type="text" className="flex-1 h-[34px] border border-[#CBD5E1] focus:border-[#0078D4] outline-none rounded-none px-2 text-[12px] uppercase"
                    value={currentDoc.kodeSf || ''} onChange={e => setCurrentDoc({ ...currentDoc, kodeSf: e.target.value.toUpperCase() })} placeholder="Kode SF (opsional)..." />
                </div>

                {/* Dynamic FLA Inputs */}
                {flaList.map((fla, index) => (
                  <div className="flex items-center" key={index}>
                    <label className="w-[110px] text-right pr-3 text-[11px] font-semibold text-[#1E293B]">
                      {index === 0 ? "NO. FLA :" : ""}
                    </label>
                    <div className="flex-1 flex space-x-2">
                      <input type="text" className="flex-1 h-[34px] border border-[#CBD5E1] focus:border-[#0078D4] outline-none rounded-none px-2 text-[12px] uppercase"
                        value={fla} onChange={e => {
                          const newFlaList = [...flaList];
                          newFlaList[index] = e.target.value.toUpperCase();
                          setFlaList(newFlaList);
                        }} placeholder="Nomor FLA... (wajib)" />
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newFlaList = flaList.filter((_, i) => i !== index);
                            setFlaList(newFlaList);
                          }}
                          className="w-[34px] h-[34px] bg-[#F3F4F6] hover:bg-[#E81123] text-[#4B5563] hover:text-white border border-[#CBD5E1] hover:border-[#E81123] rounded-none flex items-center justify-center transition-colors cursor-pointer shrink-0 text-[14px]"
                          title="Hapus baris FLA"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex justify-start pl-[110px]">
                  <button onClick={() => setFlaList([...flaList, ''])} className="text-[#0078D4] text-[11px] font-bold hover:underline flex items-center space-x-1">
                    <span>+</span>
                    <span>Tambah Nomor FLA</span>
                  </button>
                </div>

                <div className="flex items-center">
                  <label className="w-[110px] text-right pr-3 text-[11px] font-semibold text-[#1E293B]">TANGGAL ISSUE :</label>
                  <div className="flex-1 flex border border-[#CBD5E1] rounded-none overflow-hidden focus-within:border-[#0078D4]">
                    <input type="text" className="flex-1 h-[34px] px-2 outline-none text-[12px]"
                      value={currentDoc.tglIssue || ''} onChange={e => setCurrentDoc({ ...currentDoc, tglIssue: e.target.value })} placeholder="DD-MM-YYYY" />
                    <div className="relative bg-[#0078D4] hover:bg-[#1A86D9] w-[34px] flex items-center justify-center text-white shrink-0 rounded-none">
                      <Calendar className="w-4 h-4 text-white" />
                      <input
                        type="date"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        value={currentDoc.tglIssue ? currentDoc.tglIssue.split('-').reverse().join('-') : ''}
                        onClick={(e) => {
                          try {
                            if ('showPicker' in e.currentTarget) {
                              e.currentTarget.showPicker();
                            }
                          } catch (err) { }
                        }}
                        onChange={e => {
                          const val = e.target.value;
                          if (val) {
                            const parts = val.split('-');
                            if (parts.length === 3) {
                              setCurrentDoc({ ...currentDoc, tglIssue: `${parts[2]}-${parts[1]}-${parts[0]}` });
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <label className="w-[110px] text-right pr-3 text-[11px] font-semibold text-[#1E293B] mt-2">ALASAN REVISI :</label>
                  <textarea className="flex-1 h-[50px] border border-[#CBD5E1] focus:border-[#0078D4] outline-none rounded-[4px] px-2 py-1 text-[12px]"
                    value={currentDoc.alasanRevisi || ''} onChange={e => setCurrentDoc({ ...currentDoc, alasanRevisi: e.target.value })} placeholder="Wajib diisi, tulis alasan revisi..." />
                </div>
              </div>

              {formError && (
                <div className="flex items-center justify-center mt-4 text-[12px] text-[#B91C1C] font-medium">
                  <span className="mr-1.5 text-[14px]">⚠</span>
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-center space-x-3 mt-4">
                <button onClick={() => setShowModal(false)} className="px-8 py-2 border border-[#CBD5E1] bg-white hover:bg-gray-50 text-[12px] font-semibold rounded-none">
                  BATAL
                </button>
                <button onClick={handleSave} className="px-8 py-2 bg-[#005A9E] hover:bg-[#0078D4] text-white text-[12px] font-semibold rounded-none">
                  KONFIRMASI DATA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi Launch Modal */}
      {launchConfirmDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="font-sans">
          <div className="bg-white w-[400px] shadow-2xl flex flex-col overflow-hidden border border-[#E5E7EB] relative rounded-none">
            <button onClick={() => setLaunchConfirmDoc(null)} className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#10B981] transition-colors text-[18px]">
              ✕
            </button>
            <div className="p-8 flex flex-col items-center text-center mt-2">
              <div className="w-16 h-16 bg-[#D1FAE5] rounded-full flex items-center justify-center mb-5">
                <Rocket className="w-8 h-8 text-[#10B981]" />
              </div>
              <h2 className="text-[#111827] text-[18px] font-bold mb-3 tracking-tight">Launch Instruksi Mutu</h2>
              <div className="text-[13px] text-[#6B7280] leading-relaxed mb-8">
                Apakah Anda yakin ingin me-Launch dokumen <strong>'{launchConfirmDoc.description}'</strong> ({launchConfirmDoc.imCode})?<br />
                Status akan berubah menjadi <span className="font-semibold text-[#10B981]">Launched</span>.
              </div>
              <div className="flex justify-center space-x-3 w-full">
                <button onClick={() => setLaunchConfirmDoc(null)} className="flex-1 py-2.5 border border-[#D1D5DB] bg-white hover:bg-[#F9FAFB] text-[#374151] text-[12px] font-semibold transition-colors rounded-none">
                  BATAL
                </button>
                <button onClick={confirmLaunchAction} className="flex-1 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-[12px] font-semibold transition-colors shadow-sm rounded-none">
                  YA, LAUNCH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi Delete Modal */}
      {deleteConfirmDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="font-sans">
          <div className="bg-white w-[400px] shadow-2xl flex flex-col overflow-hidden border border-[#E5E7EB] relative rounded-none">
            <button onClick={() => setDeleteConfirmDoc(null)} className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#EF4444] transition-colors text-[18px]">
              ✕
            </button>
            <div className="p-8 flex flex-col items-center text-center mt-2">
              <div className="w-16 h-16 bg-[#FEE2E2] rounded-full flex items-center justify-center mb-5">
                <Trash2 className="w-8 h-8 text-[#EF4444]" />
              </div>
              <h2 className="text-[#111827] text-[18px] font-bold mb-3 tracking-tight">Hapus Instruksi Mutu</h2>
              <div className="text-[13px] text-[#6B7280] leading-relaxed mb-8">
                Apakah Anda yakin ingin menghapus dokumen <strong>'{deleteConfirmDoc.description}'</strong>?<br />
                Tindakan ini tidak dapat dibatalkan.
              </div>
              <div className="flex justify-center space-x-3 w-full">
                <button onClick={() => setDeleteConfirmDoc(null)} className="flex-1 py-2.5 border border-[#D1D5DB] bg-white hover:bg-[#F9FAFB] text-[#374151] text-[12px] font-semibold transition-colors rounded-none">
                  BATAL
                </button>
                <button onClick={confirmDeleteAction} className="flex-1 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-white text-[12px] font-semibold transition-colors shadow-sm rounded-none">
                  YA, HAPUS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Excel Modal ─────────────────────────────────────────────── */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="font-sans bg-black/50">
          {/* XLSX CDN loader */}
          <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js" />
          <div style={{ backgroundColor: '#F3F4F6', width: '860px', maxHeight: '90vh' }} className="rounded-none shadow-2xl flex flex-col overflow-hidden">

            {/* Title Bar */}
            <div className="bg-[#F3F4F6] px-3 py-2 flex justify-between items-center border-b border-[#E5E7EB] shrink-0">
              <div className="flex items-center space-x-2 text-[12px] text-[#1F2937]">
                <svg className="w-4 h-4 text-[#107C41]" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M5.884 6.68a.5.5 0 1 0-.768.64L7.349 10l-2.233 2.68a.5.5 0 0 0 .768.64L8 10.748l2.116 2.572a.5.5 0 0 0 .768-.64L8.651 10l2.233-2.68a.5.5 0 0 0-.768-.64L8 9.252 5.884 6.68z"/>
                  <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                </svg>
                <span className="font-semibold">Import Excel</span>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-[#4B5563] hover:bg-[#E81123] hover:text-white w-8 h-8 rounded-none flex items-center justify-center text-[14px] transition-colors cursor-pointer" title="Tutup">✕</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 bg-white">

              {/* Info & Download Template Row */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-[#605E5C]">
                  Kolom wajib: <b>NAMA PRODUK</b>, <b>KODE FG</b>, <b>NO. FLA</b>, <b>TANGGAL ISSUE</b> (dd-MM-yyyy), <b>ALASAN REVISI</b> — Opsional: <b>KODE SF</b>
                </p>
                <button
                  onClick={downloadImportTemplate}
                  className="flex items-center space-x-1.5 bg-[#107C10] hover:bg-[#0E6B0E] text-white px-3 py-1.5 rounded-none text-[12px] font-semibold shadow-sm transition-colors cursor-pointer shrink-0 ml-4"
                >
                  <span>⬇</span>
                  <span>Download Template</span>
                </button>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setImportDragOver(true); }}
                onDragLeave={() => setImportDragOver(false)}
                onDrop={handleImportDrop}
                onClick={() => document.getElementById('import-excel-input')?.click()}
                className="cursor-pointer rounded-none border-2 border-dashed flex flex-col items-center justify-center py-8 transition-colors mb-3"
                style={{ borderColor: importDragOver ? '#0078D4' : '#C8C6C4', backgroundColor: importDragOver ? '#EFF6FC' : '#FAFAFA' }}
              >
                <span className="text-[40px] mb-2">📗</span>
                <p className="text-[#0078D4] font-semibold text-[13px]">Drag &amp; Drop file Excel ke sini</p>
                <p className="text-[#605E5C] text-[11px] mt-1">atau klik untuk memilih file (.xlsx / .xls)</p>
                <input id="import-excel-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFileSelect} />
              </div>

              {/* File name / error */}
              {importFileName ? (
                <p className="text-[11px] text-[#605E5C] italic mb-3">File dipilih: <b>{importFileName}</b> — {importRows.length} baris valid</p>
              ) : (
                <p className="text-[11px] text-[#605E5C] italic mb-3">Belum ada file yang dipilih.</p>
              )}
              {importError && <p className="text-[11px] text-red-600 mb-3 font-semibold">{importError}</p>}

              {/* Preview Table */}
              <div className="font-bold text-[13px] text-[#323130] mb-2">Preview Data</div>
              <div className="overflow-x-auto border border-[#EDEBE9] rounded-[2px]" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="w-full text-[11px] border-collapse" style={{ minWidth: '700px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1F3864' }}>
                      {['#', 'NAMA PRODUK', 'KODE FG', 'KODE SF', 'NO. FLA', 'TANGGAL ISSUE', 'ALASAN REVISI'].map(h => (
                        <th key={h} className="text-white font-semibold px-2 py-1.5 text-left border-r border-[#2D4E8A] last:border-r-0 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-[#A19F9D] py-8 italic">Belum ada data</td></tr>
                    ) : importRows.map((row, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#F3F2F1' }}>
                        <td className="px-2 py-1 border-r border-[#EDEBE9] text-center text-[#605E5C]">{i + 1}</td>
                        <td className="px-2 py-1 border-r border-[#EDEBE9]">{row.description}</td>
                        <td className="px-2 py-1 border-r border-[#EDEBE9] font-mono">{row.imCode}</td>
                        <td className="px-2 py-1 border-r border-[#EDEBE9] font-mono">{row.kodeSf}</td>
                        <td className="px-2 py-1 border-r border-[#EDEBE9]">{row.noFla}</td>
                        <td className="px-2 py-1 border-r border-[#EDEBE9]">{row.tglIssue}</td>
                        <td className="px-2 py-1">{row.alasanRevisi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-[#E5E7EB] px-6 py-4 flex justify-between items-center shrink-0">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-6 py-2 border border-[#CBD5E1] bg-white hover:bg-gray-50 text-[12px] font-semibold rounded-none text-[#1F2937]"
              >BATAL</button>
              <button
                onClick={handleConfirmImport}
                disabled={importRows.length === 0 || importLoading}
                className="flex items-center space-x-2 px-6 py-2 text-[12px] font-semibold rounded-none min-w-[160px] justify-center transition-colors"
                style={{
                  backgroundColor: importRows.length === 0 || importLoading ? '#E5E7EB' : '#005A9E',
                  color: importRows.length === 0 || importLoading ? '#9CA3AF' : 'white',
                  cursor: importRows.length === 0 || importLoading ? 'not-allowed' : 'pointer',
                }}
              >
                <Upload className="w-4 h-4 mr-1" />
                <span>{importLoading ? 'MENGIMPORT...' : 'KONFIRMASI IMPORT'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Warning/Alert Modal */}
      {showWarningModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }} className="font-sans">
          <div className="bg-white w-[400px] shadow-2xl flex flex-col overflow-hidden border border-[#E5E7EB] relative rounded-none">
            <button onClick={() => setShowWarningModal(false)} className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#F59E0B] transition-colors text-[18px]">
              ✕
            </button>
            <div className="p-8 flex flex-col items-center text-center mt-2">
              <div className="w-16 h-16 bg-[#FEF3C7] rounded-full flex items-center justify-center mb-5">
                <AlertTriangle className="w-8 h-8 text-[#F59E0B]" />
              </div>
              <h2 className="text-[#111827] text-[18px] font-bold mb-3 tracking-tight">{warningTitle}</h2>
              <div className="text-[13px] text-[#6B7280] leading-relaxed mb-8">
                {warningMessage}
              </div>
              <div className="flex justify-center w-full">
                <button onClick={() => setShowWarningModal(false)} className="w-full py-2.5 border border-[#D1D5DB] bg-white hover:bg-[#F9FAFB] text-[#374151] text-[12px] font-semibold transition-colors shadow-sm rounded-none">
                  MENGERTI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rincian Perhitungan Modal */}
      <CalculationDetailModal
        isOpen={showCalculationDetailModal}
        onClose={() => setShowCalculationDetailModal(false)}
        qcFillingData={previewDoc?.savedQcFillingData || previewDoc?.qcFillingData}
        qcResult={previewDoc?.savedQcResult || previewDoc?.qcResult}
        productName={previewDoc?.description || previewDoc?.productName || ''}
        imCode={previewDoc?.imCode || ''}
      />

    </div>
  );
}

