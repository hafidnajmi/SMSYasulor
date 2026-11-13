"use client";
import React, { useState, useEffect, useRef } from "react";

export interface ModalImageItem {
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

export interface PoleDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialOuterBox: string;
    initialLayers: string;
    initialFg: string;
    initialSceneState?: any;
    onSave: (result: {
        outerBox: string;
        layers: string;
        fg: string;
        imageDataUrl: string;
        sceneState: any;
    }) => void;
}

export default function PoleDataModal({
    isOpen,
    onClose,
    initialOuterBox,
    initialLayers,
    initialFg,
    initialSceneState,
    onSave,
}: PoleDataModalProps) {
    const [outerBox, setOuterBox] = useState(initialOuterBox || "");
    const [layers, setLayers] = useState(initialLayers || "");
    const [fg, setFg] = useState(initialFg || "");
    const [pcsPerBox, setPcsPerBox] = useState<string>("");

    const [modalImages, setModalImages] = useState<ModalImageItem[]>([]);
    const [modalAnnotations, setModalAnnotations] = useState<any[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);

    const [dragState, setDragState] = useState<{
        mode: string;
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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const CANVAS_W = 640;
    const CANVAS_H = 175;

    useEffect(() => {
        if (isOpen) {
            const ob = initialOuterBox || "";
            const lay = initialLayers || "";
            const f = initialFg || "";
            setOuterBox(ob);
            setLayers(lay);
            setFg(f);

            const numOb = parseFloat(ob) || 0;
            const numLay = parseFloat(lay) || 0;
            const numFg = parseFloat(f) || 0;
            const totalBox = numOb * numLay;
            if (totalBox > 0 && numFg > 0) {
                const calculatedPcs = numFg / totalBox;
                setPcsPerBox(Number.isInteger(calculatedPcs) ? calculatedPcs.toString() : calculatedPcs.toFixed(1));
            } else {
                setPcsPerBox("");
            }

            if (initialSceneState) {
                setModalImages(initialSceneState.images || []);
                setModalAnnotations(initialSceneState.annotations || []);
                const firstId =
                    (initialSceneState.images && initialSceneState.images[0]?.id) ||
                    (initialSceneState.annotations && initialSceneState.annotations[0]?.id) ||
                    null;
                setSelectedItemId(firstId);
            } else {
                setModalImages([]);
                setModalAnnotations([]);
                setSelectedItemId(null);
            }
            setEditingTextId(null);
        }
    }, [isOpen, initialOuterBox, initialLayers, initialFg, initialSceneState]);

    const handleOuterBoxChange = (val: string) => {
        setOuterBox(val);
        const numOb = parseFloat(val) || 0;
        const numLay = parseFloat(layers) || 0;
        const numPcs = parseFloat(pcsPerBox) || 0;
        if (numOb > 0 && numLay > 0 && numPcs > 0) {
            setFg(Math.round(numOb * numLay * numPcs).toString());
        } else if (numOb > 0 && numLay > 0 && parseFloat(fg) > 0) {
            const calculatedPcs = parseFloat(fg) / (numOb * numLay);
            setPcsPerBox(Number.isInteger(calculatedPcs) ? calculatedPcs.toString() : calculatedPcs.toFixed(1));
        }
    };

    const handleLayersChange = (val: string) => {
        setLayers(val);
        const numOb = parseFloat(outerBox) || 0;
        const numLay = parseFloat(val) || 0;
        const numPcs = parseFloat(pcsPerBox) || 0;
        if (numOb > 0 && numLay > 0 && numPcs > 0) {
            setFg(Math.round(numOb * numLay * numPcs).toString());
        } else if (numOb > 0 && numLay > 0 && parseFloat(fg) > 0) {
            const calculatedPcs = parseFloat(fg) / (numOb * numLay);
            setPcsPerBox(Number.isInteger(calculatedPcs) ? calculatedPcs.toString() : calculatedPcs.toFixed(1));
        }
    };

    const handlePcsPerBoxChange = (val: string) => {
        setPcsPerBox(val);
        const numOb = parseFloat(outerBox) || 0;
        const numLay = parseFloat(layers) || 0;
        const numPcs = parseFloat(val) || 0;
        if (numOb > 0 && numLay > 0 && numPcs > 0) {
            setFg(Math.round(numOb * numLay * numPcs).toString());
        }
    };

    const handleFgChange = (val: string) => {
        setFg(val);
        const numOb = parseFloat(outerBox) || 0;
        const numLay = parseFloat(layers) || 0;
        const numFg = parseFloat(val) || 0;
        const totalBox = numOb * numLay;
        if (totalBox > 0 && numFg > 0) {
            const calculatedPcs = numFg / totalBox;
            setPcsPerBox(Number.isInteger(calculatedPcs) ? calculatedPcs.toString() : calculatedPcs.toFixed(1));
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

            if (e.key === "Delete" || e.key === "Backspace") {
                if (selectedItemId) {
                    if (selectedItemId.startsWith("img_")) {
                        setModalImages((prev) => prev.filter((img) => img.id !== selectedItemId));
                        setSelectedItemId(null);
                    } else {
                        setModalAnnotations((prev) => prev.filter((a) => a.id !== selectedItemId));
                        setSelectedItemId(null);
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, selectedItemId]);

    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e: MouseEvent) => {
            const container = document.getElementById("pole-canvas-container");
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const curX = e.clientX - rect.left;
            const curY = e.clientY - rect.top;
            const dx = curX - dragState.startX;
            const dy = curY - dragState.startY;

            if (dragState.mode === "drag-image" && dragState.activeImageId) {
                setModalImages((prev) =>
                    prev.map((img) =>
                        img.id === dragState.activeImageId
                            ? {
                                ...img,
                                left: Math.round(dragState.initLeft + dx),
                                top: Math.round(dragState.initTop + dy),
                            }
                            : img
                    )
                );
            } else if (dragState.mode === "scale-image" && dragState.activeImageId) {
                const aspect = (dragState.initWidth || 100) / (dragState.initHeight || 100);
                let newW = dragState.initWidth;
                let newH = dragState.initHeight;
                let newL = dragState.initLeft;
                let newT = dragState.initTop;

                if (dragState.handle === "br") {
                    newW = Math.max(30, dragState.initWidth + dx);
                    newH = Math.round(newW / aspect);
                } else if (dragState.handle === "bl") {
                    newW = Math.max(30, dragState.initWidth - dx);
                    newH = Math.round(newW / aspect);
                    newL = dragState.initLeft + (dragState.initWidth - newW);
                } else if (dragState.handle === "tr") {
                    newW = Math.max(30, dragState.initWidth + dx);
                    newH = Math.round(newW / aspect);
                    newT = dragState.initTop + (dragState.initHeight - newH);
                } else if (dragState.handle === "tl") {
                    newW = Math.max(30, dragState.initWidth - dx);
                    newH = Math.round(newW / aspect);
                    newL = dragState.initLeft + (dragState.initWidth - newW);
                    newT = dragState.initTop + (dragState.initHeight - newH);
                }

                const scaleRatio = newW / dragState.initWidth;
                setModalImages((prev) =>
                    prev.map((img) =>
                        img.id === dragState.activeImageId
                            ? {
                                ...img,
                                left: Math.round(newL),
                                top: Math.round(newT),
                                width: Math.round(newW),
                                height: Math.round(newH),
                                cropLeft: Math.round(dragState.initCropL * scaleRatio),
                                cropTop: Math.round(dragState.initCropT * scaleRatio),
                                cropRight: Math.round(dragState.initCropR * scaleRatio),
                                cropBottom: Math.round(dragState.initCropB * scaleRatio),
                            }
                            : img
                    )
                );
            } else if (dragState.mode === "crop-image" && dragState.activeImageId) {
                setModalImages((prev) =>
                    prev.map((img) => {
                        if (img.id !== dragState.activeImageId) return img;
                        let cl = dragState.initCropL;
                        let ct = dragState.initCropT;
                        let cr = dragState.initCropR;
                        let cb = dragState.initCropB;

                        if (dragState.handle === "top") {
                            ct = Math.max(0, Math.min(img.height - cb - 15, dragState.initCropT + dy));
                        } else if (dragState.handle === "bottom") {
                            cb = Math.max(0, Math.min(img.height - ct - 15, dragState.initCropB - dy));
                        } else if (dragState.handle === "left") {
                            cl = Math.max(0, Math.min(img.width - cr - 15, dragState.initCropL + dx));
                        } else if (dragState.handle === "right") {
                            cr = Math.max(0, Math.min(img.width - cl - 15, dragState.initCropR - dx));
                        }

                        return {
                            ...img,
                            cropLeft: Math.round(cl),
                            cropTop: Math.round(ct),
                            cropRight: Math.round(cr),
                            cropBottom: Math.round(cb),
                        };
                    })
                );
            } else if (dragState.mode === "drag-annotation" && dragState.initItem) {
                const itemId = dragState.initItem.id;
                setModalAnnotations((prev) =>
                    prev.map((a) => {
                        if (a.id !== itemId) return a;
                        if (a.type === "arrow" || a.type === "dimension") {
                            return {
                                ...a,
                                x1: Math.round((Number(dragState.initItem.x1) || 0) + dx),
                                y1: Math.round((Number(dragState.initItem.y1) || 0) + dy),
                                x2: Math.round((Number(dragState.initItem.x2) || 0) + dx),
                                y2: Math.round((Number(dragState.initItem.y2) || 0) + dy),
                            };
                        }
                        return {
                            ...a,
                            x: Math.round((Number(dragState.initItem.x) || 0) + dx),
                            y: Math.round((Number(dragState.initItem.y) || 0) + dy),
                        };
                    })
                );
            } else if (dragState.mode === "resize-arrow-start" && dragState.initItem) {
                setModalAnnotations((prev) =>
                    prev.map((a) =>
                        a.id === dragState.initItem.id
                            ? {
                                ...a,
                                x1: Math.round((Number(dragState.initItem.x1) || 0) + dx),
                                y1: Math.round((Number(dragState.initItem.y1) || 0) + dy),
                            }
                            : a
                    )
                );
            } else if (dragState.mode === "resize-arrow-end" && dragState.initItem) {
                setModalAnnotations((prev) =>
                    prev.map((a) =>
                        a.id === dragState.initItem.id
                            ? {
                                ...a,
                                x2: Math.round((Number(dragState.initItem.x2) || 0) + dx),
                                y2: Math.round((Number(dragState.initItem.y2) || 0) + dy),
                            }
                            : a
                    )
                );
            } else if (
                (dragState.mode === "resize-note" || dragState.mode === "resize-text") &&
                dragState.initItem
            ) {
                const itemId = dragState.initItem.id;
                const initX = Number(dragState.initItem.x) || 0;
                const initY = Number(dragState.initItem.y) || 0;
                const initW = Number(dragState.initItem.width) || 140;
                const initH = Number(dragState.initItem.height) || 60;

                let newX = initX;
                let newY = initY;
                let newW = initW;
                let newH = initH;

                if (dragState.handle === "br") {
                    newW = Math.max(30, initW + dx);
                    newH = Math.max(20, initH + dy);
                } else if (dragState.handle === "bl") {
                    newW = Math.max(30, initW - dx);
                    newH = Math.max(20, initH + dy);
                    newX = initX + (initW - newW);
                } else if (dragState.handle === "tr") {
                    newW = Math.max(30, initW + dx);
                    newH = Math.max(20, initH - dy);
                    newY = initY + (initH - newH);
                } else if (dragState.handle === "tl") {
                    newW = Math.max(30, initW - dx);
                    newH = Math.max(20, initH - dy);
                    newX = initX + (initW - newW);
                    newY = initY + (initH - newH);
                } else if (dragState.handle === "r") {
                    newW = Math.max(30, initW + dx);
                } else if (dragState.handle === "b") {
                    newH = Math.max(20, initH + dy);
                } else if (dragState.handle === "l") {
                    newW = Math.max(30, initW - dx);
                    newX = initX + (initW - newW);
                } else if (dragState.handle === "t") {
                    newH = Math.max(20, initH - dy);
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
                                height: Math.round(newH),
                            }
                            : a
                    )
                );
            } else if (dragState.mode === "resize-circle" && dragState.initItem) {
                const itemId = dragState.initItem.id;
                const initRx =
                    Number(dragState.initItem.radiusX) ||
                    Number(dragState.initItem.radius) ||
                    25;
                const initRy =
                    Number(dragState.initItem.radiusY) ||
                    Number(dragState.initItem.radius) ||
                    25;

                let newRx = initRx;
                let newRy = initRy;

                if (dragState.handle === "br") {
                    newRx = Math.max(8, initRx + dx);
                    newRy = Math.max(8, initRy + dy);
                } else if (dragState.handle === "bl") {
                    newRx = Math.max(8, initRx - dx);
                    newRy = Math.max(8, initRy + dy);
                } else if (dragState.handle === "tr") {
                    newRx = Math.max(8, initRx + dx);
                    newRy = Math.max(8, initRy - dy);
                } else if (dragState.handle === "tl") {
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
                                radius: Math.round(newRx),
                            }
                            : a
                    )
                );
            }
        };

        const handleMouseUp = () => setDragState(null);

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [dragState]);

    // Image Upload
    const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (loadEvt) => {
            const rawDataUrl = loadEvt.target?.result as string;
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
                    const compCanvas = document.createElement("canvas");
                    compCanvas.width = compW;
                    compCanvas.height = compH;
                    const compCtx = compCanvas.getContext("2d");
                    if (compCtx) {
                        compCtx.fillStyle = "#FFFFFF";
                        compCtx.fillRect(0, 0, compW, compH);
                        compCtx.drawImage(img, 0, 0, compW, compH);
                        srcToStore = compCanvas.toDataURL("image/jpeg", 0.85);
                    }
                } catch {
                    srcToStore = rawDataUrl;
                }

                let w = img.width;
                let h = img.height;
                const maxW = 320;
                const maxH = 150;
                if (w > maxW || h > maxH) {
                    const ratio = Math.min(maxW / w, maxH / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                const offset = (modalImages.length % 6) * 20;
                const l = Math.max(10, Math.min(CANVAS_W - w - 10, Math.round((CANVAS_W - w) / 2) + offset));
                const t = Math.max(10, Math.min(CANVAS_H - h - 10, Math.round((CANVAS_H - h) / 2) + offset));

                const newId = "img_" + Date.now();
                const newImg: ModalImageItem = {
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
                    cropBottom: 0,
                };
                setModalImages((prev) => [...prev, newImg]);
                setSelectedItemId(newId);
            };
            img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    // Rotate
    const handleRotate = () => {
        setModalImages((prev) =>
            prev.map((img) => {
                if (!selectedItemId || img.id === selectedItemId) {
                    return { ...img, rotation: ((img.rotation || 0) + 90) % 360 };
                }
                return img;
            })
        );
    };

    // Add Tools
    const handleAddArrow = () => {
        const newItem = {
            id: "arrow_" + Date.now(),
            type: "arrow",
            x1: 80,
            y1: 40,
            x2: 200,
            y2: 40,
            color: "#DC2626",
        };
        setModalAnnotations((prev) => [...prev, newItem]);
        setSelectedItemId(newItem.id);
    };

    const handleAddDimension = () => {
        const newItem = {
            id: "dim_" + Date.now(),
            type: "dimension",
            x1: 60,
            y1: 40,
            x2: 220,
            y2: 40,
            color: "#DC2626",
        };
        setModalAnnotations((prev) => [...prev, newItem]);
        setSelectedItemId(newItem.id);
    };

    const handleAddText = () => {
        const newItem = {
            id: "text_" + Date.now(),
            type: "text",
            x: 100,
            y: 30,
            width: 140,
            height: 35,
            text: "DOUBLE-CLICK TO EDIT",
            fontSize: 11,
            isBold: true,
            color: "#000000",
        };
        setModalAnnotations((prev) => [...prev, newItem]);
        setSelectedItemId(newItem.id);
    };

    const handleAddNote = () => {
        const newItem = {
            id: "note_" + Date.now(),
            type: "note",
            x: 90,
            y: 20,
            width: 140,
            height: 60,
            fontSize: 11,
            text: "NOTE",
            bg: "#FFFFFF",
            border: "#EF4444",
            color: "#000000",
        };
        setModalAnnotations((prev) => [...prev, newItem]);
        setSelectedItemId(newItem.id);
    };

    const handleAddCircle = () => {
        const newItem = {
            id: "circle_" + Date.now(),
            type: "circle",
            x: 150,
            y: 40,
            radiusX: 30,
            radiusY: 30,
            radius: 30,
            color: "#DC2626",
        };
        setModalAnnotations((prev) => [...prev, newItem]);
        setSelectedItemId(newItem.id);
    };

    const handleDelete = () => {
        if (!selectedItemId) return;
        if (selectedItemId.startsWith("img_")) {
            setModalImages((prev) => prev.filter((im) => im.id !== selectedItemId));
        } else {
            setModalAnnotations((prev) => prev.filter((a) => a.id !== selectedItemId));
        }
        setSelectedItemId(null);
    };

    // Render & Save Composite Result
    const handleSaveResult = async () => {
        const MULTIPLIER = 2;
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_W * MULTIPLIER;
        canvas.height = CANVAS_H * MULTIPLIER;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            onSave({
                outerBox,
                layers,
                fg,
                imageDataUrl: "",
                sceneState: {
                    images: modalImages,
                    annotations: modalAnnotations,
                    outerBox,
                    layers,
                    fg,
                },
            });
            onClose();
            return;
        }

        ctx.scale(MULTIPLIER, MULTIPLIER);
        ctx.fillStyle = "#EAEFE3";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Draw images
        for (const imgItem of modalImages) {
            if (!imgItem.src) continue;
            await new Promise<void>((resolveImg) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
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
                    resolveImg();
                };
                img.onerror = () => resolveImg();
                img.src = imgItem.src;
            });
        }

        // Draw Paletload Text Badge Overlay on Canvas (top-left)
        ctx.fillStyle = "#0F172A";
        ctx.font = "bold 10px Segoe UI, sans-serif";
        ctx.fillText(`Jumlah Outer Box per layer  ~ ${outerBox || "..."} Box`, 12, 20);
        ctx.fillText(`Jumlah Layer                ~ ${layers || "..."} Layer`, 12, 36);
        ctx.fillText(`Jumlah FG per palet         ~ ${fg || "..."} pcs`, 12, 52);

        // Draw Annotations
        modalAnnotations.forEach((item) => {
            if (item.type === "arrow") {
                ctx.strokeStyle = item.color || "#DC2626";
                ctx.fillStyle = item.color || "#DC2626";
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(item.x1, item.y1);
                ctx.lineTo(item.x2, item.y2);
                ctx.stroke();

                const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                const headlen = 10;
                ctx.beginPath();
                ctx.moveTo(item.x2, item.y2);
                ctx.lineTo(
                    item.x2 - headlen * Math.cos(angle - Math.PI / 6),
                    item.y2 - headlen * Math.sin(angle - Math.PI / 6)
                );
                ctx.lineTo(
                    item.x2 - headlen * Math.cos(angle + Math.PI / 6),
                    item.y2 - headlen * Math.sin(angle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fill();
            } else if (item.type === "dimension") {
                const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                ctx.strokeStyle = item.color || "#DC2626";
                ctx.fillStyle = item.color || "#DC2626";
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.moveTo(item.x1, item.y1);
                ctx.lineTo(item.x2, item.y2);
                ctx.stroke();

                const tlen = 6;
                ctx.beginPath();
                ctx.moveTo(
                    item.x1 + tlen * Math.cos(angle + Math.PI / 2),
                    item.y1 + tlen * Math.sin(angle + Math.PI / 2)
                );
                ctx.lineTo(
                    item.x1 + tlen * Math.cos(angle - Math.PI / 2),
                    item.y1 + tlen * Math.sin(angle - Math.PI / 2)
                );
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(
                    item.x2 + tlen * Math.cos(angle + Math.PI / 2),
                    item.y2 + tlen * Math.sin(angle + Math.PI / 2)
                );
                ctx.lineTo(
                    item.x2 + tlen * Math.cos(angle - Math.PI / 2),
                    item.y2 + tlen * Math.sin(angle - Math.PI / 2)
                );
                ctx.stroke();
            } else if (item.type === "text") {
                ctx.fillStyle = item.color || "#000000";
                const fSize = item.fontSize || 11;
                ctx.font = `bold ${fSize}px Segoe UI, sans-serif`;
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                ctx.fillText(item.text || "", item.x + 4, item.y + 6);
            } else if (item.type === "note") {
                const w = item.width || 140;
                const h = item.height || 60;
                const fSize = item.fontSize || 11;
                const lineHeight = fSize * 1.3;
                ctx.save();
                ctx.fillStyle = item.bg || "#FFFFFF";
                ctx.strokeStyle = item.border || "#EF4444";
                ctx.lineWidth = 1.5;
                ctx.fillRect(item.x, item.y, w, h);
                ctx.strokeRect(item.x, item.y, w, h);

                ctx.beginPath();
                ctx.rect(item.x, item.y, w, h);
                ctx.clip();

                ctx.fillStyle = item.color || "#000000";
                ctx.font = `bold ${fSize}px Segoe UI, sans-serif`;
                ctx.textAlign = "left";
                ctx.textBaseline = "top";

                const padX = 6;
                const padY = 6;
                const maxW = Math.max(10, w - 12);
                const textToDraw = item.text || "NOTE";

                // Word wrap with character-level fallback (mirrors CSS break-words in modal textarea)
                const linesToDraw: string[] = [];
                const paragraphs = textToDraw.split("\n");
                for (const para of paragraphs) {
                    if (para === "") {
                        linesToDraw.push("");
                        continue;
                    }
                    const words = para.split(" ");
                    let currentLine = "";

                    for (let wIdx = 0; wIdx < words.length; wIdx++) {
                        const word = words[wIdx];
                        const testLine = currentLine ? `${currentLine} ${word}` : word;

                        if (ctx.measureText(testLine).width <= maxW) {
                            currentLine = testLine;
                        } else {
                            if (currentLine) {
                                linesToDraw.push(currentLine);
                                currentLine = "";
                            }

                            if (ctx.measureText(word).width <= maxW) {
                                currentLine = word;
                            } else {
                                // Word itself is wider than maxW (or unbroken string): break character by character
                                let charBuf = "";
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
            } else if (item.type === "circle") {
                ctx.strokeStyle = item.color || "#DC2626";
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                const rx = item.radiusX || item.radius || 25;
                const ry = item.radiusY || item.radius || 25;
                ctx.ellipse(item.x, item.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        const finalDataUrl = canvas.toDataURL("image/jpeg", 0.85);

        onSave({
            outerBox,
            layers,
            fg,
            imageDataUrl: finalDataUrl,
            sceneState: {
                images: modalImages,
                annotations: modalAnnotations,
                outerBox,
                layers,
                fg,
            },
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm font-sans animate-in fade-in duration-150">
            <div className="bg-white rounded-none shadow-2xl border border-gray-300 w-[960px] max-w-[95vw] overflow-hidden flex flex-col">
                {/* Title Bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#F1F5F9] border-b border-[#CBD5E1]">
                    <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-[#0078D4]" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2l-2.218-.887zm3.564 1.426L5.596 5 8 5.961 14.154 3.5l-2.404-.961zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l6.229 2.492A1.5 1.5 0 0 1 16 4.072v8.856a1.5 1.5 0 0 1-.943 1.39l-6.229 2.492a1.5 1.5 0 0 1-1.114 0L.943 14.318A1.5 1.5 0 0 1 0 12.928V4.072a1.5 1.5 0 0 1 .943-1.39L7.443.184z"/>
                        </svg>
                        <span className="text-[12px] font-semibold text-[#1F2937]">
                            POLE DATA INPUT (A.6. Paletisasi)
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[#4B5563] hover:bg-[#E81123] hover:text-white w-8 h-8 rounded-none flex items-center justify-center text-[14px] transition-colors cursor-pointer"
                        title="Tutup"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 flex flex-col">
                    {/* Action Toolbar */}
                    <div className="flex items-center justify-between mb-3 bg-[#F8FAFC] p-1.5 rounded-none border border-[#E2E8F0]">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleUploadImage}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                    <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                                </svg>
                                <span>Upload</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleRotate}
                                className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                                </svg>
                                <span>Rotate</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleAddArrow}
                                className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                                </svg>
                                <span>Arrow</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleAddDimension}
                                className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M1.146 8.354a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L2.707 7.5h10.586l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L13.293 8.5H2.707l1.147 1.146a.5.5 0 0 1-.708.708l-2-2z"/>
                                </svg>
                                <span>Dimension</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleAddText}
                                className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="m2.244 13.081.943-2.815h4.626l.94 2.815h1.295L6.37 2.92H5.064L1 13.081h1.244zm3.212-9.67 1.94 5.86H3.504l1.94-5.86h.012z"/>
                                </svg>
                                <span>Text</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleAddNote}
                                className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5v-11zm7 11.293V9.5a.5.5 0 0 1 .5-.5h4.293L9 13.793z"/>
                                </svg>
                                <span>Note</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleAddCircle}
                                className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer"
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                </svg>
                                <span>Circle</span>
                            </button>
                        </div>

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
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={!selectedItemId}
                            className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-40 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-none flex items-center space-x-1.5 shadow-none transition-colors cursor-pointer ml-auto"
                        >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                            </svg>
                            <span>Delete</span>
                        </button>
                    </div>

                    {/* Canvas + Right Form Fields */}
                    <div className="flex items-start justify-center">
                        {/* Canvas */}
                        <div
                            id="pole-canvas-container"
                            className="relative bg-[#EAEFE3] border border-[#CBD5E1] rounded-none overflow-hidden select-none shadow-none"
                            style={{ width: `${CANVAS_W}px`, height: `${CANVAS_H}px` }}
                            onClick={(e) => {
                                if (e.target === e.currentTarget) setSelectedItemId(null);
                            }}
                        >
                            {/* Live Badge Overlay on top left */}
                            <div className="absolute top-2 left-3 text-[10px] font-bold text-[#0F172A] space-y-0.5 pointer-events-none z-10 bg-white/90 px-2 py-1 rounded-none border border-[#CBD5E1] shadow-none">
                                <div>
                                    Jumlah Outer Box per layer &nbsp;~ &nbsp;{outerBox || "..."} Box
                                </div>
                                <div>
                                    Jumlah Layer &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~ &nbsp;{layers || "..."} Layer
                                </div>
                                <div>
                                    Jumlah FG per palet &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~ &nbsp;{fg || "..."} pcs
                                </div>
                            </div>

                            {/* Images */}
                            {modalImages.map((imgItem) => {
                                const isSelected = selectedItemId === imgItem.id;
                                const cropW = Math.max(1, imgItem.width - imgItem.cropLeft - imgItem.cropRight);
                                const cropH = Math.max(1, imgItem.height - imgItem.cropTop - imgItem.cropBottom);

                                return (
                                    <div
                                        key={imgItem.id}
                                        className={`absolute ${isSelected ? "z-15" : "z-10"}`}
                                        style={{
                                            left: `${imgItem.left}px`,
                                            top: `${imgItem.top}px`,
                                            width: `${imgItem.width}px`,
                                            height: `${imgItem.height}px`,
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedItemId(imgItem.id);
                                        }}
                                    >
                                        <div
                                            className="absolute overflow-hidden cursor-move"
                                            style={{
                                                left: `${imgItem.cropLeft}px`,
                                                top: `${imgItem.cropTop}px`,
                                                width: `${cropW}px`,
                                                height: `${cropH}px`,
                                            }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setSelectedItemId(imgItem.id);
                                                const rect = document
                                                    .getElementById("pole-canvas-container")
                                                    ?.getBoundingClientRect();
                                                if (!rect) return;
                                                setDragState({
                                                    mode: "drag-image",
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
                                                    initCropB: imgItem.cropBottom,
                                                });
                                            }}
                                        >
                                            <img
                                                src={imgItem.src}
                                                alt="Pole Image"
                                                draggable={false}
                                                style={{
                                                    position: "absolute",
                                                    left: `-${imgItem.cropLeft}px`,
                                                    top: `-${imgItem.cropTop}px`,
                                                    width: `${imgItem.width}px`,
                                                    height: `${imgItem.height}px`,
                                                    maxWidth: "none",
                                                    maxHeight: "none",
                                                    transform: `rotate(${imgItem.rotation || 0}deg)`,
                                                    transformOrigin: `${imgItem.width / 2}px ${imgItem.height / 2}px`,
                                                    pointerEvents: "none",
                                                }}
                                            />
                                        </div>

                                        {isSelected && (
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div
                                                    className="absolute border-2 border-[#2563EB] pointer-events-none"
                                                    style={{
                                                        left: `${imgItem.cropLeft}px`,
                                                        top: `${imgItem.cropTop}px`,
                                                        width: `${cropW}px`,
                                                        height: `${cropH}px`,
                                                    }}
                                                />
                                                {/* Corner Resize Handle */}
                                                <div
                                                    className="absolute w-[14px] h-[14px] bg-white border-2 border-[#2563EB] rounded-full cursor-nwse-resize z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                                    style={{
                                                        left: `${imgItem.width - imgItem.cropRight}px`,
                                                        top: `${imgItem.height - imgItem.cropBottom}px`,
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItemId(imgItem.id);
                                                        const rect = document
                                                            .getElementById("pole-canvas-container")
                                                            ?.getBoundingClientRect();
                                                        if (!rect) return;
                                                        setDragState({
                                                            mode: "scale-image",
                                                            activeImageId: imgItem.id,
                                                            handle: "br",
                                                            startX: e.clientX - rect.left,
                                                            startY: e.clientY - rect.top,
                                                            initLeft: imgItem.left,
                                                            initTop: imgItem.top,
                                                            initWidth: imgItem.width,
                                                            initHeight: imgItem.height,
                                                            initCropL: imgItem.cropLeft,
                                                            initCropT: imgItem.cropTop,
                                                            initCropR: imgItem.cropRight,
                                                            initCropB: imgItem.cropBottom,
                                                        });
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Annotations */}
                            <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none">
                                {modalAnnotations.map((item) => {
                                    const isSelected = selectedItemId === item.id;
                                    if (item.type === "arrow") {
                                        const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                                        const headlen = 12;
                                        const p1x = item.x2 - headlen * Math.cos(angle - Math.PI / 6.5);
                                        const p1y = item.y2 - headlen * Math.sin(angle - Math.PI / 6.5);
                                        const p2x = item.x2 - headlen * Math.cos(angle + Math.PI / 6.5);
                                        const p2y = item.y2 - headlen * Math.sin(angle + Math.PI / 6.5);

                                        return (
                                            <g key={item.id}>
                                                <line
                                                    x1={item.x1}
                                                    y1={item.y1}
                                                    x2={item.x2}
                                                    y2={item.y2}
                                                    stroke="transparent"
                                                    strokeWidth={16}
                                                    style={{ pointerEvents: "auto", cursor: "move" }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItemId(item.id);
                                                        const rect = document
                                                            .getElementById("pole-canvas-container")
                                                            ?.getBoundingClientRect();
                                                        if (!rect) return;
                                                        setDragState({
                                                            mode: "drag-annotation",
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
                                                            initItem: { ...item },
                                                        });
                                                    }}
                                                />
                                                <line
                                                    x1={item.x1}
                                                    y1={item.y1}
                                                    x2={item.x2}
                                                    y2={item.y2}
                                                    stroke={item.color || "#DC2626"}
                                                    strokeWidth={isSelected ? 3 : 2.2}
                                                    strokeLinecap="round"
                                                    style={{ pointerEvents: "auto", cursor: "move" }}
                                                />
                                                <polygon
                                                    points={`${item.x2},${item.y2} ${p1x},${p1y} ${p2x},${p2y}`}
                                                    fill={item.color || "#DC2626"}
                                                    style={{ pointerEvents: "auto", cursor: "move" }}
                                                />
                                                {isSelected && (
                                                    <>
                                                        <circle
                                                            cx={item.x1}
                                                            cy={item.y1}
                                                            r={5.5}
                                                            fill="#FFFFFF"
                                                            stroke="#2563EB"
                                                            strokeWidth={2}
                                                            style={{ pointerEvents: "auto", cursor: "crosshair" }}
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation();
                                                                const rect = document
                                                                    .getElementById("pole-canvas-container")
                                                                    ?.getBoundingClientRect();
                                                                if (!rect) return;
                                                                setDragState({
                                                                    mode: "resize-arrow-start",
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
                                                                    initItem: { ...item },
                                                                });
                                                            }}
                                                        />
                                                        <circle
                                                            cx={item.x2}
                                                            cy={item.y2}
                                                            r={5.5}
                                                            fill="#FFFFFF"
                                                            stroke="#2563EB"
                                                            strokeWidth={2}
                                                            style={{ pointerEvents: "auto", cursor: "crosshair" }}
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation();
                                                                const rect = document
                                                                    .getElementById("pole-canvas-container")
                                                                    ?.getBoundingClientRect();
                                                                if (!rect) return;
                                                                setDragState({
                                                                    mode: "resize-arrow-end",
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
                                                                    initItem: { ...item },
                                                                });
                                                            }}
                                                        />
                                                    </>
                                                )}
                                            </g>
                                        );
                                    } else if (item.type === "dimension") {
                                        const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
                                        const tlen = 6;
                                        return (
                                            <g key={item.id}>
                                                <line
                                                    x1={item.x1}
                                                    y1={item.y1}
                                                    x2={item.x2}
                                                    y2={item.y2}
                                                    stroke="transparent"
                                                    strokeWidth={16}
                                                    style={{ pointerEvents: "auto", cursor: "move" }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItemId(item.id);
                                                        const rect = document
                                                            .getElementById("pole-canvas-container")
                                                            ?.getBoundingClientRect();
                                                        if (!rect) return;
                                                        setDragState({
                                                            mode: "drag-annotation",
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
                                                            initItem: { ...item },
                                                        });
                                                    }}
                                                />
                                                <line
                                                    x1={item.x1}
                                                    y1={item.y1}
                                                    x2={item.x2}
                                                    y2={item.y2}
                                                    stroke={item.color || "#DC2626"}
                                                    strokeWidth={2}
                                                    style={{ pointerEvents: "auto", cursor: "move" }}
                                                />
                                                {/* Start T */}
                                                <line
                                                    x1={item.x1 + tlen * Math.cos(angle + Math.PI / 2)}
                                                    y1={item.y1 + tlen * Math.sin(angle + Math.PI / 2)}
                                                    x2={item.x1 + tlen * Math.cos(angle - Math.PI / 2)}
                                                    y2={item.y1 + tlen * Math.sin(angle - Math.PI / 2)}
                                                    stroke={item.color || "#DC2626"}
                                                    strokeWidth={2}
                                                />
                                                {/* End T */}
                                                <line
                                                    x1={item.x2 + tlen * Math.cos(angle + Math.PI / 2)}
                                                    y1={item.y2 + tlen * Math.sin(angle + Math.PI / 2)}
                                                    x2={item.x2 + tlen * Math.cos(angle - Math.PI / 2)}
                                                    y2={item.y2 + tlen * Math.sin(angle - Math.PI / 2)}
                                                    stroke={item.color || "#DC2626"}
                                                    strokeWidth={2}
                                                />
                                                {isSelected && (
                                                    <>
                                                        <circle
                                                            cx={item.x1}
                                                            cy={item.y1}
                                                            r={5.5}
                                                            fill="#FFFFFF"
                                                            stroke="#2563EB"
                                                            strokeWidth={2}
                                                            style={{ pointerEvents: "auto", cursor: "crosshair" }}
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation();
                                                                const rect = document
                                                                    .getElementById("pole-canvas-container")
                                                                    ?.getBoundingClientRect();
                                                                if (!rect) return;
                                                                setDragState({
                                                                    mode: "resize-arrow-start",
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
                                                                    initItem: { ...item },
                                                                });
                                                            }}
                                                        />
                                                        <circle
                                                            cx={item.x2}
                                                            cy={item.y2}
                                                            r={5.5}
                                                            fill="#FFFFFF"
                                                            stroke="#2563EB"
                                                            strokeWidth={2}
                                                            style={{ pointerEvents: "auto", cursor: "crosshair" }}
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation();
                                                                const rect = document
                                                                    .getElementById("pole-canvas-container")
                                                                    ?.getBoundingClientRect();
                                                                if (!rect) return;
                                                                setDragState({
                                                                    mode: "resize-arrow-end",
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
                                                                    initItem: { ...item },
                                                                });
                                                            }}
                                                        />
                                                    </>
                                                )}
                                            </g>
                                        );
                                    } else if (item.type === "circle") {
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
                                                    stroke={item.color || "#DC2626"}
                                                    strokeWidth={isSelected ? 3.5 : 2.5}
                                                    style={{ pointerEvents: "auto", cursor: "move" }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItemId(item.id);
                                                        const rect = document
                                                            .getElementById("pole-canvas-container")
                                                            ?.getBoundingClientRect();
                                                        if (!rect) return;
                                                        setDragState({
                                                            mode: "drag-annotation",
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
                                                            initItem: { ...item },
                                                        });
                                                    }}
                                                />
                                                {isSelected && (
                                                    <circle
                                                        cx={item.x + rx}
                                                        cy={item.y + ry}
                                                        r={5}
                                                        fill="#2563EB"
                                                        stroke="#FFFFFF"
                                                        strokeWidth={1.5}
                                                        style={{ cursor: "nwse-resize", pointerEvents: "auto" }}
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                            const rect = document
                                                                .getElementById("pole-canvas-container")
                                                                ?.getBoundingClientRect();
                                                            if (!rect) return;
                                                            setDragState({
                                                                mode: "resize-circle",
                                                                handle: "br",
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
                                                                initItem: { ...item },
                                                            });
                                                        }}
                                                    />
                                                )}
                                            </g>
                                        );
                                    }
                                    return null;
                                })}
                            </svg>

                            {/* Text & Note Annotations (HTML Elements) */}
                            {modalAnnotations.map((item) => {
                                const isSelected = selectedItemId === item.id;
                                if (item.type === "text") {
                                    return (
                                        <div
                                            key={item.id}
                                            className={`absolute select-none pointer-events-auto p-1 ${isSelected ? "border border-dashed border-[#2563EB] z-25" : "z-20"
                                                }`}
                                            style={{
                                                left: `${item.x}px`,
                                                top: `${item.y}px`,
                                                color: item.color || "#000000",
                                                fontSize: `${item.fontSize || 11}px`,
                                                fontWeight: item.isBold !== false ? "bold" : "normal",
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedItemId(item.id);
                                            }}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setEditingTextId(item.id);
                                            }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setSelectedItemId(item.id);
                                                if (editingTextId === item.id) return;
                                                const rect = document
                                                    .getElementById("pole-canvas-container")
                                                    ?.getBoundingClientRect();
                                                if (!rect) return;
                                                setDragState({
                                                    mode: "drag-annotation",
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
                                                    initItem: { ...item },
                                                });
                                            }}
                                        >
                                            {editingTextId === item.id ? (
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={item.text || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setModalAnnotations((prev) =>
                                                            prev.map((a) => (a.id === item.id ? { ...a, text: val } : a))
                                                        );
                                                    }}
                                                    onBlur={() => setEditingTextId(null)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === "Escape") {
                                                            setEditingTextId(null);
                                                        }
                                                    }}
                                                    className="bg-white border border-[#2563EB] px-1 rounded text-black outline-none"
                                                />
                                            ) : (
                                                <span>{item.text || "DOUBLE-CLICK TO EDIT"}</span>
                                            )}
                                        </div>
                                    );
                                } else if (item.type === "note") {
                                    const noteFontSize = item.fontSize || 11;
                                    const noteLineHeight = noteFontSize * 1.3;
                                    const startResize = (e: React.MouseEvent, handle: string) => {
                                        e.stopPropagation();
                                        setSelectedItemId(item.id);
                                        const rect = document
                                            .getElementById("pole-canvas-container")
                                            ?.getBoundingClientRect();
                                        if (!rect) return;
                                        setDragState({
                                            mode: "resize-note",
                                            handle,
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
                                            initItem: { ...item },
                                        });
                                    };

                                    return (
                                        <div
                                            key={item.id}
                                            className={`absolute select-none pointer-events-auto p-1.5 ${isSelected ? "z-25" : "z-20"
                                                }`}
                                            style={{
                                                left: `${item.x}px`,
                                                top: `${item.y}px`,
                                                width: `${item.width || 140}px`,
                                                height: `${item.height || 60}px`,
                                                backgroundColor: item.bg || "#FFFFFF",
                                                border: `1.5px solid ${item.border || "#EF4444"}`,
                                                fontFamily: "'Montserrat', sans-serif, sans-serif",
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedItemId(item.id);
                                            }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setSelectedItemId(item.id);
                                                const rect = document
                                                    .getElementById("pole-canvas-container")
                                                    ?.getBoundingClientRect();
                                                if (!rect) return;
                                                setDragState({
                                                    mode: "drag-annotation",
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
                                                    initItem: { ...item },
                                                });
                                            }}
                                            title="Tarik untuk geser, gunakan bulatan biru di sudut/sisi untuk ubah ukuran"
                                        >
                                            <textarea
                                                value={item.text || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setModalAnnotations((prev) =>
                                                        prev.map((a) => (a.id === item.id ? { ...a, text: val } : a))
                                                    );
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedItemId(item.id);
                                                }}
                                                onFocus={() => {
                                                    setSelectedItemId(item.id);
                                                }}
                                                className="w-full h-full bg-transparent resize-none border-none outline-none font-bold text-black p-0 cursor-text select-text overflow-hidden break-words"
                                                style={{
                                                    fontFamily: "'Montserrat', sans-serif, sans-serif",
                                                    fontSize: `${noteFontSize}px`,
                                                    lineHeight: `${noteLineHeight}px`,
                                                }}
                                                placeholder="NOTE"
                                            />

                                            {/* 8 Resize Handles (4 Corners + 4 Edges) when Selected */}
                                            {isSelected && (
                                                <>
                                                    {/* Top-Left */}
                                                    <div
                                                        className="absolute -top-[5px] -left-[5px] w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-nwse-resize z-30 pointer-events-auto shadow-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => startResize(e, "tl")}
                                                        title="Ubah ukuran"
                                                    />
                                                    {/* Top-Right */}
                                                    <div
                                                        className="absolute -top-[5px] -right-[5px] w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-nesw-resize z-30 pointer-events-auto shadow-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => startResize(e, "tr")}
                                                        title="Ubah ukuran"
                                                    />
                                                    {/* Bottom-Left */}
                                                    <div
                                                        className="absolute -bottom-[5px] -left-[5px] w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-nesw-resize z-30 pointer-events-auto shadow-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => startResize(e, "bl")}
                                                        title="Ubah ukuran"
                                                    />
                                                    {/* Bottom-Right */}
                                                    <div
                                                        className="absolute -bottom-[5px] -right-[5px] w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-nwse-resize z-30 pointer-events-auto shadow-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => startResize(e, "br")}
                                                        title="Ubah ukuran"
                                                    />
                                                    {/* Top Edge */}
                                                    <div
                                                        className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-ns-resize z-30 pointer-events-auto shadow-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => startResize(e, "t")}
                                                        title="Ubah tinggi"
                                                    />
                                                    {/* Bottom Edge */}
                                                    <div
                                                        className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-ns-resize z-30 pointer-events-auto shadow-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => startResize(e, "b")}
                                                        title="Ubah tinggi"
                                                    />
                                                    {/* Left Edge */}
                                                    <div
                                                        className="absolute top-1/2 -left-[5px] -translate-y-1/2 w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-ew-resize z-30 pointer-events-auto shadow-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => startResize(e, "l")}
                                                        title="Ubah lebar"
                                                    />
                                                    {/* Right Edge */}
                                                    <div
                                                        className="absolute top-1/2 -right-[5px] -translate-y-1/2 w-[10px] h-[10px] bg-[#2563EB] border-[1.5px] border-white rounded-full cursor-ew-resize z-30 pointer-events-auto shadow-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => startResize(e, "r")}
                                                        title="Ubah lebar"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>

                        {/* Right side inputs for Paletload - Simple & Elegant */}
                        <div className="w-[240px] ml-5 flex flex-col bg-white border border-[#E2E8F0] rounded-none p-3.5 shadow-none self-start">
                            <div className="text-[12px] font-bold text-[#1E293B] pb-2 mb-2.5 border-b border-[#F1F5F9] flex items-center justify-between">
                                <span>Data Paletisasi</span>
                                {(() => {
                                    const numOb = parseFloat(outerBox) || 0;
                                    const numLay = parseFloat(layers) || 0;
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
                                        value={outerBox}
                                        onChange={(e) => handleOuterBoxChange(e.target.value)}
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
                                        value={layers}
                                        onChange={(e) => handleLayersChange(e.target.value)}
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
                                        value={pcsPerBox}
                                        onChange={(e) => handlePcsPerBoxChange(e.target.value)}
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
                                            onClick={() => handlePcsPerBoxChange(val)}
                                            className={`flex-1 py-1 rounded-none text-[10px] font-semibold transition-colors cursor-pointer ${pcsPerBox === val ? 'bg-[#1E3A8A] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'}`}
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
                                        const numOb = parseFloat(outerBox) || 0;
                                        const numLay = parseFloat(layers) || 0;
                                        const numPcs = parseFloat(pcsPerBox) || 0;
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
                                        value={fg}
                                        onChange={(e) => handleFgChange(e.target.value)}
                                        className="w-full h-[34px] pl-3 pr-10 border border-[#93C5FD] rounded-none text-[13px] font-extrabold text-[#1E3A8A] bg-[#F8FAFC] focus:bg-white focus:border-[#2563EB] outline-none"
                                    />
                                    <span className="absolute right-3 top-2 text-[11px] font-semibold text-[#64748B]">pcs</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pro Tip */}
                    <div className="text-[10.5px] italic text-[#64748B] mt-2 mb-4">
                        Pro tip: Select an item and press Delete/Backspace or click DELETE to remove. Double-click text to edit.
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-white border border-[#CBD5E1] text-[#475569] font-semibold text-[12px] w-[95px] h-[36px] rounded-none hover:bg-[#F1F5F9] transition-colors cursor-pointer shadow-none"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveResult}
                            className="bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-bold text-[12px] w-[130px] h-[36px] rounded-none shadow-none transition-colors cursor-pointer"
                        >
                            Simpan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
