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
        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
      >
        {copied ? "Link tersalin ✓" : "Salin link"}
      </button>

      <button
        type="button"
        onClick={shareWhatsApp}
        className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-100"
      >
        Bagikan ke WhatsApp
      </button>
    </div>
  );
}
