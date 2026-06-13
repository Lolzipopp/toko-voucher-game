"use client";

import { useMemo, useState } from "react";

import { formatRupiah } from "@/lib/format/display";
import { buildWhatsappUrl } from "@/lib/whatsapp/url";
type Props = {
  productName: string;
  productSlug: string;
  currentPrice: number;
  minimumOffer: number | null;
  whatsappNumber: string | null;
  storeName: string;
};


export default function NegotiationBox({
  productName,
  productSlug,
  currentPrice,
  minimumOffer,
  whatsappNumber,
  storeName,
}: Props) {
  const [offer, setOffer] = useState("");
  const [note, setNote] = useState("");
  const numericOffer = Number(offer);

  const error = useMemo(() => {
    if (!offer) return null;

    if (!Number.isSafeInteger(numericOffer) || numericOffer <= 0) {
      return "Masukkan nominal penawaran yang valid.";
    }

    if (
      minimumOffer !== null &&
      numericOffer < minimumOffer
    ) {
      return `Penawaran minimum untuk produk ini ${formatRupiah(
        minimumOffer,
      )}.`;
    }

    if (numericOffer >= currentPrice) {
      return "Nominal nego harus lebih rendah dari harga saat ini.";
    }

    return null;
  }, [currentPrice, minimumOffer, numericOffer, offer]);

  function openWhatsApp() {
    if (!offer || error || !whatsappNumber) return;

    const productUrl =
      `${window.location.origin}/products/` +
      encodeURIComponent(productSlug);

    const message = [
      `Halo ${storeName}, saya ingin mengajukan nego.`,
      `Produk: ${productName}`,
      `Harga website: ${formatRupiah(currentPrice)}`,
      `Penawaran saya: ${formatRupiah(numericOffer)}`,
      note ? `Catatan: ${note}` : null,
      `Link produk: ${productUrl}`,
      "",
      "Saya paham harga checkout belum berubah sampai admin menyetujui kesepakatan.",
    ]
      .filter(Boolean)
      .join("\n");

    const url = buildWhatsappUrl(whatsappNumber, message);
    if (!url) return;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="mt-5 rounded-3xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
        Harga bisa dinegosiasikan
      </p>

      <h2 className="mt-2 text-lg font-black text-slate-950">
        Ajukan harga lewat WhatsApp
      </h2>

      <p className="mt-2 text-xs leading-6 text-slate-600">
        Nego belum mengubah total checkout otomatis. Setelah
        sepakat, admin akan memberi instruksi harga dan pembayaran.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-bold text-slate-700">
            Penawaran kamu
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={offer}
            onChange={(event) => setOffer(event.target.value)}
            placeholder="Contoh: 12000"
            className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-slate-700">
            Catatan (opsional)
          </label>
          <input
            value={note}
            maxLength={160}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Contoh: beli 2 akun"
            className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
        </div>
      </div>

      {minimumOffer !== null ? (
        <p className="mt-3 text-xs font-semibold text-amber-700">
          Penawaran mulai {formatRupiah(minimumOffer)}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={
          !offer ||
          Boolean(error) ||
          !whatsappNumber
        }
        onClick={openWhatsApp}
        className="mt-4 w-full rounded-2xl bg-amber-400 px-5 py-3.5 text-sm font-black text-amber-950 shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-200 disabled:text-amber-700"
      >
        Ajukan nego ke WhatsApp
      </button>

      {!whatsappNumber ? (
        <p className="mt-3 text-xs font-bold text-red-700">
          Nomor WhatsApp toko belum diatur.
        </p>
      ) : null}
    </section>
  );
}
