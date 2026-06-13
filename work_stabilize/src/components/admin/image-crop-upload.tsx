"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  name?: string;
  required?: boolean;
  maxSizeMb: number;
  label: string;
  helpText?: string;
};

type LoadedImage = {
  element: HTMLImageElement;
  objectUrl: string;
  filename: string;
};

const OUTPUT_WIDTH = 1600;
const OUTPUT_HEIGHT = 800;

export default function ImageCropUpload({
  name = "image",
  required = false,
  maxSizeMb,
  label,
  helpText,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (loaded?.objectUrl) URL.revokeObjectURL(loaded.objectUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [loaded, resultUrl]);

  function clampOffset(nextX: number, nextY: number, currentZoom = zoom) {
    if (!loaded) return { x: nextX, y: nextY };

    const aspect = loaded.element.naturalWidth / loaded.element.naturalHeight;
    const displayedWidthPercent = Math.max(100, (aspect / 2) * 100) * currentZoom;
    const displayedHeightPercent = Math.max(100, (2 / aspect) * 100) * currentZoom;
    const maxX = Math.max(0, (displayedWidthPercent - 100) / 2);
    const maxY = Math.max(0, (displayedHeightPercent - 100) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, nextX)),
      y: Math.max(-maxY, Math.min(maxY, nextY)),
    };
  }

  function resetCrop() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  async function onChooseFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar JPG, PNG, atau WebP.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (loaded?.objectUrl) URL.revokeObjectURL(loaded.objectUrl);
      setLoaded({ element: image, objectUrl, filename: file.name });
      resetCrop();
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError("Gambar tidak dapat dibaca.");
    };
    image.src = objectUrl;
  }

  async function applyCrop() {
    if (!loaded || !inputRef.current) return;
    const naturalWidth = loaded.element.naturalWidth;
    const naturalHeight = loaded.element.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Browser tidak mendukung proses crop gambar.");
      return;
    }

    const baseScale = Math.max(
      OUTPUT_WIDTH / naturalWidth,
      OUTPUT_HEIGHT / naturalHeight,
    );
    const scale = baseScale * zoom;
    const drawWidth = naturalWidth * scale;
    const drawHeight = naturalHeight * scale;
    const scaledOffsetX = (offset.x / 100) * OUTPUT_WIDTH;
    const scaledOffsetY = (offset.y / 100) * OUTPUT_HEIGHT;
    const drawX = (OUTPUT_WIDTH - drawWidth) / 2 + scaledOffsetX;
    const drawY = (OUTPUT_HEIGHT - drawHeight) / 2 + scaledOffsetY;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(loaded.element, drawX, drawY, drawWidth, drawHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.9),
    );
    if (!blob) {
      setError("Gagal membuat hasil crop.");
      return;
    }
    if (blob.size > maxSizeMb * 1024 * 1024) {
      setError(`Hasil crop lebih dari ${maxSizeMb} MB. Coba kurangi detail atau gunakan gambar lain.`);
      return;
    }

    const croppedFile = new File(
      [blob],
      `${loaded.filename.replace(/\.[^.]+$/, "")}-1600x800.webp`,
      { type: "image/webp" },
    );
    const transfer = new DataTransfer();
    transfer.items.add(croppedFile);
    inputRef.current.files = transfer.files;

    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(URL.createObjectURL(blob));
    setLoaded(null);
  }

  const previewStyle = loaded
    ? (() => {
        const aspect = loaded.element.naturalWidth / loaded.element.naturalHeight;
        const widthPercent = Math.max(100, (aspect / 2) * 100) * zoom;
        const heightPercent = Math.max(100, (2 / aspect) * 100) * zoom;
        return {
          width: `${widthPercent}%`,
          height: `${heightPercent}%`,
          left: `${50 + offset.x}%`,
          top: `${50 + offset.y}%`,
          transform: "translate(-50%, -50%)",
        };
      })()
    : undefined;

  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-slate-600">{label}</label>
      <input ref={inputRef} name={name} type="file" required={required} className="sr-only" />
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100">
        <span>{resultUrl ? "Ganti dan crop ulang gambar" : "Pilih gambar lalu crop"}</span>
        <span className="rounded-xl bg-white px-3 py-2 text-xs shadow-sm">Pilih file</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => void onChooseFile(event.target.files?.[0])}
        />
      </label>
      {helpText ? <p className="mt-2 text-xs text-slate-400">{helpText}</p> : null}
      {resultUrl ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt="Hasil crop 1600 × 800" className="aspect-[2/1] w-full object-cover" />
          <p className="px-3 py-2 text-center text-xs font-bold text-emerald-700">Siap diupload — 1600 × 800 WebP</p>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs font-bold text-red-600">{error}</p> : null}

      {loaded ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-[2rem] bg-white p-4 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Crop gambar menjadi 1600 × 800</h3>
                <p className="mt-1 text-xs text-slate-500">Geser gambar untuk menentukan posisi. Gunakan zoom bila perlu.</p>
              </div>
              <button type="button" onClick={() => setLoaded(null)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600">✕</button>
            </div>

            <div
              className="relative mt-4 aspect-[2/1] w-full cursor-grab touch-none overflow-hidden rounded-2xl bg-slate-900 active:cursor-grabbing"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                dragStart.current = {
                  x: event.clientX,
                  y: event.clientY,
                  offsetX: offset.x,
                  offsetY: offset.y,
                };
              }}
              onPointerMove={(event) => {
                const start = dragStart.current;
                if (!start) return;
                const rect = event.currentTarget.getBoundingClientRect();
                setOffset(clampOffset(
                  start.offsetX + ((event.clientX - start.x) / rect.width) * 100,
                  start.offsetY + ((event.clientY - start.y) / rect.height) * 100,
                ));
              }}
              onPointerUp={() => { dragStart.current = null; }}
              onPointerCancel={() => { dragStart.current = null; }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={loaded.objectUrl} alt="Preview crop" draggable={false} className="absolute max-w-none select-none" style={previewStyle} />
              <div className="pointer-events-none absolute inset-0 border-2 border-white/90" />
              <div className="pointer-events-none absolute left-1/3 top-0 h-full border-l border-white/30" />
              <div className="pointer-events-none absolute left-2/3 top-0 h-full border-l border-white/30" />
              <div className="pointer-events-none absolute left-0 top-1/3 w-full border-t border-white/30" />
              <div className="pointer-events-none absolute left-0 top-2/3 w-full border-t border-white/30" />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs font-black text-slate-600">Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => {
                  const nextZoom = Number(event.target.value);
                  setZoom(nextZoom);
                  setOffset((current) => clampOffset(current.x, current.y, nextZoom));
                }}
                className="w-full accent-emerald-600"
              />
              <span className="w-12 text-right text-xs font-bold text-slate-500">{zoom.toFixed(1)}×</span>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setLoaded(null)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600">Batal</button>
              <button type="button" onClick={() => void applyCrop()} className="rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white">Gunakan hasil crop 1600 × 800</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
