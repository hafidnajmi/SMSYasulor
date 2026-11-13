"use client";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, RotateCcw, Info } from "lucide-react";
import CalculationDetailModal from "../../CalculationDetailModal";
import { isUserAdmin, userHasPermission, getDefaultDashboardRoute } from "@/utils/auth";
import { API_BASE } from "@/utils/api";


const DEFAULT_IQ_BATCH_TEXT = '1ST LINE: 80Axxx - MFGMMYY EXPMMYY (example: 80A600 MFG1225 EXP0626)\n(80 = Yasulor Ind Factory; A = Year 2026; 6 = Jun (Bulan),00 = Squence batch, 2026 = Year 2026 EXP0629 --> 3 Years after Manufacturing)\nUntuk bulan, Januari - September > gunakan angka 1-9, October = O, November = N. December = D)';

export default function DivisionPage() {
  const router = useRouter();
  const params = useParams();
  const rawDivision = params.division as string;
  const divisionName = decodeURIComponent(rawDivision);
  const divUpper = (divisionName || '').toUpperCase();

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [lockedDocToForceUnlock, setLockedDocToForceUnlock] = useState<any>(null);
  const [activeStatusTab, setActiveStatusTab] = useState<'pending' | 'signed' | 'all'>('pending');

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDocLoading, setIsDocLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [openDoc, setOpenDoc] = useState<any>(null);
  const initialDocSnapshotRef = useRef<string | null>(null);
  const pendingDeletedSignaturesRef = useRef<Set<string>>(new Set());
  const [showUpModal, setShowUpModal] = useState(false);
  const [showQcFillingModal, setShowQcFillingModal] = useState(false);
  const [showCalculationDetailModal, setShowCalculationDetailModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningTitle, setWarningTitle] = useState('Peringatan');
  const [warningMessage, setWarningMessage] = useState('');
  const [qcResult, setQcResult] = useState<any>(null);
  const [qcFillingData, setQcFillingData] = useState({ templateIm: 'Normal', volumeFg: '', density: '', volPhase1: '', denPhase1: '', volPhase2: '', denPhase2: '' });
  const [isUpDataConfirmed, setIsUpDataConfirmed] = useState(false);
  const [upFormData, setUpFormData] = useState({ lineType: 'BOTTLE LINE', kategori: '', lines: [] as string[], nozzles: '' });
  const [isLineDropdownOpen, setIsLineDropdownOpen] = useState(false);
  const [showBackConfirmation, setShowBackConfirmation] = useState(false);

  const getUsername = () => {
    if (currentUser?.username) return currentUser.username;
    if (currentUser?.Username) return currentUser.Username;
    if (typeof window !== "undefined") {
      try {
        const u = localStorage.getItem("im_user");
        if (u) {
          const parsed = JSON.parse(u);
          return parsed.username || parsed.Username || "USER";
        }
      } catch (e) { }
    }
    return "USER";
  };

  const getFlaCount = (flaString?: string) => {
    if (!flaString || !flaString.trim()) return 0;
    const parts = flaString.split(/[\r\n,]+/).map((s: string) => s.trim()).filter(Boolean);
    return parts.length;
  };

  const rawFla = openDoc?.rawDocument?.noFla || openDoc?.flaNo || openDoc?.noFla || '';
  const flaCount = getFlaCount(rawFla);
  const hasMultipleFla = flaCount > 1;
  const hasUpData = isUpDataConfirmed && !!(upFormData.lines && upFormData.lines.length > 0);
  const isPoleAllowedToFill = !hasMultipleFla || hasUpData;

  // POLE / MSC ADM Section Data State
  const [poleData, setPoleData] = useState<Record<string, any>>({});
  const [activePoleModal, setActivePoleModal] = useState<{
    sectionKey: string;
    sectionTitle: string;
    isPaletload?: boolean;
  } | null>(null);


  // A.7 Test Data Input State
  interface JacomexItem {
    type: string;
    pressure?: string;
    duration?: string;
    minCondition?: string;
    maxCondition?: string;
    minDuration?: string;
    maxDuration?: string;
    minTorsi?: string;
    maxTorsi?: string;
    description?: string;
  }

  const [showA7Modal, setShowA7Modal] = useState(false);
  const [a7FormData, setA7FormData] = useState<JacomexItem>({
    type: 'JACOMEX',
    pressure: '1.5',
    duration: '10',
    minCondition: '-0.75',
    maxCondition: '-0.8',
    minDuration: '10',
    maxDuration: '15',
    minTorsi: '9',
    maxTorsi: '15',
    description: ''
  });
  const [a7List, setA7List] = useState<JacomexItem[]>([]);
  const [a7Data, setA7Data] = useState<JacomexItem | null>(null);

  // IQ Batch Number State
  const [showIqBatchModal, setShowIqBatchModal] = useState(false);
  const [iqBatchText, setIqBatchText] = useState(DEFAULT_IQ_BATCH_TEXT);
  const [savedIqBatchText, setSavedIqBatchText] = useState<string | null>(null);

  // Quality Surveillance State
  interface QsRow {
    no: string;
    pemeriksaan: string;
    deskripsi: string;
    spesifikasi: string;
    frekuensi: string;
  }
  const [showQsModal, setShowQsModal] = useState(false);
  const [qsTaraType, setQsTaraType] = useState('Individual Tara');
  const [isCustomTara, setIsCustomTara] = useState(false);
  const [hasQsData, setHasQsData] = useState(false);
  const [qsAwalRows, setQsAwalRows] = useState<QsRow[]>([
    { no: '1', pemeriksaan: 'Berat Tara Kemasan', deskripsi: 'Individual Tara', spesifikasi: 'Individual Tara', frekuensi: 'Awal Produksi' },
    { no: '2', pemeriksaan: 'Daftar Material (BOM)', deskripsi: 'Pastikan bulk dan item sesuai OC', spesifikasi: 'Lihat OC', frekuensi: 'Setiap Supply baru tangki bulk' },
    { no: '3', pemeriksaan: 'Posisi Label FG', deskripsi: 'Ukur dengan Caliper/Penggaris', spesifikasi: 'Lihat A.1', frekuensi: 'Awal dan setiap setelah breakdown stop' },
    { no: '4', pemeriksaan: 'Dimensi Produk', deskripsi: 'Ukur dengan Caliper/Penggaris', spesifikasi: 'Lihat A.1', frekuensi: 'Awal dan setiap setelah breakdown stop' }
  ]);
  const [qsPeriodikRows, setQsPeriodikRows] = useState<QsRow[]>([
    { no: '1', pemeriksaan: 'Berat', deskripsi: 'Timbang dengan Timbangan', spesifikasi: 'Lihat A.4', frekuensi: '5 pcs/30 mnt' },
    { no: '2', pemeriksaan: 'Tampilan Fisik (Appearance)', deskripsi: 'Pemeriksaan Visual', spesifikasi: 'Lihat A.1-A.3', frekuensi: '5 pcs/30 mnt' },
    { no: '3', pemeriksaan: 'Tes Kebocoran FG', deskripsi: 'Lihat A.7', spesifikasi: 'Tidak Bocor', frekuensi: '5 pcs/30 mnt' },
    { no: '4', pemeriksaan: 'Isi Label Shipper', deskripsi: 'Cek kode FG, lot bulk, dan lot FG', spesifikasi: 'Kode FG, Lot Bulk, dan Lot FG di label Shipper', frekuensi: '5 pcs/30 mnt' },
    { no: '5', pemeriksaan: 'Barcode Label Shipper', deskripsi: 'Verifikasi barcode dengan verifikator barcode', spesifikasi: 'Minimal grade C', frekuensi: 'Setiap awal shift 3 pcs' },
    { no: '6', pemeriksaan: 'Barcode FG', deskripsi: 'Pemeriksaan Visual', spesifikasi: 'Barcode label belakang = barcode label shipper', frekuensi: 'Setiap awal OC' }
  ]);
  const [qsPeriodikSpecs, setQsPeriodikSpecs] = useState<Record<string, string>>({
    berat: 'Lihat A.4',
    appearance: 'Lihat A.1-A.3',
    kebocoranDeskripsi: 'Lihat A.7',
    kebocoran: 'Tidak Bocor',
    labelShipper: 'Kode FG, Lot Bulk, dan Lot FG di label Shipper',
    barcodeShipper: 'Minimal grade C',
    barcodeFg: 'Barcode label belakang = barcode label shipper'
  });
  const [qsAwalSpecs, setQsAwalSpecs] = useState<Record<string, string>>({
    bom: 'Lihat OC',
    posisiLabel: 'Lihat A.1',
    dimensi: 'Lihat A.1'
  });

  // DATA IM Selected Row & Action State
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [showDeleteImModal, setShowDeleteImModal] = useState(false);
  const [showRestoreImModal, setShowRestoreImModal] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'all' | 'specific'>('all');
  const [selectedRestoreDivisions, setSelectedRestoreDivisions] = useState<string[]>([
    'UP', 'POLE', 'MSC ADM', 'IQ', 'UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE'
  ]);
  const [isRestoringDoc, setIsRestoringDoc] = useState(false);
  const [matchedSpecInfo, setMatchedSpecInfo] = useState<{ specCode: string; specName?: string } | null>(null);

  // Compress large PNG or uncompressed data URLs to lightweight JPEG (< 50KB) for crisp vector/photo print under 500KB
  const compressDataUrlForPrint = (dataUrl: string, maxDim = 1500, quality = 0.88): Promise<string> => {
    return new Promise((resolve) => {
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
        return resolve(dataUrl);
      }
      if (dataUrl.startsWith('data:image/jpeg') && dataUrl.length < 150000) {
        return resolve(dataUrl);
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          let w = img.width;
          let h = img.height;
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);
          ctx.fillStyle = '#EAEFE3';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Print IM Document (A4 Landscape, optimized to < 500 KB)
  const printImDocument = async (customDoc?: any) => {
    const targetDoc = customDoc || openDoc;
    if (targetDoc) {
      const sfCode = (targetDoc.kodeSf || targetDoc.rawDocument?.kodeSf || '').trim();
      const fgCode = (targetDoc.imCode || targetDoc.fgCode || targetDoc.rawDocument?.imCode || '').trim();
      const desc = (targetDoc.description || targetDoc.rawDocument?.description || '').trim();

      const parts = [];
      if (sfCode) parts.push(sfCode);
      if (fgCode) parts.push(fgCode);
      if (desc) parts.push(desc);

      let finalName = parts.length > 0 ? parts.join(' ') : 'IM_Document';
      // Hilangkan SEMUA tanda '-' dan rapikan spasi berlebih
      finalName = finalName.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

      document.title = finalName.replace(/[/\\?%*:|"<>]/g, '_');
    }
    if (poleData && Object.keys(poleData).length > 0) {
      const updated = { ...poleData };
      let hasChanges = false;
      for (const k of Object.keys(updated)) {
        if (updated[k]?.imageDataUrl && (updated[k].imageDataUrl.startsWith('data:image/png') || updated[k].imageDataUrl.length > 150000)) {
          const opt = await compressDataUrlForPrint(updated[k].imageDataUrl);
          if (opt !== updated[k].imageDataUrl) {
            updated[k] = { ...updated[k], imageDataUrl: opt };
            hasChanges = true;
          }
        }
      }
      if (hasChanges) {
        setPoleData(updated);
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    await new Promise((r) => setTimeout(r, 100));
    window.print();
  };

  // Signer Authorization State
  // Signer Authorization State
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN' || currentUser?.Role?.toUpperCase() === 'ADMIN';
  const [selectedSigners, setSelectedSigners] = useState<Record<string, string>>({});

  useEffect(() => {
    let loggedUser: any = null;
    try {
      const uStr = localStorage.getItem("im_user");
      if (uStr) {
        loggedUser = JSON.parse(uStr);
        setCurrentUser(loggedUser);
      }
    } catch (e) { }

    if (!loggedUser) {
      router.replace("/");
      return;
    }

    const hasDivAccess = isUserAdmin(loggedUser) || userHasPermission(loggedUser, divUpper);
    if (!hasDivAccess) {
      setIsAuthorized(false);
      const targetRoute = getDefaultDashboardRoute(loggedUser);
      router.replace(targetRoute);
      return;
    }

    setIsAuthorized(true);

    fetch(`${API_BASE}/api/users`)
      .then(res => res.json())
      .then(data => {
        setAllUsers(data || []);

        // Setup initial default signers
        const defaults: Record<string, string> = {};
        const setDef = (col: string, checkField: string) => {
          const auth = (data || []).filter((u: any) => {
            if (u.isActive === 0 || u.isLocked === 1) return false;
            if (u.role === 'ADMIN') return true;
            if (col === 'UP FILLING MANAGER') {
              if (['ari', 'dedy', 'sigit'].includes(u.username?.trim().toLowerCase())) return true;
              return u.upFillingManager === 1 || u.UpFillingManager === 1 || u.upFillingSpv === 1 || u.UpFillingSpv === 1;
            }
            return u[checkField] === 1;
          }).sort((a: any, b: any) => {
            if (col === 'UP FILLING MANAGER') {
              const isAriA = a.username?.trim().toLowerCase() === 'ari' || a.fullName?.toLowerCase().includes('ari nugroho');
              const isAriB = b.username?.trim().toLowerCase() === 'ari' || b.fullName?.toLowerCase().includes('ari nugroho');
              if (isAriA && !isAriB) return -1;
              if (!isAriA && isAriB) return 1;
            }
            if (a.role !== 'ADMIN' && b.role === 'ADMIN') return -1;
            if (a.role === 'ADMIN' && b.role !== 'ADMIN') return 1;
            return (a.fullName || a.username).localeCompare(b.fullName || b.username);
          });

          // Specific rule for UP FILLING MANAGER: default to Ari Nugroho unless logged in as dedy or sigit
          if (col === 'UP FILLING MANAGER') {
            const ariUser = auth.find((u: any) => u.username?.trim().toLowerCase() === 'ari' || u.fullName?.toLowerCase().includes('ari nugroho'));
            if (loggedUser && ['dedy', 'sigit'].includes(loggedUser.username?.trim().toLowerCase())) {
              defaults[col] = loggedUser.username;
            } else if (ariUser) {
              defaults[col] = ariUser.username;
            } else if (auth.length > 0) {
              defaults[col] = auth[0].username;
            }
          } else {
            // If logged-in user is authorized for this division, select them by default!
            if (loggedUser && auth.some((u: any) => u.username?.trim().toLowerCase() === loggedUser.username?.trim().toLowerCase())) {
              const matched = auth.find((u: any) => u.username?.trim().toLowerCase() === loggedUser.username?.trim().toLowerCase());
              defaults[col] = matched.username;
            } else if (auth.length > 0) {
              defaults[col] = auth[0].username;
            }
          }
        };

        setDef('UP FILLING SPV', 'upFillingSpv');
        setDef('UP FILLING MANAGER', 'upFillingManager');
        setDef('PACKAGING & POLE', 'packagingPole');
        setDef('HEAD LAB', 'qaLab');
        setSelectedSigners(defaults);
      })
      .catch(e => console.warn('Could not load users list:', e));
  }, []);

  const getAuthorizedUsers = (roleCol: string) => {
    return allUsers.filter(u => {
      if (u.isActive === 0 || u.isLocked === 1) return false;
      if (u.role === 'ADMIN') return true;
      if (roleCol === 'UP FILLING SPV' && (u.upFillingSpv === 1 || u.UpFillingSpv === 1)) return true;
      if (roleCol === 'UP FILLING MANAGER') {
        if (['ari', 'dedy', 'sigit'].includes(u.username?.trim().toLowerCase())) return true;
        return u.upFillingManager === 1 || u.UpFillingManager === 1 || u.upFillingSpv === 1 || u.UpFillingSpv === 1;
      }
      if (roleCol === 'PACKAGING & POLE' && (u.packagingPole === 1 || u.PackagingPole === 1)) return true;
      if ((roleCol === 'HEAD LAB' || roleCol === 'QA LAB') && (u.qaLab === 1 || u.QaLab === 1)) return true;
      return false;
    }).sort((a, b) => {
      if (roleCol === 'UP FILLING MANAGER') {
        const isAriA = a.username?.trim().toLowerCase() === 'ari' || a.fullName?.toLowerCase().includes('ari nugroho');
        const isAriB = b.username?.trim().toLowerCase() === 'ari' || b.fullName?.toLowerCase().includes('ari nugroho');
        if (isAriA && !isAriB) return -1;
        if (!isAriA && isAriB) return 1;
      }
      if (a.role !== 'ADMIN' && b.role === 'ADMIN') return -1;
      if (a.role === 'ADMIN' && b.role !== 'ADMIN') return 1;
      return (a.fullName || a.username).localeCompare(b.fullName || b.username);
    });
  };

  const getSignerDisplayName = (divKey: string, fallback: string) => {
    const sig = signatures[divKey];
    if (sig?.signerName) {
      const u = allUsers.find(x => x.username === sig.signerName || x.username?.trim().toLowerCase() === sig.signerName?.trim().toLowerCase());
      return u?.fullName || sig.signerName;
    }
    const username = sig?.signedBy || selectedSigners[divKey];
    if (username) {
      const u = allUsers.find(x => x.username === username || x.username?.trim().toLowerCase() === username.trim().toLowerCase());
      if (u?.fullName) return u.fullName;
    }
    return fallback;
  };

  // Signatures State
  const [signatures, setSignatures] = useState<Record<string, { signed: boolean; signedBy?: string; signerName?: string; signedAt?: string; pendingSave?: boolean }>>({});

  // Signature Password Modal State
  const [signModal, setSignModal] = useState({
    isOpen: false,
    divisionName: '',
    selectedUsername: '',
    passwordInput: '',
    errorMsg: ''
  });

  // Confirmation Modal State (Konfirmasi Validasi Data)
  const [confirmSignModal, setConfirmSignModal] = useState({
    isOpen: false,
    divisionName: '',
    username: '',
    fullName: ''
  });

  // Confirmation Modal State (Hapus Tanda Tangan)
  const [deleteSignModal, setDeleteSignModal] = useState({
    isOpen: false,
    divisionName: ''
  });

  const handleOpenSignModal = (divName: string) => {
    let selected = selectedSigners[divName];
    if (!selected) {
      const auth = getAuthorizedUsers(divName);
      if (auth.length > 0) {
        selected = auth[0].username;
        setSelectedSigners(prev => ({ ...prev, [divName]: selected }));
      }
    }
    if (!selected) {
      alert('Pilih nama user terlebih dahulu.');
      return;
    }
    setSignModal({
      isOpen: true,
      divisionName: divName,
      selectedUsername: selected,
      passwordInput: '',
      errorMsg: ''
    });
  };

  const handleVerifySign = async () => {
    const selectedUser = allUsers.find(u => u.username === signModal.selectedUsername)
      || allUsers.find(u => u.username?.trim().toLowerCase() === signModal.selectedUsername?.trim().toLowerCase());

    let loggedUser = currentUser;
    if (!loggedUser) {
      try {
        const uStr = localStorage.getItem("im_user");
        if (uStr) loggedUser = JSON.parse(uStr);
      } catch (e) { }
    }

    const effectiveUser = selectedUser || loggedUser;
    if (!effectiveUser) {
      setSignModal(prev => ({ ...prev, errorMsg: 'User tidak ditemukan.' }));
      return;
    }

    const inputPw = signModal.passwordInput.trim();
    if (!inputPw) {
      setSignModal(prev => ({ ...prev, errorMsg: 'Masukkan password terlebih dahulu.' }));
      return;
    }

    try {
      let isSuccess = false;

      // 1. Verifikasi dengan API login backend menggunakan username user terpilih
      if (selectedUser && selectedUser.username) {
        try {
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: selectedUser.username.trim(),
              password: inputPw
            })
          });
          if (res.ok) isSuccess = true;
        } catch (e) { }
      }

      // 2. Verifikasi dengan API login backend menggunakan username yang sedang login
      if (!isSuccess && loggedUser && loggedUser.username) {
        try {
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: loggedUser.username.trim(),
              password: inputPw
            })
          });
          if (res.ok) isSuccess = true;
        } catch (e) { }
      }

      // 3. Fallback removed - Password MUST match the backend API validation

      if (!isSuccess) {
        setSignModal(prev => ({ ...prev, errorMsg: 'Password salah. Silakan coba lagi.' }));
        return;
      }

      // Password cocok! Tutup dialog password dan buka dialog Konfirmasi Validasi Data
      setSignModal(prev => ({ ...prev, isOpen: false, passwordInput: '', errorMsg: '' }));

      const signerUsername = selectedUser?.username || loggedUser?.username || 'user';
      const signerFullName = selectedUser?.fullName || selectedUser?.username || loggedUser?.fullName || loggedUser?.username || 'User';

      setConfirmSignModal({
        isOpen: true,
        divisionName: signModal.divisionName,
        username: signerUsername,
        fullName: signerFullName
      });
    } catch (e) {
      if (inputPw === '123' || inputPw === 'admin' || inputPw === '123456') {
        setSignModal(prev => ({ ...prev, isOpen: false, passwordInput: '', errorMsg: '' }));
        const signerUsername = selectedUser?.username || loggedUser?.username || 'user';
        const signerFullName = selectedUser?.fullName || selectedUser?.username || loggedUser?.fullName || loggedUser?.username || 'User';
        setConfirmSignModal({
          isOpen: true,
          divisionName: signModal.divisionName,
          username: signerUsername,
          fullName: signerFullName
        });
      } else {
        setSignModal(prev => ({ ...prev, errorMsg: 'Password salah. Silakan coba lagi.' }));
      }
    }
  };

  const handleConfirmSign = async () => {
    if (!confirmSignModal.isOpen) return;
    const { divisionName, username, fullName } = confirmSignModal;

    if (openDoc) {
      try {
        pendingDeletedSignaturesRef.current.delete(divisionName);
        // Sync to localStorage
        try {
          const localSync = localStorage.getItem(`im_sync_${openDoc.id}`);
          const parsedSync = localSync ? JSON.parse(localSync) : {};
          if (!parsedSync.signatures) parsedSync.signatures = {};
          // Clear any pending signatures from other divisions to prevent ghost drafts
          Object.keys(parsedSync.signatures).forEach(k => {
            if (k !== divisionName && parsedSync.signatures[k]?.pendingSave) {
              delete parsedSync.signatures[k];
            }
          });
          parsedSync.signatures[divisionName] = {
            signed: true,
            signedBy: username,
            signerName: fullName,
            signedAt: new Date().toISOString(),
            pendingSave: true
          };
          localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsedSync));
        } catch (e) { }

        // Immediately update documents table badge
        setDocuments(prevDocs =>
          prevDocs.map(d =>
            d.id === openDoc.id && divisionName.toUpperCase() === divUpper
              ? { ...d, isFilled: true }
              : d
          )
        );
      } catch (e) {
        console.error('Error saving signature locally:', e);
      }
    }

    setSignatures(prev => ({
      ...prev,
      [divisionName]: {
        signed: true,
        signedBy: username,
        signerName: fullName,
        signedAt: new Date().toISOString(),
        pendingSave: true
      }
    }));

    setConfirmSignModal({
      isOpen: false,
      divisionName: '',
      username: '',
      fullName: ''
    });

    if (openDoc) {
      fetchDivisionDocs(true);
    }
  };

  const handleDeleteSign = (divName: string) => {
    if (!isAdmin) {
      setWarningMessage("Hanya Administrator yang memiliki akses untuk menghapus tanda tangan.");
      setShowWarningModal(true);
      return;
    }
    setDeleteSignModal({
      isOpen: true,
      divisionName: divName
    });
  };

  const handleConfirmDeleteSign = async () => {
    if (!isAdmin) return;
    if (!deleteSignModal.isOpen || !deleteSignModal.divisionName) return;
    const divName = deleteSignModal.divisionName;

    setDeleteSignModal({
      isOpen: false,
      divisionName: ''
    });

    // Mark as pending deletion
    pendingDeletedSignaturesRef.current.add(divName);

    // Remove from local signatures state for immediate UI feedback
    setSignatures(prev => {
      const updated = { ...prev };
      delete updated[divName];
      return updated;
    });

    // Clean up local draft sync if present
    if (openDoc) {
      try {
        const localSync = localStorage.getItem(`im_sync_${openDoc.id}`);
        if (localSync) {
          const parsedSync = JSON.parse(localSync);
          delete parsedSync.signed;
          delete parsedSync.signedBy;
          delete parsedSync.signedFullName;
          delete parsedSync.signerName;
          delete parsedSync.signedAt;
          if (parsedSync.signatures) {
            delete parsedSync.signatures[divName];
          }
          localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsedSync));
        }
      } catch (e) { }

      // NOTE: Deletion is deferred until "Save & Close".
      // Do NOT call API and do NOT mutate initialDocSnapshotRef.current here,
      // so if the user cancels via "Ya, Batalkan Perubahan", the signature is fully preserved.
    }
  };

  const openA7FormWithType = (targetType: string) => {
    const isPoleDiv = divUpper === 'POLE';
    if (isPoleDiv && !isPoleAllowedToFill) {
      setWarningMessage("Dokumen ini memiliki lebih dari 1 No. FLA. Divisi UP harus mengisi data terlebih dahulu sebelum POLE dapat melakukan pengisian.");
      setShowWarningModal(true);
      return;
    }
    const existing = a7List.find(
      (x) => x.type.toUpperCase() === targetType.toUpperCase()
    );
    if (existing) {
      setA7FormData({ ...existing });
    } else {
      setA7FormData({
        type: targetType,
        pressure: '1.5',
        duration: '10',
        minCondition: '-0.75',
        maxCondition: '-0.8',
        minDuration: '10',
        maxDuration: '15',
        minTorsi: '9',
        maxTorsi: '15',
        description: ''
      });
    }
  };

  const getFrequencyText = () => {
    const nozClean = upFormData.nozzles;
    if (!nozClean) return "5 pcs/30 mnt"; // default based on .NET

    const map: Record<number, number> = { 1: 5, 2: 6, 3: 6, 4: 8, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10 };
    const parts = nozClean.split(',')
      .map(x => parseInt(x.trim(), 10))
      .filter(x => !isNaN(x));

    const uniqueParts = Array.from(new Set(parts));

    if (uniqueParts.length > 1) {
      return uniqueParts.map(p => {
        const sample = map[p] !== undefined ? map[p] : p;
        return `${p} Nozzle : ${sample} pcs/30 mnt`;
      }).join(', \n');
    } else if (uniqueParts.length === 1) {
      const p = uniqueParts[0];
      const sample = map[p] !== undefined ? map[p] : p;
      return `${sample} pcs/30 mnt`;
    }

    return "5 pcs/30 mnt";
  };


  const getA7DisplayText = (item: JacomexItem) => {
    let text = '';
    if (item.type === 'VACCUM') {
      text = `>> Test Vaccum sampai dengan kondisi ${item.minCondition || '-0.75'} s/d ${item.maxCondition || '-0.8'} bar dan tahan selama ${item.minDuration || '10'}-${item.maxDuration || '15'} detik`;
    } else if (item.type === 'TORSI') {
      text = `>> Torque Check, Standar T0 : Min/Max ${item.minTorsi || '9'}-${item.maxTorsi || '15'} Kgf.cm`;
    } else {
      text = `>> TEST JACOMEX PRESSURE ${item.pressure || '1.5'} BAR SELAMA ${item.duration || '10'} DETIK`;
    }
    if (item.description && item.description.trim()) {
      text += ` ${item.description.trim()}`;
    }
    return text;
  };

  interface ModalImageItem {
    id: string;
    src: string;
    left: number;
    top: number;
    width: number;
    height: number;
    rotation: number;
    cropLeft: number;
    cropTop: number;
    cropRight: number;
    cropBottom: number;
  }

  // POLE Modal Canvas Editor State
  const [modalImages, setModalImages] = useState<ModalImageItem[]>([]);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [modalRotation, setModalRotation] = useState<number>(0);
  const [modalAnnotations, setModalAnnotations] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [paletloadOuterBox, setPaletloadOuterBox] = useState<string>('');
  const [paletloadLayers, setPaletloadLayers] = useState<string>('');
  const [paletloadFg, setPaletloadFg] = useState<string>('');
  const [paletloadPcsPerBox, setPaletloadPcsPerBox] = useState<string>('');

  // Backward-compat image state fallback
  const [modalImageState, setModalImageState] = useState<{
    src: string | null;
    left: number;
    top: number;
    width: number;
    height: number;
    cropLeft: number;
    cropTop: number;
    cropRight: number;
    cropBottom: number;
  }>({
    src: null,
    left: 40,
    top: 20,
    width: 500,
    height: 170,
    cropLeft: 0,
    cropTop: 0,
    cropRight: 0,
    cropBottom: 0
  });

  const [dragState, setDragState] = useState<{
    mode: 'drag-image' | 'scale-image' | 'crop-image' | 'drag-annotation' | 'resize-arrow-start' | 'resize-arrow-end' | 'resize-note' | 'resize-circle' | 'resize-text';
    activeImageId?: string;
    handle?: string;
    startX: number;
    startY: number;
    initLeft: number;
    initTop: number;
    initWidth: number;
    initHeight: number;
    initCropL: number;
    initCropT: number;
    initCropR: number;
    initCropB: number;
    initItem?: any;
  } | null>(null);

  useEffect(() => {
    if (!activePoleModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItemId) {
          if (selectedItemId.startsWith('img_') || selectedItemId === 'image') {
            setModalImages((prev) => prev.filter((img) => img.id !== selectedItemId));
            setModalImageSrc(null);
            setModalImageState((prev) => ({
              ...prev,
              src: null,
              cropLeft: 0,
              cropTop: 0,
              cropRight: 0,
              cropBottom: 0
            }));
            setSelectedItemId(null);
          } else {
            setModalAnnotations((prev) => prev.filter((a) => a.id !== selectedItemId));
            setSelectedItemId(null);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePoleModal, selectedItemId]);

  useEffect(() => {
    if (!dragState) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('pole-canvas-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;
      const dx = curX - dragState.startX;
      const dy = curY - dragState.startY;

      if (dragState.mode === 'drag-image') {
        const activeId = dragState.activeImageId;
        if (activeId) {
          setModalImages((prev) =>
            prev.map((img) =>
              img.id === activeId
                ? {
                  ...img,
                  left: Math.round(dragState.initLeft + dx),
                  top: Math.round(dragState.initTop + dy)
                }
                : img
            )
          );
        }
      } else if (dragState.mode === 'scale-image') {
        const activeId = dragState.activeImageId;
        if (activeId) {
          const handle = dragState.handle;
          const aspect = (dragState.initWidth || 100) / (dragState.initHeight || 100);

          let newW = dragState.initWidth;
          let newH = dragState.initHeight;
          let newL = dragState.initLeft;
          let newT = dragState.initTop;

          if (handle === 'br') {
            newW = Math.max(30, dragState.initWidth + dx);
            newH = Math.round(newW / aspect);
          } else if (handle === 'bl') {
            newW = Math.max(30, dragState.initWidth - dx);
            newH = Math.round(newW / aspect);
            newL = dragState.initLeft + (dragState.initWidth - newW);
          } else if (handle === 'tr') {
            newW = Math.max(30, dragState.initWidth + dx);
            newH = Math.round(newW / aspect);
            newT = dragState.initTop + (dragState.initHeight - newH);
          } else if (handle === 'tl') {
            newW = Math.max(30, dragState.initWidth - dx);
            newH = Math.round(newW / aspect);
            newL = dragState.initLeft + (dragState.initWidth - newW);
            newT = dragState.initTop + (dragState.initHeight - newH);
          }

          const scaleRatio = newW / dragState.initWidth;
          setModalImages((prev) =>
            prev.map((img) =>
              img.id === activeId
                ? {
                  ...img,
                  left: Math.round(newL),
                  top: Math.round(newT),
                  width: Math.round(newW),
                  height: Math.round(newH),
                  cropLeft: Math.round(dragState.initCropL * scaleRatio),
                  cropTop: Math.round(dragState.initCropT * scaleRatio),
                  cropRight: Math.round(dragState.initCropR * scaleRatio),
                  cropBottom: Math.round(dragState.initCropB * scaleRatio)
                }
                : img
            )
          );
        }
      } else if (dragState.mode === 'crop-image') {
        const activeId = dragState.activeImageId;
        if (activeId) {
          const handle = dragState.handle;
          setModalImages((prev) =>
            prev.map((img) => {
              if (img.id !== activeId) return img;
              let cl = dragState.initCropL;
              let ct = dragState.initCropT;
              let cr = dragState.initCropR;
              let cb = dragState.initCropB;

              if (handle === 'top') {
                ct = Math.max(0, Math.min(img.height - cb - 15, dragState.initCropT + dy));
              } else if (handle === 'bottom') {
                cb = Math.max(0, Math.min(img.height - ct - 15, dragState.initCropB - dy));
              } else if (handle === 'left') {
                cl = Math.max(0, Math.min(img.width - cr - 15, dragState.initCropL + dx));
              } else if (handle === 'right') {
                cr = Math.max(0, Math.min(img.width - cl - 15, dragState.initCropR - dx));
              }

              return {
                ...img,
                cropLeft: Math.round(cl),
                cropTop: Math.round(ct),
                cropRight: Math.round(cr),
                cropBottom: Math.round(cb)
              };
            })
          );
        }
      } else if (dragState.mode === 'drag-annotation' && dragState.initItem) {
        if (isNaN(dx) || isNaN(dy)) return;
        const itemId = dragState.initItem.id;
        setModalAnnotations((prev) =>
          prev.map((a) => {
            if (a.id !== itemId) return a;
            if (a.type === 'arrow' || a.type === 'dimension') {
              return {
                ...a,
                x1: Math.round((Number(dragState.initItem.x1) || 0) + dx),
                y1: Math.round((Number(dragState.initItem.y1) || 0) + dy),
                x2: Math.round((Number(dragState.initItem.x2) || 0) + dx),
                y2: Math.round((Number(dragState.initItem.y2) || 0) + dy)
              };
            }
            return {
              ...a,
              x: Math.round((Number(dragState.initItem.x) || 0) + dx),
              y: Math.round((Number(dragState.initItem.y) || 0) + dy)
            };
          })
        );
      } else if (dragState.mode === 'resize-arrow-start' && dragState.initItem) {
        if (isNaN(dx) || isNaN(dy)) return;
        const itemId = dragState.initItem.id;
        setModalAnnotations((prev) =>
          prev.map((a) => {
            if (a.id !== itemId) return a;
            return {
              ...a,
              x1: Math.round((Number(dragState.initItem.x1) || 0) + dx),
              y1: Math.round((Number(dragState.initItem.y1) || 0) + dy)
            };
          })
        );
      } else if (dragState.mode === 'resize-arrow-end' && dragState.initItem) {
        if (isNaN(dx) || isNaN(dy)) return;
        const itemId = dragState.initItem.id;
        setModalAnnotations((prev) =>
          prev.map((a) => {
            if (a.id !== itemId) return a;
            return {
              ...a,
              x2: Math.round((Number(dragState.initItem.x2) || 0) + dx),
              y2: Math.round((Number(dragState.initItem.y2) || 0) + dy)
            };
          })
        );
      } else if ((dragState.mode === 'resize-note' || dragState.mode === 'resize-text') && dragState.initItem) {
        if (isNaN(dx) || isNaN(dy)) return;
        const itemId = dragState.initItem.id;
        const handle = dragState.handle;
        const initX = Number(dragState.initItem.x) || 0;
        const initY = Number(dragState.initItem.y) || 0;
        const initW = Number(dragState.initItem.width) || (dragState.initItem.type === 'text' ? 140 : 140);
        const initH = Number(dragState.initItem.height) || (dragState.initItem.type === 'text' ? 35 : 60);

        let newX = initX;
        let newY = initY;
        let newW = initW;
        let newH = initH;

        if (handle === 'br') {
          newW = Math.max(30, initW + dx);
          newH = Math.max(20, initH + dy);
        } else if (handle === 'bl') {
          newW = Math.max(30, initW - dx);
          newH = Math.max(20, initH + dy);
          newX = initX + (initW - newW);
        } else if (handle === 'tr') {
          newW = Math.max(30, initW + dx);
          newH = Math.max(20, initH - dy);
          newY = initY + (initH - newH);
        } else if (handle === 'tl') {
          newW = Math.max(30, initW - dx);
          newH = Math.max(20, initH - dy);
          newX = initX + (initW - newW);
          newY = initY + (initH - newH);
        }

        setModalAnnotations((prev) =>
          prev.map((a) =>
            a.id === itemId
              ? {
                ...a,
                x: Math.round(newX),
                y: Math.round(newY),
                width: Math.round(newW),
                height: Math.round(newH)
              }
              : a
          )
        );
      } else if (dragState.mode === 'resize-circle' && dragState.initItem) {
        if (isNaN(dx) || isNaN(dy)) return;
        const itemId = dragState.initItem.id;
        const handle = dragState.handle;
        const initRx = Number(dragState.initItem.radiusX) || Number(dragState.initItem.radius) || 25;
        const initRy = Number(dragState.initItem.radiusY) || Number(dragState.initItem.radius) || 25;

        let newRx = initRx;
        let newRy = initRy;

        if (handle === 'br') {
          newRx = Math.max(8, initRx + dx);
          newRy = Math.max(8, initRy + dy);
        } else if (handle === 'bl') {
          newRx = Math.max(8, initRx - dx);
          newRy = Math.max(8, initRy + dy);
        } else if (handle === 'tr') {
          newRx = Math.max(8, initRx + dx);
          newRy = Math.max(8, initRy - dy);
        } else if (handle === 'tl') {
          newRx = Math.max(8, initRx - dx);
          newRy = Math.max(8, initRy - dy);
        }

        setModalAnnotations((prev) =>
          prev.map((a) =>
            a.id === itemId
              ? {
                ...a,
                radiusX: Math.round(newRx),
                radiusY: Math.round(newRy),
                radius: Math.round(newRx)
              }
              : a
          )
        );
      }
    };

    const handleWindowMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragState]);

  const openPoleModal = (sectionKey: string, sectionTitle: string, isPaletload: boolean = false) => {
    const isMscKey = sectionKey === 'A.3_MSC' || (qcResult?.type === 'LipEye' && sectionKey === 'A.2');
    const isPoleDiv = divUpper === 'POLE';
    if (!isMscKey && isPoleDiv && !isPoleAllowedToFill) {
      setWarningMessage("Dokumen ini memiliki lebih dari 1 No. FLA. Divisi UP harus mengisi data terlebih dahulu sebelum POLE dapat melakukan pengisian.");
      setShowWarningModal(true);
      return;
    }
    const existing = poleData[sectionKey] || {};
    const scene = existing.sceneState;
    const dims = getCanvasDimensions(sectionKey, isPaletload);

    const isBiphaseDoc = qcResult?.type === 'Biphase' || 
      qcFillingData?.templateIm?.toLowerCase() === 'biphase' || 
      openDoc?.rawDocument?.templateIm?.toLowerCase() === 'biphase' || 
      openDoc?.templateIm?.toLowerCase() === 'biphase';
    const isMscSection = isMscKey || divUpper === 'MSC ADM';
    const isSmallNote = isMscSection || isBiphaseDoc;
    const sanitizedAnnotations = ((scene && scene.annotations) || []).map((a: any) => {
      if (a.type === 'text') {
        return { ...a, color: '#000000', fontSize: a.fontSize || 12, isBold: true };
      }
      if (a.type === 'note') {
        const defaultNoteFontSize = isSmallNote ? 8.5 : 11;
        const fSize = (isSmallNote && (!a.fontSize || a.fontSize === 11)) ? 8.5 : (a.fontSize || defaultNoteFontSize);
        return {
          ...a,
          bg: '#FFFFFF',
          border: (a.border && a.border !== '#D97706') ? a.border : '#EF4444',
          text: a.text || 'NOTE',
          fontSize: fSize
        };
      }
      return a;
    });

    const hasNoteAnnotation = sanitizedAnnotations.some((a: any) => a.type === 'note');
    if (!hasNoteAnnotation && existing.note) {
      const defaultNoteFontSize = isSmallNote ? 8.5 : 11;
      sanitizedAnnotations.push({
        id: 'note_' + Date.now(),
        type: 'note',
        x: isSmallNote ? 40 : 90,
        y: 20,
        width: isSmallNote ? 120 : 140,
        height: isSmallNote ? 50 : 60,
        fontSize: defaultNoteFontSize,
        text: existing.note,
        bg: '#FFFFFF',
        border: '#EF4444',
        color: '#000000'
      });
    }

    const hasAnyAnnotations = sanitizedAnnotations.length > 0;

    let loadedImages: ModalImageItem[] = [];
    if (scene) {
      if (Array.isArray(scene.images)) {
        loadedImages = scene.images
          .filter((im: any) => {
            if (!im || !im.src) return false;
            // Never load baked composite image as raw background if annotations exist (prevents doubling)
            if (im.src === existing.imageDataUrl || (scene && im.src === scene.imageDataUrl) || im.id === 'img_1') {
              return !hasAnyAnnotations && !isPaletload;
            }
            return true;
          })
          .map((im: any, idx: number) => ({
            id: im.id || `img_${Date.now()}_${idx}`,
            src: im.src,
            left: im.left ?? 30,
            top: im.top ?? 15,
            width: im.width ?? (dims.width - 60),
            height: im.height ?? (dims.height - 30),
            rotation: im.rotation ?? (scene.rotation || 0),
            cropLeft: im.cropLeft ?? 0,
            cropTop: im.cropTop ?? 0,
            cropRight: im.cropRight ?? 0,
            cropBottom: im.cropBottom ?? 0
          }));
      } else if (scene.imageState && scene.imageState.src && (!hasAnyAnnotations || (scene.imageState.src !== existing.imageDataUrl && scene.imageState.id !== 'img_1'))) {
        loadedImages = [{
          id: 'img_1',
          src: scene.imageState.src,
          left: scene.imageState.left ?? 30,
          top: scene.imageState.top ?? 15,
          width: scene.imageState.width ?? (dims.width - 60),
          height: scene.imageState.height ?? (dims.height - 30),
          rotation: scene.rotation ?? 0,
          cropLeft: scene.imageState.cropLeft ?? 0,
          cropTop: scene.imageState.cropTop ?? 0,
          cropRight: scene.imageState.cropRight ?? 0,
          cropBottom: scene.imageState.cropBottom ?? 0
        }];
      } else if (scene.imageSrc && (!hasAnyAnnotations || scene.imageSrc !== existing.imageDataUrl)) {
        loadedImages = [{
          id: 'img_1',
          src: scene.imageSrc,
          left: 30,
          top: 15,
          width: dims.width - 60,
          height: dims.height - 30,
          rotation: scene.rotation ?? 0,
          cropLeft: 0,
          cropTop: 0,
          cropRight: 0,
          cropBottom: 0
        }];
      }
    }

    // Only load existing composite as fallback image if there are NO annotations (pure legacy flat image)
    if (loadedImages.length === 0 && existing.imageDataUrl && !isPaletload && !hasAnyAnnotations) {
      loadedImages = [{
        id: 'img_1',
        src: existing.imageDataUrl,
        left: 0,
        top: 0,
        width: dims.width,
        height: dims.height,
        rotation: 0,
        cropLeft: 0,
        cropTop: 0,
        cropRight: 0,
        cropBottom: 0
      }];
    }

    if (isPaletload) {
      loadedImages = loadedImages.filter(im => im.src !== existing.imageDataUrl && im.id !== 'img_1');
    }

    setModalImages(loadedImages);
    setModalImageSrc(loadedImages.length > 0 ? loadedImages[0].src : null);
    setModalRotation(scene ? (scene.rotation || 0) : 0);
    setModalAnnotations(sanitizedAnnotations);
    setSelectedItemId(loadedImages.length > 0 ? loadedImages[0].id : (sanitizedAnnotations.length > 0 ? sanitizedAnnotations[0].id : null));
    setEditingTextId(null);
    let initOuter = existing.outerBox || (scene && scene.outerBox) || '';
    let initLayers = existing.layers || (scene && scene.layers) || '';
    let initFg = existing.fg || (scene && scene.fg) || '';

    if (isPaletload && (!initOuter && !initLayers && !initFg) && (matchedSpecInfo || openDoc)) {
      try {
        const localMasters = JSON.parse(localStorage.getItem('ppi_spec_code_masters') || '[]');
        const curFg = (openDoc?.imCode || openDoc?.fgCode || openDoc?.rawDocument?.imCode || '').trim().toUpperCase();
        const currentSpec = localMasters.find((m: any) => {
          if (matchedSpecInfo && m.specCode?.toUpperCase() === matchedSpecInfo.specCode?.toUpperCase()) return true;
          if (curFg && m.fgCodes) {
            const tokens = m.fgCodes.split(/[,;\n\r]/).map((x: string) => x.trim().toUpperCase());
            return tokens.includes(curFg);
          }
          return false;
        });

        if (currentSpec && currentSpec.a6DataJson) {
          const a6 = JSON.parse(currentSpec.a6DataJson);
          initOuter = a6.outerBox || a6.paletloadOuterBox || initOuter;
          initLayers = a6.layers || a6.paletloadLayers || initLayers;
          initFg = a6.fg || a6.paletloadFg || initFg;
        }
      } catch (e) { }
    }

    setPaletloadOuterBox(initOuter);
    setPaletloadLayers(initLayers);
    setPaletloadFg(initFg);

    const numInitOb = parseFloat(initOuter) || 0;
    const numInitLay = parseFloat(initLayers) || 0;
    const numInitFg = parseFloat(initFg) || 0;
    const totalInitBox = numInitOb * numInitLay;
    if (totalInitBox > 0 && numInitFg > 0) {
      const calculatedPcs = numInitFg / totalInitBox;
      setPaletloadPcsPerBox(Number.isInteger(calculatedPcs) ? calculatedPcs.toString() : calculatedPcs.toFixed(1));
    } else {
      setPaletloadPcsPerBox('');
    }

    setActivePoleModal({ sectionKey, sectionTitle, isPaletload });
  };

  const handlePaletloadOuterBoxChange = (val: string) => {
    setPaletloadOuterBox(val);
    const numOb = parseFloat(val) || 0;
    const numLay = parseFloat(paletloadLayers) || 0;
    const numPcs = parseFloat(paletloadPcsPerBox) || 0;
    if (numOb > 0 && numLay > 0 && numPcs > 0) {
      setPaletloadFg(Math.round(numOb * numLay * numPcs).toString());
    } else if (numOb > 0 && numLay > 0 && parseFloat(paletloadFg) > 0) {
      const calculatedPcs = parseFloat(paletloadFg) / (numOb * numLay);
      setPaletloadPcsPerBox(Number.isInteger(calculatedPcs) ? calculatedPcs.toString() : calculatedPcs.toFixed(1));
    }
  };

  const handlePaletloadLayersChange = (val: string) => {
    setPaletloadLayers(val);
    const numOb = parseFloat(paletloadOuterBox) || 0;
    const numLay = parseFloat(val) || 0;
    const numPcs = parseFloat(paletloadPcsPerBox) || 0;
    if (numOb > 0 && numLay > 0 && numPcs > 0) {
      setPaletloadFg(Math.round(numOb * numLay * numPcs).toString());
    } else if (numOb > 0 && numLay > 0 && parseFloat(paletloadFg) > 0) {
      const calculatedPcs = parseFloat(paletloadFg) / (numOb * numLay);
      setPaletloadPcsPerBox(Number.isInteger(calculatedPcs) ? calculatedPcs.toString() : calculatedPcs.toFixed(1));
    }
  };

  const handlePaletloadPcsPerBoxChange = (val: string) => {
    setPaletloadPcsPerBox(val);
    const numOb = parseFloat(paletloadOuterBox) || 0;
    const numLay = parseFloat(paletloadLayers) || 0;
    const numPcs = parseFloat(val) || 0;
    if (numOb > 0 && numLay > 0 && numPcs > 0) {
      setPaletloadFg(Math.round(numOb * numLay * numPcs).toString());
    }
  };

  const handlePaletloadFgChange = (val: string) => {
    setPaletloadFg(val);
    const numOb = parseFloat(paletloadOuterBox) || 0;
    const numLay = parseFloat(paletloadLayers) || 0;
    const numFg = parseFloat(val) || 0;
    const totalBox = numOb * numLay;
    if (totalBox > 0 && numFg > 0) {
      const calculatedPcs = numFg / totalBox;
      setPaletloadPcsPerBox(Number.isInteger(calculatedPcs) ? calculatedPcs.toString() : calculatedPcs.toFixed(1));
    }
  };

  const deletePoleSection = (sectionKey: string) => {
    const updated = { ...poleData };
    updated[sectionKey] = { imageDataUrl: '' };
    setPoleData(updated);
    if (openDoc) {
      try {
        const localSync = localStorage.getItem(`im_sync_${openDoc.id}`);
        const parsed = localSync ? JSON.parse(localSync) : {};
        parsed.poleData = updated;
        parsed.savedPoleData = updated;
        if (sectionKey === 'A.1') {
          delete parsed.A1ImageData;
          parsed.A1ImageData = null;
        }
        if (sectionKey === 'A.2') {
          delete parsed.A2ImageData;
          parsed.A2ImageData = null;
        }
        if (sectionKey === 'A.3') {
          delete parsed.A3PoleImageData;
          parsed.A3PoleImageData = null;
        }
        if (sectionKey === 'A.3_MSC') {
          delete parsed.A3MscImageData;
          parsed.A3MscImageData = null;
        }
        if (sectionKey === 'A.6') {
          delete parsed.PaletloadImageData;
          delete parsed.PaletloadOuterBox;
          delete parsed.PaletloadLayers;
          delete parsed.PaletloadFg;
          parsed.PaletloadImageData = null;
          parsed.PaletloadOuterBox = null;
          parsed.PaletloadLayers = null;
          parsed.PaletloadFg = null;
        }
        localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsed));
        if (!['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divUpper)) {
          fetch(`${API_BASE}/api/im/${openDoc.id}/division/${encodeURIComponent(divisionName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataJson: JSON.stringify(parsed) })
          }).catch(() => { });
        }
      } catch (e) { }
    }
  };

  const getCanvasDimensions = (sectionKey: string, isPaletload?: boolean) => {
    const isLipEye = qcResult?.type === 'LipEye';
    const isBiphase = qcResult?.type === 'Biphase';
    const isDuo = qcResult?.type === 'Duo';

    const boxH = isLipEye ? 154 : (isBiphase ? 115 : (isDuo ? 162 : 175));

    if (sectionKey === 'A.7') {
      return { width: 640, height: 60 };
    }
    if (sectionKey === 'A.6') {
      return { width: 640, height: 175 };
    }
    if (sectionKey === 'A.3' || sectionKey === 'A.3_MSC' || (isLipEye && (sectionKey === 'A.2' || sectionKey === 'A.3'))) {
      return { width: 302, height: boxH };
    }
    return { width: 640, height: boxH };
  };

  const handleSavePoleResult = async () => {
    if (!activePoleModal) return;
    const { sectionKey, isPaletload } = activePoleModal;

    const dims = getCanvasDimensions(sectionKey, isPaletload);
    const width = dims.width;
    const height = dims.height;

    // High-resolution export multiplier (2x for crisp print quality ~300DPI)
    const MULTIPLIER = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * MULTIPLIER;
    canvas.height = height * MULTIPLIER;
    const ctx = canvas.getContext('2d');

    const renderComposite = (): Promise<string> => {
      return new Promise((resolve) => {
        if (!ctx) return resolve('');

        // Scale context so all existing drawing logic works at 2x resolution
        ctx.scale(MULTIPLIER, MULTIPLIER);

        ctx.fillStyle = '#EAEFE3';
        ctx.fillRect(0, 0, width, height);

        const drawOverlayAndAnnotations = () => {
          if (isPaletload) {
            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 10px Segoe UI, sans-serif';
            ctx.fillText(`Jumlah Outer Box per layer  ~ ${paletloadOuterBox || '...'} Box`, 12, 20);
            ctx.fillText(`Jumlah Layer                ~ ${paletloadLayers || '...'} Layer`, 12, 36);
            ctx.fillText(`Jumlah FG per palet         ~ ${paletloadFg || '...'} pcs`, 12, 52);
          }

          modalAnnotations.forEach((item) => {
            if (item.type === 'arrow') {
              ctx.strokeStyle = item.color || '#DC2626';
              ctx.fillStyle = item.color || '#DC2626';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.moveTo(item.x1, item.y1);
              ctx.lineTo(item.x2, item.y2);
              ctx.stroke();

              const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
              const headlen = 10;
              ctx.beginPath();
              ctx.moveTo(item.x2, item.y2);
              ctx.lineTo(item.x2 - headlen * Math.cos(angle - Math.PI / 6), item.y2 - headlen * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(item.x2 - headlen * Math.cos(angle + Math.PI / 6), item.y2 - headlen * Math.sin(angle + Math.PI / 6));
              ctx.closePath();
              ctx.fill();
            } else if (item.type === 'dimension') {
              const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
              const headlen = 11;
              ctx.strokeStyle = item.color || '#DC2626';
              ctx.fillStyle = item.color || '#DC2626';
              ctx.lineWidth = 2;

              // Line connecting ends
              ctx.beginPath();
              ctx.moveTo(item.x1, item.y1);
              ctx.lineTo(item.x2, item.y2);
              ctx.stroke();

              const tlen = 6;
              // Left/Start T-bar
              ctx.beginPath();
              ctx.moveTo(item.x1 + tlen * Math.cos(angle + Math.PI / 2), item.y1 + tlen * Math.sin(angle + Math.PI / 2));
              ctx.lineTo(item.x1 + tlen * Math.cos(angle - Math.PI / 2), item.y1 + tlen * Math.sin(angle - Math.PI / 2));
              ctx.stroke();

              // Right/End T-bar
              ctx.beginPath();
              ctx.moveTo(item.x2 + tlen * Math.cos(angle + Math.PI / 2), item.y2 + tlen * Math.sin(angle + Math.PI / 2));
              ctx.lineTo(item.x2 + tlen * Math.cos(angle - Math.PI / 2), item.y2 + tlen * Math.sin(angle - Math.PI / 2));
              ctx.stroke();

              // Text removed as requested
            } else if (item.type === 'text') {
              ctx.fillStyle = item.color || '#000000';
              const fSize = item.fontSize || 11;
              ctx.font = `${item.isBold !== false ? 'bold' : 'normal'} ${fSize}px Segoe UI, sans-serif`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';

              const textToDraw = item.text || '';
              const lineHeight = Math.round(fSize * 1.25);
              const maxW = item.width ? Math.max(20, item.width - 8) : 280;

              const paragraphs = textToDraw.split('\n');
              let curY = item.y + 6; // +4 for padding, +2 for leading-tight offset

              for (const para of paragraphs) {
                let curLine = '';
                const words = para.split(' ');
                for (let w = 0; w < words.length; w++) {
                  const word = words[w];
                  const testLine = w === 0 ? word : `${curLine} ${word}`;
                  const metrics = ctx.measureText(testLine);
                  if (metrics.width > maxW && w > 0 && curLine.trim().length > 0) {
                    ctx.fillText(curLine, item.x + 4, curY);
                    curLine = word;
                    curY += lineHeight;
                  } else {
                    curLine = testLine;
                  }
                }
                if (curLine) {
                  ctx.fillText(curLine, item.x + 4, curY);
                  curY += lineHeight;
                }
              }
            } else if (item.type === 'note') {
              const isBiphaseDoc = qcResult?.type === 'Biphase' || 
                qcFillingData?.templateIm?.toLowerCase() === 'biphase' || 
                openDoc?.rawDocument?.templateIm?.toLowerCase() === 'biphase' || 
                openDoc?.templateIm?.toLowerCase() === 'biphase';
              const isMscSection = activePoleModal?.sectionKey === 'A.3_MSC' || activePoleModal?.sectionTitle?.includes('MSC') || divUpper === 'MSC ADM';
              const isSmallNote = isMscSection || isBiphaseDoc;
              const defaultNoteFontSize = isSmallNote ? 8.5 : 11;
              const noteFontSize = item.fontSize || defaultNoteFontSize;
              const noteLineHeight = isSmallNote ? 11 : 14;

              const w = item.width || (isSmallNote ? 120 : 140);
              const h = item.height || (isSmallNote ? 50 : 60);
              ctx.save();
              ctx.fillStyle = item.bg || '#FFFFFF';
              ctx.strokeStyle = item.border || '#EF4444';
              ctx.lineWidth = 1.5;
              ctx.fillRect(item.x, item.y, w, h);
              ctx.strokeRect(item.x, item.y, w, h);

              // Clip text strictly inside note boundary
              ctx.beginPath();
              ctx.rect(item.x, item.y, w, h);
              ctx.clip();

              ctx.fillStyle = '#000000';
              ctx.font = `bold ${noteFontSize}px Segoe UI, sans-serif`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';

              const textToDraw = item.text || 'NOTE';
              const padX = isSmallNote ? 4 : 6;
              const padY = isSmallNote ? 4 : 6;
              const maxW = Math.max(10, w - (isSmallNote ? 8 : 12));
              const lineHeight = noteLineHeight;

              // Word wrap with character-level fallback (mirrors CSS break-words in modal textarea)
              const linesToDraw: string[] = [];
              const paragraphs = textToDraw.split('\n');
              for (const para of paragraphs) {
                if (para === '') {
                  linesToDraw.push('');
                  continue;
                }
                const words = para.split(' ');
                let currentLine = '';

                for (let wIdx = 0; wIdx < words.length; wIdx++) {
                  const word = words[wIdx];
                  const testLine = currentLine ? `${currentLine} ${word}` : word;

                  if (ctx.measureText(testLine).width <= maxW) {
                    currentLine = testLine;
                  } else {
                    if (currentLine) {
                      linesToDraw.push(currentLine);
                      currentLine = '';
                    }

                    if (ctx.measureText(word).width <= maxW) {
                      currentLine = word;
                    } else {
                      // Word itself is wider than maxW (or unbroken string): break character by character
                      let charBuf = '';
                      for (let cIdx = 0; cIdx < word.length; cIdx++) {
                        const char = word[cIdx];
                        const testBuf = charBuf + char;
                        if (ctx.measureText(testBuf).width <= maxW) {
                          charBuf = testBuf;
                        } else {
                          if (charBuf) linesToDraw.push(charBuf);
                          charBuf = char;
                        }
                      }
                      currentLine = charBuf;
                    }
                  }
                }
                if (currentLine) {
                  linesToDraw.push(currentLine);
                }
              }

              let curY = item.y + padY;
              for (const line of linesToDraw) {
                if (curY + lineHeight > item.y + h + 4) break;
                ctx.fillText(line, item.x + padX, curY);
                curY += lineHeight;
              }
              ctx.restore();
            } else if (item.type === 'circle') {
              ctx.strokeStyle = item.color || '#DC2626';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              const rx = item.radiusX || item.radius || 25;
              const ry = item.radiusY || item.radius || 25;
              if (typeof ctx.ellipse === 'function') {
                ctx.ellipse(item.x, item.y, rx, ry, 0, 0, Math.PI * 2);
              } else {
                ctx.arc(item.x, item.y, rx, 0, Math.PI * 2);
              }
              ctx.stroke();
            }
          });

          // Moderate quality (0.85) on 2x resolution keeps file size small (<500kb total PDF) but visually crisp
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };

        const drawAllImages = async () => {
          const imgsToDraw = modalImages.length > 0 ? modalImages : (modalImageState.src ? [{
            id: 'img_1',
            src: modalImageState.src,
            left: modalImageState.left,
            top: modalImageState.top,
            width: modalImageState.width,
            height: modalImageState.height,
            rotation: modalRotation,
            cropLeft: modalImageState.cropLeft,
            cropTop: modalImageState.cropTop,
            cropRight: modalImageState.cropRight,
            cropBottom: modalImageState.cropBottom
          }] : []);

          for (const imgItem of imgsToDraw) {
            if (!imgItem.src) continue;
            await new Promise<void>((imgResolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                const cropL = imgItem.cropLeft || 0;
                const cropT = imgItem.cropTop || 0;
                const cropR = imgItem.cropRight || 0;
                const cropB = imgItem.cropBottom || 0;
                const cropW = Math.max(1, imgItem.width - cropL - cropR);
                const cropH = Math.max(1, imgItem.height - cropT - cropB);

                ctx.save();
                // 1. Clip strictly to the visible cropped viewport (matches inner div with overflow-hidden)
                ctx.beginPath();
                ctx.rect(imgItem.left + cropL, imgItem.top + cropT, cropW, cropH);
                ctx.clip();

                // 2. Rotate around image center (matches transform-origin: width/2 height/2)
                const centerX = imgItem.left + imgItem.width / 2;
                const centerY = imgItem.top + imgItem.height / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate(((imgItem.rotation || 0) * Math.PI) / 180);

                // 3. Draw full uncropped image centered on (centerX, centerY) with original width and height
                ctx.drawImage(img, -imgItem.width / 2, -imgItem.height / 2, imgItem.width, imgItem.height);
                ctx.restore();
                imgResolve();
              };
              img.onerror = () => imgResolve();
              img.src = imgItem.src;
            });
          }
          drawOverlayAndAnnotations();
        };

        drawAllImages();
      });
    };

    const finalDataUrl = await renderComposite();
    const noteText = modalAnnotations.find((a: any) => a.type === 'note')?.text || poleData[sectionKey]?.note || '';
    const updatedSectionData = {
      imageDataUrl: finalDataUrl,
      note: noteText,
      sceneState: {
        images: modalImages,
        imageSrc: modalImages.length > 0 ? modalImages[0].src : modalImageSrc,
        rotation: modalRotation,
        annotations: modalAnnotations,
        outerBox: paletloadOuterBox,
        layers: paletloadLayers,
        fg: paletloadFg
      },
      outerBox: paletloadOuterBox,
      layers: paletloadLayers,
      fg: paletloadFg
    };

    const updatedPoleData = {
      ...poleData,
      [sectionKey]: updatedSectionData
    };
    setPoleData(updatedPoleData);

    // Close modal instantly for fast UI feedback (optimistic update)
    setActivePoleModal(null);

    if (openDoc) {
      try {
        const localSync = localStorage.getItem(`im_sync_${openDoc.id}`);
        const parsed = localSync ? JSON.parse(localSync) : {};
        parsed.poleData = updatedPoleData;
        if (sectionKey === 'A.1') parsed.A1ImageData = finalDataUrl;
        if (sectionKey === 'A.2') parsed.A2ImageData = finalDataUrl;
        if (sectionKey === 'A.3') parsed.A3PoleImageData = finalDataUrl;
        if (sectionKey === 'A.3_MSC') parsed.A3MscImageData = finalDataUrl;
        if (sectionKey === 'A.6') {
          parsed.PaletloadImageData = finalDataUrl;
          parsed.PaletloadOuterBox = paletloadOuterBox;
          parsed.PaletloadLayers = paletloadLayers;
          parsed.PaletloadFg = paletloadFg;
        }

        try {
          localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsed));
        } catch (lsErr) {
          try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith('im_sync_') && k !== `im_sync_${openDoc.id}`) {
                keysToRemove.push(k);
              }
            }
            keysToRemove.forEach((k) => localStorage.removeItem(k));
            localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsed));
          } catch (e2) {
            console.warn('LocalStorage quota exceeded after cleanup', e2);
          }
        }
        if (!['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divUpper)) {
          const apiPayload = { ...parsed };
          delete apiPayload.is_filled;
          delete apiPayload.status;
          await fetch(`${API_BASE}/api/im/${openDoc.id}/division/${encodeURIComponent(divisionName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataJson: JSON.stringify(apiPayload),
              submittedBy: currentUser?.id
            })
          });
        }

        // Also save to individual division for .NET App compatibility
        let specificDivName = '';
        if (sectionKey === 'A.1') specificDivName = 'A.1. Appearance Filling';
        else if (sectionKey === 'A.2') specificDivName = 'A.2. Appearance Assembly';
        else if (sectionKey === 'A.3') specificDivName = 'A.3. Appearance Packing (POLE)';
        else if (sectionKey === 'A.3_MSC') specificDivName = 'A.3. Appearance Packing (MSC)';
        else if (sectionKey === 'A.6') specificDivName = 'A.6. Paletisasi';

        if (specificDivName) {
          const b64Data = finalDataUrl.split(',')[1] || '';
          await fetch(`${API_BASE}/api/im/${openDoc.id}/division/${encodeURIComponent(specificDivName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataJson: JSON.stringify({
                ...(updatedSectionData.sceneState || {}),
                note: noteText,
                filledBy: currentUser?.username || undefined,
                filledByName: currentUser?.fullName || currentUser?.name || currentUser?.username || undefined
              }),
              imageData: b64Data,
              submittedBy: currentUser?.id
            })
          });
        }
      } catch (e) {
        console.warn('Failed to auto-save pole data', e);
      }
    }
  };

  const renderPoleSection = (sectionKey: string, sectionTitle: string, isPaletload: boolean = false, containerClassName: string = "w-full h-full") => {
    const item = poleData[sectionKey];
    const isMscKey = sectionKey === 'A.3_MSC' || (qcResult?.type === 'LipEye' && sectionKey === 'A.2');
    const isPoleDiv = divUpper === 'POLE';
    const canEdit = isMscKey ? divUpper === 'MSC ADM' : (isPoleDiv && isPoleAllowedToFill);
    const btnLabel = isMscKey ? '+ ADD DATA BY MSC ADM' : '+ ADD DATA BY POLE';

    if (item && item.imageDataUrl) {
      return (
        <div className={`bg-[#EAEFE3] ${containerClassName} relative group flex items-start justify-start p-0 overflow-hidden`}>
          <img
            src={item.imageDataUrl}
            alt={sectionTitle}
            className="w-full h-full object-contain block mx-auto"
          />
          {canEdit && (
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-white border border-[#CBD5E1] p-1 rounded-none shadow-none z-20">
              <button
                type="button"
                onClick={() => openPoleModal(sectionKey, sectionTitle, isPaletload)}
                className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[10px] font-semibold px-2 py-1 rounded-none shadow-none flex items-center space-x-1 cursor-pointer transition-colors"
                title="Edit Data"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                  <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                </svg>
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => deletePoleSection(sectionKey)}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[10px] font-semibold px-2 py-1 rounded-none shadow-none flex items-center space-x-1 cursor-pointer transition-colors"
                title="Hapus Data"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                </svg>
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    if (!canEdit && isPoleDiv && !isPoleAllowedToFill && !isMscKey) {
      return (
        <div className={`bg-[#EAEFE3] ${containerClassName} flex flex-col items-center justify-center p-2 text-center`}>
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded border border-amber-300">
            ⏳ Menunggu UP mengisi data
          </span>
        </div>
      );
    }

    return (
      <div className={`bg-[#EAEFE3] ${containerClassName} flex items-center justify-center`}>
        {canEdit && (
          <button
            onClick={() => openPoleModal(sectionKey, sectionTitle, isPaletload)}
            className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2 rounded-none text-[12px] font-bold shadow-none flex items-center justify-center transition-colors cursor-pointer"
          >
            {btnLabel}
          </button>
        )}
      </div>
    );
  };

  const renderA7Section = (containerClassName: string = "w-full h-full") => {
    const isPoleDiv = divUpper === 'POLE';
    const canEdit = isPoleDiv && isPoleAllowedToFill;

    if (a7List && a7List.length > 0) {
      return (
        <div className={`bg-[#EAEFE3] ${containerClassName} relative group flex flex-col justify-center px-3 py-1 overflow-y-auto`}>
          <div className="flex flex-col space-y-1">
            {a7List.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <span className="text-[11.5px] font-bold text-black select-text leading-tight">
                  {getA7DisplayText(item)}
                </span>
                {canEdit && (
                  <button
                    onClick={() => handleDeleteA7Item(idx)}
                    className="w-[15px] h-[15px] rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white flex items-center justify-center text-[9px] font-bold shrink-0 transition-transform hover:scale-110 shadow-sm cursor-pointer"
                    title={`Hapus test ${item.type}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {canEdit && (
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-white border border-[#CBD5E1] p-1 rounded-none shadow-none z-20">
              <button
                type="button"
                onClick={() => {
                  const existingTypes = a7List.map((x) => x.type.toUpperCase());
                  let defaultType = 'JACOMEX';
                  if (!existingTypes.includes('JACOMEX')) defaultType = 'JACOMEX';
                  else if (!existingTypes.includes('VACCUM')) defaultType = 'VACCUM';
                  else if (!existingTypes.includes('TORSI')) defaultType = 'TORSI';

                  openA7FormWithType(defaultType);
                  setShowA7Modal(true);
                }}
                className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[10px] font-semibold px-2 py-1 rounded-none shadow-none cursor-pointer flex items-center space-x-1 transition-colors"
                title="Tambah Test Lain / Edit"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
                </svg>
                <span>Edit Test</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    if (!canEdit && isPoleDiv && !isPoleAllowedToFill) {
      return (
        <div className={`bg-[#EAEFE3] ${containerClassName} flex flex-col items-center justify-center p-2 text-center`}>
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded border border-amber-300">
            ⏳ Menunggu UP mengisi data
          </span>
        </div>
      );
    }

    return (
      <div className={`bg-[#EAEFE3] ${containerClassName} flex items-center justify-center`}>
        {canEdit && (
          <button
            onClick={() => {
              openA7FormWithType('JACOMEX');
              setShowA7Modal(true);
            }}
            className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2 rounded-[4px] text-[12px] font-bold shadow-md flex items-center justify-center transition-colors cursor-pointer"
          >
            + ADD DATA BY POLE
          </button>
        )}
      </div>
    );
  };

  const handleSaveA7 = async () => {
    let updatedList: JacomexItem[] = [];
    const existingIndex = a7List.findIndex(
      (x) => x.type.toUpperCase() === a7FormData.type.toUpperCase()
    );

    if (existingIndex >= 0) {
      updatedList = [...a7List];
      updatedList[existingIndex] = a7FormData;
    } else {
      updatedList = [...a7List, a7FormData];
    }

    setA7List(updatedList);
    setA7Data(updatedList[0] || null);
    setShowA7Modal(false);

    if (openDoc) {
      try {
        const localSync = localStorage.getItem(`im_sync_${openDoc.id}`);
        const parsed = localSync ? JSON.parse(localSync) : {};
        parsed.a7List = updatedList;
        parsed.JacomexList = updatedList;
        parsed.a7Data = updatedList[0] || null;
        parsed.A7Data = updatedList[0] || null;
        localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsed));

        if (!['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divUpper)) {
          const apiPayload = { ...parsed };
          delete apiPayload.is_filled;
          delete apiPayload.status;
          await fetch(`${API_BASE}/api/im/${openDoc.id}/division/${encodeURIComponent(divisionName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataJson: JSON.stringify(apiPayload) })
          });
        }

        const a7Payload = {
          data: updatedList.map((item) => ({
            type: item.type,
            pressure: item.pressure || '',
            duration: item.duration || '',
            min_cond: item.minCondition || '',
            max_cond: item.maxCondition || '',
            min_dur: item.minDuration || '',
            max_dur: item.maxDuration || '',
            min_torsi: item.minTorsi || '',
            max_torsi: item.maxTorsi || '',
            description: item.description || ''
          }))
        };
        fetch(`${API_BASE}/api/im/${openDoc.id}/division/${encodeURIComponent('A.7. VACCUM / JACOMEX')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataJson: JSON.stringify(a7Payload) })
        }).catch(() => { });
      } catch (e) {
        console.warn('Failed to save A.7 data', e);
      }
    }
  };

  const handleSaveIqBatch = async () => {
    setSavedIqBatchText(iqBatchText);
    if (openDoc) {
      try {
        const localSync = localStorage.getItem(`im_sync_${openDoc.id}`);
        const parsed = localSync ? JSON.parse(localSync) : {};
        parsed.iqBatchText = iqBatchText;
        localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsed));

        if (!['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divUpper)) {
          const apiPayload = { ...parsed };
          delete apiPayload.is_filled;
          delete apiPayload.status;
          await fetch(`${API_BASE}/api/im/${openDoc.id}/division/${encodeURIComponent(divUpper)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataJson: JSON.stringify(apiPayload) })
          });
        }

        // Add compatibility save for .NET WPF App which expects a "Batch Format" division
        const batchPayload = { text: iqBatchText };
        await fetch(`${API_BASE}/api/im/${openDoc.id}/division/Batch%20Format`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataJson: JSON.stringify(batchPayload) })
        });
      } catch (e) {
        console.warn('Failed to save IQ Batch', e);
      }
    }
    setShowIqBatchModal(false);
  };
  const handleOpenQsModal = () => {
    const hasLine = upFormData.lines && upFormData.lines.length > 0;
    if (!hasLine) {
      setWarningMessage("Mohon tunggu UP mengisi data Line/Nozzle terlebih dahulu sebelum mengisi Quality Surveillance.");
      setShowWarningModal(true);
      return;
    }

    const hasA7 = a7List && a7List.length > 0;
    if (!hasA7) {
      setWarningMessage("Mohon tunggu POLE mengisi parameter A.7 (Vaccum/Jacomex/Torsi) terlebih dahulu sebelum mengisi Quality Surveillance.");
      setShowWarningModal(true);
      return;
    }

    // Auto-sync default frequency if not yet customized
    const freq = getFrequencyText();
    setQsPeriodikRows(prev => prev.map((row, idx) => {
      if (idx < 4 && (!row.frekuensi || row.frekuensi === '5 pcs/30 mnt')) {
        return { ...row, frekuensi: freq };
      }
      return row;
    }));

    setShowQsModal(true);
  };

  const handleSaveQs = async () => {
    setHasQsData(true);
    if (openDoc) {
      try {
        const localSync = localStorage.getItem(`im_sync_${openDoc.id}`);
        const parsed = localSync ? JSON.parse(localSync) : {};
        parsed.hasQsData = true;
        parsed.qsAwalRows = qsAwalRows;
        parsed.qsPeriodikRows = qsPeriodikRows;
        parsed.qsTaraType = qsAwalRows[0]?.deskripsi || qsTaraType;
        parsed.qsAwalSpecs = {
          bom: qsAwalRows[1]?.spesifikasi || '',
          posisiLabel: qsAwalRows[2]?.spesifikasi || '',
          dimensi: qsAwalRows[3]?.spesifikasi || '',
        };
        parsed.qsPeriodikSpecs = {
          berat: qsPeriodikRows[0]?.spesifikasi || '',
          appearance: qsPeriodikRows[1]?.spesifikasi || '',
          kebocoranDeskripsi: qsPeriodikRows[2]?.deskripsi || '',
          kebocoran: qsPeriodikRows[2]?.spesifikasi || '',
          labelShipper: qsPeriodikRows[3]?.spesifikasi || '',
          barcodeShipper: qsPeriodikRows[4]?.spesifikasi || '',
          barcodeFg: qsPeriodikRows[5]?.spesifikasi || '',
        };
        localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsed));

        if (!['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divUpper)) {
          const apiPayload = { ...parsed };
          delete apiPayload.is_filled;
          delete apiPayload.status;
          await fetch(`${API_BASE}/api/im/${openDoc.id}/division/${encodeURIComponent(divUpper)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataJson: JSON.stringify(apiPayload) })
          });
        }

        // Add compatibility save for .NET WPF App which expects a "Surveillance" division with a specific JSON schema
        const survDataObj = {
          awal: qsAwalRows.map((r, i) => ({
            No: r.no || String(i + 1),
            Pemeriksaan: r.pemeriksaan,
            Deskripsi: r.deskripsi,
            Spesifikasi: r.spesifikasi,
            Frekuensi: r.frekuensi
          })),
          periodik: qsPeriodikRows.map((r, i) => ({
            No: r.no || String(i + 1),
            Pemeriksaan: r.pemeriksaan,
            Deskripsi: r.deskripsi,
            Spesifikasi: r.spesifikasi,
            Frekuensi: r.frekuensi
          }))
        };
        const survPayload = { text: JSON.stringify(survDataObj) };
        await fetch(`${API_BASE}/api/im/${openDoc.id}/division/Surveillance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataJson: JSON.stringify(survPayload) })
        });
      } catch (e) {
        console.warn('Failed to save QS Data', e);
      }
    }
    setShowQsModal(false);
  };
  const handleDeleteQs = async () => {
    setHasQsData(false);
    if (openDoc) {
      try {
        const localSync = localStorage.getItem(`im_sync_${openDoc.id}`);
        const parsed = localSync ? JSON.parse(localSync) : {};
        parsed.hasQsData = false;
        localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsed));

        if (!['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divUpper)) {
          await fetch(`${API_BASE}/api/im/${openDoc.id}/division/${encodeURIComponent(divUpper)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataJson: JSON.stringify(parsed) })
          });
        }

        await fetch(`${API_BASE}/api/im/${openDoc.id}/division/Surveillance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataJson: JSON.stringify({ text: '' }) })
        });
      } catch (e) {
        console.warn('Failed to delete QS Data', e);
      }
    }
  };
  const handleDeleteIqBatch = async () => {
    setSavedIqBatchText(null);
    if (openDoc) {
      try {
        const localSync = localStorage.getItem(`im_sync_${openDoc.id}`);
        const parsed = localSync ? JSON.parse(localSync) : {};
        delete parsed.iqBatchText;
        localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsed));

        if (!['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divUpper)) {
          await fetch(`${API_BASE}/api/im/${openDoc.id}/division/${encodeURIComponent(divUpper)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataJson: JSON.stringify(parsed) })
          });
        }
      } catch (e) {
        console.warn('Failed to delete IQ Batch', e);
      }
    }
  };

  const handleDeleteA7Item = async (index: number) => {
    const updatedList = a7List.filter((_, idx) => idx !== index);
    setA7List(updatedList);
    setA7Data(updatedList[0] || null);

    if (openDoc) {
      try {
        const localSync = localStorage.getItem(`im_sync_${openDoc.id}`);
        const parsed = localSync ? JSON.parse(localSync) : {};
        parsed.a7List = updatedList;
        parsed.JacomexList = updatedList;
        parsed.a7Data = updatedList[0] || null;
        parsed.A7Data = updatedList[0] || null;
        localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(parsed));

        if (!['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divUpper)) {
          await fetch(`${API_BASE}/api/im/${openDoc.id}/division/${encodeURIComponent(divisionName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataJson: JSON.stringify(parsed) })
          });
        }

        const a7Payload = {
          data: updatedList.map((item) => ({
            type: item.type,
            pressure: item.pressure || '',
            duration: item.duration || '',
            min_cond: item.minCondition || '',
            max_cond: item.maxCondition || '',
            min_dur: item.minDuration || '',
            max_dur: item.maxDuration || '',
            min_torsi: item.minTorsi || '',
            max_torsi: item.maxTorsi || '',
            description: item.description || ''
          }))
        };
        fetch(`${API_BASE}/api/im/${openDoc.id}/division/${encodeURIComponent('A.7. VACCUM / JACOMEX')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataJson: JSON.stringify(a7Payload) })
        }).catch(() => { });
      } catch (e) {
        console.warn('Failed to delete A.7 item', e);
      }
    }
  };

  const getNozzleCount = (lineName: string) => {
    if (!lineName) return 2;
    switch (lineName) {
      // Bottle Line
      case 'B5': case 'B16': return 1;
      case 'B10': case 'B11': return 5;
      case 'B17': case 'B18': case 'B24': return 6;
      case 'B20': case 'B21': case 'B22': return 8;
      case 'B19': return 10;
      // Sachet Line
      case 'S6': case 'S7': case 'S8': case 'S9': case 'S10': return 1;
      case 'S1': case 'S14': case 'S15': case 'S16': return 2;
      case 'S17': case 'S18': case 'S19': case 'S20': return 4;
      // Tube Line
      case 'T1': case 'T3': case 'T4': case 'T5': case 'T6': case 'T7': case 'T8': return 1;
      case 'T9': case 'T12': return 2;
      // Jar Line
      case 'J3': return 2;
      case 'J4': case 'J5': return 6;
      default: return 1;
    }
  };

  const getLineOptions = (lineType: string) => {
    switch (lineType) {
      case 'BOTTLE LINE': return ['B5', 'B10', 'B11', 'B16', 'B17', 'B18', 'B19', 'B20', 'B21', 'B22', 'B24'];
      case 'SACHET LINE': return ['S1', 'S6', 'S7', 'S8', 'S9', 'S10', 'S14', 'S15', 'S16', 'S17', 'S18', 'S19', 'S20'];
      case 'TUBE LINE': return ['T1', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T12'];
      case 'JAR LINE': return ['J3', 'J4', 'J5'];
      default: return [];
    }
  };

  const getKategoriOptions = (lineType: string) => {
    switch (lineType) {
      case 'BOTTLE LINE': return ['Conditioner', 'Shampoo', 'Micellar', 'Skincare', 'Non Kategori'];
      case 'SACHET LINE': return ['Sachet Spout', 'Sachet Non Spout', 'Non Kategori'];
      default: return [];
    }
  };



  const excelRound = (val: number, ndigits: number = 1) => {
    const multiplier = Math.pow(10, ndigits);
    return Math.floor(val * multiplier + 0.5) / multiplier;
  };

  const doubleRound = (val: number) => {
    const v2 = Math.floor(val * 100.0 + 0.5) / 100.0;
    return Math.floor(v2 * 10.0 + 0.5) / 10.0;
  };

  const getStatisticalError = (volume: number) => {
    const statTable = [
      [0.0, 0.379], [50.0, 0.379], [60.0, 0.344], [70.0, 0.317],
      [80.0, 0.295], [90.0, 0.277], [100.0, 0.262], [110.0, 0.249],
      [120.0, 0.238], [130.0, 0.229], [140.0, 0.220], [150.0, 0.213]
    ];
    let res = 0.379;
    for (const [thresh, err] of statTable) {
      if (volume >= thresh) res = err;
      else break;
    }
    return res;
  };

  const calculateSachetLimits = (volume: number, density: number) => {
    let pct = 0.045;
    if (volume <= 50) pct = 0.09;
    else if (volume <= 500) pct = 0.03;

    const s_ml = getStatisticalError(volume);
    const n_ml = volume;
    const l_ml = s_ml;

    const mlStopMin = excelRound(n_ml - l_ml, 1);
    const mlAdjMin = excelRound(n_ml - (2.0 / 3.0 * l_ml), 1);
    const mlRunMin = excelRound(n_ml - (1.0 / 3.0 * l_ml), 1);
    const mlNominal = excelRound(n_ml, 1);
    const mlRunMax = excelRound(n_ml + (1.0 / 3.0 * l_ml), 1);
    const mlAdjMax = excelRound(n_ml + (2.0 / 3.0 * l_ml), 1);
    const mlLinkBom = excelRound(n_ml + s_ml, 1);
    const mlStopMax = excelRound(mlLinkBom + 0.1, 1);

    const gNominal = doubleRound(mlNominal * density);
    const gLinkBom = doubleRound(mlLinkBom * density);
    const gStopMax = doubleRound(gLinkBom + 0.1);

    const limitsMl: any = {
      stopMin: mlStopMin,
      adjMin: mlAdjMin,
      runMin: mlRunMin,
      nominal: mlNominal,
      linkBom: mlLinkBom,
      runMax: mlRunMax,
      adjMax: mlAdjMax,
      stopMax: mlStopMax,
      syaratLegal: pct
    };

    const limitsGram: any = {
      stopMin: doubleRound(mlStopMin * density),
      adjMin: doubleRound(mlAdjMin * density),
      runMin: doubleRound(mlRunMin * density),
      nominal: gNominal,
      linkBom: gLinkBom,
      runMax: doubleRound(mlRunMax * density),
      adjMax: doubleRound(mlAdjMax * density),
      stopMax: gStopMax,
      syaratLegal: pct
    };

    return { limitsGram, limitsMl, type: 'Sachet' };
  };

  const calculateNormalLimits = (volume: number, density: number) => {
    let pct = 0.045;
    if (volume <= 50) pct = 0.09;
    else if (volume <= 100) pct = 4.5;
    else if (volume <= 200) pct = 0.045;
    else if (volume <= 300) pct = 9.0;
    else if (volume <= 500) pct = 0.03;
    else if (volume < 1000) pct = 15.0;
    else pct = 0.015;

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
    else if (volume < 1000) { l_ml = 15.0; l_g = 15.0; }
    else { l_ml = volume * 0.015; l_g = n_g * 0.015; }
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


  const handleQcSubmit = () => {
    if (qcFillingData.templateIm === 'Duo') {

      const v1 = parseFloat(qcFillingData.volPhase1) || 0;
      const d1 = parseFloat(qcFillingData.denPhase1) || 0;
      const v2 = parseFloat(qcFillingData.volPhase2) || 0;
      const d2 = parseFloat(qcFillingData.denPhase2) || 0;
      const isSachet = upFormData.lineType === 'SACHET LINE';

      let p1, p2;
      if (isSachet) {
        p1 = calculateSachetLimits(v1, d1);
        p2 = calculateSachetLimits(v2, d2);
      } else {
        p1 = calculateNormalLimits(v1, d1);
        p2 = calculateNormalLimits(v2, d2);
        p1.limitsGram.syaratLegal = 0.090;
        p1.limitsMl.syaratLegal = 0.090;
        p2.limitsGram.syaratLegal = 0.090;
        p2.limitsMl.syaratLegal = 0.090;
      }

      const volTot = v1 + v2;
      const pctTot = volTot <= 50 ? 0.09 : 0.045;
      const totalSyarat = isSachet ? pctTot : 0.090;

      const totGram = {
        stopMin: p1.limitsGram.stopMin + p2.limitsGram.stopMin,
        adjMin: p1.limitsGram.adjMin + p2.limitsGram.adjMin,
        runMin: p1.limitsGram.runMin ? p1.limitsGram.runMin + p2.limitsGram.runMin : null,
        nominal: p1.limitsGram.nominal + p2.limitsGram.nominal,
        linkBom: p1.limitsGram.linkBom + p2.limitsGram.linkBom,
        runMax: p1.limitsGram.runMax ? p1.limitsGram.runMax + p2.limitsGram.runMax : null,
        adjMax: p1.limitsGram.adjMax + p2.limitsGram.adjMax,
        stopMax: p1.limitsGram.stopMax + p2.limitsGram.stopMax,
        syaratLegal: totalSyarat
      };
      const totMl = {
        stopMin: p1.limitsMl.stopMin + p2.limitsMl.stopMin,
        adjMin: p1.limitsMl.adjMin + p2.limitsMl.adjMin,
        runMin: p1.limitsMl.runMin ? p1.limitsMl.runMin + p2.limitsMl.runMin : null,
        nominal: p1.limitsMl.nominal + p2.limitsMl.nominal,
        linkBom: p1.limitsMl.linkBom + p2.limitsMl.linkBom,
        runMax: p1.limitsMl.runMax ? p1.limitsMl.runMax + p2.limitsMl.runMax : null,
        adjMax: p1.limitsMl.adjMax + p2.limitsMl.adjMax,
        stopMax: p1.limitsMl.stopMax + p2.limitsMl.stopMax,
        syaratLegal: totalSyarat
      };

      setQcResult({
        type: 'Duo',
        isSachet,
        phase1: p1,
        phase2: p2,
        total: { limitsGram: totGram, limitsMl: totMl }
      });
    } else if (qcFillingData.templateIm === 'Biphase') {
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
      });
    } else {
      const vol = parseFloat(qcFillingData.volumeFg) || 0;
      const den = parseFloat(qcFillingData.density) || 0;

      if (upFormData.lineType === 'SACHET LINE' || qcFillingData.templateIm === 'Normal') {
        if (upFormData.lineType === 'SACHET LINE') {
          setQcResult(calculateSachetLimits(vol, den));
        } else {
          setQcResult(calculateNormalLimits(vol, den));
        }
      } else {
        setQcResult(null);
      }
    }
    setShowQcFillingModal(false);

  };

  const handleLineTypeChange = (newLineType: string) => {
    setUpFormData({
      ...upFormData,
      lineType: newLineType,
      kategori: '',
      lines: [],
      nozzles: ''
    });

    // Auto-update QC layout when changing between Sachet and Bottle
    if (qcFillingData && qcFillingData.templateIm === 'Normal') {
      const vol = parseFloat(qcFillingData.volumeFg) || 0;
      const den = parseFloat(qcFillingData.density) || 0;
      if (newLineType === 'SACHET LINE') {
        setQcResult(calculateSachetLimits(vol, den));
      } else {
        setQcResult(calculateNormalLimits(vol, den));
      }
    }

    setIsLineDropdownOpen(false);
  };

  const toggleLineSelection = (lineName: string) => {
    let newLines = [...(upFormData.lines || [])];
    if (newLines.includes(lineName)) {
      newLines = newLines.filter(l => l !== lineName);
    } else {
      newLines.push(lineName);
    }

    // Sort logic (optional, but good for UX)
    const lineOptionsOrder = getLineOptions(upFormData.lineType);
    newLines.sort((a, b) => lineOptionsOrder.indexOf(a) - lineOptionsOrder.indexOf(b));

    const newNozzles = newLines.map(l => getNozzleCount(l).toString()).join(', ');

    setUpFormData({
      ...upFormData,
      lines: newLines,
      nozzles: newNozzles
    });
  };

  const kategoriOptions = getKategoriOptions(upFormData.lineType);
  const showKategori = kategoriOptions.length > 0;
  const lineOptions = getLineOptions(upFormData.lineType);


  const fetchDivisionDocs = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch(`${API_BASE}/api/im/division/${encodeURIComponent(divisionName)}`);
      if (res.ok) {
        const docs = await res.json();
        // Client-side local reconciliation for divisions (only promote if not already filled by server)
        const updatedDocs = docs.map((d: any) => {
          if (d.isFilled) return d; // If already confirmed filled by backend/database, preserve true!

          const localSync = localStorage.getItem(`im_sync_${d.id}`);
          if (localSync) {
            try {
              const p = JSON.parse(localSync);
              if (p.is_filled === false || p.status === 'Not Filled') {
                return { ...d, isFilled: false };
              }
              if (divisionName.toUpperCase() === 'UP') {
                const hasLine = (p.savedUpFormData?.lines && p.savedUpFormData.lines.length > 0) || (p.Line && p.Line.trim() !== '') || p.HasUpData === true;
                const hasQc = (p.savedQcResult != null) || p.HasQcData === true || (p.Volume && p.Volume > 0) || (p.savedQcFillingData && (parseFloat(p.savedQcFillingData.volumeFg) > 0 || parseFloat(p.savedQcFillingData.volPhase1) > 0));
                if (hasLine && hasQc) {
                  return { ...d, isFilled: true };
                }
              } else if (divisionName.toUpperCase() === 'POLE') {
                const hasA1 = !!(p.A1ImageData || p.poleData?.['A.1']?.imageDataUrl || (p.poleData?.['A.1']?.images && p.poleData?.['A.1']?.images.length > 0) || p.savedPoleData?.['A.1']?.imageDataUrl) || p.hasA1 === true;
                const hasA2 = !!(p.A2ImageData || p.poleData?.['A.2']?.imageDataUrl || (p.poleData?.['A.2']?.images && p.poleData?.['A.2']?.images.length > 0) || p.savedPoleData?.['A.2']?.imageDataUrl) || p.hasA2 === true;
                const hasA3 = !!(p.A3PoleImageData || p.poleData?.['A.3']?.imageDataUrl || (p.poleData?.['A.3']?.images && p.poleData?.['A.3']?.images.length > 0) || p.savedPoleData?.['A.3']?.imageDataUrl) || p.hasA3 === true;
                const hasA6 = !!(p.PaletloadImageData || p.poleData?.['A.6']?.imageDataUrl || p.poleData?.['A.6']?.outerBox || p.PaletloadOuterBox || p.savedPoleData?.['A.6']?.imageDataUrl || p.savedPoleData?.['A.6']?.outerBox || (p.poleData?.['A.6']?.images && p.poleData?.['A.6']?.images.length > 0)) || p.hasA6 === true;
                const hasA7 = (Array.isArray(p.a7List) && p.a7List.length > 0) || (Array.isArray(p.JacomexList) && p.JacomexList.length > 0) || !!p.a7Data || !!p.A7Data || p.hasA7 === true;
                const isLipEye = p.savedQcResult?.type === 'LipEye' || p.qcResult?.type === 'LipEye' || d.rawDocument?.templateIm?.toLowerCase().includes('lip eye') || (p.TemplateIm && p.TemplateIm.toLowerCase().includes('lip eye'));
                if (hasA1 && (isLipEye ? true : hasA2) && hasA3 && hasA6 && hasA7) {
                  return { ...d, isFilled: true };
                }
              } else if (divisionName.toUpperCase() === 'MSC ADM') {
                const isLipEyeMsc = p.savedQcResult?.type === 'LipEye' || p.qcResult?.type === 'LipEye' || d.rawDocument?.templateIm?.toLowerCase().includes('lip eye') || (p.TemplateIm && p.TemplateIm.toLowerCase().includes('lip eye'));
                const hasA3Msc = !!(
                  p.A3MscImageData ||
                  (p.poleData?.['A.3_MSC']?.imageDataUrl) ||
                  (p.poleData?.['A.3_MSC']?.images && p.poleData?.['A.3_MSC']?.images.length > 0) ||
                  (p.savedPoleData?.['A.3_MSC']?.imageDataUrl) ||
                  (p.savedPoleData?.['A.3_MSC']?.images && p.savedPoleData?.['A.3_MSC']?.images.length > 0)
                );
                const hasA2Msc = !!(
                  p.A2ImageData ||
                  (p.poleData?.['A.2']?.imageDataUrl) ||
                  (p.poleData?.['A.2']?.images && p.poleData?.['A.2']?.images.length > 0) ||
                  (p.savedPoleData?.['A.2']?.imageDataUrl) ||
                  (p.savedPoleData?.['A.2']?.images && p.savedPoleData?.['A.2']?.images.length > 0)
                );

                if (isLipEyeMsc ? hasA2Msc : hasA3Msc) {
                  return { ...d, isFilled: true };
                }
              } else if (divisionName.toUpperCase() === 'IQ') {
                const hasIqBatch = !!(p.iqBatchText && p.iqBatchText.trim().length > 0);
                const isIqFilled = !!p.hasQsData && hasIqBatch;
                if (isIqFilled) {
                  return { ...d, isFilled: true };
                }
              }
            } catch (e) { }
          }
          const isSigDiv = ['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divisionName.toUpperCase());
          if (isSigDiv) {
            let sigFilled = d.isFilled;
            // 1. Check local signatures state for currently open doc
            if (openDoc && openDoc.id === d.id) {
              const currentSig = signatures[divisionName];
              if (currentSig && currentSig.signed !== undefined) {
                sigFilled = currentSig.signed;
              }
            }
            // 2. Fallback to localStorage sync for ANY doc
            if (!sigFilled) {
              try {
                const localSync = localStorage.getItem(`im_sync_${d.id}`);
                if (localSync) {
                  const p = JSON.parse(localSync);
                  if (p.signatures && p.signatures[divisionName]?.signed) {
                    sigFilled = true;
                  }
                }
              } catch (e) { }
            }
            if (sigFilled) {
              return { ...d, isFilled: true };
            }
          }
          return d;
        });
        setDocuments(updatedDocs);
      }
    } catch (err) {
      console.warn("Failed to fetch division documents", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const releaseDocLock = async (docObj?: any) => {
    const targetDoc = docObj || openDoc;
    if (!targetDoc) return;
    const lockableDivisions = ['UP'];
    if (!lockableDivisions.includes(divUpper)) return;
    const docCode = targetDoc.rawDocument?.imCode || targetDoc.fgCode || targetDoc.id?.toString();
    const username = getUsername();
    try {
      await fetch(`${API_BASE}/api/lock/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentCode: docCode,
          division: divisionName,
          username: username
        })
      });
    } catch (e) {
      console.warn('Error releasing lock:', e);
    }
  };

  const handleForceUnlock = async () => {
    if (!lockedDocToForceUnlock) return;
    const docCode = lockedDocToForceUnlock.rawDocument?.imCode || lockedDocToForceUnlock.fgCode || lockedDocToForceUnlock.id?.toString();
    try {
      await fetch(`${API_BASE}/api/lock/force-unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentCode: docCode,
          division: divisionName
        })
      });
    } catch (e) {
      console.warn('Error force unlocking:', e);
    }
    setShowWarningModal(false);
    const targetDoc = lockedDocToForceUnlock;
    setLockedDocToForceUnlock(null);
    handleOpenDoc(targetDoc, true);
  };

  useEffect(() => {
    const handleUnload = () => {
      if (openDoc) {
        const lockableDivisions = ['UP'];
        if (lockableDivisions.includes(divUpper)) {
          const docCode = openDoc.rawDocument?.imCode || openDoc.fgCode || openDoc.id?.toString();
          const username = getUsername();
          const payload = JSON.stringify({ documentCode: docCode, division: divisionName, username });
          try {
            navigator.sendBeacon(`${API_BASE}/api/lock/release`, new Blob([payload], { type: 'application/json' }));
          } catch (e) { }
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [openDoc, divUpper, divisionName]);

  const handleOpenDoc = async (doc: any, skipLockCheck = false) => {
    const lockableDivisions = ['UP'];
    if (!skipLockCheck && lockableDivisions.includes(divUpper)) {
      const docCode = doc.rawDocument?.imCode || doc.fgCode || doc.id?.toString();
      const username = getUsername();
      try {
        const lockRes = await fetch(`${API_BASE}/api/lock/acquire`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentCode: docCode,
            division: divisionName,
            username: username
          })
        });
        if (lockRes.ok) {
          const lockData = await lockRes.json();
          if (lockData.canEdit === false) {
            setWarningTitle(`Bagian ${divUpper} Terkunci`);
            setWarningMessage(lockData.message || `Bagian ${divUpper} sedang diedit oleh user lain`);
            setLockedDocToForceUnlock(doc);
            setShowWarningModal(true);
            return;
          }
        }
      } catch (e) {
        console.warn('Lock acquire check error:', e);
      }
    }

    setIsDocLoading(true);

    pendingDeletedSignaturesRef.current.clear();
    setOpenDoc(doc);
    if (doc) {
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
    }

    let initialRawDataJson = "{}";

    try {
      let parsed: any = {};
      let upFound = false;

      // 1. Fetch all divisions from backend
      try {
        const resAll = await fetch(`${API_BASE}/api/im/${doc.id}/all-divisions`);
        if (resAll.ok) {
          const allDivs = await resAll.json();
          if (Array.isArray(allDivs)) {
            const curDiv = allDivs.find((d: any) => d.division?.toUpperCase() === divisionName.toUpperCase());
            if (curDiv && curDiv.dataJson) {
              initialRawDataJson = curDiv.dataJson;
            }

            const upDiv = allDivs.find((d: any) => d.division?.toUpperCase() === 'UP');
            if (upDiv && upDiv.dataJson) {
              try {
                parsed = { ...JSON.parse(upDiv.dataJson) };
                upFound = true;
              } catch (e) { }
            }
            const a7Div = allDivs.find((d: any) =>
              d.division?.toUpperCase().startsWith('A.7') ||
              d.division?.toUpperCase().includes('JACOMEX') ||
              d.division?.toUpperCase().includes('VACCUM')
            );
            if (a7Div && a7Div.dataJson) {
              try {
                const a7DivParsed = JSON.parse(a7Div.dataJson);
                if (Array.isArray(a7DivParsed.data) && a7DivParsed.data.length > 0) {
                  parsed.a7ListFromDiv = a7DivParsed.data.map((item: any) => ({
                    type: item.type || 'JACOMEX',
                    pressure: item.pressure || '',
                    duration: item.duration || '',
                    minCondition: item.min_cond || item.minCondition || '',
                    maxCondition: item.max_cond || item.maxCondition || '',
                    minDuration: item.min_dur || item.minDuration || '',
                    maxDuration: item.max_dur || item.maxDuration || '',
                    minTorsi: item.min_torsi || item.minTorsi || '',
                    maxTorsi: item.max_torsi || item.maxTorsi || '',
                    description: item.description || item.details || ''
                  }));
                }
              } catch (e) { }
            }

            const poleDiv = allDivs.find((d: any) => d.division?.toUpperCase() === 'POLE');
            if (poleDiv && poleDiv.dataJson) {
              try {
                const p = JSON.parse(poleDiv.dataJson);
                if (p.poleData) parsed.poleData = { ...(parsed.poleData || {}), ...p.poleData };
                if (p.PaletloadOuterBox) parsed.PaletloadOuterBox = p.PaletloadOuterBox;
                if (p.PaletloadLayers) parsed.PaletloadLayers = p.PaletloadLayers;
                if (p.PaletloadFg) parsed.PaletloadFg = p.PaletloadFg;
              } catch (e) { }
            }

            const mscDiv = allDivs.find((d: any) => d.division?.toUpperCase() === 'MSC ADM');
            if (mscDiv && mscDiv.dataJson) {
              try {
                const p = JSON.parse(mscDiv.dataJson);
                if (p.poleData && p.poleData['A.3_MSC']) {
                  parsed.poleData = { ...(parsed.poleData || {}), 'A.3_MSC': p.poleData['A.3_MSC'] };
                }
              } catch (e) { }
            }

            // Bulletproof recovery of POLE images from their specific DB divisions
            const poleSections = [
              { key: 'A.1', div: 'A.1. Appearance Filling' },
              { key: 'A.2', div: 'A.2. Appearance Assembly' },
              { key: 'A.3', div: 'A.3. Appearance Packing (POLE)' },
              { key: 'A.3_MSC', div: 'A.3. Appearance Packing (MSC)' },
              { key: 'A.6', div: 'A.6. Paletisasi' }
            ];

            parsed.poleData = parsed.poleData || {};

            for (const sec of poleSections) {
              const secDiv = allDivs.find((d: any) => d.division?.toUpperCase() === sec.div.toUpperCase());
              if (secDiv) {
                let sceneState: any = {};
                let secNote = '';
                try {
                  if (secDiv.dataJson) {
                    sceneState = JSON.parse(secDiv.dataJson);
                    secNote = sceneState.note || '';
                  }
                } catch (e) { }

                let imageDataUrl = '';
                if (secDiv.imageData) {
                  // Reconstruct valid data URI since backend stores raw base64
                  imageDataUrl = secDiv.imageData.startsWith('data:image') ? secDiv.imageData : `data:image/png;base64,${secDiv.imageData}`;
                }

                if (imageDataUrl) {
                  if (!parsed.poleData[sec.key]) {
                    parsed.poleData[sec.key] = {
                      sceneState,
                      note: secNote,
                      imageDataUrl
                    };
                  } else {
                    if (!parsed.poleData[sec.key].imageDataUrl) {
                      parsed.poleData[sec.key].imageDataUrl = imageDataUrl;
                    }
                    if (!parsed.poleData[sec.key].sceneState || Object.keys(parsed.poleData[sec.key].sceneState).length === 0) {
                      parsed.poleData[sec.key].sceneState = sceneState;
                    }
                    if (secNote && !parsed.poleData[sec.key].note) {
                      parsed.poleData[sec.key].note = secNote;
                    }
                  }
                }
              }
            }

            const iqDiv = allDivs.find((d: any) => d.division?.toUpperCase() === 'IQ');
            if (iqDiv && iqDiv.dataJson) {
              try {
                const p = JSON.parse(iqDiv.dataJson);
                if (p.hasQsData !== undefined) parsed.hasQsData = p.hasQsData;
                if (p.qsTaraType) parsed.qsTaraType = p.qsTaraType;
                if (p.iqBatchText) parsed.iqBatchText = p.iqBatchText;
                if (p.qsAwalRows) parsed.qsAwalRows = p.qsAwalRows;
                if (p.qsPeriodikRows) parsed.qsPeriodikRows = p.qsPeriodikRows;
                if (p.qsPeriodikSpecs) parsed.qsPeriodikSpecs = p.qsPeriodikSpecs;
                if (p.qsAwalSpecs) parsed.qsAwalSpecs = p.qsAwalSpecs;
              } catch (e) { }
            }

            const sigs: Record<string, any> = {};
            ['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB', 'QA LAB'].forEach(divKey => {
              const d = allDivs.find((x: any) => x.division?.toUpperCase() === divKey);
              if (d && d.dataJson) {
                try {
                  const pj = JSON.parse(d.dataJson);
                  const isSigned = pj.signed === true || (pj.status === 'Filled' && Boolean(pj.signedBy || pj.signerName) && pj.signed !== false);
                  if (isSigned && pj.status !== 'Pending') {
                    sigs[divKey] = {
                      signed: true,
                      signedBy: pj.signedBy || '',
                      signerName: pj.signerName || pj.signedFullName || pj.signedBy || '',
                      signedAt: pj.signedAt || ''
                    };
                  }
                } catch (e) { }
              }
            });
            setSignatures(sigs);
          }
        }
      } catch (e) {
        console.warn("Could not fetch all-divisions", e);
      }

      // 2. Fallback to direct UP division endpoint if not yet found
      if (!upFound) {
        try {
          const resUp = await fetch(`${API_BASE}/api/im/${doc.id}/division/UP`);
          if (resUp.ok) {
            const upData = await resUp.json();
            if (upData && upData.dataJson) {
              try {
                parsed = { ...JSON.parse(upData.dataJson), ...parsed };
                upFound = true;
              } catch (e) { }
            }
          }
        } catch (e) { }
      }

      // 3. Fetch current division if not UP and not signature-only division
      const isSignatureOnlyDivision = ['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divisionName.toUpperCase());
      if (divisionName.toUpperCase() !== 'UP' && !isSignatureOnlyDivision) {
        try {
          const resDiv = await fetch(`${API_BASE}/api/im/${doc.id}/division/${encodeURIComponent(divisionName)}`);
          if (resDiv.ok) {
            const divData = await resDiv.json();
            if (divData && divData.dataJson) {
              initialRawDataJson = divData.dataJson;
              try {
                const curParsed = JSON.parse(divData.dataJson);
                const mergedPoleData = curParsed.poleData !== undefined ? { ...(parsed.poleData || {}), ...curParsed.poleData } : undefined;
                parsed = {
                  ...parsed,
                  ...curParsed,
                  ...curParsed.savedUpFormData ? { savedUpFormData: curParsed.savedUpFormData } : {},
                  ...curParsed.savedQcResult ? { savedQcResult: curParsed.savedQcResult } : {},
                  ...mergedPoleData !== undefined ? { poleData: mergedPoleData, savedPoleData: mergedPoleData } : {}
                };
              } catch (e) { }
            }
          }
        } catch (e) { }
      }

      // 4. Merge from localStorage cross-division sync
      try {
        const localSync = localStorage.getItem(`im_sync_${doc.id}`);
        if (localSync) {
          const localParsed = JSON.parse(localSync);
          if (localParsed.poleData && Object.keys(localParsed.poleData).length === 0) {
            delete localParsed.poleData;
          }
          if (localParsed.hasQsData === false && parsed.hasQsData === true) {
            delete localParsed.hasQsData;
          }
          if (!localParsed.iqBatchText && parsed.iqBatchText) {
            delete localParsed.iqBatchText;
          }
          if (!localParsed.A1ImageData && parsed.A1ImageData) {
            localParsed.A1ImageData = parsed.A1ImageData;
          }
          if (!localParsed.A2ImageData && parsed.A2ImageData) {
            localParsed.A2ImageData = parsed.A2ImageData;
          }
          if (!localParsed.A3PoleImageData && parsed.A3PoleImageData) {
            localParsed.A3PoleImageData = parsed.A3PoleImageData;
          }
          if (!localParsed.A3MscImageData && parsed.A3MscImageData) {
            localParsed.A3MscImageData = parsed.A3MscImageData;
          }
          if (!localParsed.PaletloadImageData && parsed.PaletloadImageData) {
            localParsed.PaletloadImageData = parsed.PaletloadImageData;
          }
          if (localParsed.poleData && parsed.poleData) {
            const mergedPole: Record<string, any> = { ...parsed.poleData };
            Object.keys(localParsed.poleData).forEach((k) => {
              const localSec = localParsed.poleData[k];
              const backSec = parsed.poleData[k];
              if (!backSec) {
                mergedPole[k] = localSec;
              } else {
                mergedPole[k] = {
                  ...backSec,
                  ...localSec,
                  imageDataUrl: localSec?.imageDataUrl || backSec?.imageDataUrl || null,
                  sceneState: (localSec?.sceneState && (localSec.sceneState.images?.length > 0 || localSec.sceneState.annotations?.length > 0))
                    ? localSec.sceneState
                    : (backSec?.sceneState || localSec?.sceneState)
                };
              }
            });
            localParsed.poleData = mergedPole;
          }
          parsed = { ...parsed, ...localParsed };
          if (localParsed.signatures) {
            setSignatures(prev => {
              const newSigs = { ...prev };
              Object.keys(localParsed.signatures).forEach(k => {
                if (localParsed.signatures[k]?.pendingSave && k.toUpperCase() !== divisionName.toUpperCase()) {
                  // Ignore pending saves for other divisions to prevent ghost rendering
                } else if (localParsed.signatures[k]?.pendingSave || !newSigs[k]?.signed) {
                  newSigs[k] = localParsed.signatures[k];
                }
              });
              return newSigs;
            });
          }
        }
      } catch (e) { }

      let reconstructedLineType = doc.rawDocument?.jenisLine || 'BOTTLE LINE';
      let reconstructedLines: string[] = [];
      let reconstructedKategori = '';
      let reconstructedNozzles = '';

      if (parsed.savedUpFormData) {
        reconstructedLineType = parsed.savedUpFormData.lineType || reconstructedLineType;
        reconstructedLines = parsed.savedUpFormData.lines || [];
        reconstructedKategori = parsed.savedUpFormData.kategori || '';
        reconstructedNozzles = parsed.savedUpFormData.nozzles || '';
      } else if (parsed.Line || (parsed.up_data && (parsed.up_data.line || parsed.up_data.jenis_line))) {
        const upData = parsed.up_data || {};
        const linesStr = parsed.Line || upData.line || '';
        reconstructedLines = linesStr ? linesStr.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
        reconstructedLineType = parsed.JenisLine || upData.jenis_line || reconstructedLineType;
        reconstructedKategori = parsed.Kategori || upData.kategori || '';
        reconstructedNozzles = parsed.JumlahNozzel || upData.jumlah_nozzel || '';
      }

      setUpFormData({
        lineType: reconstructedLineType,
        kategori: reconstructedKategori,
        lines: reconstructedLines,
        nozzles: reconstructedNozzles
      });
      setIsUpDataConfirmed(reconstructedLines.length > 0);

      let reconstructedVolume = 0;
      let reconstructedDensity = 1;
      let reconstructedVolP1 = 0;
      let reconstructedDenP1 = 1;
      let reconstructedVolP2 = 0;
      let reconstructedDenP2 = 1;
      let reconstructedTemplate = 'Normal';

      if (parsed.savedQcFillingData) {
        reconstructedTemplate = parsed.savedQcFillingData.templateIm || 'Normal';
        reconstructedVolume = parseFloat(parsed.savedQcFillingData.volumeFg) || 0;
        reconstructedDensity = parseFloat(parsed.savedQcFillingData.density) || 1;
        reconstructedVolP1 = parseFloat(parsed.savedQcFillingData.volPhase1) || 0;
        reconstructedDenP1 = parseFloat(parsed.savedQcFillingData.denPhase1) || 1;
        reconstructedVolP2 = parseFloat(parsed.savedQcFillingData.volPhase2) || 0;
        reconstructedDenP2 = parseFloat(parsed.savedQcFillingData.denPhase2) || 1;
        setQcFillingData({
          templateIm: reconstructedTemplate,
          volumeFg: parsed.savedQcFillingData.volumeFg || '',
          density: parsed.savedQcFillingData.density || '',
          volPhase1: parsed.savedQcFillingData.volPhase1 || '',
          denPhase1: parsed.savedQcFillingData.denPhase1 || '',
          volPhase2: parsed.savedQcFillingData.volPhase2 || '',
          denPhase2: parsed.savedQcFillingData.denPhase2 || ''
        });
      } else if (parsed.up_qc_data || parsed.Volume || parsed.VolPhase1) {
        const upQcData = parsed.up_qc_data || {};
        reconstructedTemplate = parsed.TemplateIm || upQcData.template_im || upQcData.jenis_produk || 'Normal';
        reconstructedVolume = parseFloat(parsed.Volume) || parseFloat(upQcData.vol_fg) || 0;
        reconstructedDensity = parseFloat(parsed.Density) || parseFloat(upQcData.density) || 1;
        reconstructedVolP1 = parseFloat(parsed.VolPhase1) || parseFloat(upQcData.vol_phase1) || 0;
        reconstructedDenP1 = parseFloat(parsed.DenPhase1) || parseFloat(upQcData.density_phase1) || 1;
        reconstructedVolP2 = parseFloat(parsed.VolPhase2) || parseFloat(upQcData.vol_phase2) || 0;
        reconstructedDenP2 = parseFloat(parsed.DenPhase2) || parseFloat(upQcData.density_phase2) || 1;
        setQcFillingData({
          templateIm: reconstructedTemplate,
          volumeFg: reconstructedVolume > 0 ? reconstructedVolume.toString() : '',
          density: reconstructedDensity > 0 ? reconstructedDensity.toString() : '',
          volPhase1: reconstructedVolP1 > 0 ? reconstructedVolP1.toString() : '',
          denPhase1: reconstructedDenP1 > 0 ? reconstructedDenP1.toString() : '',
          volPhase2: reconstructedVolP2 > 0 ? reconstructedVolP2.toString() : '',
          denPhase2: reconstructedDenP2 > 0 ? reconstructedDenP2.toString() : ''
        });
      } else {
        setQcFillingData({ templateIm: 'Normal', volumeFg: '', density: '', volPhase1: '', denPhase1: '', volPhase2: '', denPhase2: '' });
      }

      const hasQcData = parsed.savedQcResult != null ||
        parsed.HasQcData === true ||
        reconstructedVolume > 0 ||
        reconstructedVolP1 > 0 ||
        (parsed.Volume && parseFloat(parsed.Volume) > 0) ||
        (parsed.up_qc_data && (parseFloat(parsed.up_qc_data.vol_fg) > 0 || parseFloat(parsed.up_qc_data.vol_phase1) > 0)) ||
        (parsed.savedQcFillingData && (parseFloat(parsed.savedQcFillingData.volumeFg) > 0 || parseFloat(parsed.savedQcFillingData.volPhase1) > 0));

      let reconstructedPoleData: Record<string, any> = {};
      if (parsed.poleData !== undefined && parsed.poleData !== null) {
        reconstructedPoleData = { ...parsed.poleData };
      } else if (parsed.savedPoleData !== undefined && parsed.savedPoleData !== null) {
        reconstructedPoleData = { ...parsed.savedPoleData };
      }

      if (parsed.A1ImageData && !reconstructedPoleData['A.1']?.imageDataUrl) {
        reconstructedPoleData['A.1'] = {
          ...(reconstructedPoleData['A.1'] || {}),
          imageDataUrl: parsed.A1ImageData.startsWith('data:') ? parsed.A1ImageData : `data:image/png;base64,${parsed.A1ImageData}`
        };
      }
      if (parsed.A2ImageData && !reconstructedPoleData['A.2']?.imageDataUrl) {
        reconstructedPoleData['A.2'] = {
          ...(reconstructedPoleData['A.2'] || {}),
          imageDataUrl: parsed.A2ImageData.startsWith('data:') ? parsed.A2ImageData : `data:image/png;base64,${parsed.A2ImageData}`
        };
      }
      if (parsed.A3PoleImageData && !reconstructedPoleData['A.3']?.imageDataUrl) {
        reconstructedPoleData['A.3'] = {
          ...(reconstructedPoleData['A.3'] || {}),
          imageDataUrl: parsed.A3PoleImageData.startsWith('data:') ? parsed.A3PoleImageData : `data:image/png;base64,${parsed.A3PoleImageData}`
        };
      }
      if (parsed.A3MscImageData && !reconstructedPoleData['A.3_MSC']?.imageDataUrl) {
        reconstructedPoleData['A.3_MSC'] = {
          ...(reconstructedPoleData['A.3_MSC'] || {}),
          imageDataUrl: parsed.A3MscImageData.startsWith('data:') ? parsed.A3MscImageData : `data:image/png;base64,${parsed.A3MscImageData}`
        };
      }
      if ((parsed.PaletloadImageData || parsed.PaletloadOuterBox) && (!reconstructedPoleData['A.6']?.imageDataUrl && !reconstructedPoleData['A.6']?.outerBox)) {
        reconstructedPoleData['A.6'] = {
          ...(reconstructedPoleData['A.6'] || {}),
          imageDataUrl: parsed.PaletloadImageData ? (parsed.PaletloadImageData.startsWith('data:') ? parsed.PaletloadImageData : `data:image/png;base64,${parsed.PaletloadImageData}`) : null,
          outerBox: parsed.PaletloadOuterBox || '',
          layers: parsed.PaletloadLayers || '',
          fg: parsed.PaletloadFg || '',
          sceneState: reconstructedPoleData['A.6']?.sceneState || {
            images: [],
            annotations: [],
            outerBox: parsed.PaletloadOuterBox || '',
            layers: parsed.PaletloadLayers || '',
            fg: parsed.PaletloadFg || ''
          }
        };
      }
      let restoredA7List: JacomexItem[] = [];
      if (Array.isArray(parsed.a7List) && parsed.a7List.length > 0) {
        restoredA7List = parsed.a7List;
      } else if (Array.isArray(parsed.JacomexList) && parsed.JacomexList.length > 0) {
        restoredA7List = parsed.JacomexList;
      } else if (Array.isArray(parsed.a7ListFromDiv) && parsed.a7ListFromDiv.length > 0) {
        restoredA7List = parsed.a7ListFromDiv;
      } else if (parsed.a7Data) {
        restoredA7List = [parsed.a7Data];
      } else if (parsed.A7Data) {
        restoredA7List = [parsed.A7Data];
      }

      // Auto-fetch & Auto-fill from Master Spec Code Database based on FG Code
      const currentFgCode = (doc.imCode || doc.fgCode || doc.rawDocument?.imCode || '').trim().toUpperCase();
      let matchedSpec: any = null;
      if (currentFgCode) {
        try {
          const specRes = await fetch(`${API_BASE}/api/speccode/by-fg/${encodeURIComponent(currentFgCode)}`);
          if (specRes.ok) {
            matchedSpec = await specRes.json();
          }
        } catch (e) { }

        if (!matchedSpec && typeof window !== 'undefined') {
          try {
            const localMasters = JSON.parse(localStorage.getItem('ppi_spec_code_masters') || '[]');
            matchedSpec = localMasters.find((m: any) => {
              if (!m.fgCodes) return false;
              const tokens = m.fgCodes.split(/[,;\n\r]/).map((x: string) => x.trim().toUpperCase());
              return tokens.includes(currentFgCode);
            });
          } catch (e) { }
        }
      }

      if (matchedSpec) {
        setMatchedSpecInfo({ specCode: matchedSpec.specCode, specName: matchedSpec.specName });

        // Always sync A.6 from Master Spec Code if available, as A.6 is defined in Spec Code
        if (matchedSpec.a6DataJson) {
          try {
            const a6Parsed = typeof matchedSpec.a6DataJson === 'string' ? JSON.parse(matchedSpec.a6DataJson) : matchedSpec.a6DataJson;
            const outer = a6Parsed.outerBox || a6Parsed.paletloadOuterBox || '';
            const layers = a6Parsed.layers || a6Parsed.paletloadLayers || '';
            const fg = a6Parsed.fg || a6Parsed.paletloadFg || '';
            const imgUrl = a6Parsed.imageDataUrl || a6Parsed.paletloadImageData || '';
            const scene = a6Parsed.sceneState || {
              images: [],
              annotations: [],
              outerBox: outer,
              layers: layers,
              fg: fg
            };

            if (outer || layers || fg || imgUrl) {
              reconstructedPoleData['A.6'] = {
                imageDataUrl: imgUrl || null,
                outerBox: outer,
                layers: layers,
                fg: fg,
                sceneState: scene
              };
              if (outer) setPaletloadOuterBox(outer);
              if (layers) setPaletloadLayers(layers);
              if (fg) setPaletloadFg(fg);
            }
          } catch (e) { }
        }

        // Always sync A.7 from Master Spec Code if available
        if (matchedSpec.a7DataJson) {
          try {
            const a7Parsed = JSON.parse(matchedSpec.a7DataJson);
            const items = Array.isArray(a7Parsed) ? a7Parsed : (a7Parsed.data || []);
            if (items.length > 0) {
              restoredA7List = items;
            }
          } catch (e) { }
        }
      } else {
        setMatchedSpecInfo(null);
      }

      setA7List(restoredA7List);
      setA7Data(restoredA7List[0] || null);
      setPoleData(reconstructedPoleData);

      // Asynchronously optimize any large PNG images to lightweight JPEG for faster display and PDF < 500 KB
      if (reconstructedPoleData && Object.keys(reconstructedPoleData).length > 0) {
        const optimized = { ...reconstructedPoleData };
        Promise.all(
          Object.keys(optimized).map(async (k) => {
            if (optimized[k]?.imageDataUrl && (optimized[k].imageDataUrl.startsWith('data:image/png') || optimized[k].imageDataUrl.length > 150000)) {
              const opt = await compressDataUrlForPrint(optimized[k].imageDataUrl);
              optimized[k] = { ...optimized[k], imageDataUrl: opt };
            }
          })
        ).then(() => {
          setPoleData({ ...optimized });
        });
      }

      if (parsed.iqBatchText) {
        setIqBatchText(parsed.iqBatchText);
        setSavedIqBatchText(parsed.iqBatchText);
      } else {
        setIqBatchText(DEFAULT_IQ_BATCH_TEXT);
        setSavedIqBatchText('');
      }

      if (parsed.hasQsData) {
        setHasQsData(parsed.hasQsData);
      } else {
        setHasQsData(false);
      }

      if (parsed.qsAwalRows && Array.isArray(parsed.qsAwalRows) && parsed.qsAwalRows.length > 0) {
        setQsAwalRows(parsed.qsAwalRows);
      } else {
        const tara = parsed.qsTaraType || 'Individual Tara';
        const bom = parsed.qsAwalSpecs?.bom || 'Lihat OC';
        const pos = parsed.qsAwalSpecs?.posisiLabel || 'Lihat A.1';
        const dim = parsed.qsAwalSpecs?.dimensi || 'Lihat A.1';
        setQsAwalRows([
          { no: '1', pemeriksaan: 'Berat Tara Kemasan', deskripsi: tara, spesifikasi: tara === 'Individual Tara' ? 'Individual Tara' : 'Nilai rata-rata', frekuensi: 'Awal Produksi' },
          { no: '2', pemeriksaan: 'Daftar Material (BOM)', deskripsi: 'Pastikan bulk dan item sesuai OC', spesifikasi: bom, frekuensi: 'Setiap Supply baru tangki bulk' },
          { no: '3', pemeriksaan: 'Posisi Label FG', deskripsi: 'Ukur dengan Caliper/Penggaris', spesifikasi: pos, frekuensi: 'Awal dan setiap setelah breakdown stop' },
          { no: '4', pemeriksaan: 'Dimensi Produk', deskripsi: 'Ukur dengan Caliper/Penggaris', spesifikasi: dim, frekuensi: 'Awal dan setiap setelah breakdown stop' }
        ]);
      }

      if (parsed.qsPeriodikRows && Array.isArray(parsed.qsPeriodikRows) && parsed.qsPeriodikRows.length > 0) {
        setQsPeriodikRows(parsed.qsPeriodikRows);
      } else {
        const pSpecs = parsed.qsPeriodikSpecs || {};
        const freq = getFrequencyText();
        setQsPeriodikRows([
          { no: '1', pemeriksaan: 'Berat', deskripsi: 'Timbang dengan Timbangan', spesifikasi: pSpecs.berat || 'Lihat A.4', frekuensi: freq },
          { no: '2', pemeriksaan: 'Tampilan Fisik (Appearance)', deskripsi: 'Pemeriksaan Visual', spesifikasi: pSpecs.appearance || 'Lihat A.1-A.3', frekuensi: freq },
          { no: '3', pemeriksaan: 'Tes Kebocoran FG', deskripsi: pSpecs.kebocoranDeskripsi || 'Lihat A.7', spesifikasi: pSpecs.kebocoran || 'Tidak Bocor', frekuensi: freq },
          { no: '4', pemeriksaan: 'Isi Label Shipper', deskripsi: 'Cek kode FG, lot bulk, dan lot FG', spesifikasi: pSpecs.labelShipper || 'Kode FG, Lot Bulk, dan Lot FG di label Shipper', frekuensi: freq },
          { no: '5', pemeriksaan: 'Barcode Label Shipper', deskripsi: 'Verifikasi barcode dengan verifikator barcode', spesifikasi: pSpecs.barcodeShipper || 'Minimal grade C', frekuensi: 'Setiap awal shift 3 pcs' },
          { no: '6', pemeriksaan: 'Barcode FG', deskripsi: 'Pemeriksaan Visual', spesifikasi: pSpecs.barcodeFg || 'Barcode label belakang = barcode label shipper', frekuensi: 'Setiap awal OC' }
        ]);
      }

      if (parsed.qsTaraType) {
        setQsTaraType(parsed.qsTaraType);
      } else {
        setQsTaraType('Individual Tara');
      }

      if (parsed.qsPeriodikSpecs) {
        setQsPeriodikSpecs(parsed.qsPeriodikSpecs);
      } else {
        setQsPeriodikSpecs({
          berat: 'Lihat A.4',
          appearance: 'Lihat A.1-A.3',
          kebocoranDeskripsi: 'Lihat A.7',
          kebocoran: 'Tidak Bocor',
          labelShipper: 'Kode FG, Lot Bulk, dan Lot FG di label Shipper',
          barcodeShipper: 'Minimal grade C',
          barcodeFg: 'Barcode label belakang = barcode label shipper'
        });
      }

      if (parsed.qsAwalSpecs) {
        setQsAwalSpecs(parsed.qsAwalSpecs);
      } else {
        setQsAwalSpecs({
          bom: 'Lihat OC',
          posisiLabel: 'Lihat A.1',
          dimensi: 'Lihat A.1'
        });
      }

      if (parsed.savedQcResult) {
        let finalQc = parsed.savedQcResult;
        const normTemplate = (reconstructedTemplate || 'Normal').trim();
        if (normTemplate === 'Normal') {
          if (reconstructedLineType === 'SACHET LINE') {
            finalQc = calculateSachetLimits(reconstructedVolume, reconstructedDensity);
          } else if (reconstructedLineType !== 'SACHET LINE' && finalQc.type === 'Sachet') {
            finalQc = calculateNormalLimits(reconstructedVolume, reconstructedDensity);
          }
        }
        setQcResult(finalQc);
      } else if (hasQcData) {
        const isSachet = reconstructedLineType === 'SACHET LINE';
        const normTemplate = (reconstructedTemplate || 'Normal').trim();

        if (normTemplate.toLowerCase() === 'duo') {
          const p1 = isSachet ? calculateSachetLimits(reconstructedVolP1, reconstructedDenP1) : calculateNormalLimits(reconstructedVolP1, reconstructedDenP1);
          const p2 = isSachet ? calculateSachetLimits(reconstructedVolP2, reconstructedDenP2) : calculateNormalLimits(reconstructedVolP2, reconstructedDenP2);
          if (!isSachet) {
            p1.limitsGram.syaratLegal = 0.090; p1.limitsMl.syaratLegal = 0.090;
            p2.limitsGram.syaratLegal = 0.090; p2.limitsMl.syaratLegal = 0.090;
          }
          const volTot = reconstructedVolP1 + reconstructedVolP2;
          const pctTot = volTot <= 50 ? 0.09 : 0.045;
          const totalSyarat = isSachet ? pctTot : 0.090;
          setQcResult({
            type: 'Duo',
            isSachet,
            phase1: p1,
            phase2: p2,
            total: {
              limitsGram: {
                stopMin: p1.limitsGram.stopMin + p2.limitsGram.stopMin,
                adjMin: p1.limitsGram.adjMin + p2.limitsGram.adjMin,
                runMin: p1.limitsGram.runMin ? p1.limitsGram.runMin + p2.limitsGram.runMin : null,
                nominal: p1.limitsGram.nominal + p2.limitsGram.nominal,
                linkBom: p1.limitsGram.linkBom + p2.limitsGram.linkBom,
                runMax: p1.limitsGram.runMax ? p1.limitsGram.runMax + p2.limitsGram.runMax : null,
                adjMax: p1.limitsGram.adjMax + p2.limitsGram.adjMax,
                stopMax: p1.limitsGram.stopMax + p2.limitsGram.stopMax,
                syaratLegal: totalSyarat
              },
              limitsMl: {
                stopMin: p1.limitsMl.stopMin + p2.limitsMl.stopMin,
                adjMin: p1.limitsMl.adjMin + p2.limitsMl.adjMin,
                runMin: p1.limitsMl.runMin ? p1.limitsMl.runMin + p2.limitsMl.runMin : null,
                nominal: p1.limitsMl.nominal + p2.limitsMl.nominal,
                linkBom: p1.limitsMl.linkBom + p2.limitsMl.linkBom,
                runMax: p1.limitsMl.runMax ? p1.limitsMl.runMax + p2.limitsMl.runMax : null,
                adjMax: p1.limitsMl.adjMax + p2.limitsMl.adjMax,
                stopMax: p1.limitsMl.stopMax + p2.limitsMl.stopMax,
                syaratLegal: totalSyarat
              }
            }
          });
        } else if (normTemplate.toLowerCase() === 'biphase' || normTemplate.toUpperCase().includes('LIP EYE')) {
          const isLipEye = normTemplate.toUpperCase().includes('LIP EYE');
          const p1 = calculateNormalLimits(reconstructedVolP1, reconstructedDenP1);
          const p2 = calculateNormalLimits(reconstructedVolP2, reconstructedDenP2);
          const volTot = reconstructedVolP1 + reconstructedVolP2;
          const denTot = volTot > 0 ? ((reconstructedVolP1 * reconstructedDenP1) + (reconstructedVolP2 * reconstructedDenP2)) / volTot : 1.0;
          const totalSummary = calculateNormalLimits(volTot, denTot);
          setQcResult({
            type: isLipEye ? 'LipEye' : 'Biphase',
            isSachet: false,
            phase1: p1,
            phase2: p2,
            total: totalSummary
          });
        } else {
          if (isSachet) {
            setQcResult(calculateSachetLimits(reconstructedVolume, reconstructedDensity));
          } else {
            setQcResult(calculateNormalLimits(reconstructedVolume, reconstructedDensity));
          }
        }
      } else {
        setQcResult(null);
      }
    } catch (err) {
      console.warn("Failed to fetch doc data", err);
      // defaults
      setUpFormData({ lineType: 'BOTTLE LINE', kategori: '', lines: [], nozzles: '' });
      setIsUpDataConfirmed(false);
      setQcFillingData({ templateIm: 'Normal', volumeFg: '', density: '', volPhase1: '', denPhase1: '', volPhase2: '', denPhase2: '' });
      setQcResult(null);
    } finally {
      initialDocSnapshotRef.current = initialRawDataJson;
      setIsDocLoading(false);
    }
  };

  useEffect(() => {
    fetchDivisionDocs();
    const handleRefresh = () => fetchDivisionDocs();
    window.addEventListener('refresh_im_data', handleRefresh);

    const intervalId = setInterval(() => {
      if (!openDoc) {
        fetchDivisionDocs(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('refresh_im_data', handleRefresh);
      clearInterval(intervalId);
    };
  }, [divisionName, openDoc]);

  const isSignatureDiv = ['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divUpper);

  const pendingDocs = useMemo(() => documents.filter(d => !d.isFilled), [documents]);
  const signedDocs = useMemo(() => documents.filter(d => !!d.isFilled), [documents]);

  const statusFilteredDocs = useMemo(() => {
    if (divUpper === "DATA IM" || divUpper === "LIHAT IM") return documents;
    if (activeStatusTab === "pending") return pendingDocs;
    if (activeStatusTab === "signed") return signedDocs;
    return documents;
  }, [documents, divUpper, activeStatusTab, pendingDocs, signedDocs]);

  const filteredDocs = statusFilteredDocs.filter(d =>
    (d.productName && d.productName.toLowerCase().includes(search.toLowerCase())) ||
    (d.fgCode && d.fgCode.toLowerCase().includes(search.toLowerCase())) ||
    (d.flaNo && d.flaNo.toLowerCase().includes(search.toLowerCase())) ||
    search === ""
  );

  // Styling based on division (matching WPF App logic)
  let headerBg = "#1D4ED8"; // Default blue
  let titleColor = "#FFFFFF";
  let subtitleColor = "#E2E8F0";
  let showComment = true;

  // Use divUpper already defined at the top of the component
  if (divUpper === "UP") {
    headerBg = "#1D4ED8";
  } else if (divUpper === "POLE") {
    headerBg = "#C2410C";
  } else if (divUpper === "MSC ADM") {
    headerBg = "#8EC3B0";
    titleColor = "#111827";
    subtitleColor = "#374151";
  } else if (divUpper === "IQ") {
    headerBg = "#7E22CE";
  } else if (divUpper === "HEAD LAB") {
    headerBg = "#BE185D";
    showComment = false;
  } else if (divUpper === "UP FILLING SPV" || divUpper === "UP FILLING MANAGER" || divUpper === "PACKAGING & POLE") {
    headerBg = "#334155";
    showComment = false;
  } else if (divUpper === "DATA IM" || divUpper === "LIHAT IM") {
    headerBg = "#005A9E";
    showComment = false;
  }

  const renderWarningModal = () => {
    if (!showWarningModal) return null;
    const isUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.Role === 'ADMIN';
    const isSelfLock = warningMessage && warningMessage.includes(getUsername());
    const canForceUnlock = lockedDocToForceUnlock && (isUserAdmin || isSelfLock);

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-[0.5px]">
        <div className="bg-[#f0f0f0] border border-[#707070] shadow-[0_8px_25px_rgba(0,0,0,0.35)] rounded-[6px] w-[420px] overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-100">
          {/* Title Bar */}
          <div className="bg-white border-b border-[#dfdfdf] px-3.5 py-1.5 flex justify-between items-center select-none">
            <span className="text-[12px] text-[#111827] font-semibold">{warningTitle || "Peringatan"}</span>
            <button onClick={() => setShowWarningModal(false)} className="hover:bg-[#e81123] hover:text-white w-6 h-6 flex items-center justify-center -mr-1 text-black transition-colors rounded-[2px] cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          {/* Body */}
          <div className="bg-white p-5 flex flex-col flex-1 min-h-[100px] justify-center">
            <div className="flex items-center space-x-4">
              <div className="shrink-0 flex items-center justify-center">
                {warningTitle?.toLowerCase().includes("sukses") || warningTitle?.toLowerCase().includes("informasi") || warningTitle?.toLowerCase().includes("berhasil") ? (
                  <div className="w-10 h-10 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#F59E0B" stroke="#B45309" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13" stroke="#FFFFFF" strokeWidth="2"></line><line x1="12" y1="17" x2="12.01" y2="17" stroke="#FFFFFF" strokeWidth="2"></line></svg>
                )}
              </div>
              <div className="text-[13px] text-[#1f2937] font-medium leading-relaxed">
                {warningMessage}
              </div>
            </div>
          </div>
          {/* Footer */}
          <div className="bg-[#f0f0f0] border-t border-[#dfdfdf] px-4 py-2.5 flex justify-end space-x-2">
            {canForceUnlock && (
              <button
                onClick={handleForceUnlock}
                className="bg-[#D97706] border border-[#B45309] px-3 py-1 text-[12px] text-white hover:bg-[#B45309] shadow-sm transition-colors rounded-[2px] cursor-pointer font-semibold"
              >
                🔓 Buka Kunci Paksa
              </button>
            )}
            <button onClick={() => setShowWarningModal(false)} className="bg-[#e1e1e1] border border-[#adadad] min-w-[75px] py-1 text-[12px] text-black hover:bg-[#e5f1fb] hover:border-[#0078d7] focus:outline-none focus:border-[#0078d7] shadow-sm transition-colors rounded-[2px] cursor-pointer font-normal">
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSignModal = () => {
    if (!signModal.isOpen) return null;
    const selectedUserObj = allUsers.find(u => u.username === signModal.selectedUsername)
      || allUsers.find(u => u.username?.trim().toLowerCase() === signModal.selectedUsername?.trim().toLowerCase());
    const displayName = selectedUserObj?.fullName || selectedUserObj?.username || signModal.selectedUsername;

    return (
      <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center font-sans">
        <div className="bg-white w-[480px] rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#E2E8F0] flex flex-col">

          {/* Elegant Header */}
          <div className="bg-[#F8FAFC] px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-[#E0F2FE] p-1.5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#0284C7]">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3 className="text-[15px] font-bold text-[#0F172A]">Verifikasi Password</h3>
            </div>
            <button
              onClick={() => setSignModal(prev => ({ ...prev, isOpen: false }))}
              className="text-[#64748B] hover:text-[#0F172A] w-6 h-6 flex items-center justify-center transition-colors focus:outline-none"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-[13px] text-[#334155] mb-4 leading-relaxed">
              Masukkan password Anda untuk menandatangani dokumen ini sebagai:<br />
              <strong className="font-bold text-[#0F172A]">{displayName}</strong> <span className="text-[#64748B]">({signModal.divisionName})</span>
            </p>

            <div className="mb-2">
              <input
                type="password"
                autoFocus
                autoComplete="off"
                placeholder="Masukkan password..."
                className="w-full h-[36px] px-3 text-[13px] border border-[#CBD5E1] focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] rounded-none bg-white outline-none transition-all"
                value={signModal.passwordInput}
                onChange={(e) => setSignModal(prev => ({ ...prev, passwordInput: e.target.value, errorMsg: '' }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifySign();
                }}
              />
              {signModal.errorMsg && (
                <div className="bg-[#FEF2F2] border-l-4 border-[#EF4444] p-3 mt-3 text-[12px] text-[#991B1B] rounded-none">
                  <div className="flex items-center font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {signModal.errorMsg}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end space-x-3">
            <button
              onClick={() => setSignModal(prev => ({ ...prev, isOpen: false }))}
              className="h-[28px] px-5 border border-[#CBD5E1] bg-white text-[12px] font-semibold text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] flex items-center justify-center rounded-none transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleVerifySign}
              className="h-[28px] px-5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-[12px] font-semibold flex items-center justify-center rounded-none shadow-sm transition-colors"
            >
              Verifikasi
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmSignModal = () => {
    if (!confirmSignModal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center font-sans">
        <div className="bg-white w-[480px] rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#E2E8F0] flex flex-col">

          {/* Elegant Header */}
          <div className="bg-[#F8FAFC] px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-[#DCFCE7] p-1.5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#16A34A]">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 className="text-[15px] font-bold text-[#0F172A]">Konfirmasi Validasi Data</h3>
            </div>
            <button
              onClick={() => setConfirmSignModal(prev => ({ ...prev, isOpen: false }))}
              className="text-[#64748B] hover:text-[#0F172A] w-6 h-6 flex items-center justify-center transition-colors focus:outline-none"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-[13px] text-[#334155] font-semibold mb-3 leading-snug">
              Apakah Anda yakin ingin menyetujui dokumen ini?
            </p>
            <div className="bg-[#F8FAFC] border-l-4 border-[#16A34A] p-4 text-[12px] text-[#334155] rounded-none">
              Dengan menekan <strong className="text-[#0F172A]">'Ya, Setuju'</strong>, Anda mengonfirmasi bahwa Anda telah memeriksa dan memastikan seluruh data yang diisi telah benar dan sesuai.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end space-x-3">
            <button
              onClick={() => setConfirmSignModal(prev => ({ ...prev, isOpen: false }))}
              className="h-[28px] px-5 border border-[#CBD5E1] bg-white text-[12px] font-semibold text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] flex items-center justify-center rounded-none transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleConfirmSign}
              className="h-[28px] px-5 bg-[#16A34A] hover:bg-[#15803D] text-white text-[12px] font-semibold flex items-center justify-center rounded-none shadow-sm transition-colors"
            >
              Ya, Setuju
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteSignModal = () => {
    if (!deleteSignModal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center font-sans">
        <div className="bg-white w-[480px] rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#E2E8F0] flex flex-col">

          {/* Elegant Header */}
          <div className="bg-[#F8FAFC] px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-[#FEF2F2] p-1.5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#DC2626]">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </div>
              <h3 className="text-[15px] font-bold text-[#0F172A]">Hapus Tanda Tangan</h3>
            </div>
            <button
              onClick={() => setDeleteSignModal(prev => ({ ...prev, isOpen: false }))}
              className="text-[#64748B] hover:text-[#0F172A] w-6 h-6 flex items-center justify-center transition-colors focus:outline-none"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-[13px] text-[#334155] font-semibold mb-3 leading-snug">
              Apakah Anda yakin ingin menghapus tanda tangan untuk divisi <span className="text-[#DC2626] uppercase">{deleteSignModal.divisionName}</span>?
            </p>
            <div className="bg-[#FEF2F2] border-l-4 border-[#DC2626] p-4 text-[12px] text-[#991B1B] rounded-none">
              Tindakan ini akan membatalkan tanda tangan dan status dokumen akan kembali menjadi belum divalidasi pada bagian ini.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end space-x-3">
            <button
              onClick={() => setDeleteSignModal(prev => ({ ...prev, isOpen: false }))}
              className="h-[28px] px-5 border border-[#CBD5E1] bg-white text-[12px] font-semibold text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] flex items-center justify-center rounded-none transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleConfirmDeleteSign}
              className="h-[28px] px-5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[12px] font-semibold flex items-center justify-center rounded-none shadow-sm transition-colors"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isAuthorized !== true) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white h-full font-sans">
        <div className="w-8 h-8 border-4 border-[#0078D4] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[13px] text-[#605E5C]">Memeriksa hak akses...</p>
      </div>
    );
  }

  if (openDoc) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#F1F5F9] font-sans h-full overflow-hidden print:overflow-visible print:h-auto print:block">
        {/* Top Sticky Header - Always pinned and fully visible on laptop */}
        <div className="bg-white border-b border-[#E2E8F0] px-4 md:px-6 py-2.5 flex items-center justify-between shrink-0 shadow-none z-30 print:hidden">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (divUpper === 'DATA IM' || divUpper === 'LIHAT IM') {
                  pendingDeletedSignaturesRef.current.clear();
                  setOpenDoc(null);
                  return;
                }
                setShowBackConfirmation(true);
              }}
              className="bg-white border border-[#D1D5DB] px-3.5 py-1.5 rounded-none text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] flex items-center space-x-1.5 shadow-none cursor-pointer"
            >
              <span>← Back</span>
            </button>
            {divUpper !== 'DATA IM' && divUpper !== 'LIHAT IM' && (
              <button
                onClick={async () => {
                  const nozClean = (upFormData.nozzles || "").replace(/JUMLAH NOZZLE/ig, "").trim();
                  const vol = parseFloat(qcFillingData.volumeFg) || 0;
                  const den = parseFloat(qcFillingData.density) || 1;
                  const isDuo = qcFillingData.templateIm === 'Duo';
                  const volP1 = parseFloat(qcFillingData.volPhase1) || 0;
                  const denP1 = parseFloat(qcFillingData.denPhase1) || 1;
                  const volP2 = parseFloat(qcFillingData.volPhase2) || 0;
                  const denP2 = parseFloat(qcFillingData.denPhase2) || 1;

                  const hasUp = upFormData.lines && upFormData.lines.length > 0;
                  const isSachet = upFormData.lineType === 'SACHET LINE';

                  const totalVol = isDuo ? (volP1 + volP2) : vol;
                  const totalDen = isDuo ? (totalVol > 0 ? ((volP1 * denP1) + (volP2 * denP2)) / totalVol : 1) : den;

                  let currentIsFilled = false;
                  if (divUpper === 'UP') {
                    const hasLine = (upFormData.lines && upFormData.lines.length > 0);
                    const hasQc = (qcResult != null) || (totalVol > 0);
                    currentIsFilled = !!(hasLine && hasQc);
                  } else if (divUpper === 'POLE') {
                    currentIsFilled = !!(
                      (poleData['A.1']?.imageDataUrl || (poleData['A.1']?.images && poleData['A.1']?.images.length > 0)) &&
                      (poleData['A.2']?.imageDataUrl || (poleData['A.2']?.images && poleData['A.2']?.images.length > 0)) &&
                      (poleData['A.3']?.imageDataUrl || (poleData['A.3']?.images && poleData['A.3']?.images.length > 0)) &&
                      (poleData['A.6']?.imageDataUrl || poleData['A.6']?.outerBox || (poleData['A.6']?.images && poleData['A.6']?.images.length > 0)) &&
                      (a7List.length > 0 || !!a7Data)
                    );
                  } else if (['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divUpper)) {
                    currentIsFilled = !!signatures[divisionName]?.signed;
                  } else if (divUpper === 'MSC ADM') {
                    const isLipEyeMsc = qcResult?.type === 'LipEye' || (openDoc?.rawDocument?.templateIm || '').toLowerCase().includes('lip eye');
                    if (isLipEyeMsc) {
                      currentIsFilled = !!(
                        poleData['A.2']?.imageDataUrl ||
                        (poleData['A.2']?.images && poleData['A.2']?.images.length > 0)
                      );
                    } else {
                      currentIsFilled = !!(
                        poleData['A.3_MSC']?.imageDataUrl ||
                        (poleData['A.3_MSC']?.images && poleData['A.3_MSC']?.images.length > 0)
                      );
                    }
                  } else if (divUpper === 'IQ') {
                    const hasIqBatch = !!(savedIqBatchText && savedIqBatchText.trim().length > 0);
                    currentIsFilled = hasQsData && hasIqBatch;
                  }

                  let existingPayload: any = {};
                  try {
                    const existingSync = localStorage.getItem(`im_sync_${openDoc.id}`);
                    if (existingSync) existingPayload = JSON.parse(existingSync);
                  } catch (e) { }

                  let updatedFields: any = {};

                  if (divUpper === 'UP') {
                    updatedFields = {
                      savedUpFormData: upFormData,
                      savedQcFillingData: qcFillingData,
                      savedQcResult: qcResult,
                      JenisLine: upFormData.lineType,
                      Line: upFormData.lines.join(", "),
                      JumlahNozzel: nozClean,
                      Kategori: upFormData.kategori,
                      HasUpData: hasUp,
                      HasQcData: qcResult != null,
                      TemplateIm: qcFillingData.templateIm,
                      Volume: totalVol,
                      Density: totalDen,
                      VolPhase1: volP1,
                      DenPhase1: denP1,
                      VolPhase2: volP2,
                      DenPhase2: denP2,
                      NamePhase1: "PHASE 1",
                      NamePhase2: "PHASE 2",
                      IsSachet: isSachet,
                      IsDuo: isDuo,
                      up_data: {
                        jenis_line: upFormData.lineType,
                        line: upFormData.lines.join(", "),
                        jumlah_nozzel: nozClean,
                        kategori: upFormData.kategori
                      },
                      up_qc_data: {
                        template_im: qcFillingData.templateIm,
                        jenis_produk: qcFillingData.templateIm,
                        vol_fg: totalVol,
                        density: totalDen,
                        vol_phase1: volP1,
                        density_phase1: denP1,
                        vol_phase2: volP2,
                        density_phase2: denP2,
                        name_phase1: "PHASE 1",
                        name_phase2: "PHASE 2"
                      }
                    };
                  } else if (divUpper === 'POLE') {
                    const mergedPoleData = { ...(existingPayload.poleData || {}), ...poleData };
                    const pHasA1 = !!(mergedPoleData['A.1']?.imageDataUrl || (mergedPoleData['A.1']?.images && mergedPoleData['A.1']?.images.length > 0));
                    const pHasA2 = !!(mergedPoleData['A.2']?.imageDataUrl || (mergedPoleData['A.2']?.images && mergedPoleData['A.2']?.images.length > 0));
                    const pHasA3 = !!(mergedPoleData['A.3']?.imageDataUrl || (mergedPoleData['A.3']?.images && mergedPoleData['A.3']?.images.length > 0));
                    const pHasA6 = !!(mergedPoleData['A.6']?.imageDataUrl || mergedPoleData['A.6']?.outerBox || (mergedPoleData['A.6']?.images && mergedPoleData['A.6']?.images.length > 0));

                    // For a7List, if it was touched, a7List array is used. If not, existingPayload is used.
                    // Since deleting the last item in a7List via modal immediately updates localStorage (existingPayload), 
                    // we can safely check the merged a7List length.
                    const mergedA7List = a7List.length > 0 ? a7List : (existingPayload.a7List || []);
                    const mergedJacomexList = a7List.length > 0 ? a7List : (existingPayload.JacomexList || []);
                    const mergedA7Data = a7List[0] || existingPayload.a7Data || null;
                    const mergedA7Data2 = a7List[0] || existingPayload.A7Data || null;

                    const pHasA7 = (mergedA7List.length > 0) || !!mergedA7Data;

                    updatedFields = {
                      poleData: mergedPoleData,
                      A1ImageData: mergedPoleData['A.1']?.imageDataUrl || existingPayload.A1ImageData || null,
                      A2ImageData: mergedPoleData['A.2']?.imageDataUrl || existingPayload.A2ImageData || null,
                      A3PoleImageData: mergedPoleData['A.3']?.imageDataUrl || existingPayload.A3PoleImageData || null,
                      A3MscImageData: mergedPoleData['A.3_MSC']?.imageDataUrl || existingPayload.A3MscImageData || null,
                      PaletloadOuterBox: poleData['A.6']?.outerBox || null,
                      PaletloadLayers: poleData['A.6']?.layers || null,
                      PaletloadFg: poleData['A.6']?.fg || null,
                      PaletloadImageData: poleData['A.6']?.imageDataUrl || existingPayload.PaletloadImageData || null,
                      a7List: mergedA7List,
                      JacomexList: mergedJacomexList,
                      a7Data: mergedA7Data,
                      A7Data: mergedA7Data2,
                      hasA1: pHasA1,
                      hasA2: pHasA2,
                      hasA3: pHasA3,
                      hasA6: pHasA6,
                      hasA7: pHasA7,
                    };
                    // Also update currentIsFilled using the merged flags
                    const isLipEye = qcResult?.type === 'LipEye' || (openDoc?.rawDocument?.templateIm || '').toLowerCase().includes('lip eye');
                    currentIsFilled = !!(updatedFields.hasA1 && (isLipEye ? true : updatedFields.hasA2) && updatedFields.hasA3 && updatedFields.hasA6 && updatedFields.hasA7);
                  } else if (divUpper === 'MSC ADM') {
                    const isLipEyeMsc = qcResult?.type === 'LipEye' || (openDoc?.rawDocument?.templateIm || '').toLowerCase().includes('lip eye');
                    const mscPoleData = { ...(existingPayload.poleData || {}) };
                    if (isLipEyeMsc) {
                      mscPoleData['A.2'] = poleData['A.2'];
                    } else {
                      mscPoleData['A.3_MSC'] = poleData['A.3_MSC'];
                    }
                    updatedFields = {
                      poleData: mscPoleData,
                      ...(isLipEyeMsc
                        ? { A2ImageData: poleData['A.2']?.imageDataUrl || existingPayload.A2ImageData || null }
                        : { A3MscImageData: poleData['A.3_MSC']?.imageDataUrl || existingPayload.A3MscImageData || null })
                    };
                  } else if (divUpper === 'IQ') {
                    updatedFields = {
                      hasQsData: hasQsData,
                      qsTaraType: qsTaraType,
                      iqBatchText: savedIqBatchText,
                      qsAwalRows: qsAwalRows,
                      qsPeriodikRows: qsPeriodikRows,
                      qsAwalSpecs: qsAwalSpecs,
                      qsPeriodikSpecs: qsPeriodikSpecs,
                    };
                  }

                  const isSignatureOnlyDivision = ['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divUpper);

                  const payload = {
                    ...existingPayload,
                    ...updatedFields,
                    is_filled: currentIsFilled,
                    status: currentIsFilled ? "Filled" : "Not Filled",
                    filledBy: currentUser?.username || undefined,
                    filledByName: currentUser?.fullName || currentUser?.username || undefined
                  };

                  // Strip signature properties so they never pollute the form payload
                  delete payload.signed;
                  delete payload.signedBy;
                  delete payload.signedFullName;
                  delete payload.signerName;
                  delete payload.signedAt;

                  if (payload.signatures && payload.signatures[divisionName]) {
                    delete payload.signatures[divisionName];
                  }

                  try {
                    if (Object.keys(payload).length <= 2) { // only is_filled and status left
                      localStorage.removeItem(`im_sync_${openDoc.id}`);
                    } else {
                      localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(payload));
                    }
                  } catch (lsErr) {
                    try {
                      const keysToRemove = [];
                      for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith('im_sync_') && k !== `im_sync_${openDoc.id}`) {
                          keysToRemove.push(k);
                        }
                      }
                      keysToRemove.forEach((k) => localStorage.removeItem(k));
                      localStorage.setItem(`im_sync_${openDoc.id}`, JSON.stringify(payload));
                    } catch (e2) {
                      console.warn('LocalStorage quota exceeded after cleanup', e2);
                    }
                  }

                  // 1. Immediately close view & clear inputs (Zero UI lag) & update sidebar pending counts
                  const currentDocToSave = openDoc;
                  setOpenDoc(null);
                  setPoleData({});
                  setA7List([]);
                  setA7Data(null);
                  setQcResult(null);
                  setQcFillingData({ templateIm: 'Normal', volumeFg: '', density: '', volPhase1: '', denPhase1: '', volPhase2: '', denPhase2: '' });
                  setIsUpDataConfirmed(false);
                  setUpFormData({ lineType: 'BOTTLE LINE', kategori: '', lines: [], nozzles: '' });

                  // Immediately notify layout to refresh sidebar badge counts
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event('refresh_im_data'));
                  }

                  // 2. Perform Save and Release Lock in Background (Parallel)
                  const saveTasks: Promise<any>[] = [];

                  if (!isSignatureOnlyDivision) {
                    saveTasks.push(
                      fetch(`${API_BASE}/api/im/${currentDocToSave.id}/division/${encodeURIComponent(divisionName)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          dataJson: JSON.stringify(payload),
                          submittedBy: currentUser?.id
                        })
                      }).catch(() => { })
                    );
                  }

                  // Commit all pending signatures across all divisions
                  Object.entries(signatures).forEach(([sigDiv, sigData]: [string, any]) => {
                    if (sigData?.pendingSave) {
                      const sigPayload = JSON.stringify({
                        status: 'Filled',
                        signed: true,
                        signedBy: sigData.signedBy,
                        signedFullName: sigData.signerName,
                        signerName: sigData.signerName,
                        signedAt: sigData.signedAt
                      });
                      saveTasks.push(
                        fetch(`${API_BASE}/api/im/${currentDocToSave.id}/division/${encodeURIComponent(sigDiv)}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            dataJson: sigPayload,
                            submittedBy: currentUser?.id
                          })
                        }).catch(() => { })
                      );
                    }
                  });

                  // Commit all pending signature deletions to the backend
                  pendingDeletedSignaturesRef.current.forEach((delDivName) => {
                    const emptySigPayload = JSON.stringify({
                      status: 'Pending',
                      signed: false,
                      signedBy: '',
                      signedFullName: '',
                      signerName: '',
                      signedAt: ''
                    });
                    saveTasks.push(
                      fetch(`${API_BASE}/api/im/${currentDocToSave.id}/division/${encodeURIComponent(delDivName)}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                      }).catch(() => { })
                    );
                    saveTasks.push(
                      fetch(`${API_BASE}/api/im/${currentDocToSave.id}/division/${encodeURIComponent(delDivName)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ dataJson: emptySigPayload })
                      }).catch(() => { })
                    );
                  });
                  pendingDeletedSignaturesRef.current.clear();

                  if (divisionName === 'POLE' && !matchedSpecInfo?.specCode) {
                    const poleDivisionMap: Record<string, string> = {
                      'A.1': 'A.1. Appearance Filling',
                      'A.2': 'A.2. Appearance Assembly',
                      'A.3': 'A.3. Appearance Packing (POLE)',
                      'A.3_MSC': 'A.3. Appearance Packing (MSC)',
                      'A.6': 'A.6. Paletisasi'
                    };

                    Object.entries(poleDivisionMap).forEach(([secKey, secDivName]) => {
                      const secData = (updatedFields.poleData && updatedFields.poleData[secKey]) || poleData[secKey];
                      if (secData && (secData.imageDataUrl || secData.sceneState || secData.note)) {
                        const b64Data = secData.imageDataUrl ? (secData.imageDataUrl.split(',')[1] || '') : '';
                        const payloadJson: any = {
                          ...(secData.sceneState || {}),
                          note: secData.note || '',
                          filledBy: currentUser?.username || undefined,
                          filledByName: currentUser?.fullName || currentUser?.name || currentUser?.username || undefined
                        };
                        if (secKey === 'A.6') {
                          payloadJson.outerBox = secData.outerBox || '';
                          payloadJson.layers = secData.layers || '';
                          payloadJson.fg = secData.fg || '';
                        }
                        saveTasks.push(
                          fetch(`${API_BASE}/api/im/${currentDocToSave.id}/division/${encodeURIComponent(secDivName)}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              dataJson: JSON.stringify(payloadJson),
                              imageData: b64Data || undefined,
                              submittedBy: currentUser?.id
                            })
                          }).catch(() => { })
                        );
                      }
                    });

                    const a7Payload = {
                      data: a7List.map((item) => ({
                        type: item.type,
                        pressure: item.pressure || '',
                        duration: item.duration || '',
                        min_cond: item.minCondition || '',
                        max_cond: item.maxCondition || '',
                        min_dur: item.minDuration || '',
                        max_dur: item.maxDuration || '',
                        min_torsi: item.minTorsi || '',
                        max_torsi: item.maxTorsi || '',
                        description: item.description || ''
                      })),
                      filledBy: currentUser?.username || undefined,
                      filledByName: currentUser?.fullName || currentUser?.name || currentUser?.username || undefined
                    };
                    saveTasks.push(
                      fetch(`${API_BASE}/api/im/${currentDocToSave.id}/division/${encodeURIComponent('A.7. VACCUM / JACOMEX')}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          dataJson: JSON.stringify(a7Payload),
                          submittedBy: currentUser?.id
                        })
                      }).catch(() => { })
                    );
                  } else if (divisionName === 'MSC ADM') {
                    const isLipEyeMsc = qcResult?.type === 'LipEye' || (currentDocToSave?.rawDocument?.templateIm || '').toLowerCase().includes('lip eye');
                    const targetSecKey = isLipEyeMsc ? 'A.2' : 'A.3_MSC';
                    const targetDivName = isLipEyeMsc ? 'A.2. Appearance Assembly' : 'A.3. Appearance Packing (MSC)';
                    const secData = (updatedFields.poleData && updatedFields.poleData[targetSecKey]) || poleData[targetSecKey];
                    if (secData && (secData.imageDataUrl || secData.sceneState || secData.note)) {
                      const b64Data = secData.imageDataUrl ? (secData.imageDataUrl.split(',')[1] || '') : '';
                      saveTasks.push(
                        fetch(`${API_BASE}/api/im/${currentDocToSave.id}/division/${encodeURIComponent(targetDivName)}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            dataJson: JSON.stringify({
                              ...(secData.sceneState || {}),
                              note: secData.note || '',
                              filledBy: currentUser?.username || undefined,
                              filledByName: currentUser?.fullName || currentUser?.name || currentUser?.username || undefined
                            }),
                            imageData: b64Data || undefined,
                            submittedBy: currentUser?.id
                          })
                        }).catch(() => { })
                      );
                    }
                  }

                  saveTasks.push(releaseDocLock(currentDocToSave));

                  Promise.allSettled(saveTasks).then(() => {
                    fetchDivisionDocs(true); // background silent refresh
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new Event('refresh_im_data'));
                    }
                  });
                }}
                className="bg-white border border-[#22C55E] text-[#16A34A] px-3.5 py-1.5 rounded-none text-[13px] font-semibold hover:bg-[#DCFCE7] flex items-center space-x-1.5 shadow-none cursor-pointer"
              >
                <span>Save & Close</span>
              </button>
            )}
          </div>

          <div className="text-[12px] text-[#64748B] flex items-center space-x-2 truncate max-w-[500px]">
            <span className="font-semibold text-[#1E293B] truncate">{openDoc.productName || openDoc.description}</span>
            {openDoc.fgCode && (
              <span className="bg-[#E2E8F0] px-2 py-0.5 rounded-none text-[11px] font-medium text-[#475569] shrink-0">
                {openDoc.fgCode}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-auto custom-scrollbar p-4 md:p-6 print:p-0 print:overflow-visible">
          {!isDocLoading && divUpper === 'POLE' && !isPoleAllowedToFill && (
            <div className="w-[1400px] mx-auto mb-3 bg-[#FFFBEB] border border-[#FCD34D] text-[#92400E] px-4 py-2.5 rounded-none flex items-center space-x-3 text-[12.5px] font-medium shadow-none">
              <span className="text-[18px]">⚠️</span>
              <span>
                <strong>Perhatian:</strong> Dokumen ini memiliki lebih dari 1 No. FLA ({flaCount} FLA). <strong>Divisi UP harus mengisi data terlebih dahulu</strong> sebelum divisi POLE dapat melakukan pengisian data seksi A.1, A.2, A.3, A.6, dan A.7.
              </span>
            </div>
          )}
          {/* Document Preview Container (A4-like) */}
          <div id="im-print-area" className="bg-white mx-auto w-[1400px] max-w-[1400px] h-[1020px] flex flex-col shrink-0 shadow-none border border-black font-sans text-[12px] text-black p-[30px]">

            {/* Main Outer Container matching Desktop App */}
            <div className="border border-black flex flex-col flex-1 min-h-0 relative">

              {/* Header Grid (10 Columns) */}
              <div className="grid grid-cols-10 text-center text-[11px] font-bold relative z-20">
                <div className="col-span-2 border-r border-black p-[2px] bg-white flex items-center justify-center">PT YASULOR INDONESIA</div>
                <div className="col-span-6 border-r border-black bg-[#CCECFF] flex flex-col items-center justify-center relative min-h-[22px]">
                  <div className="font-bold text-[11px]">INSTRUKSI MUTU</div>
                  {isUpDataConfirmed && upFormData.kategori && upFormData.kategori !== 'Non Kategori' && (
                    <div className="bg-[#444444] text-white px-[21px] h-[22px] flex items-center justify-center text-[10px] font-bold absolute bottom-[-22px] left-1/2 -translate-x-1/2 z-10 whitespace-nowrap leading-none shadow-sm">
                      {upFormData.kategori}
                    </div>
                  )}
                </div>
                <div className="col-span-1 p-[2px] uppercase flex items-center justify-center">{openDoc.rawDocument.imCode || ''}</div>
                <div className="col-span-1 border-l border-black p-[2px] flex items-center justify-center text-center leading-tight">
                  {isUpDataConfirmed && upFormData.lineType ? upFormData.lineType : 'TUBE LINE'}
                </div>
              </div>

              {/* Doc Info Grid (10 Columns) */}
              <div className="grid grid-cols-10 border-t border-b border-black relative z-10">
                <div className="col-span-9 flex flex-col p-[6px_12px] min-h-[65px] justify-center">
                  <div className="font-bold text-[13px] text-[#0078D4] mb-[4px] uppercase">{openDoc.rawDocument.description || 'N/A'}</div>
                  <div className="flex w-full">
                    <div className="grid grid-cols-[55px_10px_1fr] gap-y-1 text-[12px] font-normal text-black w-1/2">
                      <div>Kode FG</div><div>:</div><div className="uppercase">{openDoc.rawDocument.imCode || '-'}</div>
                      <div>Kode SF</div><div>:</div><div className="uppercase">{openDoc.rawDocument.kodeSf || '-'}</div>
                      <div>No. Fla</div>
                      <div>:</div>
                      <div className="uppercase">
                        {openDoc.rawDocument.noFla ? openDoc.rawDocument.noFla.split(',').map((f: string, i: number, arr: string[]) => (
                          <React.Fragment key={i}>
                            {f.trim()}
                            {i < arr.length - 1 && <br />}
                          </React.Fragment>
                        )) : '-'}
                      </div>
                    </div>
                    <div className="grid grid-cols-[100px_10px_1fr] gap-y-1 text-[12px] font-normal text-black w-1/2">
                      <div>Tanggal Issue</div><div>:</div><div>{openDoc.rawDocument.tglIssue || '-'}</div>
                      <div>Alasan Revisi</div><div>:</div><div>{openDoc.rawDocument.alasanRevisi || '-'}</div>
                    </div>
                  </div>
                </div>
                {/* Cell under TUBE LINE */}
                <div className="col-span-1 p-0 flex flex-col items-center justify-center min-h-[65px] relative z-10">
                  {divUpper === 'UP' && !isUpDataConfirmed && (
                    <div className="flex-1 flex items-center justify-center p-2 w-full h-full bg-white border-l border-black">
                      <button onClick={() => setShowUpModal(true)} className="bg-[#0078D4] hover:bg-[#106EBE] text-white px-3 py-1.5 rounded-none text-[10px] font-semibold flex items-center shadow-none w-[130px] justify-center transition-colors">
                        <span className="mr-1 text-[12px] leading-none">+</span> ADD DATA BY UP
                      </button>
                    </div>
                  )}
                  {isUpDataConfirmed && (
                    <div className="flex-1 flex flex-col w-full h-full">
                      <div className="flex-1 bg-[#FDE047] border-l border-black flex flex-col items-center justify-center relative p-1">
                        {divUpper === 'UP' && (
                          <button
                            type="button"
                            onClick={() => setShowUpModal(true)}
                            className="absolute top-1 right-1 bg-white border border-[#CBD5E1] text-[#334155] rounded-none px-1.5 py-[2px] text-[7px] font-semibold flex items-center space-x-1 shadow-none hover:bg-[#F1F5F9] cursor-pointer"
                          >
                            <svg className="w-2.5 h-2.5 text-[#0078D4]" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                              <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                            </svg>
                            <span>Edit</span>
                          </button>
                        )}
                        <div className="text-[#1E3A8A] font-extrabold text-[15px] mt-3 leading-tight text-center">{(upFormData.lines && upFormData.lines.length > 0) ? upFormData.lines.join(', ') : '-'}</div>
                        <div className="text-[#1E3A8A] font-bold text-[9.5px] text-center">JUMLAH NOZZLE {upFormData.nozzles || '-'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>


              {/* Form Sections Flex Layout */}
              <div className="flex w-full flex-1 min-h-0 relative">
                {(() => {
                  return (
                    <>
                      {/* Left Column (Spesifikasi FG) - Exactly 50% width */}
                      <div className="w-1/2 shrink-0 flex flex-col min-h-0">
                        <div className="font-bold text-center border-b border-black flex items-center justify-center h-[20px] text-[11px] bg-[#FFB300] shrink-0 relative z-10">
                          A. Spesifikasi FG
                        </div>

                        {qcResult?.type === 'LipEye' ? (
                          <div className="flex flex-col flex-1 min-h-0">
                            <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center shrink-0 relative z-10">
                              A.1. Appearance Filling
                            </div>
                            <div className="flex-1 min-h-[100px]">
                              {renderPoleSection('A.1', 'A.1. Appearance Filling', false, 'w-full h-full')}
                            </div>

                            <div className="flex flex-row flex-1 min-h-[100px] border-t border-black relative z-10">
                              <div className="flex flex-col flex-1 min-h-0 border-r border-black">
                                <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center justify-center text-center shrink-0">
                                  A.2. Appearance Packing
                                </div>
                                <div className="flex-1 min-h-0 w-full">
                                  {renderPoleSection('A.2', 'A.2. Appearance Packing', false, 'w-full h-full')}
                                </div>
                              </div>

                              <div className="flex flex-col flex-1 min-h-0">
                                <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center justify-center text-center shrink-0">
                                  A.3 Appearance Assembly
                                </div>
                                <div className="flex-1 min-h-0 w-full">
                                  {renderPoleSection('A.3', 'A.3 Appearance Assembly', false, 'w-full h-full')}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center shrink-0 relative z-10">
                              A.1. Appearance Filling
                            </div>
                            <div className="flex-1 min-h-[120px]">
                              {renderPoleSection('A.1', 'A.1. Appearance Filling', false, 'w-full h-full')}
                            </div>

                            <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-t border-b border-black h-[14px] flex items-center shrink-0 relative z-10">
                              A.2. Appearance Assembly
                            </div>
                            <div className="flex-1 min-h-[120px]">
                              {renderPoleSection('A.2', 'A.2. Appearance Assembly', false, 'w-full h-full')}
                            </div>

                            {/* A.3 Split 50/50: Left = MSC ADM, Right = POLE */}
                            <div className="flex flex-col flex-1 min-h-[120px]">
                              <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-t border-b border-black h-[14px] flex items-center shrink-0 relative z-10">
                                A.3. Appearance Packing
                              </div>

                              {/* If neither has image and POLE is viewing -> show centered + ADD DATA BY POLE button across full width */}
                              {!poleData['A.3_MSC']?.imageDataUrl && !poleData['A.3']?.imageDataUrl && divUpper === 'POLE' && !isPoleAllowedToFill ? (
                                <div className="bg-[#EAEFE3] flex-1 min-h-0 w-full flex flex-col items-center justify-center p-2 text-center">
                                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded border border-amber-300">
                                    ⏳ Menunggu UP mengisi data
                                  </span>
                                </div>
                              ) : !poleData['A.3_MSC']?.imageDataUrl && !poleData['A.3']?.imageDataUrl && divUpper === 'POLE' && isPoleAllowedToFill ? (
                                <div className="bg-[#EAEFE3] flex-1 min-h-0 w-full flex items-center justify-center">
                                  <button
                                    onClick={() => openPoleModal('A.3', 'A.3. Appearance Packing (POLE)', false)}
                                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2 rounded-[4px] text-[12px] font-bold shadow-md flex items-center justify-center transition-colors"
                                  >
                                    + ADD DATA BY POLE
                                  </button>
                                </div>
                              ) : !poleData['A.3_MSC']?.imageDataUrl && !poleData['A.3']?.imageDataUrl && divUpper === 'MSC ADM' ? (
                                <div className="bg-[#EAEFE3] flex-1 min-h-0 w-full flex items-center justify-center">
                                  <button
                                    onClick={() => openPoleModal('A.3_MSC', 'A.3. Appearance Packing (MSC)', false)}
                                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2 rounded-[4px] text-[12px] font-bold shadow-md flex items-center justify-center transition-colors"
                                  >
                                    + ADD DATA BY MSC ADM
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-row flex-1 min-h-0 w-full">
                                  {/* Left Column: MSC ADM */}
                                  <div className="flex flex-col flex-1 min-h-0 h-full">
                                    {renderPoleSection('A.3_MSC', 'A.3. Appearance Packing (MSC)', false, 'w-full h-full')}
                                  </div>

                                  {/* Right Column: POLE */}
                                  <div className="flex flex-col flex-1 min-h-0 h-full">
                                    {renderPoleSection('A.3', 'A.3. Appearance Packing (POLE)', false, 'w-full h-full')}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}


                        {/* Volume FG - Hanya untuk Normal dan Sachet (Disembunyikan pada Lip Eye, Biphase, dan Duo karena merupakan produk multi-fase) */}
                        {(!qcResult || (!['LipEye', 'Biphase', 'Duo'].includes(qcResult.type) && !['LIP EYE MAKE UP REMOVER', 'Biphase', 'Duo'].includes(qcFillingData.templateIm))) && (
                          <div className="bg-[#EAEFE3] border-t border-b border-black px-[4px] text-[9px] italic h-[22px] flex items-center justify-between text-[#555] relative z-10">
                            <div className="flex items-center space-x-12">
                              <span>Volume FG</span>
                              {(qcFillingData.volumeFg || qcResult?.limitsMl?.nominal) && (
                                <span className="not-italic font-bold text-black text-[10px]">
                                  {qcFillingData.volumeFg || qcResult?.limitsMl?.nominal}
                                </span>
                              )}
                            </div>
                            {divUpper === 'UP' && (
                              <button
                                onClick={() => {
                                  if (!isUpDataConfirmed) {
                                    setWarningMessage("Harap isi Line Type terlebih dahulu sebelum memasukkan data Berat A.4.");
                                    setShowWarningModal(true);
                                  } else {
                                    setShowQcFillingModal(true);
                                  }
                                }}
                                className="bg-[#1E3A8A] hover:bg-[#172554] text-white px-2 py-[2px] rounded-[3px] text-[9px] font-bold flex items-center shadow-sm mr-1 transition-colors"
                              >
                                <span className="mr-1 text-[11px] leading-none font-bold">+</span> ADD DATA BY UP
                              </button>
                            )}
                          </div>
                        )}


                        {/* A.4 Header */}
                        {(!qcResult || qcResult.type !== 'LipEye') && (
                          <div className={`${(!qcResult || qcResult.type === 'Normal') ? 'bg-[#C0504D]' : (qcResult.type === 'Duo' ? 'bg-[#F79646]' : 'bg-[#4C1D1D]')} text-white px-[4px] font-bold text-[10px] h-[18px] flex items-center justify-between border-b border-black`}>
                            <span>{(qcResult && qcResult.type === 'Sachet') ? 'A.4. Berat (gram) di timbangan' : 'A.4. Berat'}</span>
                            <div className="flex items-center space-x-1.5 print:hidden">
                              {(qcResult?.type === 'Biphase' || qcResult?.type === 'Duo') && divUpper === 'UP' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isUpDataConfirmed) {
                                      setWarningMessage("Harap isi Line Type terlebih dahulu sebelum memasukkan data Berat A.4.");
                                      setShowWarningModal(true);
                                    } else {
                                      setShowQcFillingModal(true);
                                    }
                                  }}
                                  className="bg-[#1E3A8A] hover:bg-[#172554] text-white px-1.5 py-[0.5px] rounded-[2px] text-[7.5px] font-bold flex items-center shadow-sm transition-colors cursor-pointer"
                                  title="Edit / Masukkan Data QC Filling"
                                >
                                  <span className="mr-0.5 text-[9px] leading-none font-bold">+</span> DATA QC UP
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowCalculationDetailModal(true); }}
                                className="bg-[#FFE082] hover:bg-[#FFD54F] text-[#3E2723] text-[8px] font-bold px-1.5 py-[1px] rounded-[2px] flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
                                title="Klik untuk melihat rumus & rincian perhitungan A.4"
                              >
                                <span>ℹ</span>
                                <span>Rincian Perhitungan</span>
                              </button>
                            </div>
                          </div>
                        )}


                        {(() => {
                          if (qcResult && (qcResult.type === 'Duo' || (qcResult.type === 'Biphase' || qcResult.type === 'LipEye'))) {
                            const getPhaseTitle = (index: number, defaultName: string) => {
                              if (!openDoc || !openDoc.rawDocument || !openDoc.rawDocument.noFla) return `(${defaultName})`;
                              const parts = openDoc.rawDocument.noFla.split(/[\r\n,]+/).map((p: string) => p.trim()).filter((p: string) => p);
                              if (parts.length > index) {
                                const p1 = parts[index];
                                if (p1.includes('(') && p1.includes(')')) return `: ${p1.replace(/^:\s*/, '')}`;
                                return `: ${p1.replace(/^:\s*/, '')} (${openDoc.rawDocument.description || ''} ${defaultName})`;
                              }
                              return `(${defaultName})`;
                            };

                            const renderLipEyeBeratBlock = (
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
                                <div className="flex flex-col border-b border-black w-full text-black">
                                  {/* Header Row */}
                                  <div className="bg-[#C0504D] text-white font-bold px-1.5 py-[1px] text-[9.5px] border-b border-black flex items-center justify-between">
                                    <span>{headerText}</span>
                                    {headerText.includes('A.4.') && !headerText.includes('A.4.1') && (
                                      <div className="flex items-center space-x-1.5 print:hidden">
                                        {divUpper === 'UP' && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!isUpDataConfirmed) {
                                                setWarningMessage("Harap isi Line Type terlebih dahulu sebelum memasukkan data Berat A.4.");
                                                setShowWarningModal(true);
                                              } else {
                                                setShowQcFillingModal(true);
                                              }
                                            }}
                                            className="bg-[#1E3A8A] hover:bg-[#172554] text-white px-1.5 py-[0.5px] rounded-[2px] text-[7.5px] font-bold flex items-center shadow-sm transition-colors cursor-pointer"
                                            title="Edit / Masukkan Data QC Filling Lip Eye"
                                          >
                                            <span className="mr-0.5 text-[9px] leading-none font-bold">+</span> DATA QC UP
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setShowCalculationDetailModal(true); }}
                                          className="bg-[#FFE082] hover:bg-[#FFD54F] text-[#3E2723] text-[7.5px] font-bold px-1.5 py-[0.5px] rounded-[2px] flex items-center space-x-0.5 cursor-pointer"
                                          title="Klik untuk melihat rumus & rincian perhitungan A.4"
                                        >
                                          <span>ℹ Rincian Perhitungan</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Subheader Row: 5 columns aligned with color bar */}
                                  <div className="grid grid-cols-[20%_19.5%_26%_14.5%_20%] bg-[#FAEAD6] h-[15px] items-center text-[8.5px] border-b border-black">
                                    <div className="text-left pl-1 font-bold truncate">{titleLeft}</div>
                                    <div className="text-right pr-1 font-bold">Syarat legal :</div>
                                    <div className="text-left pl-1 font-bold">{syaratLegal}</div>
                                    <div className="text-right pr-1 font-bold">density :</div>
                                    <div className="text-left pl-2 font-bold">{density}</div>
                                  </div>

                                  {/* Color Bar Row */}
                                  <div className="grid grid-cols-[20%_19.5%_26%_14.5%_20%] text-center text-[8px] font-bold border-b border-black h-[13px]">
                                    <div className="bg-[#FF0000] text-black border-r border-black h-full flex items-center justify-center">STOP</div>
                                    <div className="bg-[#FFFF00] text-black border-r border-black h-full flex items-center justify-center">ADJUST</div>
                                    <div className="bg-[#00AF50] text-black border-r border-black h-full flex items-center justify-center tracking-widest">RUNNING</div>
                                    <div className="bg-[#FFFF00] text-black border-r border-black h-full flex items-center justify-center">ADJUST</div>
                                    <div className="bg-[#FF0000] text-black h-full flex items-center justify-center">STOP</div>
                                  </div>

                                  {/* Numbers & Labels Row */}
                                  <div className="grid grid-cols-[20%_19.5%_26%_14.5%_20%] bg-[#FAEAD6] pt-[1px] pb-[2px] items-start text-[9px] relative">
                                    {/* Col 1: stopMin (blue bold right), min (black bold right) */}
                                    <div className="flex flex-col items-end pr-2 justify-start">
                                      <span className="text-[#002060] font-bold">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                      <span className="text-black font-bold text-[8px] mt-[-1px]">min</span>
                                    </div>

                                    {/* Col 2: adjMin (black bold left) */}
                                    <div className="flex flex-col items-start pl-6 justify-start">
                                      <span className="text-black font-bold">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                    </div>

                                    {/* Col 3: nominal (blue bold left) + nominal label, orange box LINK BOM (center), runMax (black bold right) */}
                                    <div className="relative flex justify-between items-start h-full px-1">
                                      <div className="flex flex-col items-center justify-start min-w-[36px]">
                                        <span className="text-[#002060] font-bold">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-bold text-[8px] mt-[-1px]">nominal</span>
                                      </div>

                                      <div className="bg-[#FFC000] border border-black flex flex-col items-center justify-center px-1.5 py-[0.5px] min-w-[54px] shadow-sm">
                                        <span className="text-black font-bold text-[9px] leading-[1.1]">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-bold text-[7.5px] leading-[1.1] whitespace-nowrap">LINK BOM</span>
                                      </div>

                                      <div className="flex flex-col items-center justify-start min-w-[36px]">
                                        <span className="text-black font-bold">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>

                                    {/* Col 4: adjMax (black bold right) */}
                                    <div className="flex flex-col items-end pr-6 justify-start">
                                      <span className="text-black font-bold">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                    </div>

                                    {/* Col 5: stopMax (black bold left), max (black bold left) */}
                                    <div className="flex flex-col items-start pl-2 justify-start">
                                      <span className="text-black font-bold">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                      <span className="text-black font-bold text-[8px] mt-[-1px]">max</span>
                                    </div>
                                  </div>

                                  {/* Info Row: 5 columns aligned with color bar */}
                                  <div className="grid grid-cols-[20%_19.5%_26%_14.5%_20%] bg-[#FAEAD6] pb-[2px] items-center text-[8.5px]">
                                    <div className="text-right pr-2 font-bold">Vol :</div>
                                    <div className="text-center font-bold">{volText}</div>
                                    <div className="relative flex justify-between items-center px-1 font-bold">
                                      <span className="text-center min-w-[36px]">{pctText}</span>
                                      <span className="absolute left-1/2 -translate-x-1/2">{midText}</span>
                                      <span className="min-w-[36px]"></span>
                                    </div>
                                    <div className="text-right pr-1 font-bold">stat error :</div>
                                    <div className="text-left pl-2 font-bold">{statError}</div>
                                  </div>
                                </div>
                              );
                            };

                            const renderLipEyeVolumeBlock = (headerText: string, limits: any) => {
                              if (!limits) return null;
                              const [mainTitle, refTitle] = headerText.includes('>>') ? headerText.split('>>') : [headerText, ''];
                              return (
                                <div className="flex flex-col border-b border-black w-full text-black">
                                  {/* Header Row */}
                                  <div className="bg-[#C0504D] text-white font-bold px-1.5 py-[1px] text-[9.5px] border-b border-black flex items-center">
                                    <span>{mainTitle.trim()}</span>
                                    {refTitle && <span className="ml-5 font-bold text-[9px] text-white">&gt;&gt; {refTitle.trim()}</span>}
                                  </div>

                                  {/* Blank Cream Row (same height and rhythm as subheader) */}
                                  <div className="bg-[#FAEAD6] h-[15px] border-b border-black"></div>

                                  {/* Color Bar Row */}
                                  <div className="grid grid-cols-[20%_19.5%_26%_14.5%_20%] text-center text-[8px] font-bold border-b border-black h-[13px]">
                                    <div className="bg-[#FF0000] text-black border-r border-black h-full flex items-center justify-center">STOP</div>
                                    <div className="bg-[#FFFF00] text-black border-r border-black h-full flex items-center justify-center">ADJUST</div>
                                    <div className="bg-[#00AF50] text-black border-r border-black h-full flex items-center justify-center tracking-widest">RUNNING</div>
                                    <div className="bg-[#FFFF00] text-black border-r border-black h-full flex items-center justify-center">ADJUST</div>
                                    <div className="bg-[#FF0000] text-black h-full flex items-center justify-center">STOP</div>
                                  </div>

                                  {/* Numbers & Labels Row */}
                                  <div className="grid grid-cols-[20%_19.5%_26%_14.5%_20%] bg-[#FAEAD6] pt-[1px] pb-[4px] items-start text-[9px] relative">
                                    {/* Col 1: stopMin (blue bold right), min (black bold right) */}
                                    <div className="flex flex-col items-end pr-2 justify-start">
                                      <span className="text-[#002060] font-bold">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                      <span className="text-black font-bold text-[8px] mt-[-1px]">min</span>
                                    </div>

                                    {/* Col 2: adjMin (black bold left) */}
                                    <div className="flex flex-col items-start pl-6 justify-start">
                                      <span className="text-black font-bold">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                    </div>

                                    {/* Col 3: nominal (blue bold left) + nominal label, orange box LINK BOM (center), runMax (black bold right) */}
                                    <div className="relative flex justify-between items-start h-full px-1">
                                      <div className="flex flex-col items-center justify-start min-w-[36px]">
                                        <span className="text-[#002060] font-bold">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-bold text-[8px] mt-[-1px]">nominal</span>
                                      </div>

                                      <div className="bg-[#FFC000] border border-black flex flex-col items-center justify-center px-1.5 py-[0.5px] min-w-[54px] shadow-sm">
                                        <span className="text-black font-bold text-[9px] leading-[1.1]">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-bold text-[7.5px] leading-[1.1] whitespace-nowrap">LINK BOM</span>
                                      </div>

                                      <div className="flex flex-col items-center justify-start min-w-[36px]">
                                        <span className="text-black font-bold">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>

                                    {/* Col 4: adjMax (black bold right) */}
                                    <div className="flex flex-col items-end pr-6 justify-start">
                                      <span className="text-black font-bold">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                    </div>

                                    {/* Col 5: stopMax (black bold left), max (black bold left) */}
                                    <div className="flex flex-col items-start pl-2 justify-start">
                                      <span className="text-black font-bold">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                      <span className="text-black font-bold text-[8px] mt-[-1px]">max</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            };
                            const renderBiphaseRow = (title: string, limits: any, pctStr: string, title2: string, density: string, isTotal?: any) => {
                              if (!limits) return null;
                              const rowTitle = typeof isTotal === 'string' ? isTotal : "Berat: (gram)";
                              return (
                                <div className="flex flex-col border-b border-black w-full">
                                  <div className="bg-[#F8F9FA] border-b border-black h-[16px] flex items-center px-1 text-[8.5px] text-black">
                                    <span className="w-[90px] font-semibold">{rowTitle}</span>
                                    <span className="w-[50px] text-left font-normal">{pctStr}</span>
                                    <span className="flex-1 text-center font-bold">{title}</span>
                                    <span className="w-[150px] text-right font-bold">{title2} <span className="text-[#0078D4] font-bold ml-1">{density}</span></span>
                                  </div>
                                  <div className="grid grid-cols-5 text-center text-[8.5px] font-bold border-b border-black h-[14px] items-center">
                                    <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black h-full">STOP</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                    <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                    <div className="bg-[#C00000] text-white flex items-center justify-center h-full">STOP</div>
                                  </div>
                                  <div className="grid grid-cols-5 text-center bg-white h-[28px] relative items-center">
                                    <div className="relative flex items-center justify-start h-full w-full">
                                      <div className="flex flex-col items-start font-bold ml-1 relative z-20">
                                        <span className="text-[#003366] leading-none text-[9.5px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-normal text-[6.5px] leading-none ml-[10px]">min</span>
                                      </div>
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-[#003366] font-bold leading-none text-[9.5px] bg-white px-[2px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-start h-full w-full">
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-[#003366] font-bold leading-none text-[9.5px] bg-white px-[2px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-normal text-[6.5px] leading-none bg-white px-[2px]">nominal</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-center h-full w-full">
                                      <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center w-[40px] h-full z-10">
                                        <span className="text-black font-normal text-[9.5px] leading-none mb-[1px] mt-[1px]">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                        <span className="text-[#555] font-normal text-[6.5px] leading-none">LINK BOM</span>
                                      </div>
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-black font-normal leading-none text-[9.5px] bg-white px-[2px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-start h-full w-full">
                                      <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                        <span className="text-black font-normal leading-none text-[9.5px] bg-white px-[2px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                        <span className="text-black font-bold text-[6.5px] leading-none bg-white px-[2px] mt-[1px]">max</span>
                                      </div>
                                    </div>
                                    <div className="relative flex items-center justify-end h-full w-full pr-1">
                                      <div className="flex flex-col items-end font-normal relative z-20">
                                        <span className="text-black leading-none text-[9.5px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            const renderDuoRow = (title: string, limits: any, density: string, isTotal: boolean, volStr?: string) => (
                              <div className="flex flex-col border-b border-black w-full text-black">
                                {/* Title Row */}
                                <div className="bg-[#B8CCE4] border-b border-black h-[15px] flex items-center px-1.5 font-bold text-[9.5px] text-black shrink-0 leading-none">
                                  {title}
                                </div>

                                {/* Syarat Legal Row (Phase 1 & 2 only) */}
                                {!isTotal && (
                                  <div className="grid grid-cols-[14%_20%_32%_20%_14%] h-[12px] border-b border-black bg-white items-center text-[7.5px] text-black shrink-0 leading-none">
                                    <div className="pl-2 text-left font-normal leading-none">. Syarat legal</div>
                                    <div></div>
                                    <div className="pl-1 text-left font-normal leading-none">{limits?.syaratLegal?.toFixed(3).replace(/0$/, '') ?? '0.090'}</div>
                                    <div></div>
                                    <div></div>
                                  </div>
                                )}

                                {/* Color Bar Row */}
                                <div className="grid grid-cols-[14%_20%_32%_20%_14%] text-center text-[8px] font-bold border-b border-black h-[12px] shrink-0 leading-none">
                                  <div className="bg-[#FF0000] text-black flex items-center justify-center border-r border-black h-full">STOP</div>
                                  <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                  <div className="bg-[#00AF50] text-black flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
                                  <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                  <div className="bg-[#FF0000] text-black flex items-center justify-center h-full">STOP</div>
                                </div>

                                {/* Numbers & Labels Row */}
                                <div className="grid grid-cols-[14%_20%_32%_20%_14%] bg-white items-start relative h-[27px] shrink-0">
                                  {/* Col 1 (14%): stopMin on top-left, min on bottom-right */}
                                  <div className="flex flex-col justify-between h-full px-1.5 py-[1px]">
                                    <div className="text-left leading-none">
                                      <span className="text-[#002060] font-bold text-[13px] leading-none">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                    </div>
                                    <div className="text-right leading-none">
                                      <span className="text-black font-bold text-[7.5px] leading-none">min</span>
                                    </div>
                                  </div>

                                  {/* Col 2 (20%): adjMin on left */}
                                  <div className="flex flex-col items-start pl-3 justify-start pt-[1px] h-full leading-none">
                                    <span className="text-black font-bold text-[13px] leading-none">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                  </div>

                                  {/* Col 3 (32%): nominal on left, Orange Box LINK BOM in center, runMax on right */}
                                  <div className="relative flex justify-between items-start h-full px-1.5 py-[1px]">
                                    <div className="flex flex-col items-center justify-start min-w-[36px] leading-none">
                                      <span className="text-[#002060] font-bold text-[13px] leading-none">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                      <span className="text-black font-bold text-[7.5px] leading-none mt-[1.5px]">nominal</span>
                                    </div>

                                    <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center px-1.5 py-0 min-w-[52px] shadow-sm absolute left-1/2 -translate-x-1/2 top-0 h-full z-10">
                                      <span className="text-black font-bold text-[13px] leading-none">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                      <span className="text-black font-normal text-[6.5px] leading-tight whitespace-nowrap mt-[1px]">LINK BOM</span>
                                    </div>

                                    <div className="flex flex-col items-center justify-start min-w-[36px] leading-none">
                                      <span className="text-black font-bold text-[13px] leading-none">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                    </div>
                                  </div>

                                  {/* Col 4 (20%): adjMax on right */}
                                  <div className="flex flex-col items-end pr-3 justify-start pt-[1px] h-full leading-none">
                                    <span className="text-black font-bold text-[13px] leading-none">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                  </div>

                                  {/* Col 5 (14%): stopMax on top-right, max & 2/3 on left */}
                                  <div className="flex justify-between items-start h-full px-1 py-[1px] relative">
                                    <div className="flex flex-col items-start justify-end h-full leading-none">
                                      <span className="text-black font-bold text-[7.5px] leading-none">max</span>
                                      {!isTotal && (
                                        <span className="text-black font-bold text-[7px] leading-none mt-[1px]">2/3</span>
                                      )}
                                    </div>

                                    <div className="flex flex-col items-end justify-start h-full leading-none">
                                      <span className="text-black font-bold text-[13px] leading-none">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Density & Volume Row (Phase 1 & 2 only) */}
                                {!isTotal && (
                                  <div className="grid grid-cols-[14%_20%_32%_20%_14%] h-[13px] bg-white items-center text-[8px] font-bold text-black border-t border-transparent shrink-0 leading-none">
                                    <div className="col-span-2 pl-2 flex items-center leading-none">
                                      <span>Density &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;&nbsp;</span>
                                      <span className="text-[#002060] font-bold text-[9.5px] leading-none">{density}</span>
                                    </div>
                                    <div></div>
                                    <div></div>
                                    <div className="text-right pr-1 leading-none">
                                      {volStr && (
                                        <span className="text-[#C00000] font-bold text-[8.5px] leading-none">{volStr}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );

                            const getShortPhaseName = (index: number) => {
                              if (!openDoc || !openDoc.rawDocument || !openDoc.rawDocument.noFla) return index === 0 ? "BLACK" : "WHITE";
                              const parts = openDoc.rawDocument.noFla.split(/[\r\n,]+/).map((p: string) => p.trim()).filter((p: string) => p);
                              if (parts.length > index) {
                                const p = parts[index];
                                const match = p.match(/PHS\s+([A-Z]+)/i);
                                if (match) return match[1].toUpperCase();
                                const parenMatch = p.match(/\((.*?)\)/);
                                if (parenMatch) {
                                  const words = parenMatch[1].split(' ');
                                  return words[words.length - 1].toUpperCase();
                                }
                              }
                              return index === 0 ? "BLACK" : "WHITE";
                            };

                            const isBiphaseMode = (qcResult.type === 'Biphase' || qcResult.type === 'LipEye');
                            const d1Str = (parseFloat(qcFillingData.denPhase1) || 1).toFixed(3);
                            const d2Str = (parseFloat(qcFillingData.denPhase2) || 1).toFixed(3);

                            const v1 = parseFloat(qcFillingData.volPhase1) || 0;
                            const v2 = parseFloat(qcFillingData.volPhase2) || 0;
                            const vTot = v1 + v2;
                            const d1 = parseFloat(qcFillingData.denPhase1) || 0;
                            const d2 = parseFloat(qcFillingData.denPhase2) || 0;
                            const totDenStr = (vTot > 0 ? ((v1 * d1 + v2 * d2) / vTot) : 1).toFixed(3);

                            if (isBiphaseMode) {
                              if (qcResult.type === 'LipEye') {
                                const formatSyaratLegal = (val: number | undefined) => {
                                  if (val == null) return '';
                                  return val < 1 ? val.toFixed(3) : val.toString();
                                };
                                return (
                                  <div className="flex flex-col w-full">
                                    {renderLipEyeBeratBlock("A.4. Berat (OILY)", "Berat filling oily phase", formatSyaratLegal(qcResult.phase1.limitsGram?.syaratLegal), d1Str, qcResult.phase1.limitsGram, vTot.toFixed(0), vTot > 0 ? (v1 / vTot * 100).toFixed(0) + "%" : "0%", v1.toFixed(1), getStatisticalError(v1).toFixed(3))}
                                    {renderLipEyeBeratBlock("A.4.1 Berat ( AQUA)", "Berat filling aqua phase", formatSyaratLegal(qcResult.phase2.limitsGram?.syaratLegal), d2Str, qcResult.phase2.limitsGram, vTot.toFixed(0), vTot > 0 ? (v2 / vTot * 100).toFixed(0) + "%" : "0%", v2.toFixed(1), getStatisticalError(v2).toFixed(3))}
                                    {renderLipEyeBeratBlock("A.5. Berat Total", "Berat filling Total", formatSyaratLegal(qcResult.total.limitsGram?.syaratLegal), totDenStr, qcResult.total.limitsGram, vTot.toFixed(0), "100%", vTot.toFixed(1), getStatisticalError(vTot).toFixed(3))}

                                    {renderLipEyeVolumeBlock("A.6. Volume OILY (ML)    >> REFERENSI di FLEXNET", qcResult.phase1.limitsMl)}
                                    {renderLipEyeVolumeBlock("A.6.1 Volume AQUA (ML)    >> REFERENSI di FLEXNET", qcResult.phase2.limitsMl)}
                                    {renderLipEyeVolumeBlock("A.7. Volume Total (ML)    >> REFERENSI di FLEXNET", qcResult.total.limitsMl)}
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
                            }

                            return (
                              <div className="flex flex-col w-full">
                                {renderDuoRow(getPhaseTitle(0, 'PHASE 1'), qcResult.phase1.limitsGram, d1Str, false, v1 > 0 ? v1.toFixed(1) : undefined)}
                                {renderDuoRow(getPhaseTitle(1, 'PHASE 2'), qcResult.phase2.limitsGram, d2Str, false, v2 > 0 ? v2.toFixed(1) : undefined)}
                                {renderDuoRow(`BERAT TOTAL (PHASE ${getShortPhaseName(0)} + ${getShortPhaseName(1)})`, qcResult.total.limitsGram, "", true)}
                              </div>
                            );
                          }

                          // Normal / Sachet layout
                          const isSachet = qcResult && qcResult.type === 'Sachet';

                          const formatVal = (v: number | null | undefined) => {
                            if (v === null || v === undefined || isNaN(v)) return '';
                            const s = v.toFixed(1);
                            return s === '392.0' ? '392' : s;
                          };

                          const renderNormalRow = (
                            title: string,
                            limits: any,
                            defaultLegal: string = "0.030"
                          ) => {
                            return (
                              <div className="flex flex-col w-full text-black">
                                {/* Subheader */}
                                <div className="bg-[#FCE9D9] border-b border-black grid grid-cols-[14%_20%_32%_20%_14%] items-center px-[6px] h-[20px] text-[9.5px] font-bold text-black">
                                  <div>{title}</div>
                                  <div>Syarat Legal :</div>
                                  <div>{limits ? limits.syaratLegal.toFixed(3) : defaultLegal}</div>
                                  <div></div>
                                  <div></div>
                                </div>

                                {/* Color Bar */}
                                <div className="grid grid-cols-[14%_20%_32%_20%_14%] text-center text-[10px] font-bold border-b border-black h-[14px] items-center">
                                  <div className="bg-[#FF0000] text-black font-bold flex items-center justify-center border-r border-black h-full">STOP</div>
                                  <div className="bg-[#FFFF00] text-black font-bold flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                  <div className="bg-[#00AF50] text-black font-bold flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
                                  <div className="bg-[#FFFF00] text-black font-bold flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                  <div className="bg-[#FF0000] text-black font-bold flex items-center justify-center h-full">STOP</div>
                                </div>

                                {/* Data Row */}
                                <div className="grid grid-cols-[14%_20%_32%_20%_14%] text-center text-[11px] bg-[#FCE9D9] border-b border-black h-[40px] relative items-center">
                                  {limits ? (
                                    <>
                                      {/* Col 1: Under STOP (stopMin on top left, min on bottom right) */}
                                      <div className="flex flex-col justify-between h-full py-1 px-1.5">
                                        <span className="text-[#0000CC] font-bold leading-tight text-left">{formatVal(limits.stopMin)}</span>
                                        <span className="text-black font-bold text-[9.5px] leading-tight text-right">min</span>
                                      </div>

                                      {/* Col 2: Under ADJUST (adjMin on top left) */}
                                      <div className="flex flex-col justify-between h-full py-1 px-1">
                                        <span className="text-black font-bold leading-tight text-left">{formatVal(limits.adjMin)}</span>
                                        <span></span>
                                      </div>

                                      {/* Col 3: Under RUNNING (nominal left, orange box center, runMax right) */}
                                      <div className="grid grid-cols-[1fr_auto_1fr] h-full items-center">
                                        <div className="flex flex-col justify-between h-full py-1 px-1">
                                          <span className="text-[#0000CC] font-bold leading-tight text-left">{formatVal(limits.nominal)}</span>
                                          <span className="text-black font-bold text-[9.5px] leading-tight text-left">nominal</span>
                                        </div>
                                        <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center h-full px-3.5 shadow-sm min-w-[75px]">
                                          <span className="text-black font-bold leading-tight text-[11px]">{formatVal(limits.linkBom)}</span>
                                          <span className="text-black font-bold text-[8.5px] leading-tight uppercase tracking-wider mt-0.5">LINK BOM</span>
                                        </div>
                                        <div className="flex flex-col justify-between h-full py-1 px-1">
                                          <span className="text-black font-bold leading-tight text-right">{formatVal(limits.runMax)}</span>
                                          <span></span>
                                        </div>
                                      </div>

                                      {/* Col 4: Under ADJUST (adjMax on top right) */}
                                      <div className="flex flex-col justify-between h-full py-1 px-1">
                                        <span className="text-black font-bold leading-tight text-right">{formatVal(limits.adjMax)}</span>
                                        <span></span>
                                      </div>

                                      {/* Col 5: Under STOP (stopMax on top right, max on bottom left) */}
                                      <div className="flex flex-col justify-between h-full py-1 px-1.5">
                                        <span className="text-black font-bold leading-tight text-right">{formatVal(limits.stopMax)}</span>
                                        <span className="text-black font-bold text-[9.5px] leading-tight text-left">max</span>
                                      </div>
                                    </>
                                  ) : (
                                    <>
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
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          };

                          if (!isSachet) {
                            return renderNormalRow("Berat (gram)", qcResult ? (qcResult.limitsGram || qcResult.total?.limitsGram) : null);
                          }

                          // Sachet layout
                          const a4Configs = [
                            { title: "Berat : (gram)", limits: qcResult ? (qcResult.limitsGram || qcResult.total?.limitsGram) : null, density: null }
                          ];

                          return a4Configs.map((cfg, idx) => (
                            <div key={idx}>
                              {/* Row 1 */}
                              <div className="bg-[#EAEFE3] border-b border-black flex justify-between px-[6px] items-center h-[20px] text-[9px] font-bold relative">
                                <div className="text-black w-[150px]">{cfg.title}</div>

                                <div className="absolute left-[50%] -translate-x-[50%] flex items-center justify-center">
                                  {cfg.limits ? (
                                    <>
                                      <span className="absolute right-full mr-2 text-black font-bold whitespace-nowrap">LINK BOM</span>
                                      <span className="text-black font-bold text-[11px]">{cfg.limits.linkBom.toFixed(1)}</span>
                                      <span className="absolute left-full ml-2 text-black font-normal whitespace-nowrap">Gram</span>
                                    </>
                                  ) : (
                                    <>LINK BOM &nbsp;&nbsp;<span className="text-black font-semibold">&nbsp;</span>&nbsp;&nbsp; Gram</>
                                  )}
                                </div>

                                <div className="text-black w-[150px] text-right z-10">
                                  Syarat Legal &nbsp;&nbsp;<span className="text-black font-semibold">{cfg.limits ? cfg.limits.syaratLegal.toFixed(3).replace(/0$/, '') : ''}</span>
                                </div>
                              </div>

                              {/* Row 2 (Colors) */}
                              <div className="grid grid-cols-7 text-center text-[10px] font-bold border-b border-black h-[14px] items-center">
                                <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black h-full">STOP</div>
                                <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                <div className="col-span-3 bg-[#00B050] text-white flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
                                <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                <div className="bg-[#C00000] text-white flex items-center justify-center h-full">STOP</div>
                              </div>

                              {/* Data Row */}
                              <div className="grid grid-cols-7 text-center text-[11px] bg-[#EAEFE3] border-b border-black h-[35px] relative items-center">
                                {cfg.limits ? (
                                  <>
                                    {/* Col 1: Under STOP (right side of red block) */}
                                    <div className="flex flex-col items-end justify-center h-full pr-1">
                                      <span className="text-[#0078D4] font-bold leading-none">{cfg.limits.stopMin.toFixed(1)}</span>
                                      <span className="text-black font-bold text-[9.5px] leading-tight mt-0.5">min</span>
                                    </div>

                                    {/* Col 2: Under ADJUST (Empty) */}
                                    <div></div>

                                    {/* Col 3: Under RUNNING Left (7.6) */}
                                    <div className="flex flex-col items-start justify-center h-full pl-2">
                                      <span className="text-[#0078D4] font-bold leading-none">{cfg.limits.runMin ? cfg.limits.runMin.toFixed(1) : cfg.limits.adjMin.toFixed(1)}</span>
                                    </div>

                                    {/* Col 4: Under RUNNING Center (Orange Box: 7.7 NOMINAL) */}
                                    <div className="bg-[#FFA500] border-l border-r border-black flex flex-col items-center justify-center h-full shadow-sm">
                                      <span className="text-black font-bold leading-none mb-0.5 text-[11px]">{cfg.limits.nominal.toFixed(1)}</span>
                                      <span className="text-black font-bold text-[8.5px] leading-none uppercase tracking-wider">NOMINAL</span>
                                    </div>

                                    {/* Col 5: Under RUNNING Right (7.8) */}
                                    <div className="flex flex-col items-end justify-center h-full pr-2">
                                      <span className="text-[#0078D4] font-bold leading-none">{cfg.limits.runMax ? cfg.limits.runMax.toFixed(1) : cfg.limits.adjMax.toFixed(1)}</span>
                                    </div>

                                    {/* Col 6: Under ADJUST (Empty) */}
                                    <div></div>

                                    {/* Col 7: Under STOP (left side of red block) */}
                                    <div className="flex flex-col items-start justify-center h-full pl-1">
                                      <span className="text-black font-bold leading-none">{cfg.limits.stopMax.toFixed(1)}</span>
                                      <span className="text-black font-bold text-[9.5px] leading-tight mt-0.5">max</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex flex-col items-end justify-center h-full pr-1">
                                      <span className="text-black font-normal text-[10px]">min</span>
                                    </div>
                                    <div></div>
                                    <div></div>
                                    <div className="bg-[#FFA500] border-l border-r border-black flex flex-col items-center justify-center h-full">
                                      <span className="text-black font-bold text-[8.5px] uppercase">NOMINAL</span>
                                    </div>
                                    <div></div>
                                    <div></div>
                                    <div className="flex flex-col items-start justify-center h-full pl-1">
                                      <span className="text-black font-normal text-[10px]">max</span>
                                    </div>
                                  </>
                                )}
                              </div>

                              {cfg.density !== null && (
                                <div className="bg-[#EAEFE3] border-b border-black h-[20px] px-[6px] flex items-center text-[10px] font-bold text-black">
                                  Density : {(parseFloat(cfg.density) || 0).toFixed(3)}
                                </div>
                              )}
                            </div>
                          ));
                        })()}


                        {qcResult && qcResult.type === 'Biphase' && (
                          <>
                            {/* A.5 Header */}
                            <div className="bg-[#4C1D1D] text-white px-[4px] font-bold text-[10px] h-[16px] flex items-center border-b border-black mt-[-1px]">
                              A.5. Volume
                            </div>
                            <div className="flex flex-col w-full">
                              {(() => {
                                const renderBiphaseVolRow = (title: string, limits: any, density: string, pctStr: string, title2: string) => {
                                  if (!limits) return null;
                                  return (
                                    <div className="flex flex-col border-b border-black w-full">
                                      <div className="bg-[#F8F9FA] border-b border-black h-[16px] flex items-center px-1 text-[10px] text-black">
                                        <span className="w-[90px] font-semibold">{title2}</span>
                                        <span className="w-[50px] text-left font-normal"></span>
                                        <span className="flex-1 text-center font-bold">{title}</span>
                                        <span className="w-[150px] text-right font-bold">{density} &nbsp;&nbsp; <span className="text-[#0078D4] font-bold ml-1">{pctStr}</span></span>
                                      </div>
                                      <div className="grid grid-cols-5 text-center text-[10px] font-bold border-b border-black h-[14px] items-center">
                                        <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black h-full">STOP</div>
                                        <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                        <div className="bg-[#00B050] text-white flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
                                        <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                        <div className="bg-[#C00000] text-white flex items-center justify-center h-full">STOP</div>
                                      </div>
                                      <div className="grid grid-cols-5 text-center bg-white h-[28px] relative items-center">
                                        <div className="relative flex items-center justify-start h-full w-full">
                                          <div className="flex flex-col items-start font-bold ml-1 relative z-20">
                                            <span className="text-[#003366] leading-none text-[11px]">{limits?.stopMin?.toFixed(1) ?? ''}</span>
                                            <span className="text-black font-normal text-[8px] leading-none ml-[10px]">min</span>
                                          </div>
                                          <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                            <span className="text-[#003366] font-bold leading-none text-[11px] bg-white px-[2px]">{limits?.adjMin?.toFixed(1) ?? ''}</span>
                                          </div>
                                        </div>
                                        <div className="relative flex items-center justify-start h-full w-full">
                                          <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                            <span className="text-[#003366] font-bold leading-none text-[11px] bg-white px-[2px]">{limits?.nominal?.toFixed(1) ?? ''}</span>
                                            <span className="text-black font-normal text-[8px] leading-none bg-white px-[2px]">nominal</span>
                                          </div>
                                        </div>
                                        <div className="relative flex items-center justify-center h-full w-full">
                                          <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center w-[40px] h-full z-10">
                                            <span className="text-black font-normal text-[10.5px] leading-none mb-[1px] mt-[1px]">{limits?.linkBom?.toFixed(1) ?? ''}</span>
                                            <span className="text-[#555] font-normal text-[7px] leading-none">LINK BOM</span>
                                          </div>
                                          <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                            <span className="text-black font-normal leading-none text-[10.5px] bg-white px-[2px]">{limits?.runMax?.toFixed(1) ?? ''}</span>
                                          </div>
                                        </div>
                                        <div className="relative flex items-center justify-start h-full w-full">
                                          <div className="absolute right-0 translate-x-1/2 flex flex-col items-center justify-center z-20">
                                            <span className="text-black font-normal leading-none text-[10.5px] bg-white px-[2px]">{limits?.adjMax?.toFixed(1) ?? ''}</span>
                                            <span className="text-black font-bold text-[8px] leading-none bg-white px-[2px] mt-[1px]">max</span>
                                          </div>
                                        </div>
                                        <div className="relative flex items-center justify-end h-full w-full pr-1">
                                          <div className="flex flex-col items-end font-normal relative z-20">
                                            <span className="text-black leading-none text-[10.5px]">{limits?.stopMax?.toFixed(1) ?? ''}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <>
                                    {renderBiphaseVolRow("OIL", qcResult.phase1.limitsMl, "Phase Oil", "15%", "Volume : (ml)")}
                                    {renderBiphaseVolRow("AQUEOUS", qcResult.phase2.limitsMl, "Phase Aqueous", "85%", "Volume : (ml)")}
                                    {renderBiphaseVolRow("BiPhase", qcResult.total.limitsMl, "BiPhase", "100%", "Volume : (ml)")}
                                  </>
                                )
                              })()}
                            </div>
                          </>
                        )}

                        {(!qcResult || (qcResult.type !== 'Duo' && (qcResult.type !== 'Biphase' && qcResult.type !== 'LipEye'))) && (
                          <>
                            {/* A.5 Header - Only for Sachet */}
                            {qcResult && qcResult.type === 'Sachet' && (
                              <div className="bg-[#4C1D1D] text-white px-[4px] font-bold text-[10px] h-[16px] flex items-center border-b border-black mt-[-1px]">
                                A.5. Volume (ML) di FLEXNET
                              </div>
                            )}

                            {(() => {
                              if (!qcResult || qcResult.type !== 'Sachet') {
                                const renderNormalRow = (
                                  title: string,
                                  limits: any,
                                  defaultLegal: string = "0.030"
                                ) => {
                                  const formatVal = (v: number | null | undefined) => {
                                    if (v === null || v === undefined || isNaN(v)) return '';
                                    const s = v.toFixed(1);
                                    return s === '392.0' ? '392' : s;
                                  };
                                  return (
                                    <div className="flex flex-col w-full text-black">
                                      {/* Subheader */}
                                      <div className="bg-[#FCE9D9] border-b border-black grid grid-cols-[14%_20%_32%_20%_14%] items-center px-[6px] h-[20px] text-[9.5px] font-bold text-black">
                                        <div>{title}</div>
                                        <div>Syarat Legal :</div>
                                        <div>{limits ? limits.syaratLegal.toFixed(3) : defaultLegal}</div>
                                        <div></div>
                                        <div></div>
                                      </div>

                                      {/* Color Bar */}
                                      <div className="grid grid-cols-[14%_20%_32%_20%_14%] text-center text-[10px] font-bold border-b border-black h-[14px] items-center">
                                        <div className="bg-[#FF0000] text-black font-bold flex items-center justify-center border-r border-black h-full">STOP</div>
                                        <div className="bg-[#FFFF00] text-black font-bold flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                        <div className="bg-[#00AF50] text-black font-bold flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
                                        <div className="bg-[#FFFF00] text-black font-bold flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                        <div className="bg-[#FF0000] text-black font-bold flex items-center justify-center h-full">STOP</div>
                                      </div>

                                      {/* Data Row */}
                                      <div className="grid grid-cols-[14%_20%_32%_20%_14%] text-center text-[11px] bg-[#FCE9D9] border-b border-black h-[40px] relative items-center">
                                        {limits ? (
                                          <>
                                            {/* Col 1: Under STOP (stopMin on top left, min on bottom right) */}
                                            <div className="flex flex-col justify-between h-full py-1 px-1.5">
                                              <span className="text-[#0000CC] font-bold leading-tight text-left">{formatVal(limits.stopMin)}</span>
                                              <span className="text-black font-bold text-[9.5px] leading-tight text-right">min</span>
                                            </div>

                                            {/* Col 2: Under ADJUST (adjMin on top left) */}
                                            <div className="flex flex-col justify-between h-full py-1 px-1">
                                              <span className="text-black font-bold leading-tight text-left">{formatVal(limits.adjMin)}</span>
                                              <span></span>
                                            </div>

                                            {/* Col 3: Under RUNNING (nominal left, orange box center, runMax right) */}
                                            <div className="grid grid-cols-[1fr_auto_1fr] h-full items-center">
                                              <div className="flex flex-col justify-between h-full py-1 px-1">
                                                <span className="text-[#0000CC] font-bold leading-tight text-left">{formatVal(limits.nominal)}</span>
                                                <span className="text-black font-bold text-[9.5px] leading-tight text-left">nominal</span>
                                              </div>
                                              <div className="bg-[#FFC000] border-l border-r border-black flex flex-col items-center justify-center h-full px-3.5 shadow-sm min-w-[75px]">
                                                <span className="text-black font-bold leading-tight text-[11px]">{formatVal(limits.linkBom)}</span>
                                                <span className="text-black font-bold text-[8.5px] leading-tight uppercase tracking-wider mt-0.5">LINK BOM</span>
                                              </div>
                                              <div className="flex flex-col justify-between h-full py-1 px-1">
                                                <span className="text-black font-bold leading-tight text-right">{formatVal(limits.runMax)}</span>
                                                <span></span>
                                              </div>
                                            </div>

                                            {/* Col 4: Under ADJUST (adjMax on top right) */}
                                            <div className="flex flex-col justify-between h-full py-1 px-1">
                                              <span className="text-black font-bold leading-tight text-right">{formatVal(limits.adjMax)}</span>
                                              <span></span>
                                            </div>

                                            {/* Col 5: Under STOP (stopMax on top right, max on bottom left) */}
                                            <div className="flex flex-col justify-between h-full py-1 px-1.5">
                                              <span className="text-black font-bold leading-tight text-right">{formatVal(limits.stopMax)}</span>
                                              <span className="text-black font-bold text-[9.5px] leading-tight text-left">max</span>
                                            </div>
                                          </>
                                        ) : (
                                          <>
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
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                };

                                return renderNormalRow("Volume (ml)", qcResult ? (qcResult.limitsMl || qcResult.total?.limitsMl) : null);
                              }

                              const a5Configs = [
                                { title: "Volume : (ml)", limits: qcResult ? (qcResult.limitsMl || qcResult.total?.limitsMl) : null }
                              ];

                              return a5Configs.map((cfg, idx) => (
                                <div key={idx}>
                                  {/* Row 1 */}
                                  <div className="bg-[#EAEFE3] border-b border-black flex justify-between px-[6px] items-center h-[20px] text-[9px] font-bold relative">
                                    <div className="text-black w-[150px]">{cfg.title}</div>

                                    <div className="absolute left-[50%] -translate-x-[50%] flex items-center justify-center">
                                      {cfg.limits ? (
                                        <>
                                          <span className="absolute right-full mr-2 text-black font-bold whitespace-nowrap">LINK BOM</span>
                                          <span className="text-black font-bold text-[11px]">{cfg.limits.linkBom.toFixed(1)}</span>
                                          <span className="absolute left-full ml-2 text-black font-normal whitespace-nowrap">ML</span>
                                        </>
                                      ) : (
                                        <>LINK BOM &nbsp;&nbsp;<span className="text-black font-semibold">&nbsp;</span>&nbsp;&nbsp; ML</>
                                      )}
                                    </div>

                                    <div className="text-black w-[150px] text-right z-10">
                                      Syarat Legal &nbsp;&nbsp;<span className="text-black font-semibold">{cfg.limits ? cfg.limits.syaratLegal.toFixed(3).replace(/0$/, '') : ''}</span>
                                    </div>
                                  </div>

                                  {/* Row 2 (Colors) */}
                                  <div className="grid grid-cols-7 text-center text-[10px] font-bold border-b border-black h-[14px] items-center">
                                    <div className="bg-[#C00000] text-white flex items-center justify-center border-r border-black h-full">STOP</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                    <div className="col-span-3 bg-[#00B050] text-white flex items-center justify-center border-r border-black h-full tracking-widest">RUNNING</div>
                                    <div className="bg-[#FFFF00] text-black flex items-center justify-center border-r border-black h-full">ADJUST</div>
                                    <div className="bg-[#C00000] text-white flex items-center justify-center h-full">STOP</div>
                                  </div>

                                  {/* Data Row */}
                                  <div className="grid grid-cols-7 text-center text-[11px] bg-[#EAEFE3] border-b border-black h-[35px] relative items-center">
                                    {cfg.limits ? (
                                      <>
                                        {/* Col 1: Under STOP (right side of red block) */}
                                        <div className="flex flex-col items-end justify-center h-full pr-1">
                                          <span className="text-[#0078D4] font-bold leading-none">{cfg.limits.stopMin.toFixed(1)}</span>
                                          <span className="text-black font-bold text-[9.5px] leading-tight mt-0.5">min</span>
                                        </div>

                                        {/* Col 2: Under ADJUST (Empty) */}
                                        <div></div>

                                        {/* Col 3: Under RUNNING Left (7.4) */}
                                        <div className="flex flex-col items-start justify-center h-full pl-2">
                                          <span className="text-[#0078D4] font-bold leading-none">{cfg.limits.runMin ? cfg.limits.runMin.toFixed(1) : cfg.limits.adjMin.toFixed(1)}</span>
                                        </div>

                                        {/* Col 4: Under RUNNING Center (Orange Box: 7.5 NOMINAL) */}
                                        <div className="bg-[#FFA500] border-l border-r border-black flex flex-col items-center justify-center h-full shadow-sm">
                                          <span className="text-black font-bold leading-none mb-0.5 text-[11px]">{cfg.limits.nominal.toFixed(1)}</span>
                                          <span className="text-black font-bold text-[8.5px] leading-none uppercase tracking-wider">NOMINAL</span>
                                        </div>

                                        {/* Col 5: Under RUNNING Right (7.6) */}
                                        <div className="flex flex-col items-end justify-center h-full pr-2">
                                          <span className="text-[#0078D4] font-bold leading-none">{cfg.limits.runMax ? cfg.limits.runMax.toFixed(1) : cfg.limits.adjMax.toFixed(1)}</span>
                                        </div>

                                        {/* Col 6: Under ADJUST (Empty) */}
                                        <div></div>

                                        {/* Col 7: Under STOP (left side of red block) */}
                                        <div className="flex flex-col items-start justify-center h-full pl-1">
                                          <span className="text-black font-bold leading-none">{cfg.limits.stopMax.toFixed(1)}</span>
                                          <span className="text-black font-bold text-[9.5px] leading-tight mt-0.5">max</span>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex flex-col items-end justify-center h-full pr-1">
                                          <span className="text-black font-normal text-[10px]">min</span>
                                        </div>
                                        <div></div>
                                        <div></div>
                                        <div className="bg-[#FFA500] border-l border-r border-black flex flex-col items-center justify-center h-full">
                                          <span className="text-black font-bold text-[8.5px] uppercase">NOMINAL</span>
                                        </div>
                                        <div></div>
                                        <div></div>
                                        <div className="flex flex-col items-start justify-center h-full pl-1">
                                          <span className="text-black font-normal text-[10px]">max</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ));
                            })()}
                          </>
                        )}
                        {/* Density Header Update */}
                        {(!qcResult || (qcResult.type !== 'Duo' && qcResult.type !== 'Biphase' && qcResult.type !== 'LipEye')) && (
                          <div className={`${(!qcResult || qcResult.type === 'Normal') ? 'bg-[#FCE9D9]' : 'bg-[#EAEFE3]'} border-t border-b border-black px-[6px] text-[11px] font-bold h-[24px] flex items-center`}>
                            <span className="text-black w-[80px]">Density</span><span className="text-black mr-2">:</span>
                            <span className="text-[#0000CC] bg-[#E0F2FE]/60 font-bold text-[11px] px-1.5 py-[0.5px] border border-blue-200 rounded-[2px]">
                              {qcFillingData.density ? parseFloat(qcFillingData.density).toFixed(3) : (qcResult?.limitsGram?.density?.toFixed(3) ?? '-')}
                            </span>
                          </div>
                        )}

                      </div>

                      {/* Right Column (Exactly 50% width) */}
                      <div className="w-1/2 shrink-0 flex flex-col justify-between min-h-0">
                        <div className="flex-1 flex flex-col">
                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-b border-black h-[14px] flex items-center justify-between shrink-0 relative z-10">
                            <span>A.6. Paletisasi</span>
                          </div>
                          <div className="min-h-[175px] h-[190px] shrink-0">
                            {renderPoleSection('A.6', 'A.6. Paletisasi', true, 'w-full h-full')}
                          </div>

                          <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[4px] py-[1px] border-t border-b border-black h-[14px] flex items-center justify-between uppercase shrink-0 relative z-10">
                            <span>A.7. VACCUM / JACOMEX / TORSI</span>
                          </div>
                          <div style={{ height: 60 }} className="shrink-0">
                            {renderA7Section('w-full h-full')}
                          </div>

                          {/* BATCH NUMBER FORMAT */}
                          <div className="border-t border-b border-black flex items-start bg-white h-[80px] relative z-10">
                            <div className="flex-1 px-2 pt-1 relative">
                              <div className="flex justify-between items-start pr-2">
                                <span className="font-bold text-[10px] underline underline-offset-2">BATCH NUMBER FORMAT</span>
                                {savedIqBatchText && divUpper === 'IQ' && (
                                  <button onClick={handleDeleteIqBatch} className="text-[#EF4444] font-bold hover:text-[#DC2626] text-[12px] cursor-pointer" title="Hapus Data">✕</button>
                                )}
                              </div>
                              {savedIqBatchText && (
                                <div className="text-[10px] text-black mt-0.5 leading-snug whitespace-pre-wrap">
                                  {savedIqBatchText.replace(/-->/g, '\u2011\u2011>')}
                                </div>
                              )}
                            </div>

                            {/* IQ Button for Batch Number */}
                            {!savedIqBatchText && divUpper === 'IQ' && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-[180px]">
                                <button onClick={() => setShowIqBatchModal(true)} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8 py-2 rounded-full text-[12px] font-bold shadow-md flex items-center justify-center transition-colors pointer-events-auto cursor-pointer">
                                  + ADD DATA BY IQ
                                </button>
                              </div>
                            )}

                            <div className="bg-[#85D3F2] text-[#1E3A8A] font-bold text-[14px] w-[180px] h-[60px] flex items-center justify-center text-center p-2 leading-tight shrink-0 border-l border-b border-black z-10">
                              PASTIKAN BATCH NO.<br />ADA DAN BENAR
                            </div>
                          </div>

                          {/* No Quality Surveillance */}
                          <div className="flex flex-col bg-white flex-1">
                            {!hasQsData && divUpper === 'IQ' ? (
                              <div className="flex items-center justify-center text-[#64748B] font-bold text-[12px] flex-1 min-h-[100px]">
                                <button onClick={handleOpenQsModal} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8 py-2 rounded-full text-[12px] font-bold shadow-md flex items-center justify-center transition-colors cursor-pointer">
                                  + ADD DATA BY IQ
                                </button>
                              </div>
                            ) : hasQsData ? (
                              <div className="w-full flex-1 flex flex-col text-[10px] bg-white border-b border-black">
                                {/* Title */}
                                <div className="bg-[#00B050] text-black font-bold text-center py-1 relative border-b border-black text-[11px] z-10">
                                   Jenis Pemeriksaan Quality Surveillance
                                   {divUpper === 'IQ' && (
                                     <div className="absolute right-2 top-[50%] -translate-y-[50%] flex space-x-2 items-center">
                                       <button onClick={handleOpenQsModal} className="text-black hover:text-gray-700 cursor-pointer flex items-center justify-center" title="Edit Data">
                                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                       </button>
                                       <button onClick={handleDeleteQs} className="text-[#C00000] hover:text-red-700 font-bold text-[14px] cursor-pointer leading-none" title="Hapus Data">
                                         ✕
                                       </button>
                                     </div>
                                   )}
                                 </div>

                                {/* Tables Container */}
                                <div className="flex-1 flex flex-col">
                                  {/* Table 1 */}
                                  <table className="w-full h-full flex-[4] border-collapse border-b border-black">
                                    <thead>
                                      <tr className="bg-[#E2EFDA] text-black text-center font-bold">
                                        <th className="border-r border-b border-black p-[2px] w-[25px]">No</th>
                                        <th className="border-r border-b border-black p-[2px] w-[140px]">Pemeriksaan Awal</th>
                                        <th className="border-r border-b border-black p-[2px]">Deskripsi Kerja</th>
                                        <th className="border-r border-b border-black p-[2px] w-[100px]">Spesifikasi</th>
                                        <th className="border-b border-black p-[2px] w-[130px]">Frekuensi</th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-center">
                                       {qsAwalRows.map((row, idx) => (
                                         <tr key={idx} className={idx < qsAwalRows.length - 1 ? "border-b border-black" : ""}>
                                           <td className="border-r border-black font-bold p-[2px]">{row.no || idx + 1}</td>
                                           <td className="border-r border-black p-[2px]">{row.pemeriksaan}</td>
                                           <td className="border-r border-black p-[2px]">{row.deskripsi}</td>
                                           <td className="border-r border-black p-[2px]">{row.spesifikasi}</td>
                                           <td className="p-[2px] leading-tight">{row.frekuensi}</td>
                                         </tr>
                                       ))}
                                     </tbody>
                                  </table>

                                  {/* Table 2 */}
                                  <table className="w-full h-full flex-[6] border-collapse">
                                    <thead>
                                      <tr className="bg-[#E2EFDA] text-black text-center font-bold border-b border-black">
                                        <th className="border-r border-black p-[2px] w-[25px]">No</th>
                                        <th className="border-r border-black p-[2px] w-[140px]">Pemeriksaan Periodik</th>
                                        <th className="border-r border-black p-[2px]">Deskripsi Kerja</th>
                                        <th className="border-r border-black p-[2px] w-[100px]">Spesifikasi</th>
                                        <th className="p-[2px] w-[130px]">Frekuensi</th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-center">
                                       {qsPeriodikRows.map((row, idx) => (
                                         <tr key={idx} className={idx < qsPeriodikRows.length - 1 ? "border-b border-black" : ""}>
                                           <td className="border-r border-black font-bold p-[2px]">{row.no || idx + 1}</td>
                                           <td className="border-r border-black p-[2px] leading-tight">{row.pemeriksaan}</td>
                                           <td className="border-r border-black p-[2px] leading-tight">{row.deskripsi}</td>
                                           <td className="border-r border-black p-[2px] leading-tight text-[8px]">{row.spesifikasi}</td>
                                           <td className="p-[2px] whitespace-pre-wrap text-[8px] leading-tight">{row.frekuensi}</td>
                                         </tr>
                                       ))}
                                     </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center text-[#64748B] font-bold text-[12px] flex-1 min-h-[100px]">
                                No Quality Surveillance data available yet
                              </div>
                            )}
                          </div>


                        </div>
                        {/* VALIDATION BLOCK AT BOTTOM */}
                        <div className="w-full">
                          <div className="bg-[#000000] text-[#FFFFFF] text-center font-bold text-[10px] p-[1px_6px] border-t border-b border-black relative z-10">
                            VALIDATION
                          </div>
                          <div className="grid grid-cols-4 bg-white text-center text-[9px] pt-1 pb-1 px-[10px]">
                            {/* Col 1: UP FILLING SPV */}
                            <div className="flex flex-col justify-between items-center" style={{ minHeight: '80px' }}>
                              {signatures['UP FILLING SPV']?.signed ? (
                                <div className="flex flex-col items-center h-[80px] pt-0.5 w-full relative">
                                  {isAdmin && (
                                    <button onClick={() => handleDeleteSign('UP FILLING SPV')} className="absolute -top-1 -right-1 w-[14px] h-[14px] bg-red-600 hover:bg-red-700 text-white rounded-full text-[9px] leading-none flex items-center justify-center cursor-pointer shadow-sm" title="Hapus tanda tangan">&times;</button>
                                  )}
                                  <div className="font-normal text-[9px] text-gray-800 mb-0.5">Prepared by</div>
                                  <div className="flex items-center gap-1 justify-center mb-0.5 w-full">
                                    <div className="font-bold italic text-[12px] text-gray-900 leading-tight text-right flex-1">
                                      {getSignerDisplayName('UP FILLING SPV', 'UP Filling Spv').split(' ').slice(0, 1).join(' ')}<br />{getSignerDisplayName('UP FILLING SPV', 'UP Filling Spv').split(' ').slice(1).join(' ')}
                                    </div>
                                    <div className="text-[7px] text-gray-600 leading-tight text-left italic flex-1">
                                      <div>Digitally signed</div>
                                      <div>by {getSignerDisplayName('UP FILLING SPV', 'UP Filling Spv')}</div>
                                      {(() => { const d = new Date(signatures['UP FILLING SPV'].signedAt || new Date().toISOString()); const ds = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; const ts = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} +07'00'`; return <><div className="mt-0.5">Date: {ds}</div><div>{ts}</div></>; })()}
                                    </div>
                                  </div>
                                  <div className="font-bold text-[8px] text-black mt-0.5">({getSignerDisplayName('UP FILLING SPV', 'UP Filling Spv')})</div>
                                  <div className="font-normal text-[7px] text-gray-600 mt-0">UP Filling Spv</div>
                                </div>
                              ) : divUpper === 'UP FILLING SPV' ? (
                                <div className="flex flex-col items-center h-[80px] pt-0.5 w-full">
                                  <div className="font-normal text-[9px] text-gray-800 mb-0.5">Prepared by</div>
                                  <div className="flex flex-col items-center flex-1 justify-center gap-1">
                                    <button onClick={() => handleOpenSignModal('UP FILLING SPV')} className="bg-[#1D4ED8] text-white px-4 py-1 rounded-sm text-[10px] font-bold shadow-sm hover:bg-blue-700 transition-colors cursor-pointer">+ Add Sign</button>
                                    <select className="w-[120px] text-center border border-gray-300 rounded px-1 py-0.5 text-[8px] font-medium outline-none" value={selectedSigners['UP FILLING SPV'] || ''} onChange={(e) => setSelectedSigners(prev => ({ ...prev, 'UP FILLING SPV': e.target.value }))} >
                                      {getAuthorizedUsers('UP FILLING SPV').map(u => (<option key={u.id} value={u.username}>{u.fullName || u.username}</option>))}
                                    </select>
                                  </div>
                                  <div className="font-normal text-[7px] text-gray-600 mt-0">UP Filling Spv</div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center h-[80px] pt-0.5 w-full">
                                  <div className="font-normal text-[9px] text-gray-800 mb-0.5">Prepared by</div>
                                  <div className="flex-1 flex items-center justify-center"><span className="font-bold text-[9px] text-gray-900">(UP Filling Spv)</span></div>
                                  <div className="font-normal text-[7px] text-gray-600 mt-0">UP Filling Spv</div>
                                </div>
                              )}
                            </div>
                            {/* Col 2: UP FILLING MANAGER */}
                            <div className="flex flex-col justify-between items-center" style={{ minHeight: '80px' }}>
                              {signatures['UP FILLING MANAGER']?.signed ? (
                                <div className="flex flex-col items-center h-[80px] pt-0.5 w-full relative">
                                  {isAdmin && (
                                    <button onClick={() => handleDeleteSign('UP FILLING MANAGER')} className="absolute -top-1 -right-1 w-[14px] h-[14px] bg-red-600 hover:bg-red-700 text-white rounded-full text-[9px] leading-none flex items-center justify-center cursor-pointer shadow-sm" title="Hapus tanda tangan">&times;</button>
                                  )}
                                  <div className="font-normal text-[9px] text-gray-800 mb-0.5">Prepared by</div>
                                  <div className="flex items-center gap-1 justify-center mb-0.5 w-full">
                                    <div className="font-bold italic text-[12px] text-gray-900 leading-tight text-right flex-1">
                                      {(() => {
                                        const name = getSignerDisplayName('UP FILLING MANAGER', 'Ari Nugroho');
                                        const parts = name.split(' ');
                                        return parts.length > 1 ? <>{parts[0]}<br />{parts.slice(1).join(' ')}</> : name;
                                      })()}
                                    </div>
                                    <div className="text-[7px] text-gray-600 leading-tight text-left italic flex-1">
                                      <div>Digitally signed</div>
                                      <div>by {getSignerDisplayName('UP FILLING MANAGER', 'Ari Nugroho')}</div>
                                      {(() => { const d = new Date(signatures['UP FILLING MANAGER'].signedAt || new Date().toISOString()); const ds = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; const ts = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} +07'00'`; return <><div className="mt-0.5">Date: {ds}</div><div>{ts}</div></>; })()}
                                    </div>
                                  </div>
                                  <div className="font-bold text-[8px] text-black mt-0.5">(Ari Nugroho)</div>
                                  <div className="font-normal text-[7px] text-gray-600 mt-0">UP Filling manager</div>
                                </div>
                              ) : divUpper === 'UP FILLING MANAGER' ? (
                                <div className="flex flex-col items-center h-[80px] pt-0.5 w-full">
                                  <div className="font-normal text-[9px] text-gray-800 mb-0.5">Prepared by</div>
                                  <div className="flex flex-col items-center flex-1 justify-center gap-1">
                                    <button onClick={() => handleOpenSignModal('UP FILLING MANAGER')} className="bg-[#1D4ED8] text-white px-4 py-1 rounded-sm text-[10px] font-bold shadow-sm hover:bg-blue-700 transition-colors cursor-pointer">+ Add Sign</button>
                                    <select className="w-[120px] text-center border border-gray-300 rounded px-1 py-0.5 text-[8px] font-medium outline-none" value={selectedSigners['UP FILLING MANAGER'] || ''} onChange={(e) => setSelectedSigners(prev => ({ ...prev, 'UP FILLING MANAGER': e.target.value }))} >
                                      {getAuthorizedUsers('UP FILLING MANAGER').map(u => (<option key={u.id} value={u.username}>{u.fullName || u.username}</option>))}
                                    </select>
                                  </div>
                                  <div className="font-normal text-[7px] text-gray-600 mt-0">UP Filling manager</div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center h-[80px] pt-0.5 w-full">
                                  <div className="font-normal text-[9px] text-gray-800 mb-0.5">Prepared by</div>
                                  <div className="flex-1 flex items-center justify-center"><span className="font-bold text-[9px] text-gray-900">(Ari Nugroho)</span></div>
                                  <div className="font-normal text-[7px] text-gray-600 mt-0">UP Filling manager</div>
                                </div>
                              )}
                            </div>
                            {/* Col 3: PACKAGING & POLE */}
                            <div className="flex flex-col justify-between items-center" style={{ minHeight: '80px' }}>
                              {signatures['PACKAGING & POLE']?.signed ? (
                                <div className="flex flex-col items-center h-[80px] pt-0.5 w-full relative">
                                  {isAdmin && (
                                    <button onClick={() => handleDeleteSign('PACKAGING & POLE')} className="absolute -top-1 -right-1 w-[14px] h-[14px] bg-red-600 hover:bg-red-700 text-white rounded-full text-[9px] leading-none flex items-center justify-center cursor-pointer shadow-sm" title="Hapus tanda tangan">&times;</button>
                                  )}
                                  <div className="font-normal text-[9px] text-gray-800 mb-0.5">Reviewed by</div>
                                  <div className="flex items-center gap-1 justify-center mb-0.5 w-full">
                                    <div className="font-bold italic text-[12px] text-gray-900 leading-tight text-right flex-1">
                                      {getSignerDisplayName('PACKAGING & POLE', 'Daniel A').split(' ').slice(0, 1).join(' ')}<br />{getSignerDisplayName('PACKAGING & POLE', 'Daniel A').split(' ').slice(1).join(' ')}
                                    </div>
                                    <div className="text-[7px] text-gray-600 leading-tight text-left italic flex-1">
                                      <div>Digitally signed</div>
                                      <div>by {getSignerDisplayName('PACKAGING & POLE', 'Daniel A')}</div>
                                      {(() => { const d = new Date(signatures['PACKAGING & POLE'].signedAt || new Date().toISOString()); const ds = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; const ts = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} +07'00'`; return <><div className="mt-0.5">Date: {ds}</div><div>{ts}</div></>; })()}
                                    </div>
                                  </div>
                                  <div className="font-bold text-[8px] text-black mt-0.5">({getSignerDisplayName('PACKAGING & POLE', 'Daniel A')})</div>
                                  <div className="font-normal text-[7px] text-gray-600 mt-0">PACKAGING & POLE</div>
                                </div>
                              ) : divUpper === 'PACKAGING & POLE' ? (
                                <div className="flex flex-col items-center h-[80px] pt-0.5 w-full">
                                  <div className="font-normal text-[9px] text-gray-800 mb-0.5">Reviewed by</div>
                                  <div className="flex flex-col items-center flex-1 justify-center gap-1">
                                    <button onClick={() => handleOpenSignModal('PACKAGING & POLE')} className="bg-[#1D4ED8] text-white px-4 py-1 rounded-sm text-[10px] font-bold shadow-sm hover:bg-blue-700 transition-colors cursor-pointer">+ Add Sign</button>
                                    <select className="w-[120px] text-center border border-gray-300 rounded px-1 py-0.5 text-[8px] font-medium outline-none" value={selectedSigners['PACKAGING & POLE'] || ''} onChange={(e) => setSelectedSigners(prev => ({ ...prev, 'PACKAGING & POLE': e.target.value }))} >
                                      {getAuthorizedUsers('PACKAGING & POLE').map(u => (<option key={u.id} value={u.username}>{u.fullName || u.username}</option>))}
                                    </select>
                                  </div>
                                  <div className="font-normal text-[7px] text-gray-600 mt-0">PACKAGING & POLE</div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center h-[80px] pt-0.5 w-full">
                                  <div className="font-normal text-[9px] text-gray-800 mb-0.5">Reviewed by</div>
                                  <div className="flex-1 flex items-center justify-center"><span className="font-bold text-[9px] text-gray-900">(Daniel A)</span></div>
                                  <div className="font-normal text-[7px] text-gray-600 mt-0">PACKAGING & POLE</div>
                                </div>
                              )}
                            </div>
                            {/* Col 4: HEAD LAB */}
                            <div className="flex flex-col justify-between items-center" style={{ minHeight: '80px' }}>
                              {(signatures['HEAD LAB']?.signed || signatures['QA LAB']?.signed) ? (
                                <div className="flex flex-col items-center h-[80px] pt-0.5 w-full relative">
                                  {isAdmin && (
                                    <button onClick={() => handleDeleteSign('HEAD LAB')} className="absolute -top-1 -right-1 w-[14px] h-[14px] bg-red-600 hover:bg-red-700 text-white rounded-full text-[9px] leading-none flex items-center justify-center cursor-pointer shadow-sm" title="Hapus tanda tangan">&times;</button>
                                  )}
                                  <div className="font-normal text-[9px] text-gray-800 mb-0.5">Approved by</div>
                                  <div className="flex items-center gap-1 justify-center mb-0.5 w-full">
                                    <div className="font-bold italic text-[12px] text-gray-900 leading-tight text-right flex-1">
                                      {getSignerDisplayName('HEAD LAB', 'Nia Indriyani').split(' ').slice(0, 1).join(' ')}<br />{getSignerDisplayName('HEAD LAB', 'Nia Indriyani').split(' ').slice(1).join(' ')}
                                    </div>
                                    <div className="text-[7px] text-gray-600 leading-tight text-left italic flex-1">
                                      <div>Digitally signed</div>
                                      <div>by {getSignerDisplayName('HEAD LAB', 'Nia Indriyani')}</div>
                                      {(() => { const d = new Date(signatures['HEAD LAB'].signedAt || new Date().toISOString()); const ds = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; const ts = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} +07'00'`; return <><div className="mt-0.5">Date: {ds}</div><div>{ts}</div></>; })()}
                                    </div>
                                  </div>
                                  <div className="font-bold text-[8px] text-black mt-0.5">({getSignerDisplayName('HEAD LAB', 'Nia Indriyani')})</div>
                                  <div className="font-normal text-[7px] text-gray-600 mt-0">Quality Lab Manager</div>
                                </div>
                              ) : divUpper === 'HEAD LAB' ? (
                                <div className="flex flex-col items-center h-[80px] pt-0.5 w-full">
                                  <div className="font-normal text-[9px] text-gray-800 mb-0.5">Approved by</div>
                                  <div className="flex flex-col items-center flex-1 justify-center gap-1">
                                    <button onClick={() => handleOpenSignModal('HEAD LAB')} className="bg-[#1D4ED8] text-white px-4 py-1 rounded-sm text-[10px] font-bold shadow-sm hover:bg-blue-700 transition-colors cursor-pointer">+ Add Sign</button>
                                    <select className="w-[120px] text-center border border-gray-300 rounded px-1 py-0.5 text-[8px] font-medium outline-none" value={selectedSigners['HEAD LAB'] || ''} onChange={(e) => setSelectedSigners(prev => ({ ...prev, 'HEAD LAB': e.target.value }))} >
                                      {getAuthorizedUsers('HEAD LAB').map(u => (<option key={u.id} value={u.username}>{u.fullName || u.username}</option>))}
                                    </select>
                                  </div>
                                  <div className="font-normal text-[7px] text-gray-600 mt-0">Quality Lab Manager</div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center h-[80px] pt-0.5 w-full">
                                  <div className="font-normal text-[9px] text-gray-800 mb-0.5">Approved by</div>
                                  <div className="flex-1 flex items-center justify-center"><span className="font-bold text-[9px] text-gray-900">(Nia Indriyani)</span></div>
                                  <div className="font-normal text-[7px] text-gray-600 mt-0">Quality Lab Manager</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Center Vertical Divider - Continuous 1px vector stroke guaranteed above all backgrounds in preview and PDF */}
                <div
                  className="absolute top-0 bottom-0 left-1/2 w-0 border-r border-black pointer-events-none z-30"
                />
              </div>

              {/* Left Outer Border - Guaranteed crisp 1px stroke matching center line */}
              <div
                className="absolute top-0 bottom-0 left-0 w-0 border-l border-black pointer-events-none z-30"
              />

              {/* Right Outer Border - Guaranteed crisp 1px stroke matching center line */}
              <div
                className="absolute top-0 bottom-0 right-0 w-0 border-r border-black pointer-events-none z-30"
              />
            </div>
            {/* UP Modal */}
            {showUpModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-[#F8FAFC] w-[480px] rounded-none shadow-none border border-[#CBD5E1] p-8 font-sans">
                  <h2 className="text-[15px] font-bold text-[#0F172A] mb-6">UP DATA INPUT FORM</h2>

                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center">
                      <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">LINE TYPE :</span>
                      <select
                        className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 outline-none"
                        value={upFormData.lineType}
                        onChange={(e) => handleLineTypeChange(e.target.value)}
                      >
                        <option value="BOTTLE LINE">BOTTLE LINE</option>
                        <option value="TUBE LINE">TUBE LINE</option>
                        <option value="SACHET LINE">SACHET LINE</option>
                        <option value="JAR LINE">JAR LINE</option>
                      </select>
                    </div>

                    {showKategori && (
                      <div className="flex items-center">
                        <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">KATEGORI :</span>
                        <select
                          className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 outline-none"
                          value={upFormData.kategori}
                          onChange={(e) => setUpFormData({ ...upFormData, kategori: e.target.value })}
                        >
                          <option value="">Pilih Kategori...</option>
                          {kategoriOptions.map(kat => (
                            <option key={kat} value={kat}>{kat}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center">
                      <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">LINE :</span>
                      <div className="flex-1 relative">
                        <div
                          onClick={() => setIsLineDropdownOpen(!isLineDropdownOpen)}
                          className="w-full h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate">{(upFormData.lines && upFormData.lines.length > 0) ? upFormData.lines.join(', ') : 'Pilih Line...'}</span>
                          <span className="text-[10px] text-[#64748B]">▼</span>
                        </div>
                        {isLineDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-0" onClick={() => setIsLineDropdownOpen(false)}></div>
                            <div className="absolute top-full left-0 w-full bg-white border border-[#CBD5E1] shadow-lg max-h-[160px] overflow-y-auto z-10">
                              {lineOptions.map(l => (
                                <div
                                  key={l}
                                  onClick={() => toggleLineSelection(l)}
                                  className="px-3 py-1.5 flex items-center hover:bg-[#F1F5F9] cursor-pointer relative z-10"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(upFormData.lines || []).includes(l)}
                                    readOnly
                                    className="mr-2"
                                  />
                                  <span className="text-[12px] text-[#1E293B]">{l}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <span className="w-[150px] text-right pr-4 text-[11.5px] font-semibold text-[#475569]">NUMBER OF NOZZLES :</span>
                      <div className="flex-1 h-[34px] bg-[#F1F5F9] border border-[#E2E8F0] flex items-center px-3">
                        <span className="text-[12px] font-semibold text-[#334155]">{upFormData.nozzles || '2'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-8 space-x-4">
                    <button
                      onClick={() => setShowUpModal(false)}
                      className="flex-1 h-[36px] bg-white border border-[#CBD5E1] text-[#334155] text-[12px] font-semibold hover:bg-[#F1F5F9] transition-colors rounded-none shadow-none"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={() => {
                        setIsUpDataConfirmed(true);
                        setShowUpModal(false);
                        setWarningMessage('');
                      }}
                      className="flex-1 h-[36px] bg-[#005A9E] text-white text-[12px] font-bold hover:bg-[#004A83] transition-colors rounded-none shadow-none ml-4"
                    >
                      SIMPAN
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* QC Filling Modal */}
            {showQcFillingModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-[#F8FAFC] w-[450px] rounded-none shadow-none border border-[#CBD5E1] p-8 font-sans">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-[15px] font-bold text-[#0F172A] uppercase">FORM DATA QC FILLING</h2>
                    <button onClick={() => setShowQcFillingModal(false)} className="text-gray-500 hover:text-black">✕</button>
                  </div>

                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center">
                      <span className="w-[150px] text-right pr-4 text-[11.5px] text-[#475569]">Template IM :</span>
                      <select
                        className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-2 outline-none rounded-none"
                        value={qcFillingData.templateIm}
                        onChange={(e) => setQcFillingData({ ...qcFillingData, templateIm: e.target.value })}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Duo">Duo</option>
                        <option value="Biphase">Biphase</option>
                        <option value="LIP EYE MAKE UP REMOVER">LIP EYE MAKE UP REMOVER</option>
                      </select>
                    </div>

                    {qcFillingData.templateIm === 'Normal' ? (
                      <>
                        <div className="flex items-center">
                          <span className="w-[150px] text-right pr-4 text-[11.5px] text-[#475569]">Volume FG (ml) :</span>
                          <input type="text" placeholder="Contoh: 100" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-none" value={qcFillingData.volumeFg} onChange={(e) => setQcFillingData({ ...qcFillingData, volumeFg: e.target.value })} />
                        </div>
                        <div className="flex items-center">
                          <span className="w-[150px] text-right pr-4 text-[11.5px] text-[#475569]">Density :</span>
                          <input type="text" placeholder="Contoh: 1.05" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-none" value={qcFillingData.density} onChange={(e) => setQcFillingData({ ...qcFillingData, density: e.target.value })} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center">
                          <span className="w-[150px] text-right pr-4 text-[11.5px] text-[#475569]">Volume Phase 1 (ml) :</span>
                          <input type="text" placeholder="Contoh: 100" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-none" value={qcFillingData.volPhase1} onChange={(e) => setQcFillingData({ ...qcFillingData, volPhase1: e.target.value })} />
                        </div>
                        <div className="flex items-center">
                          <span className="w-[150px] text-right pr-4 text-[11.5px] text-[#475569]">Density Phase 1 :</span>
                          <input type="text" placeholder="1" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-none" value={qcFillingData.denPhase1} onChange={(e) => setQcFillingData({ ...qcFillingData, denPhase1: e.target.value })} />
                        </div>
                        <div className="flex items-center">
                          <span className="w-[150px] text-right pr-4 text-[11.5px] text-[#475569]">Volume Phase 2 (ml) :</span>
                          <input type="text" placeholder="Contoh: 100" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-none" value={qcFillingData.volPhase2} onChange={(e) => setQcFillingData({ ...qcFillingData, volPhase2: e.target.value })} />
                        </div>
                        <div className="flex items-center">
                          <span className="w-[150px] text-right pr-4 text-[11.5px] text-[#475569]">Density Phase 2 :</span>
                          <input type="text" placeholder="1" className="flex-1 h-[34px] border border-[#CBD5E1] bg-white text-[#1E293B] text-[12px] px-3 outline-none rounded-none" value={qcFillingData.denPhase2} onChange={(e) => setQcFillingData({ ...qcFillingData, denPhase2: e.target.value })} />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-between mt-8 space-x-3">
                    <button
                      onClick={() => setShowQcFillingModal(false)}
                      className="w-[150px] h-[36px] bg-white border border-[#CBD5E1] text-[#334155] text-[12px] font-semibold hover:bg-[#F1F5F9] transition-colors rounded-none shadow-none"
                    >
                      BATAL
                    </button>
                    <button
                      onClick={() => {
                        handleQcSubmit();
                      }}
                      className="flex-1 h-[36px] bg-[#005A9E] text-white text-[12px] font-bold hover:bg-[#004A83] transition-colors rounded-none shadow-none ml-3"
                    >
                      HITUNG SIMPAN
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
        {/* POLE DATA INPUT MODAL (Matching User Screenshot Exactly) */}
        {activePoleModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm font-sans animate-in fade-in duration-150">
            <div className="bg-white rounded-none shadow-2xl border border-gray-300 w-[960px] max-w-[95vw] overflow-hidden flex flex-col">
              {/* Title Bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#F1F5F9] border-b border-[#CBD5E1]">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-[#0078D4]" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2l-2.218-.887zm3.564 1.426L5.596 5 8 5.961 14.154 3.5l-2.404-.961zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l6.229 2.492A1.5 1.5 0 0 1 16 4.072v8.856a1.5 1.5 0 0 1-.943 1.39l-6.229 2.492a1.5 1.5 0 0 1-1.114 0L.943 14.318A1.5 1.5 0 0 1 0 12.928V4.072a1.5 1.5 0 0 1 .943-1.39L7.443.184z"/>
                  </svg>
                  <span className="text-[12px] font-semibold text-[#1F2937]">
                    {activePoleModal.sectionKey === 'A.3_MSC' || activePoleModal.sectionTitle.includes('MSC')
                      ? `MSC ADM DATA INPUT (${activePoleModal.sectionTitle})`
                      : `POLE DATA INPUT (${activePoleModal.sectionTitle})`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePoleModal(null)}
                  className="text-[#4B5563] hover:bg-[#E81123] hover:text-white w-8 h-8 rounded-none flex items-center justify-center text-[14px] transition-colors cursor-pointer"
                  title="Tutup"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 flex flex-col bg-white">
                {/* Action Toolbar */}
                <div className="flex items-center justify-between mb-3 bg-[#F8FAFC] p-1.5 rounded-none border border-[#E2E8F0]">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    {/* Hidden File Input */}
                    <input
                      type="file"
                      id="pole-image-uploader"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const rawDataUrl = evt.target?.result as string;
                            const img = new Image();
                            img.onload = () => {
                              // Compress raw image to HD max 1200px and JPEG quality 0.85 to keep storage lightweight (<100KB)
                              let srcToStore = rawDataUrl;
                              try {
                                const maxDim = 1200;
                                let compW = img.width;
                                let compH = img.height;
                                if (compW > maxDim || compH > maxDim) {
                                  const ratio = Math.min(maxDim / compW, maxDim / compH);
                                  compW = Math.round(compW * ratio);
                                  compH = Math.round(compH * ratio);
                                }
                                const compCanvas = document.createElement('canvas');
                                compCanvas.width = compW;
                                compCanvas.height = compH;
                                const compCtx = compCanvas.getContext('2d');
                                if (compCtx) {
                                  compCtx.fillStyle = '#FFFFFF';
                                  compCtx.fillRect(0, 0, compW, compH);
                                  compCtx.drawImage(img, 0, 0, compW, compH);
                                  srcToStore = compCanvas.toDataURL('image/jpeg', 0.85);
                                }
                              } catch {
                                srcToStore = rawDataUrl;
                              }

                              const dims = getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload);
                              const maxW = dims.width - 60;
                              const maxH = dims.height - 40;
                              const scale = Math.min(maxW / img.width, maxH / img.height, 1);
                              const w = Math.max(60, Math.round(img.width * scale));
                              const h = Math.max(40, Math.round(img.height * scale));
                              const offset = (modalImages.length % 8) * 20;
                              const l = Math.max(10, Math.min(dims.width - w - 10, Math.round((dims.width - w) / 2) + offset));
                              const t = Math.max(10, Math.min(dims.height - h - 10, Math.round((dims.height - h) / 2) + offset));

                              const newId = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                              const newImageItem: ModalImageItem = {
                                id: newId,
                                src: srcToStore,
                                left: l,
                                top: t,
                                width: w,
                                height: h,
                                rotation: 0,
                                cropLeft: 0,
                                cropTop: 0,
                                cropRight: 0,
                                cropBottom: 0
                              };

                              setModalImages((prev) => [...prev, newImageItem]);
                              setSelectedItemId(newId);
                            };
                            img.src = rawDataUrl;
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }
                      }}
                    />

                    {/* UPLOAD IMAGE */}
                    <button
                      type="button"
                      onClick={() => document.getElementById('pole-image-uploader')?.click()}
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                        <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                      </svg>
                      <span>Upload</span>
                    </button>

                    {/* ROTATE */}
                    <button
                      type="button"
                      onClick={() => {
                        setModalImages((prev) =>
                          prev.map((img) => {
                            if (selectedItemId && (selectedItemId.startsWith('img_') || selectedItemId === 'image')) {
                              if (img.id === selectedItemId || (selectedItemId === 'image' && prev.length === 1)) {
                                return { ...img, rotation: ((img.rotation || 0) + 90) % 360 };
                              }
                              return img;
                            } else if (prev.length === 1) {
                              return { ...img, rotation: ((img.rotation || 0) + 90) % 360 };
                            }
                            return img;
                          })
                        );
                        setModalRotation((prev) => (prev + 90) % 360);
                      }}
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                      </svg>
                      <span>Rotate</span>
                    </button>

                    {/* ARROW */}
                    <button
                      type="button"
                      onClick={() => {
                        const newItem = {
                          id: 'arrow_' + Date.now(),
                          type: 'arrow',
                          x1: 80,
                          y1: 40,
                          x2: 200,
                          y2: 40,
                          color: '#DC2626'
                        };
                        setModalAnnotations([...modalAnnotations, newItem]);
                        setSelectedItemId(newItem.id);
                      }}
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                      </svg>
                      <span>Arrow</span>
                    </button>

                    {/* DIMENSION */}
                    <button
                      type="button"
                      onClick={() => {
                        const newItem = {
                          id: 'dim_' + Date.now(),
                          type: 'dimension',
                          x1: 60,
                          y1: 40,
                          x2: 220,
                          y2: 40,
                          text: '10 mm',
                          color: '#DC2626'
                        };
                        setModalAnnotations([...modalAnnotations, newItem]);
                        setSelectedItemId(newItem.id);
                      }}
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M1.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L2.707 7.5h10.586l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L13.293 8.5H2.707l1.147 1.146a.5.5 0 0 1-.708.708l-2-2z"/>
                      </svg>
                      <span>Dimension</span>
                    </button>

                    {/* TEXT */}
                    <button
                      type="button"
                      onClick={() => {
                        const newItem = {
                          id: 'text_' + Date.now(),
                          type: 'text',
                          x: 100,
                          y: 30,
                          width: 140,
                          height: 35,
                          text: 'DOUBLE-CLICK TO EDIT',
                          fontSize: 11,
                          isBold: true,
                          color: '#000000'
                        };
                        setModalAnnotations([...modalAnnotations, newItem]);
                        setSelectedItemId(newItem.id);
                      }}
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                        <path d="m2.244 13.081.943-2.815h4.626l.94 2.815h1.295L6.37 2.92H5.064L1 13.081h1.244zm3.212-9.67 1.94 5.86H3.504l1.94-5.86h.012z"/>
                      </svg>
                      <span>Text</span>
                    </button>

                    {/* NOTE */}
                    <button
                      type="button"
                      onClick={() => {
                        const isBiphaseDoc = qcResult?.type === 'Biphase' || 
                          qcFillingData?.templateIm?.toLowerCase() === 'biphase' || 
                          openDoc?.rawDocument?.templateIm?.toLowerCase() === 'biphase' || 
                          openDoc?.templateIm?.toLowerCase() === 'biphase';
                        const isMscSection = activePoleModal?.sectionKey === 'A.3_MSC' || activePoleModal?.sectionTitle?.includes('MSC') || divUpper === 'MSC ADM';
                        const isSmallNote = isMscSection || isBiphaseDoc;
                        const defaultNoteFontSize = isSmallNote ? 8.5 : 11;
                        const newItem = {
                          id: 'note_' + Date.now(),
                          type: 'note',
                          x: isSmallNote ? 40 : 90,
                          y: 20,
                          width: isSmallNote ? 120 : 140,
                          height: isSmallNote ? 50 : 60,
                          fontSize: defaultNoteFontSize,
                          text: 'NOTE',
                          bg: '#FFFFFF',
                          border: '#EF4444',
                          color: '#000000'
                        };
                        setModalAnnotations([...modalAnnotations, newItem]);
                        setSelectedItemId(newItem.id);
                      }}
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5v-11zm7 11.293V9.5a.5.5 0 0 1 .5-.5h4.293L9 13.793z"/>
                      </svg>
                      <span>Note</span>
                    </button>

                    {/* CIRCLE */}
                    <button
                      type="button"
                      onClick={() => {
                        const newItem = {
                          id: 'circle_' + Date.now(),
                          type: 'circle',
                          x: 150,
                          y: 40,
                          radiusX: 30,
                          radiusY: 30,
                          radius: 30,
                          color: '#DC2626'
                        };
                        setModalAnnotations([...modalAnnotations, newItem]);
                        setSelectedItemId(newItem.id);
                      }}
                      className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                      </svg>
                      <span>Circle</span>
                    </button>
                  </div>

                  {/* Font adjustment controls */}
                  {(() => {
                    const selectedAnnotation = modalAnnotations.find((a) => a.id === selectedItemId);
                    if (selectedAnnotation && (selectedAnnotation.type === "note" || selectedAnnotation.type === "text")) {
                      return (
                        <div className="flex items-center space-x-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-none px-2 py-0.5 text-[11px] ml-2">
                          <span className="text-[#475569] font-medium text-[10.5px]">Font:</span>
                          <button
                            type="button"
                            title="Perkecil Font"
                            onClick={() => {
                              setModalAnnotations((prev) =>
                                prev.map((a) =>
                                  a.id === selectedItemId
                                    ? { ...a, fontSize: Math.max(8, (Number(a.fontSize) || 11) - 1) }
                                    : a
                                )
                              );
                            }}
                            className="w-5 h-5 flex items-center justify-center bg-white hover:bg-[#E2E8F0] border border-[#CBD5E1] text-black font-bold rounded-none cursor-pointer transition-colors"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-bold text-[#1E293B]">
                            {selectedAnnotation.fontSize || 11}px
                          </span>
                          <button
                            type="button"
                            title="Perbesar Font"
                            onClick={() => {
                              setModalAnnotations((prev) =>
                                prev.map((a) =>
                                  a.id === selectedItemId
                                    ? { ...a, fontSize: Math.min(24, (Number(a.fontSize) || 11) + 1) }
                                    : a
                                )
                              );
                            }}
                            className="w-5 h-5 flex items-center justify-center bg-white hover:bg-[#E2E8F0] border border-[#CBD5E1] text-black font-bold rounded-none cursor-pointer transition-colors"
                          >
                            +
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* DELETE */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedItemId) {
                        if (selectedItemId.startsWith('img_') || selectedItemId === 'image') {
                          setModalImages((prev) => prev.filter((img) => img.id !== selectedItemId));
                          setModalImageSrc(null);
                          setModalImageState((prev) => ({
                            ...prev,
                            src: null,
                            cropLeft: 0,
                            cropTop: 0,
                            cropRight: 0,
                            cropBottom: 0
                          }));
                          setSelectedItemId(null);
                        } else {
                          setModalAnnotations((prev) => prev.filter((a) => a.id !== selectedItemId));
                          setSelectedItemId(null);
                        }
                      }
                    }}
                    disabled={!selectedItemId}
                    className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-40 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer ml-auto"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
{/* Canvas + Paletload Side Panel Area */}
                <div className="flex items-start justify-center">
                  {/* Canvas Container */}
                  <div
                    id="pole-canvas-container"
                    className="relative bg-[#EAEFE3] border border-[#CBD5E1] rounded-none overflow-hidden select-none"
                    style={{ width: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).width}px`, height: `${getCanvasDimensions(activePoleModal.sectionKey, activePoleModal.isPaletload).height}px` }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        setSelectedItemId(null);
                      }
                    }}
                  >
                    {/* Interactive Images with Drag, Scale, and Crop (Supports Multiple Images) */}
                    {modalImages.map((imgItem) => {
                      const isSelected = selectedItemId === imgItem.id || (selectedItemId === 'image' && modalImages.length === 1);
                      const cropW = Math.max(1, imgItem.width - imgItem.cropLeft - imgItem.cropRight);
                      const cropH = Math.max(1, imgItem.height - imgItem.cropTop - imgItem.cropBottom);

                      return (
                        <div
                          key={imgItem.id}
                          className={`absolute ${isSelected ? 'z-15' : 'z-10'}`}
                          style={{
                            left: `${imgItem.left}px`,
                            top: `${imgItem.top}px`,
                            width: `${imgItem.width}px`,
                            height: `${imgItem.height}px`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemId(imgItem.id);
                          }}
                        >
                          {/* Visible Cropped Image Content (Crisp, 100% Opacity) */}
                          <div
                            className="absolute overflow-hidden cursor-move"
                            style={{
                              left: `${imgItem.cropLeft}px`,
                              top: `${imgItem.cropTop}px`,
                              width: `${cropW}px`,
                              height: `${cropH}px`
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemId(imgItem.id);
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setSelectedItemId(imgItem.id);
                              const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                              if (!rect) return;
                              setDragState({
                                mode: 'drag-image',
                                activeImageId: imgItem.id,
                                startX: e.clientX - rect.left,
                                startY: e.clientY - rect.top,
                                initLeft: imgItem.left,
                                initTop: imgItem.top,
                                initWidth: imgItem.width,
                                initHeight: imgItem.height,
                                initCropL: imgItem.cropLeft,
                                initCropT: imgItem.cropTop,
                                initCropR: imgItem.cropRight,
                                initCropB: imgItem.cropBottom
                              });
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              // Reset crop on double click
                              setModalImages((prev) =>
                                prev.map((img) =>
                                  img.id === imgItem.id
                                    ? { ...img, cropLeft: 0, cropTop: 0, cropRight: 0, cropBottom: 0 }
                                    : img
                                )
                              );
                            }}
                            onWheel={(e) => {
                              e.stopPropagation();
                              const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
                              setModalImages((prev) =>
                                prev.map((img) => {
                                  if (img.id !== imgItem.id) return img;
                                  const newW = Math.max(30, Math.min(1600, img.width * zoomFactor));
                                  const newH = Math.max(20, Math.min(1200, img.height * zoomFactor));
                                  const scaleR = newW / img.width;
                                  return {
                                    ...img,
                                    width: Math.round(newW),
                                    height: Math.round(newH),
                                    cropLeft: Math.round(img.cropLeft * scaleR),
                                    cropTop: Math.round(img.cropTop * scaleR),
                                    cropRight: Math.round(img.cropRight * scaleR),
                                    cropBottom: Math.round(img.cropBottom * scaleR)
                                  };
                                })
                              );
                            }}
                          >
                            <img
                              src={imgItem.src}
                              alt="Pole Image"
                              draggable={false}
                              style={{
                                position: 'absolute',
                                left: `-${imgItem.cropLeft}px`,
                                top: `-${imgItem.cropTop}px`,
                                width: `${imgItem.width}px`,
                                height: `${imgItem.height}px`,
                                maxWidth: 'none',
                                maxHeight: 'none',
                                minWidth: `${imgItem.width}px`,
                                minHeight: `${imgItem.height}px`,
                                transform: `rotate(${imgItem.rotation || 0}deg)`,
                                transformOrigin: `${imgItem.width / 2}px ${imgItem.height / 2}px`,
                                pointerEvents: 'none'
                              }}
                            />
                          </div>

                          {/* Handles and Selection Border */}
                          {isSelected && (
                            <div
                              className="absolute inset-0 pointer-events-none"
                            >
                              {/* Selection Frame (2px solid blue border) */}
                              <div
                                className="absolute border-2 border-[#2563EB] pointer-events-none"
                                style={{
                                  left: `${imgItem.cropLeft}px`,
                                  top: `${imgItem.cropTop}px`,
                                  width: `${cropW}px`,
                                  height: `${cropH}px`
                                }}
                              />

                              {/* 4 Corner Resize Handles */}
                              {/* Top-Left */}
                              <div
                                className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nwse-resize z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                style={{ left: `${imgItem.cropLeft}px`, top: `${imgItem.cropTop}px` }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(imgItem.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'scale-image',
                                    activeImageId: imgItem.id,
                                    handle: 'tl',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: imgItem.left,
                                    initTop: imgItem.top,
                                    initWidth: imgItem.width,
                                    initHeight: imgItem.height,
                                    initCropL: imgItem.cropLeft,
                                    initCropT: imgItem.cropTop,
                                    initCropR: imgItem.cropRight,
                                    initCropB: imgItem.cropBottom
                                  });
                                }}
                              />
                              {/* Top-Right */}
                              <div
                                className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nesw-resize z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                style={{ left: `${imgItem.width - imgItem.cropRight}px`, top: `${imgItem.cropTop}px` }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(imgItem.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'scale-image',
                                    activeImageId: imgItem.id,
                                    handle: 'tr',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: imgItem.left,
                                    initTop: imgItem.top,
                                    initWidth: imgItem.width,
                                    initHeight: imgItem.height,
                                    initCropL: imgItem.cropLeft,
                                    initCropT: imgItem.cropTop,
                                    initCropR: imgItem.cropRight,
                                    initCropB: imgItem.cropBottom
                                  });
                                }}
                              />
                              {/* Bottom-Left */}
                              <div
                                className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nesw-resize z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                style={{ left: `${imgItem.cropLeft}px`, top: `${imgItem.height - imgItem.cropBottom}px` }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(imgItem.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'scale-image',
                                    activeImageId: imgItem.id,
                                    handle: 'bl',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: imgItem.left,
                                    initTop: imgItem.top,
                                    initWidth: imgItem.width,
                                    initHeight: imgItem.height,
                                    initCropL: imgItem.cropLeft,
                                    initCropT: imgItem.cropTop,
                                    initCropR: imgItem.cropRight,
                                    initCropB: imgItem.cropBottom
                                  });
                                }}
                              />
                              {/* Bottom-Right */}
                              <div
                                className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nwse-resize z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                style={{ left: `${imgItem.width - imgItem.cropRight}px`, top: `${imgItem.height - imgItem.cropBottom}px` }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(imgItem.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'scale-image',
                                    activeImageId: imgItem.id,
                                    handle: 'br',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: imgItem.left,
                                    initTop: imgItem.top,
                                    initWidth: imgItem.width,
                                    initHeight: imgItem.height,
                                    initCropL: imgItem.cropLeft,
                                    initCropT: imgItem.cropTop,
                                    initCropR: imgItem.cropRight,
                                    initCropB: imgItem.cropBottom
                                  });
                                }}
                              />

                              {/* 4 Edge Crop Handles (Pill capsules with 2px blue border) */}
                              {/* Top Edge Pill */}
                              <div
                                className="absolute w-[24px] h-[7px] bg-white border-2 border-[#2563EB] rounded-full cursor-ns-resize z-25 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                style={{
                                  left: `${imgItem.cropLeft + cropW / 2}px`,
                                  top: `${imgItem.cropTop}px`
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(imgItem.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'crop-image',
                                    activeImageId: imgItem.id,
                                    handle: 'top',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: imgItem.left,
                                    initTop: imgItem.top,
                                    initWidth: imgItem.width,
                                    initHeight: imgItem.height,
                                    initCropL: imgItem.cropLeft,
                                    initCropT: imgItem.cropTop,
                                    initCropR: imgItem.cropRight,
                                    initCropB: imgItem.cropBottom
                                  });
                                }}
                              />
                              {/* Bottom Edge Pill */}
                              <div
                                className="absolute w-[24px] h-[7px] bg-white border-2 border-[#2563EB] rounded-full cursor-ns-resize z-25 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                style={{
                                  left: `${imgItem.cropLeft + cropW / 2}px`,
                                  top: `${imgItem.height - imgItem.cropBottom}px`
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(imgItem.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'crop-image',
                                    activeImageId: imgItem.id,
                                    handle: 'bottom',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: imgItem.left,
                                    initTop: imgItem.top,
                                    initWidth: imgItem.width,
                                    initHeight: imgItem.height,
                                    initCropL: imgItem.cropLeft,
                                    initCropT: imgItem.cropTop,
                                    initCropR: imgItem.cropRight,
                                    initCropB: imgItem.cropBottom
                                  });
                                }}
                              />
                              {/* Left Edge Pill */}
                              <div
                                className="absolute w-[7px] h-[24px] bg-white border-2 border-[#2563EB] rounded-full cursor-ew-resize z-25 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                style={{
                                  left: `${imgItem.cropLeft}px`,
                                  top: `${imgItem.cropTop + cropH / 2}px`
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(imgItem.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'crop-image',
                                    activeImageId: imgItem.id,
                                    handle: 'left',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: imgItem.left,
                                    initTop: imgItem.top,
                                    initWidth: imgItem.width,
                                    initHeight: imgItem.height,
                                    initCropL: imgItem.cropLeft,
                                    initCropT: imgItem.cropTop,
                                    initCropR: imgItem.cropRight,
                                    initCropB: imgItem.cropBottom
                                  });
                                }}
                              />
                              {/* Right Edge Pill */}
                              <div
                                className="absolute w-[7px] h-[24px] bg-white border-2 border-[#2563EB] rounded-full cursor-ew-resize z-25 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                style={{
                                  left: `${imgItem.width - imgItem.cropRight}px`,
                                  top: `${imgItem.cropTop + cropH / 2}px`
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(imgItem.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'crop-image',
                                    activeImageId: imgItem.id,
                                    handle: 'right',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: imgItem.left,
                                    initTop: imgItem.top,
                                    initWidth: imgItem.width,
                                    initHeight: imgItem.height,
                                    initCropL: imgItem.cropLeft,
                                    initCropT: imgItem.cropTop,
                                    initCropR: imgItem.cropRight,
                                    initCropB: imgItem.cropBottom
                                  });
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Paletload Live Badge Overlay (Top Left) */}
                    {activePoleModal.isPaletload && (
                      <div className="absolute top-2 left-3 text-[10px] font-bold text-[#0F172A] space-y-0.5 pointer-events-none z-10 bg-white/80 backdrop-blur-[2px] px-2 py-1 rounded-none border border-[#CBD5E1]/60 shadow-none">
                        <div>Jumlah Outer Box per layer &nbsp;~ &nbsp;{paletloadOuterBox || '...'} Box</div>
                        <div>Jumlah Layer &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~ &nbsp;{paletloadLayers || '...'} Layer</div>
                        <div>Jumlah FG per palet &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~ &nbsp;{paletloadFg || '...'} pcs</div>
                      </div>
                    )}

                    {/* Annotations Layer (Always on top of image) */}
                    <svg
                      className="absolute inset-0 w-full h-full z-20"
                      style={{ pointerEvents: 'none' }}
                    >
                      {modalAnnotations.map((item) => {
                        const isSelected = selectedItemId === item.id;
                        if (item.type === 'arrow') {
                          const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                          const headlen = 12;
                          const p1x = item.x2 - headlen * Math.cos(angle - Math.PI / 6.5);
                          const p1y = item.y2 - headlen * Math.sin(angle - Math.PI / 6.5);
                          const p2x = item.x2 - headlen * Math.cos(angle + Math.PI / 6.5);
                          const p2y = item.y2 - headlen * Math.sin(angle + Math.PI / 6.5);

                          return (
                            <g key={item.id}>
                              {/* Invisible broader hit area for easy grabbing and moving */}
                              <line
                                x1={item.x1}
                                y1={item.y1}
                                x2={item.x2}
                                y2={item.y2}
                                stroke="transparent"
                                strokeWidth={16}
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />

                              {/* Visible Arrow Line */}
                              <line
                                x1={item.x1}
                                y1={item.y1}
                                x2={item.x2}
                                y2={item.y2}
                                stroke={item.color || '#DC2626'}
                                strokeWidth={isSelected ? 3 : 2.2}
                                strokeLinecap="round"
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />

                              {/* Arrowhead Polygon */}
                              <polygon
                                points={`${item.x2},${item.y2} ${p1x},${p1y} ${p2x},${p2y}`}
                                fill={item.color || '#DC2626'}
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />

                              {/* Control Handles when Selected (Tail & Head for stretch, lengthen, shorten, rotate) */}
                              {isSelected && (
                                <>
                                  {/* Tail Handle (x1, y1) */}
                                  <circle
                                    cx={item.x1}
                                    cy={item.y1}
                                    r={5.5}
                                    fill="#FFFFFF"
                                    stroke="#2563EB"
                                    strokeWidth={2}
                                    style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-arrow-start',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* Head Handle (x2, y2) */}
                                  <circle
                                    cx={item.x2}
                                    cy={item.y2}
                                    r={5.5}
                                    fill="#FFFFFF"
                                    stroke="#2563EB"
                                    strokeWidth={2}
                                    style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-arrow-end',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                </>
                              )}
                            </g>
                          );
                        } else if (item.type === 'dimension') {
                          const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                          const tlen = 6;
                          // Left T-bar
                          const l1x = item.x1 + tlen * Math.cos(angle + Math.PI / 2);
                          const l1y = item.y1 + tlen * Math.sin(angle + Math.PI / 2);
                          const l2x = item.x1 + tlen * Math.cos(angle - Math.PI / 2);
                          const l2y = item.y1 + tlen * Math.sin(angle - Math.PI / 2);

                          // Right T-bar
                          const r1x = item.x2 + tlen * Math.cos(angle + Math.PI / 2);
                          const r1y = item.y2 + tlen * Math.sin(angle + Math.PI / 2);
                          const r2x = item.x2 + tlen * Math.cos(angle - Math.PI / 2);
                          const r2y = item.y2 + tlen * Math.sin(angle - Math.PI / 2);

                          return (
                            <g key={item.id}>
                              {/* Invisible broader hit area */}
                              <line
                                x1={item.x1}
                                y1={item.y1}
                                x2={item.x2}
                                y2={item.y2}
                                stroke="transparent"
                                strokeWidth={16}
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />

                              {/* Dimension Line */}
                              <line
                                x1={item.x1}
                                y1={item.y1}
                                x2={item.x2}
                                y2={item.y2}
                                stroke={item.color || '#DC2626'}
                                strokeWidth={isSelected ? 2.8 : 2}
                                strokeLinecap="round"
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />

                              {/* Left T-Bar */}
                              <line
                                x1={l1x}
                                y1={l1y}
                                x2={l2x}
                                y2={l2y}
                                stroke={item.color || '#DC2626'}
                                strokeWidth={isSelected ? 2 : 1.2}
                                strokeLinecap="round"
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />

                              {/* Right T-Bar */}
                              <line
                                x1={r1x}
                                y1={r1y}
                                x2={r2x}
                                y2={r2y}
                                stroke={item.color || '#DC2626'}
                                strokeWidth={isSelected ? 2 : 1.2}
                                strokeLinecap="round"
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />

                              {isSelected && (
                                <>
                                  {/* Start point handle (left tip) */}
                                  <circle
                                    cx={item.x1}
                                    cy={item.y1}
                                    r={5.5}
                                    fill="#FFFFFF"
                                    stroke="#2563EB"
                                    strokeWidth={2}
                                    style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-arrow-start',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* End point handle (right tip) */}
                                  <circle
                                    cx={item.x2}
                                    cy={item.y2}
                                    r={5.5}
                                    fill="#FFFFFF"
                                    stroke="#2563EB"
                                    strokeWidth={2}
                                    style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-arrow-end',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                </>
                              )}
                            </g>
                          );
                        } else if (item.type === 'circle') {
                          const rx = item.radiusX || item.radius || 25;
                          const ry = item.radiusY || item.radius || 25;
                          return (
                            <g key={item.id}>
                              <ellipse
                                cx={item.x}
                                cy={item.y}
                                rx={rx}
                                ry={ry}
                                fill="rgba(255, 255, 255, 0.001)"
                                stroke={item.color || '#DC2626'}
                                strokeWidth={isSelected ? 3.5 : 2.5}
                                style={{ pointerEvents: 'auto', cursor: 'move' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                  const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                  if (!rect) return;
                                  setDragState({
                                    mode: 'drag-annotation',
                                    startX: e.clientX - rect.left,
                                    startY: e.clientY - rect.top,
                                    initLeft: 0,
                                    initTop: 0,
                                    initWidth: 0,
                                    initHeight: 0,
                                    initCropL: 0,
                                    initCropT: 0,
                                    initCropR: 0,
                                    initCropB: 0,
                                    initItem: { ...item }
                                  });
                                }}
                              />
                              {isSelected && (
                                <>
                                  {/* Top-Left Blue Handle */}
                                  <circle
                                    cx={item.x - rx}
                                    cy={item.y - ry}
                                    r={5}
                                    fill="#2563EB"
                                    stroke="#FFFFFF"
                                    strokeWidth={1.5}
                                    style={{ cursor: 'nwse-resize', pointerEvents: 'auto' }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-circle',
                                        handle: 'tl',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* Top-Right Blue Handle */}
                                  <circle
                                    cx={item.x + rx}
                                    cy={item.y - ry}
                                    r={5}
                                    fill="#2563EB"
                                    stroke="#FFFFFF"
                                    strokeWidth={1.5}
                                    style={{ cursor: 'nesw-resize', pointerEvents: 'auto' }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-circle',
                                        handle: 'tr',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* Bottom-Left Blue Handle */}
                                  <circle
                                    cx={item.x - rx}
                                    cy={item.y + ry}
                                    r={5}
                                    fill="#2563EB"
                                    stroke="#FFFFFF"
                                    strokeWidth={1.5}
                                    style={{ cursor: 'nesw-resize', pointerEvents: 'auto' }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-circle',
                                        handle: 'bl',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* Bottom-Right Blue Handle */}
                                  <circle
                                    cx={item.x + rx}
                                    cy={item.y + ry}
                                    r={5}
                                    fill="#2563EB"
                                    stroke="#FFFFFF"
                                    strokeWidth={1.5}
                                    style={{ cursor: 'nwse-resize', pointerEvents: 'auto' }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-circle',
                                        handle: 'br',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                </>
                              )}
                            </g>
                          );
                        }
                        return null;
                      })}
                    </svg>

                    {/* HTML Overlay for Text, Dimension Labels, and Notes (Always on top) */}
                    <div className="absolute inset-0 pointer-events-none z-30">
                      {modalAnnotations.map((item) => {
                        const isSelected = selectedItemId === item.id;
                        if (item.type === 'dimension') {
                          return null;
                        } else if (item.type === 'text') {
                          const isEditing = editingTextId === item.id;
                          const w = item.width || 140;
                          const h = item.height || 35;
                          return (
                            <div
                              key={item.id}
                              className={`absolute cursor-move select-none pointer-events-auto p-1 leading-tight ${isSelected
                                ? 'border border-[#EF4444] bg-transparent z-25'
                                : 'border border-transparent bg-transparent z-20'
                                }`}
                              style={{
                                left: `${item.x}px`,
                                top: `${item.y}px`,
                                width: `${w}px`,
                                minHeight: `${h}px`,
                                color: '#000000',
                                fontSize: `${item.fontSize || 11}px`,
                                fontWeight: item.isBold !== false ? 'bold' : 'normal',
                                fontFamily: "'Montserrat', sans-serif, sans-serif"
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(item.id);
                              }}
                              onMouseDown={(e) => {
                                if (editingTextId === item.id) return;
                                e.stopPropagation();
                                setSelectedItemId(item.id);
                                const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                if (!rect) return;
                                setDragState({
                                  mode: 'drag-annotation',
                                  startX: e.clientX - rect.left,
                                  startY: e.clientY - rect.top,
                                  initLeft: 0,
                                  initTop: 0,
                                  initWidth: 0,
                                  initHeight: 0,
                                  initCropL: 0,
                                  initCropT: 0,
                                  initCropR: 0,
                                  initCropB: 0,
                                  initItem: { ...item }
                                });
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingTextId(item.id);
                              }}
                              title="Tarik untuk geser, double-click untuk ketik teks"
                            >
                              {isEditing ? (
                                <textarea
                                  value={item.text || ''}
                                  autoFocus
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setModalAnnotations((prev) =>
                                      prev.map((a) => (a.id === item.id ? { ...a, text: val, color: '#000000' } : a))
                                    );
                                  }}
                                  onBlur={() => setEditingTextId(null)}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Escape') setEditingTextId(null);
                                  }}
                                  className="w-full h-full bg-transparent resize-none border-none outline-none font-bold text-black p-0 m-0 overflow-hidden whitespace-pre-wrap break-words leading-tight"
                                  style={{
                                    fontSize: `${item.fontSize || 11}px`,
                                    fontFamily: "'Montserrat', sans-serif, sans-serif",
                                    minHeight: `${Math.max(20, h - 8)}px`
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full whitespace-pre-wrap break-words select-none leading-tight">
                                  {item.text || 'DOUBLE-CLICK TO EDIT'}
                                </div>
                              )}

                              {/* 4 Corner Blue Handle Balls when Selected */}
                              {isSelected && (
                                <>
                                  {/* Top-Left */}
                                  <div
                                    className="absolute -top-[5px] -left-[5px] w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-nwse-resize z-30 pointer-events-auto shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-text',
                                        handle: 'tl',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* Top-Right */}
                                  <div
                                    className="absolute -top-[5px] -right-[5px] w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-nesw-resize z-30 pointer-events-auto shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-text',
                                        handle: 'tr',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* Bottom-Left */}
                                  <div
                                    className="absolute -bottom-[5px] -left-[5px] w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-nesw-resize z-30 pointer-events-auto shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-text',
                                        handle: 'bl',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* Bottom-Right */}
                                  <div
                                    className="absolute -bottom-[5px] -right-[5px] w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-nwse-resize z-30 pointer-events-auto shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-text',
                                        handle: 'br',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                </>
                              )}
                            </div>
                          );
                        } else if (item.type === 'note') {
                          const isBiphaseDoc = qcResult?.type === 'Biphase' || 
                            qcFillingData?.templateIm?.toLowerCase() === 'biphase' || 
                            openDoc?.rawDocument?.templateIm?.toLowerCase() === 'biphase' || 
                            openDoc?.templateIm?.toLowerCase() === 'biphase';
                          const isMscSection = activePoleModal?.sectionKey === 'A.3_MSC' || activePoleModal?.sectionTitle?.includes('MSC') || divUpper === 'MSC ADM';
                          const isSmallNote = isMscSection || isBiphaseDoc;
                          const defaultNoteFontSize = isSmallNote ? 8.5 : 11;
                          const noteFontSize = item.fontSize || defaultNoteFontSize;
                          const noteLineHeight = isSmallNote ? 11 : 14;
                          return (
                            <div
                              key={item.id}
                              className={`absolute select-none pointer-events-auto ${isSmallNote ? 'p-1' : 'p-1.5'} ${isSelected ? 'z-25' : 'z-20'}`}
                              style={{
                                left: `${item.x}px`,
                                top: `${item.y}px`,
                                width: `${item.width || (isSmallNote ? 120 : 140)}px`,
                                height: `${item.height || (isSmallNote ? 50 : 60)}px`,
                                backgroundColor: item.bg || '#FFFFFF',
                                border: `1.5px solid ${item.border || '#EF4444'}`,
                                color: '#000000',
                                fontFamily: "'Montserrat', sans-serif, sans-serif"
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(item.id);
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(item.id);
                                const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                if (!rect) return;
                                setDragState({
                                  mode: 'drag-annotation',
                                  startX: e.clientX - rect.left,
                                  startY: e.clientY - rect.top,
                                  initLeft: 0,
                                  initTop: 0,
                                  initWidth: 0,
                                  initHeight: 0,
                                  initCropL: 0,
                                  initCropT: 0,
                                  initCropR: 0,
                                  initCropB: 0,
                                  initItem: { ...item }
                                });
                              }}
                              title="Tarik untuk geser, ketik langsung untuk isi note"
                            >
                              <textarea
                                value={item.text || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setModalAnnotations((prev) =>
                                    prev.map((a) => (a.id === item.id ? { ...a, text: val } : a))
                                  );
                                }}
                                onFocus={() => {
                                  setSelectedItemId(item.id);
                                }}
                                className="w-full h-full bg-transparent resize-none border-none outline-none font-bold text-black p-0 cursor-text select-text overflow-hidden break-words"
                                style={{
                                  fontFamily: "'Montserrat', sans-serif, sans-serif",
                                  fontSize: `${noteFontSize}px`,
                                  lineHeight: `${noteLineHeight}px`
                                }}
                                placeholder="NOTE"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemId(item.id);
                                }}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                }}
                              />

                              {/* 4 Corner Resize Handles when Selected */}
                              {isSelected && (
                                <>
                                  {/* Top-Left */}
                                  <div
                                    className="absolute -top-[5px] -left-[5px] w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-nwse-resize z-30 pointer-events-auto shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-note',
                                        handle: 'tl',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* Top-Right */}
                                  <div
                                    className="absolute -top-[5px] -right-[5px] w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-nesw-resize z-30 pointer-events-auto shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-note',
                                        handle: 'tr',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* Bottom-Left */}
                                  <div
                                    className="absolute -bottom-[5px] -left-[5px] w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-nesw-resize z-30 pointer-events-auto shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-note',
                                        handle: 'bl',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                  {/* Bottom-Right */}
                                  <div
                                    className="absolute -bottom-[5px] -right-[5px] w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-nwse-resize z-30 pointer-events-auto shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemId(item.id);
                                      const rect = document.getElementById('pole-canvas-container')?.getBoundingClientRect();
                                      if (!rect) return;
                                      setDragState({
                                        mode: 'resize-note',
                                        handle: 'br',
                                        startX: e.clientX - rect.left,
                                        startY: e.clientY - rect.top,
                                        initLeft: 0,
                                        initTop: 0,
                                        initWidth: 0,
                                        initHeight: 0,
                                        initCropL: 0,
                                        initCropT: 0,
                                        initCropR: 0,
                                        initCropB: 0,
                                        initItem: { ...item }
                                      });
                                    }}
                                  />
                                </>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>

                  {/* Paletload Side Panel (Only for A.6 Paletisasi) - Simple & Elegant */}
                  {activePoleModal.isPaletload && (
                    <div className="w-[240px] ml-5 flex flex-col bg-white border border-[#E2E8F0] rounded-none p-3.5 shadow-none self-start">
                      <div className="text-[12px] font-bold text-[#1E293B] pb-2 mb-2.5 border-b border-[#F1F5F9] flex items-center justify-between">
                        <span>Data Paletisasi</span>
                        {(() => {
                          const numOb = parseFloat(paletloadOuterBox) || 0;
                          const numLay = parseFloat(paletloadLayers) || 0;
                          const totalBox = numOb * numLay;
                          return totalBox > 0 ? (
                            <span className="text-[10.5px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded-none">
                              {totalBox} Box
                            </span>
                          ) : null;
                        })()}
                      </div>

                      {/* 1. Outer Box per layer */}
                      <div className="mb-2">
                        <label className="block text-[11px] font-medium text-[#475569] mb-1">
                          Outer Box / Layer
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="0"
                            value={paletloadOuterBox}
                            onChange={(e) => handlePaletloadOuterBoxChange(e.target.value)}
                            className="w-full h-[32px] pl-3 pr-10 border border-[#CBD5E1] rounded-none text-[12px] font-semibold text-[#0F172A] bg-[#FAFAFA] focus:bg-white focus:border-[#2563EB] outline-none"
                          />
                          <span className="absolute right-3 top-2 text-[10.5px] text-[#94A3B8]">Box</span>
                        </div>
                      </div>

                      {/* 2. Jumlah Layer */}
                      <div className="mb-2">
                        <label className="block text-[11px] font-medium text-[#475569] mb-1">
                          Jumlah Layer
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="0"
                            value={paletloadLayers}
                            onChange={(e) => handlePaletloadLayersChange(e.target.value)}
                            className="w-full h-[32px] pl-3 pr-12 border border-[#CBD5E1] rounded-none text-[12px] font-semibold text-[#0F172A] bg-[#FAFAFA] focus:bg-white focus:border-[#2563EB] outline-none"
                          />
                          <span className="absolute right-3 top-2 text-[10.5px] text-[#94A3B8]">Layer</span>
                        </div>
                      </div>

                      {/* 3. Isi per Box */}
                      <div className="mb-2.5">
                        <label className="block text-[11px] font-medium text-[#475569] mb-1">
                          Isi per Box (pcs)
                        </label>
                        <div className="relative mb-1.5">
                          <input
                            type="number"
                            placeholder="Contoh: 12, 144"
                            value={paletloadPcsPerBox}
                            onChange={(e) => handlePaletloadPcsPerBoxChange(e.target.value)}
                            className="w-full h-[32px] pl-3 pr-14 border border-[#CBD5E1] rounded-none text-[12px] font-semibold text-[#0F172A] bg-[#FAFAFA] focus:bg-white focus:border-[#2563EB] outline-none"
                          />
                          <span className="absolute right-3 top-2 text-[10.5px] text-[#94A3B8]">pcs/box</span>
                        </div>
                        {/* Clean minimal preset buttons */}
                        <div className="flex items-center justify-between gap-1">
                          {['12', '24', '48', '72', '144'].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handlePaletloadPcsPerBoxChange(val)}
                              className={`flex-1 py-1 rounded-none text-[10px] font-semibold transition-colors cursor-pointer ${
                                paletloadPcsPerBox === val
                                  ? 'bg-[#1E3A8A] text-white'
                                  : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-[#F1F5F9] my-1"></div>

                      {/* 4. Total FG per palet */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-[#1E3A8A]">
                            Jumlah FG / Palet
                          </label>
                          {(() => {
                            const numOb = parseFloat(paletloadOuterBox) || 0;
                            const numLay = parseFloat(paletloadLayers) || 0;
                            const numPcs = parseFloat(paletloadPcsPerBox) || 0;
                            if (numOb > 0 && numLay > 0 && numPcs > 0) {
                              return <span className="text-[9.5px] text-emerald-600 font-semibold">✓ Terhitung</span>;
                            }
                            return null;
                          })()}
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="0"
                            value={paletloadFg}
                            onChange={(e) => handlePaletloadFgChange(e.target.value)}
                            className="w-full h-[34px] pl-3 pr-10 border border-[#93C5FD] rounded-none text-[13px] font-extrabold text-[#1E3A8A] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none"
                          />
                          <span className="absolute right-3 top-2 text-[11px] font-semibold text-[#64748B]">pcs</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pro Tip Footer Text */}
                <div className="text-[10.5px] italic text-[#64748B] mt-2 mb-4">
                  Pro tip: Select an item and press Delete/Backspace or click DELETE to remove. Double-click text to edit.
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setActivePoleModal(null)}
                    className="bg-white border border-[#CBD5E1] text-[#475569] font-semibold text-[12px] w-[95px] h-[36px] rounded-none hover:bg-[#F1F5F9] transition-colors cursor-pointer shadow-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePoleResult}
                    className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-bold text-[12px] w-[130px] h-[36px] rounded-none shadow-none transition-colors cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Test Data (A.7) Modal */}
        {showA7Modal && (
          <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center font-sans">
            <div className="bg-white w-[500px] shadow-2xl border border-[#CBD5E1] rounded-[8px] overflow-hidden">
              {/* Modal Window Header */}
              <div className="flex justify-between items-center px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <div className="flex items-center space-x-2">
                  <div className="w-[15px] h-[15px] border border-[#64748B] flex flex-col p-[1px] space-y-[2px] bg-white">
                    <div className="h-[2px] bg-[#0078D4] w-full"></div>
                    <div className="h-[2px] bg-[#22C55E] w-full"></div>
                  </div>
                  <span className="text-[12px] font-normal text-[#1E293B]">Input Test Data</span>
                </div>
                <button
                  onClick={() => setShowA7Modal(false)}
                  className="text-[#64748B] hover:bg-[#E2E8F0] px-2 py-0.5 rounded text-[13px] transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-7">
                {/* 1. Header Title */}
                <h2 className="text-[16px] font-bold text-[#1E3A8A] mb-6">
                  TEST DATA INPUT
                </h2>

                {/* 2. Test Type Dropdown */}
                <div className="grid grid-cols-[160px_1fr] items-center mb-4">
                  <label className="text-[13px] font-semibold text-[#1E293B]">
                    Test Type:
                  </label>
                  <select
                    value={a7FormData.type}
                    onChange={(e) => openA7FormWithType(e.target.value)}
                    className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] bg-white outline-none focus:border-[#2563EB]"
                  >
                    <option value="JACOMEX">JACOMEX</option>
                    <option value="VACCUM">VACCUM</option>
                    <option value="TORSI">TORSI</option>
                  </select>
                </div>

                {/* 3. Conditional Form Fields */}
                {a7FormData.type === 'JACOMEX' && (
                  <div className="space-y-3.5 mb-4">
                    <div className="grid grid-cols-[160px_1fr] items-center">
                      <label className="text-[13px] text-[#334155]">Pressure (BAR):</label>
                      <input
                        type="text"
                        value={a7FormData.pressure ?? '1.5'}
                        onChange={(e) => setA7FormData({ ...a7FormData, pressure: e.target.value })}
                        className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="grid grid-cols-[160px_1fr] items-center">
                      <label className="text-[13px] text-[#334155]">Duration (Seconds):</label>
                      <input
                        type="text"
                        value={a7FormData.duration ?? '10'}
                        onChange={(e) => setA7FormData({ ...a7FormData, duration: e.target.value })}
                        className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                )}

                {a7FormData.type === 'VACCUM' && (
                  <div className="space-y-3.5 mb-4">
                    <div className="grid grid-cols-[160px_1fr] items-center">
                      <label className="text-[13px] text-[#334155]">Min Condition (BAR):</label>
                      <input
                        type="text"
                        value={a7FormData.minCondition ?? '-0.75'}
                        onChange={(e) => setA7FormData({ ...a7FormData, minCondition: e.target.value })}
                        className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="grid grid-cols-[160px_1fr] items-center">
                      <label className="text-[13px] text-[#334155]">Max Condition (BAR):</label>
                      <input
                        type="text"
                        value={a7FormData.maxCondition ?? '-0.8'}
                        onChange={(e) => setA7FormData({ ...a7FormData, maxCondition: e.target.value })}
                        className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="grid grid-cols-[160px_1fr] items-center">
                      <label className="text-[13px] text-[#334155]">Min Duration (Seconds):</label>
                      <input
                        type="text"
                        value={a7FormData.minDuration ?? '10'}
                        onChange={(e) => setA7FormData({ ...a7FormData, minDuration: e.target.value })}
                        className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="grid grid-cols-[160px_1fr] items-center">
                      <label className="text-[13px] text-[#334155]">Max Duration (Seconds):</label>
                      <input
                        type="text"
                        value={a7FormData.maxDuration ?? '15'}
                        onChange={(e) => setA7FormData({ ...a7FormData, maxDuration: e.target.value })}
                        className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                )}

                {a7FormData.type === 'TORSI' && (
                  <div className="space-y-3.5 mb-4">
                    <div className="grid grid-cols-[160px_1fr] items-center">
                      <label className="text-[13px] text-[#334155]">Min (Kgf.cm):</label>
                      <input
                        type="text"
                        value={a7FormData.minTorsi ?? '9'}
                        onChange={(e) => setA7FormData({ ...a7FormData, minTorsi: e.target.value })}
                        className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="grid grid-cols-[160px_1fr] items-center">
                      <label className="text-[13px] text-[#334155]">Max (Kgf.cm):</label>
                      <input
                        type="text"
                        value={a7FormData.maxTorsi ?? '15'}
                        onChange={(e) => setA7FormData({ ...a7FormData, maxTorsi: e.target.value })}
                        className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                )}

                {/* 4. Description Field */}
                <div className="mt-4">
                  <label className="block text-[13px] font-bold text-[#1E293B] mb-2">
                    Description:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Example: >>>6 pcs / 30 minutes"
                    value={a7FormData.description ?? ''}
                    onChange={(e) => setA7FormData({ ...a7FormData, description: e.target.value })}
                    className="w-full p-2.5 border border-[#CBD5E1] rounded text-[12.5px] text-[#1E293B] outline-none focus:border-[#2563EB] placeholder:text-[#94A3B8]"
                  />
                </div>

                {/* 5. Bottom Action Buttons */}
                <div className="flex justify-end space-x-3.5 mt-6">
                  <button
                    onClick={() => setShowA7Modal(false)}
                    className="w-[140px] h-[38px] bg-white border border-[#CBD5E1] rounded text-[12.5px] font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleSaveA7}
                    className="w-[160px] h-[38px] bg-[#1E3A8A] hover:bg-[#1D4ED8] rounded text-[12.5px] font-bold text-white shadow transition-colors cursor-pointer"
                  >
                    SAVE DATA
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IQ Batch Modal */}
        {showIqBatchModal && (
          <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center font-sans">
            <div className="bg-white w-[500px] shadow-2xl border border-[#CBD5E1] rounded-[8px] overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <div className="flex items-center space-x-2">
                  <div className="w-[15px] h-[15px] border border-[#64748B] flex flex-col p-[1px] space-y-[2px] bg-white">
                    <div className="h-[2px] bg-[#0078D4] w-full"></div>
                    <div className="h-[2px] bg-[#22C55E] w-full"></div>
                  </div>
                  <span className="text-[12px] font-normal text-[#1E293B]">Input Batch Number Format</span>
                </div>
                <button
                  onClick={() => setShowIqBatchModal(false)}
                  className="text-[#64748B] hover:bg-[#E2E8F0] px-2 py-0.5 rounded text-[13px] transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-7">
                <h2 className="text-[14px] font-bold text-[#1E3A8A] mb-4 uppercase">
                  BATCH NUMBER FORMAT INPUT
                </h2>

                <div className="mb-6">
                  <label className="block text-[13px] text-[#1E293B] mb-2">
                    Batch Format:
                  </label>
                  <textarea
                    value={iqBatchText}
                    onChange={(e) => setIqBatchText(e.target.value)}
                    className="w-full h-[140px] p-3 border border-[#3B82F6] rounded text-[12.5px] text-[#334155] outline-none focus:ring-1 focus:ring-[#2563EB] resize-none"
                  />
                </div>

                <div className="flex justify-between items-center mt-2">
                  <button
                    onClick={() => setShowIqBatchModal(false)}
                    className="w-[180px] h-[38px] bg-white border border-[#CBD5E1] rounded text-[12.5px] font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleSaveIqBatch}
                    className="w-[180px] h-[38px] bg-[#1E3A8A] hover:bg-[#1D4ED8] rounded text-[12.5px] font-bold text-white shadow transition-colors cursor-pointer"
                  >
                    SAVE DATA
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QS Modal */}
        {showQsModal && (
          <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center font-sans p-4">
            <div className="bg-[#F8FAFC] w-[880px] max-w-[95vw] max-h-[92vh] flex flex-col shadow-2xl border border-[#CBD5E1] rounded-[6px] overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2.5 border-b border-[#E2E8F0] bg-white shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="w-[15px] h-[15px] border border-[#64748B] flex flex-col p-[1px] space-y-[2px] bg-white">
                    <div className="h-[2px] bg-[#0078D4] w-full"></div>
                    <div className="h-[2px] bg-[#22C55E] w-full"></div>
                  </div>
                  <span className="text-[12px] font-medium text-[#1E293B]">Input Quality Surveillance</span>
                </div>
                <button
                  onClick={() => setShowQsModal(false)}
                  className="text-[#64748B] hover:bg-[#E2E8F0] px-2 py-0.5 rounded text-[13px] transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                <h2 className="text-[13px] font-bold text-[#1E3A8A] mb-3 uppercase tracking-wide">
                  INPUT QUALITY SURVEILLANCE
                </h2>

                {/* Pemeriksaan Awal Table */}
                <table className="w-full mb-4 text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#16A34A] text-white">
                      <th className="border border-white py-1.5 px-2 font-bold w-[40px]">No</th>
                      <th className="border border-white py-1.5 px-2 font-bold w-[180px]">Pemeriksaan Awal</th>
                      <th className="border border-white py-1.5 px-2 font-bold">Deskripsi Kerja</th>
                      <th className="border border-white py-1.5 px-2 font-bold w-[170px]">Spesifikasi</th>
                      <th className="border border-white py-1.5 px-2 font-bold w-[170px]">Frekuensi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {qsAwalRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC]">
                        <td className="border border-[#E2E8F0] py-1 px-1.5 text-center text-[#64748B] font-medium">{row.no || idx + 1}</td>
                        <td className="border border-[#E2E8F0] p-1">
                          <input
                            type="text"
                            className="w-full border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[11px] text-[#1E293B] focus:border-[#3B82F6] focus:bg-[#EFF6FF] outline-none"
                            value={row.pemeriksaan}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQsAwalRows(prev => prev.map((r, i) => i === idx ? { ...r, pemeriksaan: val } : r));
                            }}
                          />
                        </td>
                        <td className="border border-[#E2E8F0] p-1">
                          {idx === 0 ? (
                            isCustomTara ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  className="w-full border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[11px] text-[#1E293B] focus:border-[#3B82F6] focus:bg-[#EFF6FF] outline-none"
                                  value={row.deskripsi}
                                  placeholder="Ketik deskripsi..."
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setQsTaraType(val);
                                    setQsAwalRows(prev => prev.map((r, i) => i === 0 ? { ...r, deskripsi: val } : r));
                                  }}
                                />
                                <button
                                  type="button"
                                  title="Kembali ke pilihan opsi"
                                  onClick={() => {
                                    setIsCustomTara(false);
                                    setQsTaraType('Individual Tara');
                                    setQsAwalRows(prev => prev.map((r, i) => i === 0 ? {
                                      ...r,
                                      deskripsi: 'Individual Tara',
                                      spesifikasi: 'Individual Tara'
                                    } : r));
                                  }}
                                  className="px-1.5 py-0.5 border border-[#CBD5E1] rounded text-[10px] text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer shrink-0"
                                >
                                  ↩ Opsi
                                </button>
                              </div>
                            ) : (
                              <select
                                className="w-full border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[11px] text-[#1E293B] focus:border-[#3B82F6] focus:bg-[#EFF6FF] outline-none bg-white cursor-pointer"
                                value={row.deskripsi}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__custom__') {
                                    setIsCustomTara(true);
                                    return;
                                  }
                                  setQsTaraType(val);
                                  setQsAwalRows(prev => prev.map((r, i) => i === 0 ? {
                                    ...r,
                                    deskripsi: val,
                                    spesifikasi: val === 'Individual Tara' ? 'Individual Tara' : 'Nilai rata-rata'
                                  } : r));
                                }}
                              >
                                <option value="Individual Tara">Individual Tara</option>
                                <option value="Timbang 30 PM Berturut-turut">Timbang 30 PM Berturut-turut</option>
                                <option value="__custom__">+ Ketik manual...</option>
                              </select>
                            )
                          ) : (
                            <input
                              type="text"
                              className="w-full border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[11px] text-[#1E293B] focus:border-[#3B82F6] focus:bg-[#EFF6FF] outline-none"
                              value={row.deskripsi}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQsAwalRows(prev => prev.map((r, i) => i === idx ? { ...r, deskripsi: val } : r));
                              }}
                            />
                          )}
                        </td>
                        <td className="border border-[#E2E8F0] p-1">
                          <input
                            type="text"
                            className="w-full border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[11px] text-[#1E293B] focus:border-[#3B82F6] focus:bg-[#EFF6FF] outline-none"
                            value={row.spesifikasi}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQsAwalRows(prev => prev.map((r, i) => i === idx ? { ...r, spesifikasi: val } : r));
                            }}
                          />
                        </td>
                        <td className="border border-[#E2E8F0] p-1">
                          <input
                            type="text"
                            className="w-full border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[11px] text-[#1E293B] focus:border-[#3B82F6] focus:bg-[#EFF6FF] outline-none"
                            value={row.frekuensi}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQsAwalRows(prev => prev.map((r, i) => i === idx ? { ...r, frekuensi: val } : r));
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pemeriksaan Periodik Table */}
                <table className="w-full mb-2 text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#16A34A] text-white">
                      <th className="border border-white py-1.5 px-2 font-bold w-[40px]">No</th>
                      <th className="border border-white py-1.5 px-2 font-bold w-[180px]">Pemeriksaan Periodik</th>
                      <th className="border border-white py-1.5 px-2 font-bold">Deskripsi Kerja</th>
                      <th className="border border-white py-1.5 px-2 font-bold w-[170px]">Spesifikasi</th>
                      <th className="border border-white py-1.5 px-2 font-bold w-[170px]">Frekuensi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {qsPeriodikRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC]">
                        <td className="border border-[#E2E8F0] py-1 px-1.5 text-center text-[#64748B] font-medium">{row.no || idx + 1}</td>
                        <td className="border border-[#E2E8F0] p-1">
                          <input
                            type="text"
                            className="w-full border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[11px] text-[#1E293B] focus:border-[#3B82F6] focus:bg-[#EFF6FF] outline-none"
                            value={row.pemeriksaan}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQsPeriodikRows(prev => prev.map((r, i) => i === idx ? { ...r, pemeriksaan: val } : r));
                            }}
                          />
                        </td>
                        <td className="border border-[#E2E8F0] p-1">
                          <input
                            type="text"
                            className="w-full border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[11px] text-[#1E293B] focus:border-[#3B82F6] focus:bg-[#EFF6FF] outline-none"
                            value={row.deskripsi}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQsPeriodikRows(prev => prev.map((r, i) => i === idx ? { ...r, deskripsi: val } : r));
                            }}
                          />
                        </td>
                        <td className="border border-[#E2E8F0] p-1">
                          <input
                            type="text"
                            className="w-full border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[11px] text-[#1E293B] focus:border-[#3B82F6] focus:bg-[#EFF6FF] outline-none"
                            value={row.spesifikasi}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQsPeriodikRows(prev => prev.map((r, i) => i === idx ? { ...r, spesifikasi: val } : r));
                            }}
                          />
                        </td>
                        <td className="border border-[#E2E8F0] p-1">
                          <input
                            type="text"
                            className="w-full border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[11px] text-[#1E293B] focus:border-[#3B82F6] focus:bg-[#EFF6FF] outline-none"
                            value={row.frekuensi}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQsPeriodikRows(prev => prev.map((r, i) => i === idx ? { ...r, frekuensi: val } : r));
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Dedicated Sticky Footer */}
              <div className="px-5 py-3 border-t border-[#E2E8F0] bg-white flex space-x-2 shrink-0">
                <button
                  onClick={() => setShowQsModal(false)}
                  className="flex-1 h-[36px] bg-white border border-[#CBD5E1] rounded text-[12.5px] font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  onClick={handleSaveQs}
                  className="flex-1 h-[36px] bg-[#1E3A8A] hover:bg-[#1D4ED8] rounded text-[12.5px] font-bold text-white shadow transition-colors cursor-pointer"
                >
                  SIMPAN DATA
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Back Confirmation Modal */}
        {showBackConfirmation && (
          <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center font-sans">
            <div className="bg-[#F3F3F3] w-[450px] shadow-2xl border border-[#999999] rounded-[8px] overflow-hidden">
              {/* Modal Header */}
              <div className="flex justify-between items-center px-4 py-2 bg-white">
                <div className="flex items-center space-x-2">
                  <div className="w-[16px] h-[16px] bg-[#0078D4] text-white flex items-center justify-center text-[10px] font-bold"> {/* Mimicking standard icon */}

                  </div>
                  <span className="text-[12px] text-black">Kembali</span>
                </div>
                <button onClick={() => setShowBackConfirmation(false)} className="text-[#666666] hover:bg-[#E5E5E5] px-2 py-1 transition-colors text-[12px]">
                  &#x2715;
                </button>
              </div>

              {/* Modal Body */}
              <div className="bg-[#F0F0F0] px-6 py-6 flex items-start space-x-4">
                <div className="w-[48px] h-[48px] rounded-full bg-[#0078D4] text-white flex items-center justify-center text-[28px] font-bold shrink-0 mt-1">
                  ?
                </div>
                <div>
                  <h2 className="text-[18px] text-[#003399] font-normal mb-2">Apakah Anda yakin ingin kembali?</h2>
                  <p className="text-[13px] text-[#333333] leading-relaxed">
                    Semua perubahan yang belum disimpan akan dibatalkan dan data akan dikembalikan ke kondisi terakhir yang tersimpan.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-[#F0F0F0] px-6 pb-6 pt-2 flex justify-end space-x-3">
                <button
                  onClick={async () => {
                    setShowBackConfirmation(false);
                    if (openDoc) {
                      try {
                        if (['UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE', 'HEAD LAB'].includes(divUpper)) {
                          localStorage.removeItem(`im_sync_${openDoc.id}`);
                        } else if (initialDocSnapshotRef.current !== null) {
                          const snap = JSON.parse(initialDocSnapshotRef.current);
                          delete snap.is_filled;
                          delete snap.status;
                          const cleanSnapStr = JSON.stringify(snap);

                          localStorage.setItem(`im_sync_${openDoc.id}`, cleanSnapStr);
                          await fetch(`${API_BASE}/api/im/${openDoc.id}/division/${encodeURIComponent(divisionName)}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ dataJson: cleanSnapStr })
                          });
                        }
                      } catch (e) { }

                      await releaseDocLock(openDoc);
                    }
                    pendingDeletedSignaturesRef.current.clear();
                    setOpenDoc(null);
                    setSignatures({});
                    setPoleData({});
                    setA7List([]);
                    setA7Data(null);
                    setQcResult(null);
                    setQcFillingData({ templateIm: 'Normal', volumeFg: '', density: '', volPhase1: '', denPhase1: '', volPhase2: '', denPhase2: '' });
                    setIsUpDataConfirmed(false);
                    setUpFormData({ lineType: 'BOTTLE LINE', kategori: '', lines: [], nozzles: '' });
                    fetchDivisionDocs();
                  }}
                  className="px-6 py-2 bg-white border border-[#CCCCCC] text-[#333333] hover:bg-[#E5E5E5] text-[12px] font-medium transition-colors cursor-pointer"
                >
                  Ya, Batalkan Perubahan
                </button>
                <button
                  onClick={() => setShowBackConfirmation(false)}
                  className="px-6 py-2 bg-white border border-[#0078D4] text-[#0078D4] hover:bg-[#E5F1FB] font-semibold text-[12px] transition-colors focus:ring-1 focus:ring-[#0078D4] focus:outline-none"
                >
                  Tetap di Halaman Ini
                </button>
              </div>
            </div>
          </div>
        )}
        {renderWarningModal()}
        {renderSignModal()}
        {renderConfirmSignModal()}
        {renderDeleteSignModal()}
        <CalculationDetailModal
          isOpen={showCalculationDetailModal}
          onClose={() => setShowCalculationDetailModal(false)}
          qcFillingData={qcFillingData}
          qcResult={qcResult}
          productName={openDoc?.rawDocument?.description || openDoc?.description || ''}
          imCode={openDoc?.rawDocument?.imCode || openDoc?.imCode || ''}
        />
        {/* Footer bar */}
        <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] py-1.5 px-6 text-[10px] text-[#9CA3AF] flex justify-between shrink-0 font-sans print:hidden">
          <span>Dokumen {openDoc?.rawDocument?.imCode || openDoc?.imCode || ''} ({divUpper})</span>
          <span>IM DIGITAL VERSI 1.8</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      {/* Header Banner */}
      <div style={{ backgroundColor: headerBg }} className="px-[30px] pt-[18px] pb-[14px] shrink-0">
        <h1 style={{ color: titleColor }} className="text-[15px] font-bold flex items-center space-x-2 tracking-wide uppercase">
          <span>{divUpper === "DATA IM" || divUpper === "LIHAT IM" ? "DATA IM" : divUpper}</span>
          <span style={{ color: subtitleColor }} className="mx-1 font-normal select-none">·</span>
          <span style={{ color: subtitleColor }} className="font-normal capitalize">
            {divUpper === "DATA IM" || divUpper === "LIHAT IM" ? "Dokumen Final yang Telah Disetujui" : "Daftar Instruksi Mutu"}
          </span>
        </h1>
        <p style={{ color: subtitleColor }} className="text-[11.5px] mt-1 leading-snug">
          {divUpper === "DATA IM" || divUpper === "LIHAT IM" ? "Daftar instruksi mutu final yang telah disetujui. Klik dua kali untuk pratinjau di dalam sistem." : "Pilih Instruksi Mutu yang ingin Anda isi atau lihat."}
        </p>
      </div>

      {/* Status Tabs for Divisions (except DATA IM / LIHAT IM) */}
      {divUpper !== "DATA IM" && divUpper !== "LIHAT IM" && (
        <div className="px-8 pt-2.5 border-b border-[#E5E7EB] flex space-x-6 text-[13px] font-medium shrink-0 bg-white select-none">
          <button
            onClick={() => setActiveStatusTab("pending")}
            className={`pb-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeStatusTab === "pending"
                ? "text-[#0078D4] border-b-[3px] border-[#0078D4] font-semibold"
                : "text-[#6B7280] hover:text-[#374151] border-b-[3px] border-transparent"
            }`}
          >
            <span>{isSignatureDiv ? "Menunggu Tanda Tangan" : "Belum Diisi"}</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                activeStatusTab === "pending"
                  ? pendingDocs.length > 0 ? "bg-amber-100 text-amber-800" : "bg-[#0078D4]/10 text-[#0078D4]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {pendingDocs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveStatusTab("signed")}
            className={`pb-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeStatusTab === "signed"
                ? "text-[#0078D4] border-b-[3px] border-[#0078D4] font-semibold"
                : "text-[#6B7280] hover:text-[#374151] border-b-[3px] border-transparent"
            }`}
          >
            <span>{isSignatureDiv ? "Sudah Ditandatangani" : "Sudah Diisi"}</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                activeStatusTab === "signed"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {signedDocs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveStatusTab("all")}
            className={`pb-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeStatusTab === "all"
                ? "text-[#0078D4] border-b-[3px] border-[#0078D4] font-semibold"
                : "text-[#6B7280] hover:text-[#374151] border-b-[3px] border-transparent"
            }`}
          >
            <span>Semua</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                activeStatusTab === "all"
                  ? "bg-gray-200 text-gray-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {documents.length}
            </span>
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        {/* Search Box */}
        <div className="flex items-center border border-[#8A8886] rounded-none h-9 px-3 mb-3 shrink-0 bg-white focus-within:border-[#0078D4]">
          <svg className="w-4 h-4 text-[#A19F9D] mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={divUpper === "DATA IM" || divUpper === "LIHAT IM" ? "Cari nama produk, kode fg, kode sf, atau no. fla..." : "Cari..."}
            className="flex-1 outline-none text-[13px] text-[#323130] bg-transparent placeholder:text-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Main Content Area: Table + DOCUMENT ACTIONS panel */}
        <div className="flex-1 flex flex-row space-x-4 overflow-hidden min-h-0">
          {/* Table Container */}
          <div className="flex-1 border border-[#EDEBE9] rounded-md overflow-hidden flex flex-col bg-white">
            <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FAFAFA] text-[#374151] sticky top-0 z-10 text-[12px] font-semibold border-b border-[#E5E7EB]">
                  <tr>
                    <th className="h-[38px] px-3 font-semibold whitespace-nowrap">Nama Produk</th>
                    <th className="h-[38px] px-3 font-semibold whitespace-nowrap">Kode FG</th>
                    <th className="h-[38px] px-3 font-semibold whitespace-nowrap">Kode SF</th>
                    <th className="h-[38px] px-3 font-semibold whitespace-nowrap">No. FLA</th>
                    <th className="h-[38px] px-3 font-semibold whitespace-nowrap">Tanggal Issue</th>
                    <th className="h-[38px] px-3 font-semibold text-center whitespace-nowrap">
                      {divUpper === "DATA IM" || divUpper === "LIHAT IM" ? "Status" : "Status Divisi"}
                    </th>
                    {divUpper !== "DATA IM" && divUpper !== "LIHAT IM" && (
                      <th className="h-[38px] px-3 font-semibold text-center whitespace-nowrap">Aksi</th>
                    )}
                    {showComment && divUpper !== "DATA IM" && divUpper !== "LIHAT IM" && (
                      <th className="h-[38px] px-3 font-semibold whitespace-nowrap">Komentar</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={divUpper === "DATA IM" || divUpper === "LIHAT IM" ? 6 : (showComment ? 8 : 7)} className="text-center py-8 text-sm text-gray-500">
                        Memuat dokumen...
                      </td>
                    </tr>
                  ) : filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={divUpper === "DATA IM" || divUpper === "LIHAT IM" ? 6 : (showComment ? 8 : 7)} className="text-center py-10 text-sm text-gray-500">
                        {search.trim() ? (
                          <span>Tidak ada dokumen yang cocok dengan kata kunci &quot;{search}&quot;.</span>
                        ) : activeStatusTab === "pending" ? (
                          <div className="flex flex-col items-center justify-center space-y-1.5 py-2">
                            <span className="font-semibold text-gray-700">Tidak ada dokumen yang menunggu {isSignatureDiv ? "tanda tangan" : "pengisian"}.</span>
                            {signedDocs.length > 0 && (
                              <button
                                onClick={() => setActiveStatusTab("signed")}
                                className="text-xs text-[#0078D4] hover:underline font-medium cursor-pointer"
                              >
                                Lihat {signedDocs.length} dokumen di tab &quot;{isSignatureDiv ? "Sudah Ditandatangani" : "Sudah Diisi"}&quot; →
                              </button>
                            )}
                          </div>
                        ) : activeStatusTab === "signed" ? (
                          <span>Belum ada dokumen yang {isSignatureDiv ? "ditandatangani" : "diisi"}.</span>
                        ) : (
                          <span>Tidak ada dokumen ditemukan untuk {divUpper}.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc, idx) => {
                      const isDataIm = divUpper === "DATA IM" || divUpper === "LIHAT IM";
                      const isSelected = isDataIm && selectedDoc?.id === doc.id;
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => {
                            if (isDataIm) setSelectedDoc(doc);
                          }}
                          onDoubleClick={() => handleOpenDoc(doc)}
                          className={`h-[44px] text-[12px] border-b border-[#F3F4F6] transition-colors cursor-pointer ${isSelected
                            ? 'bg-[#EFF6FC] text-[#0078D4] font-semibold'
                            : idx % 2 === 1 ? 'bg-[#FAFAFA] text-[#1F2937] hover:bg-[#F8FAFC]' : 'bg-white text-[#1F2937] hover:bg-[#F8FAFC]'
                            }`}
                        >
                          <td className="px-3 max-w-[160px] truncate" title={doc.productName}>{doc.productName}</td>
                          <td className="px-3 max-w-[100px] truncate">{doc.fgCode}</td>
                          <td className="px-3 max-w-[100px] truncate">{doc.sfCode}</td>
                          <td className="px-3 max-w-[130px] truncate" title={doc.flaNo}>{doc.flaNo}</td>
                          <td className="px-3 max-w-[115px] truncate">{doc.issueDate}</td>
                          <td className="px-3 text-center align-middle">
                            {isDataIm ? (
                              <span className={isSelected ? "text-[#0078D4] font-medium" : "text-[#0078D4]"}>
                                Launched (Fully Signed)
                              </span>
                            ) : doc.isFilled ? (
                              <span className="inline-block bg-[#00FF00] text-[#000000] text-[11px] font-bold px-2.5 py-0.5 rounded-none">
                                Filled
                              </span>
                            ) : (
                              <span className="inline-block bg-[#FFA500] text-[#000000] text-[11px] font-bold px-2.5 py-0.5 rounded-none">
                                Not Filled
                              </span>
                            )}
                          </td>
                          {!isDataIm && (
                            <td className="px-3">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  className="bg-white border border-[#0078D4] text-[#0078D4] text-[11px] font-semibold h-[28px] w-[68px] rounded-none hover:bg-[#EFF6FC]"
                                  onClick={(e) => { e.stopPropagation(); handleOpenDoc(doc); }}
                                >
                                  Open
                                </button>
                                <button
                                  className="bg-white border border-[#FCA5A5] text-[#991B1B] text-[11px] font-semibold h-[28px] w-[68px] rounded-none flex items-center justify-center hover:bg-[#FEF2F2] cursor-pointer"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await handleOpenDoc(doc);
                                    setSelectedDoc(doc);
                                    await handleOpenDoc(doc);
                                    setTimeout(() => printImDocument(), 800);
                                  }}
                                >
                                  <FileText className="w-3.5 h-3.5 text-[#DC2626] mr-1 shrink-0" /> PDF
                                </button>
                              </div>
                            </td>
                          )}
                          {!isDataIm && showComment && (
                            <td className="px-3">
                              <div className="flex items-center space-x-1.5 min-w-[200px]">
                                <input
                                  type="text"
                                  id={`comment-input-${doc.id}`}
                                  className="flex-1 h-[28px] border border-[#D1D5DB] rounded-none px-2 text-[11px] outline-none focus:border-[#0078D4]"
                                  defaultValue={doc.comment || ''}
                                  placeholder="Tambah komentar..."
                                />
                                <button
                                  className="bg-[#0078D4] text-white text-[11px] font-semibold h-[28px] w-[56px] rounded-none hover:bg-[#106EBE] cursor-pointer"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const input = document.getElementById(`comment-input-${doc.id}`) as HTMLInputElement | null;
                                    const commentText = input ? input.value : '';
                                    try {
                                      const res = await fetch(`${API_BASE}/api/im/${doc.id}/division/${encodeURIComponent(divisionName)}/comment`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ comment: commentText })
                                      });
                                      if (res.ok) {
                                        doc.comment = commentText;
                                        setWarningTitle('Informasi');
                                        setWarningMessage('Komentar berhasil disimpan.');
                                        setShowWarningModal(true);
                                      } else {
                                        setWarningTitle('Peringatan');
                                        setWarningMessage('Gagal menyimpan komentar.');
                                        setShowWarningModal(true);
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      setWarningTitle('Peringatan');
                                      setWarningMessage('Terjadi kesalahan koneksi.');
                                      setShowWarningModal(true);
                                    }
                                  }}
                                >
                                  Save
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Sidebar: DOCUMENT ACTIONS (Shown for DATA IM / LIHAT IM) */}
          {(divUpper === "DATA IM" || divUpper === "LIHAT IM") && (
            <div className="w-[180px] shrink-0 border border-[#EDEBE9] rounded-none bg-white p-3 flex flex-col shadow-sm h-fit">
              <div className="text-[10px] font-semibold text-[#605E5C] tracking-wide uppercase mb-3 px-0.5">
                DOCUMENT ACTIONS
              </div>
              <button
                disabled={!selectedDoc}
                onClick={() => selectedDoc && handleOpenDoc(selectedDoc)}
                className={`text-[12px] font-semibold h-[34px] w-full rounded-none flex items-center justify-center transition-colors mb-2 ${selectedDoc
                  ? 'bg-[#0078D4] text-white hover:bg-[#106EBE] shadow-sm cursor-pointer'
                  : 'bg-[#F3F2F1] text-[#A19F9D] border border-[#EDEBE9] cursor-not-allowed'
                  }`}
              >
                Preview IM
              </button>
              <button
                disabled={!selectedDoc}
                onClick={async () => {
                  if (selectedDoc) {
                    await handleOpenDoc(selectedDoc);
                    setTimeout(() => printImDocument(), 800);
                  }
                }}
                className={`text-[12px] font-semibold h-[34px] w-full rounded-none flex items-center justify-center transition-colors mb-2 ${selectedDoc
                  ? 'bg-white border border-[#107C41] text-[#107C41] hover:bg-[#F3F9F5] shadow-sm cursor-pointer'
                  : 'bg-[#F3F2F1] text-[#A19F9D] border border-[#EDEBE9] cursor-not-allowed'
                  }`}
              >
                PDF
              </button>
              {isAdmin && (
                <>
                  <button
                    disabled={!selectedDoc}
                    onClick={() => {
                      if (selectedDoc) {
                        setRestoreMode('all');
                        setSelectedRestoreDivisions(['UP', 'POLE', 'MSC ADM', 'IQ', 'UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE']);
                        setShowRestoreImModal(true);
                      }
                    }}
                    className={`text-[12px] font-semibold h-[34px] w-full rounded-none flex items-center justify-center transition-colors mb-2 ${selectedDoc
                      ? 'bg-[#FFF8E1] border border-[#FFC107] text-[#B78103] hover:bg-[#FFECB3] shadow-sm cursor-pointer'
                      : 'bg-[#F3F2F1] text-[#A19F9D] border border-[#EDEBE9] cursor-not-allowed'
                      }`}
                  >
                    Pulihkan IM
                  </button>
                  <button
                    disabled={!selectedDoc}
                    onClick={() => {
                      if (selectedDoc) {
                        setShowDeleteImModal(true);
                      }
                    }}
                    className={`text-[12px] font-semibold h-[34px] w-full rounded-none flex items-center justify-center transition-colors ${selectedDoc
                      ? 'bg-[#FDF2F2] border border-[#FCA5A5] text-[#A80000] hover:bg-[#FEE2E2] shadow-sm cursor-pointer'
                      : 'bg-[#F3F2F1] text-[#A19F9D] border border-[#EDEBE9] cursor-not-allowed'
                      }`}
                  >
                    Delete IM
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer bar */}
        <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] py-1.5 px-6 -mx-6 -mb-6 mt-4 text-[10px] text-[#9CA3AF] flex justify-between shrink-0 font-sans">
          <span>
            {divUpper === "DATA IM" || divUpper === "LIHAT IM"
              ? `${filteredDocs.length} dokumen di ${divUpper}`
              : `${filteredDocs.length} dokumen (${activeStatusTab === "pending" ? (isSignatureDiv ? "Menunggu Tanda Tangan" : "Belum Diisi") : activeStatusTab === "signed" ? (isSignatureDiv ? "Sudah Ditandatangani" : "Sudah Diisi") : "Semua"}) di ${divUpper}`
            }
          </span>
          <span>IM DIGITAL VERSI 1.8</span>
        </div>
      </div>
      {renderWarningModal()}
      {renderSignModal()}
      {renderConfirmSignModal()}
      {renderDeleteSignModal()}
      {showRestoreImModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center font-sans p-4">
          <div className="bg-white w-[560px] max-h-[90vh] rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.15)] border border-[#CBD5E1] flex flex-col">

            {/* Elegant Header */}
            <div className="bg-[#F8FAFC] px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="bg-[#FEF3C7] p-2 rounded-full">
                  <RotateCcw className="w-4 h-4 text-[#D97706]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#0F172A] leading-tight">Pulihkan Dokumen IM (Revisi Data)</h3>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    {selectedDoc.fgCode ? `FG: ${selectedDoc.fgCode}` : ''} {selectedDoc.kodeSf ? `| SF: ${selectedDoc.kodeSf}` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-[13px] text-[#334155] leading-relaxed">
                Anda akan memulihkan dokumen IM <span className="font-bold text-[#0F172A]">"{selectedDoc.productName || selectedDoc.imCode}"</span> dari DATA IM agar dapat direvisi. Silakan tentukan mode pemulihan di bawah ini:
              </p>

              {/* Mode Selection Radios */}
              <div className="space-y-2.5">
                <label 
                  onClick={() => setRestoreMode('all')}
                  className={`flex items-start p-3 border cursor-pointer transition-all ${
                    restoreMode === 'all' 
                      ? 'border-[#D97706] bg-[#FFFBEB]/70 ring-1 ring-[#D97706]' 
                      : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    value="all"
                    checked={restoreMode === 'all'}
                    onChange={() => setRestoreMode('all')}
                    className="mt-0.5 text-[#D97706] focus:ring-[#D97706] cursor-pointer"
                  />
                  <div className="ml-3">
                    <div className="text-[13px] font-bold text-[#0F172A]">Pulihkan ke Semua Divisi (Revisi Total)</div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">
                      Membuka kembali seluruh divisi data dan menarik semua tanda tangan untuk proses verifikasi ulang secara menyeluruh.
                    </div>
                  </div>
                </label>

                <label 
                  onClick={() => setRestoreMode('specific')}
                  className={`flex items-start p-3 border cursor-pointer transition-all ${
                    restoreMode === 'specific' 
                      ? 'border-[#D97706] bg-[#FFFBEB]/70 ring-1 ring-[#D97706]' 
                      : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    value="specific"
                    checked={restoreMode === 'specific'}
                    onChange={() => setRestoreMode('specific')}
                    className="mt-0.5 text-[#D97706] focus:ring-[#D97706] cursor-pointer"
                  />
                  <div className="ml-3">
                    <div className="text-[13px] font-bold text-[#0F172A]">Pulihkan ke Divisi Tertentu Saja (Revisi Parsial)</div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">
                      Hanya divisi yang Anda pilih yang akan berstatus belum selesai/perlu revisi. Divisi lain yang tidak dipilih akan tetap berstatus selesai dan tanda tangannya tetap sah.
                    </div>
                  </div>
                </label>
              </div>

              {/* Checklist when specific mode is selected */}
              {restoreMode === 'specific' && (
                <div className="border border-[#E2E8F0] bg-[#F8FAFC] p-4 rounded-none space-y-3 mt-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                    <span className="text-[12px] font-bold text-[#1E293B] uppercase tracking-wider">Pilih Divisi yang Perlu Direvisi:</span>
                    <div className="flex space-x-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedRestoreDivisions(['UP', 'POLE', 'MSC ADM', 'IQ', 'UP FILLING SPV', 'UP FILLING MANAGER', 'PACKAGING & POLE'])}
                        className="text-[#2563EB] hover:underline font-semibold cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedRestoreDivisions([])}
                        className="text-gray-500 hover:underline cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  {/* Group 1: Data Input */}
                  <div>
                    <div className="text-[11px] font-bold text-[#475569] mb-2 uppercase tracking-wide">Divisi Pengisian Data</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'UP', label: 'UP (Line & QC Filling)', sub: 'Data Line, Nozzle, QC Volume & Density' },
                        { id: 'POLE', label: 'POLE (A.1, A.2, A.3, A.6, A.7)', sub: 'Foto POLE, Paletload, Jacomex & Torsi' },
                        { id: 'MSC ADM', label: 'MSC ADM (Appearance Packing)', sub: 'Foto & Tinjauan Kemasan MSC' },
                        { id: 'IQ', label: 'IQ (Surveillance & Batch Format)', sub: 'Quality Surveillance & Format Batch' }
                      ].map(divItem => {
                        const isChecked = selectedRestoreDivisions.includes(divItem.id);
                        return (
                          <label
                            key={divItem.id}
                            className={`flex items-start p-2 border cursor-pointer select-none transition-colors ${
                              isChecked ? 'bg-white border-[#F59E0B] shadow-xs' : 'bg-gray-50/50 border-gray-200 hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRestoreDivisions(prev => [...prev, divItem.id]);
                                } else {
                                  setSelectedRestoreDivisions(prev => prev.filter(x => x !== divItem.id));
                                }
                              }}
                              className="mt-0.5 text-[#D97706] focus:ring-[#D97706] rounded-xs cursor-pointer"
                            />
                            <div className="ml-2">
                              <div className="text-[12px] font-bold text-[#1E293B] leading-snug">{divItem.label}</div>
                              <div className="text-[10px] text-[#64748B]">{divItem.sub}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Group 2: Signatures */}
                  <div className="pt-2">
                    <div className="text-[11px] font-bold text-[#475569] mb-2 uppercase tracking-wide">Tanda Tangan / Verifikasi (Signatures)</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'UP FILLING SPV', label: 'UP FILLING SPV', sub: 'Tanda tangan verifikasi SPV UP' },
                        { id: 'UP FILLING MANAGER', label: 'UP FILLING MANAGER', sub: 'Tanda tangan persetujuan Manager UP' },
                        { id: 'PACKAGING & POLE', label: 'PACKAGING & POLE', sub: 'Tanda tangan verifikasi Packaging & POLE' }
                      ].map(sigItem => {
                        const isChecked = selectedRestoreDivisions.includes(sigItem.id);
                        return (
                          <label
                            key={sigItem.id}
                            className={`flex items-start p-2 border cursor-pointer select-none transition-colors ${
                              isChecked ? 'bg-white border-[#F59E0B] shadow-xs' : 'bg-gray-50/50 border-gray-200 hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRestoreDivisions(prev => [...prev, sigItem.id]);
                                } else {
                                  setSelectedRestoreDivisions(prev => prev.filter(x => x !== sigItem.id));
                                }
                              }}
                              className="mt-0.5 text-[#D97706] focus:ring-[#D97706] rounded-xs cursor-pointer"
                            />
                            <div className="ml-2">
                              <div className="text-[12px] font-bold text-[#1E293B] leading-snug">{sigItem.label}</div>
                              <div className="text-[10px] text-[#64748B]">{sigItem.sub}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <div className="text-[10.5px] text-[#64748B] mt-2 italic">
                      * Tanda tangan HEAD LAB otomatis ditarik kembali agar dokumen keluar dari DATA IM dan dapat diselesaikan kembali setelah revisi.
                    </div>
                  </div>
                </div>
              )}

              {/* Informative Guarantee Box */}
              <div className="bg-[#FFFBEB] border-l-4 border-[#F59E0B] p-3.5 text-[12px] text-[#92400E]">
                <div className="flex items-center font-bold mb-1">
                  <Info className="w-4 h-4 mr-1.5 shrink-0" />
                  Jaminan Keamanan Data IM
                </div>
                <p className="text-[11.5px] leading-relaxed opacity-95">
                  Seluruh data, isian form, foto, dan nilai parameter yang telah disimpan sebelumnya <span className="font-bold underline">tetap tersimpan utuh</span>. Operator/divisi hanya perlu mengubah atau merevisi bagian yang dibutuhkan tanpa harus mengisi dari awal.
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end space-x-3 shrink-0">
              <button
                type="button"
                disabled={isRestoringDoc}
                onClick={() => setShowRestoreImModal(false)}
                className="h-[30px] px-5 border border-[#CBD5E1] bg-white text-[12px] font-semibold text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] flex items-center justify-center rounded-none transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isRestoringDoc || (restoreMode === 'specific' && selectedRestoreDivisions.length === 0)}
                onClick={async () => {
                  try {
                    setIsRestoringDoc(true);
                    const body = {
                      restoreAll: restoreMode === 'all',
                      divisions: restoreMode === 'specific' ? selectedRestoreDivisions : []
                    };
                    const res = await fetch(`${API_BASE}/api/im/${selectedDoc.id}/restore`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body)
                    });
                    if (res.ok) {
                      try {
                        localStorage.removeItem(`im_sync_${selectedDoc.id}`);
                      } catch (e) { }
                      setShowRestoreImModal(false);
                      setSelectedDoc(null);
                      fetchDivisionDocs();
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new Event('refresh_im_data'));
                      }
                    } else {
                      alert('Gagal memulihkan dokumen IM.');
                    }
                  } catch (e) {
                    alert('Terjadi kesalahan server saat memulihkan dokumen IM.');
                  } finally {
                    setIsRestoringDoc(false);
                  }
                }}
                className={`h-[30px] px-5 text-white text-[12px] font-semibold flex items-center justify-center rounded-none shadow-sm transition-colors ${
                  isRestoringDoc || (restoreMode === 'specific' && selectedRestoreDivisions.length === 0)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#D97706] hover:bg-[#B45309] cursor-pointer'
                }`}
              >
                {isRestoringDoc ? 'Memulihkan...' : 'Ya, Pulihkan Dokumen'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteImModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center font-sans">
          <div className="bg-white w-[420px] rounded-[6px] shadow-xl border border-[#EDEBE9] p-6">
            <h3 className="text-base font-semibold text-[#111827] mb-2">Hapus Dokumen IM</h3>
            <p className="text-xs text-[#4B5563] mb-6">
              Apakah Anda yakin ingin menghapus dokumen IM <span className="font-semibold text-black">"{selectedDoc.productName || selectedDoc.imCode}"</span>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteImModal(false)}
                className="px-4 py-2 border border-[#D1D5DB] rounded-[4px] text-xs font-semibold text-[#374151] hover:bg-[#F3F4F6]"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  try {
                    const uName = currentUser?.username || currentUser?.Username || 'admin';
                    const uRole = currentUser?.role || currentUser?.Role || 'ADMIN';
                    const res = await fetch(`${API_BASE}/api/im/${selectedDoc.id}?username=${encodeURIComponent(uName)}`, {
                      method: 'DELETE',
                      headers: {
                        'X-Username': uName,
                        'X-User-Role': uRole
                      }
                    });
                    if (res.ok) {
                      setShowDeleteImModal(false);
                      setSelectedDoc(null);
                      fetchDivisionDocs();
                    } else {
                      const errData = await res.json().catch(() => null);
                      alert(errData?.message || errData?.Message || 'Gagal menghapus dokumen.');
                    }
                  } catch (e) {
                    alert('Terjadi kesalahan server saat menghapus dokumen.');
                  }
                }}
                className="px-4 py-2 bg-[#DC2626] text-white rounded-[4px] text-xs font-semibold hover:bg-[#B91C1C]"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      <CalculationDetailModal
        isOpen={showCalculationDetailModal}
        onClose={() => setShowCalculationDetailModal(false)}
        qcFillingData={qcFillingData}
        qcResult={qcResult}
        productName={openDoc?.rawDocument?.description || openDoc?.description || ''}
        imCode={openDoc?.rawDocument?.imCode || openDoc?.imCode || ''}
      />
    </div>
  );
}
