"use client";

import { useEffect, useState } from "react";

import { DEFAULT_CLIENT_SETTINGS, fetchPublicSettings } from "@/lib/public-store/client-settings";
import { buildWhatsappUrl } from "@/lib/whatsapp/url";

export default function RestockRequestButton({ productName }: { productName: string }) {
  const [number, setNumber] = useState<string | null>(DEFAULT_CLIENT_SETTINGS.whatsapp_number);
  useEffect(() => {
    const controller = new AbortController();
    void fetchPublicSettings(controller.signal).then((settings) => setNumber(settings.whatsapp_number));
    return () => controller.abort();
  }, []);
  if (!number) return <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-800">Stok habis. Kontak WhatsApp belum diatur.</div>;
  const url = buildWhatsappUrl(number, `Halo RIKU STORE, saya ingin diberi kabar jika produk ini tersedia lagi:\n${productName}`);
  if (!url) return null;
  return <a href={url} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-3.5 text-sm font-black text-amber-950">Minta info saat restock</a>;
}
