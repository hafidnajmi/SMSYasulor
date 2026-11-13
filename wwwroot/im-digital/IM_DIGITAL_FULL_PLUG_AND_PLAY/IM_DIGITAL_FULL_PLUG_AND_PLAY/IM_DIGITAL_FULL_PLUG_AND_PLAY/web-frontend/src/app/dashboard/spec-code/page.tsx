"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Barcode,
    Search,
    Edit3,
    Check,
    X,
    RotateCw,
    AlertCircle,
    Plus,
    Trash2,
    Layers,
    Gauge,
    Package,
    Boxes,
    Info,
    CheckCircle2,
    FileText,
    Upload,
    Download,
    Eye
} from "lucide-react";
import PoleDataModal from "./PoleDataModal";
import { isUserAdmin, userHasPermission, getDefaultDashboardRoute } from "@/utils/auth";
import { API_BASE } from "@/utils/api";

export interface JacomexItem {
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

export interface SpecCodeMaster {
    id?: number;
    specCode: string;
    specName?: string;
    fgCodes?: string; // Comma-separated or array
    a6DataJson?: string;
    a7DataJson?: string;
    palletPdfName?: string;
    palletPdfData?: string;
    fgSpecPdfName?: string;
    fgSpecPdfData?: string;
    createdBy?: string;
    updatedAt?: string;
}

interface DocumentItem {
    id: number;
    imCode: string;
    description: string;
    kodeSf: string;
    noFla: string;
    status: string;
}

export default function InputSpecCodePage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [specMasters, setSpecMasters] = useState<SpecCodeMaster[]>([]);
    const [imDocuments, setImDocuments] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal state for Create / Edit Master Spec Code
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "a6" | "a7">("info");
    const [editingMaster, setEditingMaster] = useState<SpecCodeMaster | null>(null);

    // Form states
    const [formSpecCode, setFormSpecCode] = useState("");
    const [formSpecName, setFormSpecName] = useState("");
    const [formFgList, setFormFgList] = useState<string[]>([]);
    const [fgInputText, setFgInputText] = useState("");
    const [fgDuplicateCount, setFgDuplicateCount] = useState(0);

    // View All FG Codes in Master Table State
    const [expandedFgRows, setExpandedFgRows] = useState<Record<string, boolean>>({});
    const [allFgModal, setAllFgModal] = useState<{ specCode: string; specName?: string; fgList: string[] } | null>(null);
    const [fgModalSearch, setFgModalSearch] = useState("");
    const [copySuccess, setCopySuccess] = useState(false);

    const parseFgInput = (text: string) => {
        if (!text || !text.trim()) {
            return { codes: [], rawCount: 0, dups: 0 };
        }
        const lines = text.split(/[\r\n]+/);
        const rawTokens: string[] = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.includes("\t")) {
                const cols = trimmed.split("\t").map(c => c.trim()).filter(Boolean);
                const fgCol = cols.find(c => c.length >= 5 || c.startsWith("G") || c.startsWith("g")) || cols[0];
                if (fgCol) {
                    const sub = fgCol.split(/[,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
                    rawTokens.push(...sub);
                }
            } else {
                const sub = trimmed.split(/[,;\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
                rawTokens.push(...sub);
            }
        }
        const unique = Array.from(new Set(rawTokens));
        return {
            codes: unique,
            rawCount: rawTokens.length,
            dups: Math.max(0, rawTokens.length - unique.length)
        };
    };

    const handleFgChange = (newText: string) => {
        setFgInputText(newText);
        const parsed = parseFgInput(newText);
        setFormFgList(parsed.codes);
        setFgDuplicateCount(parsed.dups);
    };

    const handleFgPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pasteData = e.clipboardData.getData("text");
        if (!pasteData) return;

        if (pasteData.includes("\n") || pasteData.includes("\r") || pasteData.includes("\t")) {
            e.preventDefault();
            const parsedPaste = parseFgInput(pasteData);

            const existingParsed = parseFgInput(fgInputText);
            const combinedCodes = Array.from(new Set([...existingParsed.codes, ...parsedPaste.codes]));

            const formattedText = combinedCodes.join("\n");
            setFgInputText(formattedText);
            setFormFgList(combinedCodes);

            const totalRaw = existingParsed.rawCount + parsedPaste.rawCount;
            setFgDuplicateCount(Math.max(0, totalRaw - combinedCodes.length));
        }
    };

    // Form state A.6 (Pallet Load)
    const [a6OuterBox, setA6OuterBox] = useState("");
    const [a6Layers, setA6Layers] = useState("");
    const [a6Fg, setA6Fg] = useState("");
    const [a6ImageDataUrl, setA6ImageDataUrl] = useState<string | null>(null);
    const [a6SceneState, setA6SceneState] = useState<any | null>(null);
    const [showA6Modal, setShowA6Modal] = useState(false);

    // Form state A.7 (Vaccum / Jacomex / Torsi)
    const [a7Items, setA7Items] = useState<JacomexItem[]>([]);
    const [showA7Modal, setShowA7Modal] = useState(false);
    const [a7ModalForm, setA7ModalForm] = useState<JacomexItem>({
        type: "VACCUM",
        minCondition: "-0.75",
        maxCondition: "-0.8",
        minDuration: "10",
        maxDuration: "15",
        description: ""
    });

    const getA7DisplayText = (item: JacomexItem) => {
        let text = "";
        const t = (item.type || "").toUpperCase();
        if (t === "VACCUM") {
            text = `>> Test Vaccum sampai dengan kondisi ${item.minCondition || "-0.75"} s/d ${item.maxCondition || "-0.8"} bar dan tahan selama ${item.minDuration || "10"}-${item.maxDuration || "15"} detik`;
        } else if (t === "TORSI") {
            text = `>> Torque Check, Standar T0 : Min/Max ${item.minTorsi || "9"}-${item.maxTorsi || "15"} Kgf.cm`;
        } else {
            text = `>> TEST JACOMEX PRESSURE ${item.pressure || "1.5"} BAR SELAMA ${item.duration || "10"} DETIK`;
        }
        if (item.description && item.description.trim()) {
            text += ` ${item.description.trim()}`;
        }
        return text;
    };

    const openA7ModalWithType = (t: string) => {
        const up = t.toUpperCase();
        if (up === "JACOMEX") {
            setA7ModalForm({ type: "JACOMEX", pressure: "1.5", duration: "10", description: "" });
        } else if (up === "TORSI") {
            setA7ModalForm({ type: "TORSI", minTorsi: "9", maxTorsi: "15", description: "" });
        } else {
            setA7ModalForm({ type: "VACCUM", minCondition: "-0.75", maxCondition: "-0.8", minDuration: "10", maxDuration: "15", description: "" });
        }
        setShowA7Modal(true);
    };

    const [saving, setSaving] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

    // PDF upload states for Spec Code
    const [palletPdfName, setPalletPdfName] = useState<string>("");
    const [palletPdfData, setPalletPdfData] = useState<string>("");
    const [fgSpecPdfName, setFgSpecPdfName] = useState<string>("");
    const [fgSpecPdfData, setFgSpecPdfData] = useState<string>("");
    const [currentUser, setCurrentUser] = useState<any>(null);

    const palletFileInputRef = React.useRef<HTMLInputElement>(null);
    const fgSpecFileInputRef = React.useRef<HTMLInputElement>(null);

    const handlePdfUpload = (
        e: React.ChangeEvent<HTMLInputElement>,
        type: "pallet" | "fgSpec"
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check if PDF
        if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
            showToast("Hanya file PDF yang diperbolehkan (.pdf)!", "error");
            e.target.value = "";
            return;
        }

        // Limit size: 30MB
        const maxSize = 30 * 1024 * 1024;
        if (file.size > maxSize) {
            showToast("Ukuran file PDF maksimal 30MB!", "error");
            e.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            if (type === "pallet") {
                setPalletPdfName(file.name);
                setPalletPdfData(result);
                showToast(`Pallet PDF "${file.name}" berhasil dipilih!`, "success");
            } else {
                setFgSpecPdfName(file.name);
                setFgSpecPdfData(result);
                showToast(`FG Spec PDF "${file.name}" berhasil dipilih!`, "success");
            }
        };
        reader.onerror = () => {
            showToast("Gagal membaca file PDF", "error");
        };
        reader.readAsDataURL(file);

        // Reset input value
        e.target.value = "";
    };

    const openPdfInNewTab = (dataUri: string, filename: string) => {
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

    const downloadPdfFile = (dataUri: string, filename: string) => {
        if (!dataUri) return;
        const a = document.createElement("a");
        a.href = dataUri;
        a.download = filename || "document.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const showToast = (text: string, type: "success" | "error" = "success") => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg(null), 3500);
    };

    // 1. Fetch IM Documents (to select FG Codes)
    const fetchImDocuments = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/im`);
            let apiDocs: any[] = [];
            if (res.ok) {
                apiDocs = await res.json();
            } else {
                const resActive = await fetch(`${API_BASE}/api/im/active`);
                if (resActive.ok) apiDocs = await resActive.json();
            }

            const localData = typeof window !== "undefined" ? localStorage.getItem("local_im_docs") : null;
            let localDocs: any[] = [];
            if (localData) {
                try { localDocs = JSON.parse(localData); } catch (e) { }
            }

            const map = new Map<string, any>();
            localDocs.forEach(d => map.set(String(d.id || d.imCode), d));
            apiDocs.forEach(d => map.set(String(d.id || d.imCode), d));

            const docs: DocumentItem[] = Array.from(map.values()).map(d => ({
                id: d.id,
                imCode: d.imCode || d.im_code || "",
                description: d.description || "",
                kodeSf: d.kodeSf || d.kode_sf || "",
                noFla: d.noFla || d.no_fla || "",
                status: d.status || "Draft"
            })).filter(d => d.imCode);

            setImDocuments(docs);
        } catch (err) {
            console.warn("Error fetching documents", err);
        }
    }, []);

    // 2. Fetch Spec Code Masters (from backend and fallback to localStorage)
    const fetchSpecMasters = useCallback(async () => {
        try {
            setLoading(true);
            let masters: SpecCodeMaster[] = [];

            try {
                const res = await fetch(`${API_BASE}/api/speccode`);
                if (res.ok) {
                    masters = await res.json();
                }
            } catch (apiErr) {
                console.warn("Backend /api/speccode not reachable yet, using localStorage", apiErr);
            }

            // Sync with localStorage
            if (typeof window !== "undefined") {
                const localMastersStr = localStorage.getItem("ppi_spec_code_masters");
                if (localMastersStr) {
                    try {
                        const localMasters: SpecCodeMaster[] = JSON.parse(localMastersStr);
                        // Merge local masters if not in api
                        localMasters.forEach(lm => {
                            if (!masters.some(m => m.specCode?.toUpperCase() === lm.specCode?.toUpperCase())) {
                                masters.push(lm);
                            }
                        });
                    } catch (e) { }
                }
                // Save unified list back to localStorage (without blob fields to avoid quota)
                const mastersForCache = masters.map(({ palletPdfData: _, fgSpecPdfData: __, ...rest }) => rest);
                try {
                    localStorage.setItem("ppi_spec_code_masters", JSON.stringify(mastersForCache));
                } catch (e) {
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
        } catch (err) {
            console.warn("Error loading spec masters", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let u: any = null;
        try {
            const uStr = localStorage.getItem("im_user");
            if (uStr) u = JSON.parse(uStr);
        } catch (e) { }

        if (!u) {
            router.replace("/");
            return;
        }

        const hasAccess = isUserAdmin(u) || userHasPermission(u, "INPUT SPEC CODE");
        if (!hasAccess) {
            setIsAuthorized(false);
            const targetRoute = getDefaultDashboardRoute(u);
            router.replace(targetRoute);
            return;
        }

        setIsAuthorized(true);
        setCurrentUser(u);
        fetchImDocuments();
        fetchSpecMasters();
    }, [fetchImDocuments, fetchSpecMasters, router]);

    // Handle Open Create / Edit Modal
    const handleOpenCreate = () => {
        setEditingMaster(null);
        setFormSpecCode("");
        setFormSpecName("");
        setFormFgList([]);
        setFgInputText("");
        setFgDuplicateCount(0);
        setA6OuterBox("");
        setA6Layers("");
        setA6Fg("");
        setA6ImageDataUrl(null);
        setA6SceneState(null);
        setA7Items([]);
        setPalletPdfName("");
        setPalletPdfData("");
        setFgSpecPdfName("");
        setFgSpecPdfData("");
        setActiveTab("info");
        setIsModalOpen(true);
    };

    const handleOpenA6Modal = () => {
        setShowA6Modal(true);
    };

    const handleSavePoleA6Modal = (result: {
        outerBox: string;
        layers: string;
        fg: string;
        imageDataUrl: string;
        sceneState: any;
    }) => {
        setA6OuterBox(result.outerBox);
        setA6Layers(result.layers);
        setA6Fg(result.fg);
        setA6ImageDataUrl(result.imageDataUrl || null);
        setA6SceneState(result.sceneState || null);
    };

    const handleSaveA7Modal = () => {
        const existingIdx = a7Items.findIndex(x => (x.type || "").toUpperCase() === (a7ModalForm.type || "").toUpperCase());
        if (existingIdx >= 0) {
            const updated = [...a7Items];
            updated[existingIdx] = a7ModalForm;
            setA7Items(updated);
        } else {
            setA7Items([...a7Items, a7ModalForm]);
        }
        setShowA7Modal(false);
    };

    const handleOpenEdit = (item: SpecCodeMaster) => {
        setEditingMaster(item);
        setFormSpecCode(item.specCode || "");
        setFormSpecName(item.specName || "");

        // Parse FG codes
        let fgs: string[] = [];
        if (item.fgCodes) {
            fgs = item.fgCodes.split(/[,;\n\r]/).map(x => x.trim().toUpperCase()).filter(Boolean);
        }
        const uniqueFgs = Array.from(new Set(fgs));
        setFormFgList(uniqueFgs);
        setFgInputText(uniqueFgs.join("\n"));
        setFgDuplicateCount(Math.max(0, fgs.length - uniqueFgs.length));

        // Parse A.6
        if (item.a6DataJson) {
            try {
                const a6 = JSON.parse(item.a6DataJson);
                setA6OuterBox(a6.outerBox || a6.paletloadOuterBox || "");
                setA6Layers(a6.layers || a6.paletloadLayers || "");
                setA6Fg(a6.fg || a6.paletloadFg || "");
                setA6ImageDataUrl(a6.imageDataUrl || null);
                setA6SceneState(a6.sceneState || null);
            } catch (e) {
                setA6OuterBox("");
                setA6Layers("");
                setA6Fg("");
                setA6ImageDataUrl(null);
                setA6SceneState(null);
            }
        } else {
            setA6OuterBox("");
            setA6Layers("");
            setA6Fg("");
            setA6ImageDataUrl(null);
            setA6SceneState(null);
        }

        // Parse A.7
        if (item.a7DataJson) {
            try {
                const a7 = JSON.parse(item.a7DataJson);
                const list = Array.isArray(a7) ? a7 : (a7.data || []);
                setA7Items(list.map((x: any) => ({
                    ...x,
                    type: (x.type || "VACCUM").toUpperCase()
                })));
            } catch (e) {
                setA7Items([]);
            }
        } else {
            setA7Items([]);
        }

        // PDFs
        setPalletPdfName(item.palletPdfName || "");
        setPalletPdfData(item.palletPdfData || "");
        setFgSpecPdfName(item.fgSpecPdfName || "");
        setFgSpecPdfData(item.fgSpecPdfData || "");

        setActiveTab("info");
        setIsModalOpen(true);
    };

    const handleAddFg = (code: string) => {
        const clean = code.trim().toUpperCase();
        if (!clean) return;
        if (!formFgList.includes(clean)) {
            setFormFgList([...formFgList, clean]);
        }
        setFgInputText("");
    };

    const handleRemoveFg = (code: string) => {
        setFormFgList(formFgList.filter(x => x !== code));
    };

    // Handle A.7 Table
    const handleAddA7Row = () => {
        setA7Items([
            ...a7Items,
            { type: "VACCUM", minCondition: "-0.75", maxCondition: "-0.8", minDuration: "10", maxDuration: "15", description: "" }
        ]);
    };

    const handleUpdateA7Type = (index: number, newType: string) => {
        const t = newType.toUpperCase();
        let updatedRow: JacomexItem = {
            ...a7Items[index],
            type: t
        };
        if (t === "JACOMEX") {
            updatedRow.pressure = updatedRow.pressure || "1.5";
            updatedRow.duration = updatedRow.duration || "10";
        } else if (t === "VACCUM") {
            updatedRow.minCondition = updatedRow.minCondition || "-0.75";
            updatedRow.maxCondition = updatedRow.maxCondition || "-0.8";
            updatedRow.minDuration = updatedRow.minDuration || "10";
            updatedRow.maxDuration = updatedRow.maxDuration || "15";
        } else if (t === "TORSI") {
            updatedRow.minTorsi = updatedRow.minTorsi || "9";
            updatedRow.maxTorsi = updatedRow.maxTorsi || "15";
        }
        const updated = [...a7Items];
        updated[index] = updatedRow;
        setA7Items(updated);
    };

    const handleUpdateA7Row = (index: number, field: keyof JacomexItem, val: string) => {
        const updated = [...a7Items];
        updated[index] = { ...updated[index], [field]: val };
        setA7Items(updated);
    };

    const handleRemoveA7Row = (index: number) => {
        setA7Items(a7Items.filter((_, idx) => idx !== index));
    };

    // Save Spec Code Master
    const handleSaveMaster = async () => {
        if (!formSpecCode.trim()) {
            showToast("Spec Code wajib diisi!", "error");
            return;
        }

        try {
            setSaving(true);
            const cleanSpec = formSpecCode.trim().toUpperCase();
            const parsed = parseFgInput(fgInputText);
            const finalFgs = parsed.codes.length > 0 ? parsed.codes : formFgList;
            setFormFgList(finalFgs);
            const fgCodesStr = finalFgs.join(", ");

            const a6Payload = JSON.stringify({
                outerBox: a6OuterBox,
                layers: a6Layers,
                fg: a6Fg,
                paletloadOuterBox: a6OuterBox,
                paletloadLayers: a6Layers,
                paletloadFg: a6Fg,
                imageDataUrl: a6ImageDataUrl,
                sceneState: a6SceneState
            });

            const a7Payload = JSON.stringify(a7Items);

            const payload: SpecCodeMaster = {
                id: editingMaster?.id,
                specCode: cleanSpec,
                specName: formSpecName.trim(),
                fgCodes: fgCodesStr,
                a6DataJson: a6Payload,
                a7DataJson: a7Payload,
                palletPdfName: palletPdfName || undefined,
                palletPdfData: palletPdfData || undefined,
                fgSpecPdfName: fgSpecPdfName || undefined,
                fgSpecPdfData: fgSpecPdfData || undefined,
                createdBy: currentUser?.username || currentUser?.fullName || "daniel",
                updatedAt: new Date().toISOString()
            };

            // 1. Try to save to backend API
            try {
                await fetch(`${API_BASE}/api/speccode`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            } catch (errApi) {
                console.warn("Backend API not reachable, saving locally", errApi);
            }

            // 2. Save to localStorage for instant local availability & offline support
            let updatedList = [...specMasters];
            const idx = updatedList.findIndex(x => x.specCode.toUpperCase() === cleanSpec || (editingMaster?.id && x.id === editingMaster.id));
            if (idx >= 0) {
                updatedList[idx] = { ...updatedList[idx], ...payload };
            } else {
                updatedList.unshift(payload);
            }

            setSpecMasters(updatedList);
            if (typeof window !== "undefined") {
                const listForCache = updatedList.map(({ palletPdfData: _, fgSpecPdfData: __, ...rest }) => rest);
                try {
                    localStorage.setItem("ppi_spec_code_masters", JSON.stringify(listForCache));
                } catch (e) {
                    console.warn("localStorage quota exceeded, skipping spec-code cache.", e);
                }
            }

            showToast(`Master Spec Code ${cleanSpec} berhasil disimpan!`, "success");
            setIsModalOpen(false);
        } catch (err: any) {
            showToast(err.message || "Gagal menyimpan Spec Code", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteMaster = async (item: SpecCodeMaster) => {
        if (!confirm(`Hapus master Spec Code "${item.specCode}"?`)) return;

        try {
            if (item.id) {
                try {
                    await fetch(`${API_BASE}/api/speccode/${item.id}`, { method: "DELETE" });
                } catch (e) { }
            }

            const updated = specMasters.filter(x => x.specCode.toUpperCase() !== item.specCode.toUpperCase());
            setSpecMasters(updated);
            if (typeof window !== "undefined") {
                const updatedForCache = updated.map(({ palletPdfData: _, fgSpecPdfData: __, ...rest }) => rest);
                try {
                    localStorage.setItem("ppi_spec_code_masters", JSON.stringify(updatedForCache));
                } catch (e) {
                    console.warn("localStorage quota exceeded, skipping spec-code cache.", e);
                }
            }
            showToast(`Master Spec Code ${item.specCode} telah dihapus.`, "success");
        } catch (e: any) {
            showToast("Gagal menghapus Spec Code", "error");
        }
    };

    // Filter spec masters
    const filteredMasters = specMasters.filter(item => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
            item.specCode?.toLowerCase().includes(q) ||
            item.specName?.toLowerCase().includes(q) ||
            item.fgCodes?.toLowerCase().includes(q)
        );
    });

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
            <div className="bg-[#005A9E] px-[30px] pt-[18px] pb-[14px] shrink-0 flex items-center justify-between">
                <h1 className="text-[15px] font-bold text-white flex items-center space-x-2 tracking-wide uppercase">
                    <span>MASTER DATABASE SPEC CODE (POLE)</span>
                    <span className="text-white/60 mx-1">·</span>
                    <span className="font-normal text-white/90 capitalize">Template Otomatis A.6 & A.7</span>
                </h1>

                <div className="flex items-center shrink-0">
                    <button
                        onClick={handleOpenCreate}
                        className="bg-[#107C41] hover:bg-[#0E6A37] text-white px-3.5 py-1.5 rounded-none text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 border border-[#0E6A37]"
                    >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Tambah Spec Code Baru</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-0 overflow-hidden">
                {/* Notice Banner */}
                <div className="bg-[#EFF6FC] border border-[#C7E0F4] rounded-[4px] p-3 mb-3 shrink-0 flex items-start gap-2.5 text-[12px] text-[#004578]">
                    <Info className="w-4 h-4 text-[#0078D4] shrink-0 mt-0.5" />
                    <div className="leading-relaxed flex-1">
                        <strong>Cara Kerja:</strong> Daftarkan <strong>Kode FG</strong> ke dalam masing-masing <strong>Spec Code</strong> di bawah.
                        Ketika dokumen IM untuk Kode FG tersebut dibuka di POLE, data <strong>A.6</strong> dan <strong>A.7</strong> akan <strong>otomatis terisi (auto-fill)</strong> tanpa perlu input berulang kali. Cukup buat 1x per Spec Code!
                    </div>
                </div>

                {/* Search & Actions Bar */}
                <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                    <div className="flex-1 flex items-center border border-[#EDEBE9] rounded-[4px] px-3 h-[34px] bg-white focus-within:border-[#0078D4] shadow-sm">
                        <Search className="w-4 h-4 text-[#A19F9D] mr-2 shrink-0" />
                        <input
                            type="text"
                            placeholder="Cari berdasarkan Spec Code, Nama Spec, atau Kode FG..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-[12.5px] text-[#323130] min-w-0"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="text-[#A19F9D] hover:text-[#323130]">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => { fetchSpecMasters(); fetchImDocuments(); }}
                        className="h-[34px] px-3 bg-[#F3F2F1] hover:bg-[#EDEBE9] text-[#323130] rounded-[4px] border border-[#EDEBE9] text-[12px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                        title="Refresh"
                    >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Refresh</span>
                    </button>
                </div>

                {/* Table Spec Codes */}
                <div className="flex-1 overflow-auto border border-[#EDEBE9] rounded-[4px] bg-white shadow-sm">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-[#6B7280] text-[13px]">
                            Memuat master spec code...
                        </div>
                    ) : filteredMasters.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-[#6B7280] space-y-2 p-6 text-center">
                            <Boxes className="w-10 h-10 text-gray-300" />
                            <div className="text-[13px] font-medium text-gray-700">Belum ada Master Spec Code</div>
                            <div className="text-[11.5px] text-gray-500 max-w-md">
                                Klik tombol <strong>"Tambah Spec Code Baru"</strong> di atas untuk membuat database spec pertama Anda dan mendaftarkan Kode FG.
                            </div>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
                            <thead className="sticky top-0 bg-[#FAF9F8] z-10 border-b border-[#EDEBE9]">
                                <tr className="text-[11px] font-semibold text-[#323130]">
                                    <th className="px-3.5 py-2.5 w-[50px] text-center">NO</th>
                                    <th className="px-3.5 py-2.5 w-[160px]">SPEC CODE</th>
                                    <th className="px-3.5 py-2.5 min-w-[320px]">DAFTAR KODE FG TERDAFTAR</th>
                                    <th className="px-3.5 py-2.5 w-[140px] text-center">DATA A.6 (PALLET)</th>
                                    <th className="px-3.5 py-2.5 w-[140px] text-center">DATA A.7 (UJI)</th>
                                    <th className="px-3.5 py-2.5 w-[170px] text-center">DOKUMEN PDF</th>
                                    <th className="px-3.5 py-2.5 w-[110px] text-center">AKSI</th>
                                </tr>
                            </thead>
                            <tbody className="text-[12px] text-[#323130]">
                                {filteredMasters.map((item, idx) => {
                                    const fgList = item.fgCodes ? item.fgCodes.split(/[,;\n\r]/).map(x => x.trim()).filter(Boolean) : [];

                                    let hasA6 = false;
                                    try {
                                        if (item.a6DataJson) {
                                            const parsed = JSON.parse(item.a6DataJson);
                                            hasA6 = !!(parsed.outerBox || parsed.layers || parsed.fg || parsed.paletloadOuterBox);
                                        }
                                    } catch (e) { }

                                    let hasA7 = false;
                                    let a7Count = 0;
                                    try {
                                        if (item.a7DataJson) {
                                            const parsed = JSON.parse(item.a7DataJson);
                                            const arr = Array.isArray(parsed) ? parsed : (parsed.data || []);
                                            hasA7 = arr.length > 0;
                                            a7Count = arr.length;
                                        }
                                    } catch (e) { }

                                    return (
                                        <tr
                                            key={`spec-row-${item.specCode || item.id || idx}-${idx}`}
                                            className={`h-[46px] border-b border-[#F3F2F1] hover:bg-[#F0F7FF] transition-colors ${idx % 2 === 1 ? "bg-[#FAF9F8]" : "bg-white"}`}
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
                                            <td className="px-3.5 text-center">
                                                {hasA6 ? (
                                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>Terisi</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] bg-gray-100 text-gray-500">
                                                        Belum Diisi
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3.5 text-center">
                                                {hasA7 ? (
                                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>{a7Count} Parameter</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] bg-gray-100 text-gray-500">
                                                        Belum Diisi
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3.5 text-center">
                                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                    {item.palletPdfData ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openPdfInNewTab(item.palletPdfData!, item.palletPdfName || "Pallet PDF")}
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-blue-50 text-[#005A9E] border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                                                            title={`Lihat ${item.palletPdfName || "Pallet PDF"}`}
                                                        >
                                                            <FileText className="w-3 h-3 text-red-500" />
                                                            <span>Pallet</span>
                                                        </button>
                                                    ) : null}
                                                    {item.fgSpecPdfData ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openPdfInNewTab(item.fgSpecPdfData!, item.fgSpecPdfName || "FG Spec PDF")}
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                                                            title={`Lihat ${item.fgSpecPdfName || "FG Spec PDF"}`}
                                                        >
                                                            <FileText className="w-3 h-3 text-red-500" />
                                                            <span>FG Spec</span>
                                                        </button>
                                                    ) : null}
                                                    {!item.palletPdfData && !item.fgSpecPdfData && (
                                                        <span className="text-gray-400 text-[11px]">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3.5 text-center">
                                                <div className="flex items-center justify-center space-x-1.5">
                                                    <button
                                                        onClick={() => handleOpenEdit(item)}
                                                        className="px-2 py-1 text-[11px] font-semibold text-[#0078D4] hover:bg-[#EFF6FC] border border-[#C7E0F4] rounded-[3px] transition-colors cursor-pointer inline-flex items-center space-x-1"
                                                        title="Edit Spec Code & Parameter"
                                                    >
                                                        <Edit3 className="w-3 h-3" />
                                                        <span>Edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMaster(item)}
                                                        className="p-1 text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 rounded-[3px] transition-colors cursor-pointer"
                                                        title="Hapus Spec Code"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] py-1.5 px-6 text-[10.5px] text-[#6B7280] flex justify-between shrink-0 font-sans">
                <span>Total Master: {filteredMasters.length} Spec Code</span>
                <span>IM DIGITAL VERSI 1.8</span>
            </div>

            {/* Modal Create / Edit Spec Code Master - SIMPLE & CLEAN */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]">
                    <div className="w-[680px] max-w-full bg-white rounded-[6px] border border-[#CBD5E1] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="bg-[#005A9E] px-4 py-3 text-white flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Barcode className="w-5 h-5 text-white" />
                                <h3 className="text-[14px] font-bold uppercase tracking-wide">
                                    {editingMaster ? `EDIT SPEC CODE: ${editingMaster.specCode}` : "TAMBAH SPEC CODE"}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body - Simple 1-Page Layout */}
                        <div className="p-5 overflow-y-auto max-h-[75vh] space-y-4">
                            {/* 1. Spec Code */}
                            <div>
                                <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                                    SPEC CODE <span className="text-red-500">*</span> :
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: SPEC-01"
                                    value={formSpecCode}
                                    onChange={e => setFormSpecCode(e.target.value.toUpperCase())}
                                    className="w-full h-[34px] border border-[#CBD5E1] rounded-[4px] px-3 font-mono font-bold text-[13px] text-[#0F172A] outline-none focus:border-[#0078D4]"
                                />
                            </div>

                            {/* 2. Daftar FG Codes (Input Simple & Paste Excel) */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11.5px] font-bold text-[#334155] flex items-center gap-1.5">
                                        <span>DAFTAR KODE FG</span>
                                        <span className="text-[10.5px] font-normal text-[#64748B]">
                                            (Bisa paste 1 kolom dari Excel / 1 baris per kode / pisahkan koma) :
                                        </span>
                                    </label>
                                    {formFgList.length > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setFgInputText(formFgList.join("\n"))}
                                                className="text-[10px] text-[#0078D4] hover:text-[#005A9E] font-medium px-2 py-0.5 bg-[#F0F7FF] rounded border border-[#BAE6FD] hover:bg-[#E0F2FE] cursor-pointer transition-colors"
                                                title="Tampilkan 1 baris per kode (format kolom Excel)"
                                            >
                                                📄 Format Baris (Excel)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFgInputText(formFgList.join(", "))}
                                                className="text-[10px] text-[#0078D4] hover:text-[#005A9E] font-medium px-2 py-0.5 bg-[#F0F7FF] rounded border border-[#BAE6FD] hover:bg-[#E0F2FE] cursor-pointer transition-colors"
                                                title="Tampilkan dipisahkan koma"
                                            >
                                                🏷️ Format Koma
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFgInputText("");
                                                    setFormFgList([]);
                                                    setFgDuplicateCount(0);
                                                }}
                                                className="text-[10px] text-red-600 hover:text-red-700 font-medium px-1.5 py-0.5 bg-red-50 rounded border border-red-200 hover:bg-red-100 cursor-pointer transition-colors"
                                            >
                                                🗑️ Kosongkan
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <textarea
                                    rows={5}
                                    placeholder={`Paste langsung kolom dari Excel di sini (Ctrl+V):\n125005392\n125005396\nG3842105\n(Atau ketik dipisahkan dengan koma atau spasi)`}
                                    value={fgInputText}
                                    onChange={e => handleFgChange(e.target.value)}
                                    onPaste={handleFgPaste}
                                    className="w-full border border-[#CBD5E1] rounded-[4px] p-2.5 font-mono text-[12px] text-[#0F172A] outline-none focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] leading-relaxed resize-y min-h-[95px] max-h-[220px]"
                                />
                                <div className="mt-1 flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-2">
                                        {formFgList.length > 0 ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                                                ✓ {formFgList.length} Kode FG unik terdaftar
                                            </span>
                                        ) : (
                                            <span className="text-[10.5px] text-[#64748B]">
                                                Semua Kode FG di atas akan otomatis menggunakan data A.6 & A.7 di bawah ini.
                                            </span>
                                        )}
                                        {fgDuplicateCount > 0 && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                                                ℹ️ {fgDuplicateCount} duplikat otomatis dibersihkan
                                            </span>
                                        )}
                                    </div>
                                    {formFgList.length > 0 && (
                                        <span className="text-[10px] text-[#64748B]">
                                            Otomatis terhubung ke data A.6 & A.7 di bawah
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 3. Data A.6 (Paletisasi) - Persis Gambar Ke-2 */}
                            <div className="border border-black overflow-hidden shadow-sm">
                                <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[6px] py-[1px] border-b border-black h-[18px] flex items-center justify-between">
                                    <span>A.6. Paletisasi</span>
                                </div>
                                <div className="bg-[#EAEFE3] min-h-[140px] flex items-center justify-center relative group p-0 overflow-hidden">
                                    {a6ImageDataUrl ? (
                                        <div className="w-full h-full relative group">
                                            <img
                                                src={a6ImageDataUrl}
                                                alt="A.6 Paletisasi"
                                                className="w-full h-auto max-h-[175px] object-contain block mx-auto"
                                            />
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-white border border-[#CBD5E1] p-1 rounded-none shadow-none z-20">
                                                <button
                                                    type="button"
                                                    onClick={handleOpenA6Modal}
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
                                                    onClick={() => {
                                                        setA6OuterBox("");
                                                        setA6Layers("");
                                                        setA6Fg("");
                                                        setA6ImageDataUrl(null);
                                                        setA6SceneState(null);
                                                    }}
                                                    className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[10px] font-semibold px-2 py-1 rounded-none shadow-none flex items-center space-x-1 cursor-pointer transition-colors"
                                                    title="Hapus Data"
                                                >
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                                                        <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                                                    </svg>
                                                    <span>Delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (a6OuterBox || a6Layers || a6Fg) ? (
                                        <div className="w-full flex flex-col items-center justify-center p-3">
                                            <div className="bg-white border border-[#CBD5E1] rounded-none px-5 py-3 shadow-none flex items-center space-x-6 text-[12px]">
                                                <div>
                                                    <span className="text-[#64748B] text-[10.5px] block font-medium">Outer Box :</span>
                                                    <span className="font-bold text-[#005A9E]">{a6OuterBox || "-"}</span>
                                                </div>
                                                <div className="w-[1px] h-7 bg-gray-200"></div>
                                                <div>
                                                    <span className="text-[#64748B] text-[10.5px] block font-medium">Layers :</span>
                                                    <span className="font-bold text-[#005A9E]">{a6Layers || "-"}</span>
                                                </div>
                                                <div className="w-[1px] h-7 bg-gray-200"></div>
                                                <div>
                                                    <span className="text-[#64748B] text-[10.5px] block font-medium">FG :</span>
                                                    <span className="font-bold text-[#005A9E]">{a6Fg || "-"}</span>
                                                </div>
                                            </div>
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-white border border-[#CBD5E1] p-1 rounded-none shadow-none z-20">
                                                <button
                                                    type="button"
                                                    onClick={handleOpenA6Modal}
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
                                                    onClick={() => {
                                                        setA6OuterBox("");
                                                        setA6Layers("");
                                                        setA6Fg("");
                                                        setA6ImageDataUrl(null);
                                                        setA6SceneState(null);
                                                    }}
                                                    className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[10px] font-semibold px-2 py-1 rounded-none shadow-none flex items-center space-x-1 cursor-pointer transition-colors"
                                                    title="Hapus Data"
                                                >
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                                                        <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                                                    </svg>
                                                    <span>Delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleOpenA6Modal}
                                            className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2 rounded-none text-[12px] font-bold shadow-none flex items-center justify-center transition-colors cursor-pointer"
                                        >
                                            + ADD DATA BY POLE
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 4. Data A.7 (VACCUM / JACOMEX / TORSI) - Persis Gambar Ke-2 */}
                            <div className="border border-black overflow-hidden shadow-sm">
                                <div className="bg-[#FFB300] text-[#1E3A8A] font-bold text-[9px] px-[6px] py-[1px] border-b border-black h-[18px] flex items-center justify-between uppercase">
                                    <span>A.7. VACCUM / JACOMEX / TORSI</span>
                                </div>
                                <div className="bg-[#EAEFE3] min-h-[70px] flex items-center justify-center relative group px-3 py-2">
                                    {a7Items.length > 0 ? (
                                        <div className="w-full flex flex-col space-y-1">
                                            {a7Items.map((item, idx) => (
                                                <div key={idx} className="flex items-center space-x-2">
                                                    <span className="text-[11.5px] font-bold text-black select-text leading-tight">
                                                        {getA7DisplayText(item)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setA7Items(a7Items.filter((_, i) => i !== idx))}
                                                        className="w-[15px] h-[15px] rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white flex items-center justify-center text-[9px] font-bold shrink-0 transition-transform hover:scale-110 shadow-sm cursor-pointer"
                                                        title="Hapus test"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-white border border-[#CBD5E1] p-1 rounded-none shadow-none z-20">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const existingTypes = a7Items.map(x => (x.type || "").toUpperCase());
                                                        let defaultType = "VACCUM";
                                                        if (!existingTypes.includes("JACOMEX")) defaultType = "JACOMEX";
                                                        else if (!existingTypes.includes("VACCUM")) defaultType = "VACCUM";
                                                        else if (!existingTypes.includes("TORSI")) defaultType = "TORSI";
                                                        openA7ModalWithType(defaultType);
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
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => openA7ModalWithType("VACCUM")}
                                            className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white px-8 py-2 rounded-none text-[12px] font-bold shadow-none flex items-center justify-center transition-colors cursor-pointer"
                                        >
                                            + ADD DATA BY POLE
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 5. Upload Dokumen PDF: Pallet PDF & FG Spec PDF */}
                            <div className="pt-1">
                                <label className="block text-[11px] font-bold text-[#334155] mb-2 uppercase tracking-wide">
                                    Lampiran Dokumen PDF (Pallet PDF & FG Spec PDF) :
                                </label>

                                {/* Hidden File Inputs */}
                                <input
                                    ref={palletFileInputRef}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="hidden"
                                    onChange={e => handlePdfUpload(e, "pallet")}
                                />
                                <input
                                    ref={fgSpecFileInputRef}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="hidden"
                                    onChange={e => handlePdfUpload(e, "fgSpec")}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Card 1: Pallet PDF */}
                                    <div className="border border-[#CBD5E1] rounded-[6px] bg-[#F8FAFC] p-3 flex flex-col justify-between transition-all hover:border-[#94A3B8]">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#005A9E]"></span>
                                                <span className="text-[12px] font-bold text-[#1E293B]">Pallet PDF</span>
                                            </div>
                                            {palletPdfName ? (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Terunggah
                                                </span>
                                            ) : (
                                                <span className="text-[10.5px] text-[#94A3B8] italic">Belum ada file</span>
                                            )}
                                        </div>

                                        {palletPdfName ? (
                                            <div className="space-y-2">
                                                <div className="bg-white border border-[#E2E8F0] rounded p-2 flex items-center space-x-2">
                                                    <div className="w-7 h-7 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-[10px] shrink-0 border border-red-200">
                                                        PDF
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[11.5px] font-medium text-[#1E293B] truncate" title={palletPdfName}>
                                                            {palletPdfName}
                                                        </p>
                                                        <p className="text-[10px] text-[#64748B]">Dokumen Paletisasi</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-1 pt-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openPdfInNewTab(palletPdfData, palletPdfName)}
                                                        className="flex-1 bg-[#005A9E] hover:bg-[#004A83] text-white py-1.5 px-2 rounded-[4px] text-[11px] font-semibold flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                                                        title="Lihat / Preview PDF di tab baru"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>Preview</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadPdfFile(palletPdfData, palletPdfName)}
                                                        className="bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] py-1.5 px-2.5 rounded-[4px] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                                        title="Download file PDF"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                        <span>Unduh</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => palletFileInputRef.current?.click()}
                                                        className="bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] py-1.5 px-2.5 rounded-[4px] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                                        title="Ganti PDF dengan file lain"
                                                    >
                                                        <Upload className="w-3.5 h-3.5" />
                                                        <span>Ganti</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPalletPdfName("");
                                                            setPalletPdfData("");
                                                        }}
                                                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-1.5 rounded-[4px] transition-colors cursor-pointer"
                                                        title="Hapus Pallet PDF"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => palletFileInputRef.current?.click()}
                                                className="w-full bg-white hover:bg-[#F0F7FF] border-2 border-dashed border-[#CBD5E1] hover:border-[#0078D4] rounded-[6px] py-3.5 px-3 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-100 text-[#0078D4] flex items-center justify-center transition-colors">
                                                    <Upload className="w-4 h-4" />
                                                </div>
                                                <span className="text-[12px] font-bold text-[#1E3A8A] group-hover:text-[#0078D4]">
                                                    Upload Pallet PDF
                                                </span>
                                                <span className="text-[10px] text-[#64748B]">
                                                    Pilih file .pdf (Maks. 30MB)
                                                </span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Card 2: FG Spec PDF */}
                                    <div className="border border-[#CBD5E1] rounded-[6px] bg-[#F8FAFC] p-3 flex flex-col justify-between transition-all hover:border-[#94A3B8]">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#107C41]"></span>
                                                <span className="text-[12px] font-bold text-[#1E293B]">FG Spec PDF</span>
                                            </div>
                                            {fgSpecPdfName ? (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Terunggah
                                                </span>
                                            ) : (
                                                <span className="text-[10.5px] text-[#94A3B8] italic">Belum ada file</span>
                                            )}
                                        </div>

                                        {fgSpecPdfName ? (
                                            <div className="space-y-2">
                                                <div className="bg-white border border-[#E2E8F0] rounded p-2 flex items-center space-x-2">
                                                    <div className="w-7 h-7 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-[10px] shrink-0 border border-red-200">
                                                        PDF
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[11.5px] font-medium text-[#1E293B] truncate" title={fgSpecPdfName}>
                                                            {fgSpecPdfName}
                                                        </p>
                                                        <p className="text-[10px] text-[#64748B]">Dokumen Spesifikasi FG</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-1 pt-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openPdfInNewTab(fgSpecPdfData, fgSpecPdfName)}
                                                        className="flex-1 bg-[#107C41] hover:bg-[#0E6A37] text-white py-1.5 px-2 rounded-[4px] text-[11px] font-semibold flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                                                        title="Lihat / Preview PDF di tab baru"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>Preview</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadPdfFile(fgSpecPdfData, fgSpecPdfName)}
                                                        className="bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] py-1.5 px-2.5 rounded-[4px] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                                        title="Download file PDF"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                        <span>Unduh</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => fgSpecFileInputRef.current?.click()}
                                                        className="bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] py-1.5 px-2.5 rounded-[4px] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                                        title="Ganti PDF dengan file lain"
                                                    >
                                                        <Upload className="w-3.5 h-3.5" />
                                                        <span>Ganti</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFgSpecPdfName("");
                                                            setFgSpecPdfData("");
                                                        }}
                                                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-1.5 rounded-[4px] transition-colors cursor-pointer"
                                                        title="Hapus FG Spec PDF"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => fgSpecFileInputRef.current?.click()}
                                                className="w-full bg-white hover:bg-[#F0FDF4] border-2 border-dashed border-[#CBD5E1] hover:border-[#107C41] rounded-[6px] py-3.5 px-3 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-emerald-50 group-hover:bg-emerald-100 text-[#107C41] flex items-center justify-center transition-colors">
                                                    <Upload className="w-4 h-4" />
                                                </div>
                                                <span className="text-[12px] font-bold text-[#065F46] group-hover:text-[#107C41]">
                                                    Upload FG Spec PDF
                                                </span>
                                                <span className="text-[10px] text-[#64748B]">
                                                    Pilih file .pdf (Maks. 30MB)
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3 flex justify-end space-x-2.5">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                disabled={saving}
                                className="px-4 py-1.5 border border-[#CBD5E1] bg-white text-[#475569] text-[12px] font-semibold rounded-[4px] hover:bg-[#F1F5F9] cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveMaster}
                                disabled={saving}
                                className="px-5 py-1.5 bg-[#005A9E] hover:bg-[#004A83] text-white text-[12px] font-bold rounded-[4px] shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Simpan Spec Code</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Sub-Dialog A.6 Paletisasi (POLE DATA INPUT) */}
            <PoleDataModal
                isOpen={showA6Modal}
                onClose={() => setShowA6Modal(false)}
                initialOuterBox={a6OuterBox}
                initialLayers={a6Layers}
                initialFg={a6Fg}
                initialSceneState={a6SceneState}
                onSave={handleSavePoleA6Modal}
            />

            {/* Modal Sub-Dialog A.7 Test Data Input */}
            {showA7Modal && (
                <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center font-sans animate-in fade-in duration-150">
                    <div className="bg-white w-[500px] shadow-2xl border border-[#CBD5E1] rounded-[8px] overflow-hidden">
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

                        <div className="p-7">
                            <h2 className="text-[16px] font-bold text-[#1E3A8A] mb-6">
                                TEST DATA INPUT
                            </h2>

                            <div className="grid grid-cols-[160px_1fr] items-center mb-4">
                                <label className="text-[13px] font-semibold text-[#1E293B]">
                                    Test Type:
                                </label>
                                <select
                                    value={a7ModalForm.type}
                                    onChange={(e) => openA7ModalWithType(e.target.value)}
                                    className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] bg-white outline-none focus:border-[#2563EB]"
                                >
                                    <option value="JACOMEX">JACOMEX</option>
                                    <option value="VACCUM">VACCUM</option>
                                    <option value="TORSI">TORSI</option>
                                </select>
                            </div>

                            {a7ModalForm.type === 'JACOMEX' && (
                                <div className="space-y-3.5 mb-4">
                                    <div className="grid grid-cols-[160px_1fr] items-center">
                                        <label className="text-[13px] text-[#334155]">Pressure (BAR):</label>
                                        <input
                                            type="text"
                                            value={a7ModalForm.pressure ?? '1.5'}
                                            onChange={(e) => setA7ModalForm({ ...a7ModalForm, pressure: e.target.value })}
                                            className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-[160px_1fr] items-center">
                                        <label className="text-[13px] text-[#334155]">Duration (Seconds):</label>
                                        <input
                                            type="text"
                                            value={a7ModalForm.duration ?? '10'}
                                            onChange={(e) => setA7ModalForm({ ...a7ModalForm, duration: e.target.value })}
                                            className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                                        />
                                    </div>
                                </div>
                            )}

                            {a7ModalForm.type === 'VACCUM' && (
                                <div className="space-y-3.5 mb-4">
                                    <div className="grid grid-cols-[160px_1fr] items-center">
                                        <label className="text-[13px] text-[#334155]">Min Condition (BAR):</label>
                                        <input
                                            type="text"
                                            value={a7ModalForm.minCondition ?? '-0.75'}
                                            onChange={(e) => setA7ModalForm({ ...a7ModalForm, minCondition: e.target.value })}
                                            className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-[160px_1fr] items-center">
                                        <label className="text-[13px] text-[#334155]">Max Condition (BAR):</label>
                                        <input
                                            type="text"
                                            value={a7ModalForm.maxCondition ?? '-0.8'}
                                            onChange={(e) => setA7ModalForm({ ...a7ModalForm, maxCondition: e.target.value })}
                                            className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-[160px_1fr] items-center">
                                        <label className="text-[13px] text-[#334155]">Min Duration (Seconds):</label>
                                        <input
                                            type="text"
                                            value={a7ModalForm.minDuration ?? '10'}
                                            onChange={(e) => setA7ModalForm({ ...a7ModalForm, minDuration: e.target.value })}
                                            className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-[160px_1fr] items-center">
                                        <label className="text-[13px] text-[#334155]">Max Duration (Seconds):</label>
                                        <input
                                            type="text"
                                            value={a7ModalForm.maxDuration ?? '15'}
                                            onChange={(e) => setA7ModalForm({ ...a7ModalForm, maxDuration: e.target.value })}
                                            className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                                        />
                                    </div>
                                </div>
                            )}

                            {a7ModalForm.type === 'TORSI' && (
                                <div className="space-y-3.5 mb-4">
                                    <div className="grid grid-cols-[160px_1fr] items-center">
                                        <label className="text-[13px] text-[#334155]">Min (Kgf.cm):</label>
                                        <input
                                            type="text"
                                            value={a7ModalForm.minTorsi ?? '9'}
                                            onChange={(e) => setA7ModalForm({ ...a7ModalForm, minTorsi: e.target.value })}
                                            className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-[160px_1fr] items-center">
                                        <label className="text-[13px] text-[#334155]">Max (Kgf.cm):</label>
                                        <input
                                            type="text"
                                            value={a7ModalForm.maxTorsi ?? '15'}
                                            onChange={(e) => setA7ModalForm({ ...a7ModalForm, maxTorsi: e.target.value })}
                                            className="h-[32px] px-3 border border-[#CBD5E1] rounded text-[13px] text-[#1E293B] outline-none focus:border-[#2563EB]"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="mt-4">
                                <label className="block text-[13px] font-bold text-[#1E293B] mb-2">
                                    Description:
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Example: >>>6 pcs / 30 minutes"
                                    value={a7ModalForm.description ?? ''}
                                    onChange={(e) => setA7ModalForm({ ...a7ModalForm, description: e.target.value })}
                                    className="w-full p-2.5 border border-[#CBD5E1] rounded text-[12.5px] text-[#1E293B] outline-none focus:border-[#2563EB] placeholder:text-[#94A3B8]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3.5 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowA7Modal(false)}
                                    className="w-[140px] h-[38px] bg-white border border-[#CBD5E1] rounded text-[12.5px] font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveA7Modal}
                                    className="w-[160px] h-[38px] bg-[#1E3A8A] hover:bg-[#1D4ED8] rounded text-[12.5px] font-bold text-white shadow transition-colors cursor-pointer"
                                >
                                    SAVE DATA
                                </button>
                            </div>
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

            {/* Toast Notification */}
            {toastMsg && (
                <div
                    className={`fixed bottom-5 right-5 z-[999] px-4 py-3 rounded-[6px] shadow-lg border text-[12.5px] font-semibold flex items-center space-x-2 transition-all animate-in slide-in-from-bottom-5 ${toastMsg.type === "success"
                        ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                        : "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
                        }`}
                >
                    {toastMsg.type === "success" ? (
                        <Check className="w-4 h-4 text-[#15803D]" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-[#B91C1C]" />
                    )}
                    <span>{toastMsg.text}</span>
                </div>
            )}
        </div>
    );
}
