"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import SectionLink from "./section-link";

export type HomeBanner = {
  id: string;
  title: string;
  message: string;
  button_label: string | null;
  button_url: string | null;
  tone: string;
  image_url: string | null;
};

type Props = {
  banners: HomeBanner[];
};

const fallbackBanners: HomeBanner[] = [
  {
    id: "buy-account",
    title: "Cari akun game yang sesuai kebutuhanmu",
    message:
      "Lihat stok nyata, spesifikasi lengkap, dan harga sebelum melakukan checkout.",
    button_label: "Lihat akun tersedia",
    button_url: "/#produk",
    tone: "promo",
    image_url: null,
  },
  {
    id: "sell-account",
    title: "Mau jual akun game ke RIKU STORE?",
    message:
      "Kirim detail akun melalui WhatsApp agar admin dapat memeriksa spesifikasi dan memberikan penawaran.",
    button_label: "Hubungi admin",
    button_url: "/tentang-kontak",
    tone: "info",
    image_url: null,
  },
];

function toneGradient(tone: string) {
  if (tone === "warning") {
    return "from-amber-500/35 via-orange-500/15 to-[#081625]";
  }
  if (tone === "info") {
    return "from-sky-500/30 via-cyan-500/10 to-[#081625]";
  }
  return "from-emerald-500/35 via-lime-500/10 to-[#081625]";
}

export default function HomeBannerCarousel({ banners }: Props) {
  const slides = useMemo(
    () => (banners.length ? banners : fallbackBanners),
    [banners],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [manualPauseUntil, setManualPauseUntil] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);

  useEffect(() => {
    if (slides.length < 2) return;

    const timer = window.setInterval(() => {
      if (Date.now() < manualPauseUntil) return;
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [manualPauseUntil, slides.length]);

  function pauseAutoplay() {
    setManualPauseUntil(Date.now() + 8000);
  }

  function goTo(index: number) {
    pauseAutoplay();
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

  return (
    <section
      aria-label="Banner promosi"
      className="relative border-b border-white/8 bg-[#06111f]"
    >
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6 sm:py-7">
        <div
          className="relative aspect-[2/1] cursor-grab touch-pan-y select-none overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#081625] shadow-[0_30px_80px_rgba(0,0,0,.35)] active:cursor-grabbing sm:rounded-[2rem]"
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest("button, a, input")) return;
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
            {slides.map((slide, index) => (
              <article
                key={slide.id}
                className="relative h-full shrink-0"
                style={{ width: `${100 / slides.length}%` }}
                aria-hidden={index !== activeIndex}
              >
                {slide.image_url ? (
                  <>
                    <div
                      role="img"
                      aria-label={slide.title}
                      className="h-full w-full bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${slide.image_url})` }}
                    />
                    <div className="sr-only">
                      <h2>{slide.title}</h2>
                      <p>{slide.message}</p>
                    </div>
                    {slide.button_label && slide.button_url ? (
                      <SectionLink
                        href={slide.button_url}
                        className="absolute bottom-5 right-5 z-[2] rounded-2xl border border-white/20 bg-black/65 px-5 py-3 text-sm font-black text-white shadow-xl backdrop-blur transition hover:bg-black/80 sm:bottom-8 sm:right-8"
                      >
                        {slide.button_label} →
                      </SectionLink>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${toneGradient(slide.tone)}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#06111f]/95 via-[#06111f]/72 to-[#06111f]/10" />
                    <div className="relative flex h-full max-w-3xl flex-col justify-center px-8 py-10 sm:px-14 lg:px-20">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300 sm:text-xs">
                        RIKU STORE EVENT
                      </p>
                      <h2 className="mt-3 max-w-2xl text-2xl font-black italic leading-tight sm:text-5xl">
                        {slide.title}
                      </h2>
                      <p className="mt-4 max-w-xl text-xs leading-5 text-slate-300 sm:text-base sm:leading-7">
                        {slide.message}
                      </p>
                      {slide.button_label && slide.button_url ? (
                        <SectionLink
                          href={slide.button_url}
                          className="mt-5 inline-flex w-fit rounded-2xl bg-emerald-400 px-5 py-3 text-xs font-black text-emerald-950 transition hover:-translate-y-0.5 hover:bg-emerald-300 sm:mt-6 sm:text-sm"
                        >
                          {slide.button_label} →
                        </SectionLink>
                      ) : null}
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>

          {slides.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Banner sebelumnya"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(activeIndex - 1);
                }}
                className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/45 text-xl text-white backdrop-blur hover:bg-black/70 sm:h-11 sm:w-11"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Banner berikutnya"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(activeIndex + 1);
                }}
                className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/45 text-xl text-white backdrop-blur hover:bg-black/70 sm:h-11 sm:w-11"
              >
                ›
              </button>
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-5">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Buka banner ${index + 1}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      goTo(index);
                    }}
                    className={`h-2.5 rounded-full border border-black/20 shadow transition-all ${
                      index === activeIndex
                        ? "w-8 bg-emerald-300"
                        : "w-2.5 bg-white/70 hover:bg-white"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
        {slides.length > 1 ? (
          <p className="mt-2 text-center text-[11px] font-semibold text-slate-500">
            Geser banner, tekan panah, atau pilih titik untuk berpindah.
          </p>
        ) : null}
      </div>
    </section>
  );
}
