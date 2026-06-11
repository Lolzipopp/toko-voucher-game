"use client";

import { useMemo, useRef, useState } from "react";

export type ProductCarouselImage = {
  url: string;
  alt: string;
};

type Props = {
  images: ProductCarouselImage[];
  gameName: string;
  availableStock: number;
};

export default function ProductImageCarousel({
  images,
  gameName,
  availableStock,
}: Props) {
  const slides = useMemo(
    () =>
      images.length
        ? images
        : [{ url: "", alt: `Gambar produk ${gameName}` }],
    [gameName, images],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);

  function goTo(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
    setDragOffset(0);
  }

  function finishDrag(clientX: number) {
    if (pointerStartX.current === null) return;

    const delta = clientX - pointerStartX.current;
    pointerStartX.current = null;
    activePointerId.current = null;
    setDragOffset(0);

    if (Math.abs(delta) < 40) return;
    goTo(activeIndex + (delta < 0 ? 1 : -1));
  }

  const soldOut = availableStock <= 0;

  return (
    <div>
      <div
        className="relative aspect-[2/1] cursor-grab touch-pan-y select-none overflow-hidden rounded-[32px] bg-gradient-to-br from-[#103d2b] via-emerald-700 to-emerald-400 shadow-2xl shadow-emerald-950/15 active:cursor-grabbing"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          pointerStartX.current = event.clientX;
          activePointerId.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (
            pointerStartX.current === null ||
            activePointerId.current !== event.pointerId
          ) {
            return;
          }
          setDragOffset(event.clientX - pointerStartX.current);
        }}
        onPointerUp={(event) => finishDrag(event.clientX)}
        onPointerCancel={() => {
          pointerStartX.current = null;
          activePointerId.current = null;
          setDragOffset(0);
        }}
        onLostPointerCapture={() => {
          pointerStartX.current = null;
          activePointerId.current = null;
          setDragOffset(0);
        }}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{
            width: `${slides.length * 100}%`,
            transform: `translateX(calc(-${activeIndex * (100 / slides.length)}% + ${dragOffset}px))`,
          }}
        >
          {slides.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              className="relative h-full shrink-0"
              style={{ width: `${100 / slides.length}%` }}
              aria-hidden={index !== activeIndex}
            >
              {image.url ? (
                <div
                  role="img"
                  aria-label={image.alt}
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${image.url})` }}
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />

        <div className="pointer-events-none absolute bottom-5 left-5 flex gap-2">
          <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-black text-emerald-800">
            {gameName}
          </span>
          <span
            className={`rounded-full px-4 py-2 text-xs font-black ${
              soldOut
                ? "bg-red-500 text-white"
                : "bg-emerald-300 text-emerald-950"
            }`}
          >
            {soldOut ? "Stok habis" : `${availableStock} stok tersedia`}
          </span>
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Foto sebelumnya"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                goTo(activeIndex - 1);
              }}
              className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/50 text-2xl text-white backdrop-blur hover:bg-black/75"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Foto berikutnya"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                goTo(activeIndex + 1);
              }}
              className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/50 text-2xl text-white backdrop-blur hover:bg-black/75"
            >
              ›
            </button>
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {slides.map((image, index) => (
                <button
                  key={`${image.url}-dot-${index}`}
                  type="button"
                  aria-label={`Buka foto ${index + 1}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    goTo(index);
                  }}
                  className={`h-2.5 rounded-full border border-black/20 shadow transition-all ${
                    index === activeIndex
                      ? "w-8 bg-emerald-300"
                      : "w-2.5 bg-white/75 hover:bg-white"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <p className="mt-2 text-center text-xs font-semibold text-slate-500">
          Geser foto, tekan panah, atau pilih titik untuk melihat foto lainnya.
        </p>
      ) : null}
    </div>
  );
}
