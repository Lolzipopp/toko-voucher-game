"use client";

import { useState } from "react";

type ShareProductProps = {
  name: string;
  slug: string;
  price: number;
};

export default function ShareProduct({
  name,
  slug,
  price,
}: ShareProductProps) {
  const [copied, setCopied] = useState(false);

  const getUrl = () =>
    `${window.location.origin}/products/${encodeURIComponent(slug)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function shareWhatsApp() {
    const priceText = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);

    const message = [
      `Lihat produk ini di RIKU STORE:`,
      name,
      `Harga: ${priceText}`,
      getUrl(),
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copyLink}
        className="rounded-xl border border-white/15 bg-white/[.04] px-4 py-3 text-sm font-black text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200"
      >
        {copied ? "Link tersalin ✓" : "Salin link"}
      </button>

      <button
        type="button"
        onClick={shareWhatsApp}
        className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200 hover:bg-emerald-400/15"
      >
        Bagikan ke WhatsApp
      </button>
    </div>
  );
}
