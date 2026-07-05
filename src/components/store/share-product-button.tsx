"use client";

import { useState } from "react";

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path d="M8.6 10.9 15.4 7M8.6 13.1l6.8 3.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 5.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 18.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function ShareProductButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // User cancelled native share; keep quiet.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-900 shadow-sm backdrop-blur transition hover:bg-white active:scale-95"
      aria-label="Bagikan link produk"
      title={copied ? "Link tersalin" : "Bagikan"}
    >
      <ShareIcon />
    </button>
  );
}
