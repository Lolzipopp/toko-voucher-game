"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  bulkAddInventory,
  updateInventoryStatus,
} from "./actions";

export type InventoryProduct = {
  id: string;
  name: string;
  product_code: string;
  product_type: string;
};

export type InventoryRow = {
  id: string;
  product_id: string;
  status: string;
  purchase_cost: number;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  archived_at: string | null;
  products:
    | {
        name: string;
        product_code: string;
      }
    | null;
};

type InventoryClientProps = {
  products: InventoryProduct[];
  inventory: InventoryRow[];
};

type ParsedRow = {
  lineNumber: number;
  raw: string;
  username: string;
  valid: boolean;
  reason: string;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function parsePreview(raw: string): ParsedRow[] {
  const seen = new Set<string>();

  return raw
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) => Boolean(line))
    .map(({ line, index }) => {
      const row: ParsedRow = {
        lineNumber: index + 1,
        raw: line,
        username: "",
        valid: false,
        reason: "",
      };

      const prefix = "USER:PW|";

      if (!line.startsWith(prefix)) {
        row.reason = "Harus diawali USER:PW|";
        return row;
      }

      const credentials = line.slice(prefix.length);
      const separatorIndex = credentials.indexOf(":");

      if (separatorIndex <= 0) {
        row.reason = "Username/password tidak lengkap";
        return row;
      }

      const username = credentials.slice(0, separatorIndex).trim();
      const password = credentials.slice(separatorIndex + 1);

      row.username = username;

      if (!username || !password.trim()) {
        row.reason = "Username/password kosong";
        return row;
      }

      const normalizedUsername = username.toLowerCase();

      if (seen.has(normalizedUsername)) {
        row.reason = "Duplikat di data paste";
        return row;
      }

      seen.add(normalizedUsername);
      row.valid = true;

      return row;
    });
}

function getStatusClasses(status: string) {
  switch (status) {
    case "available":
      return "border-green-200 bg-green-50 text-green-700";
    case "reserved":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "sold":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "disabled":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "problem":
      return "border-red-200 bg-red-50 text-red-700";
    case "archived":
      return "border-slate-200 bg-slate-50 text-slate-500";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export default function InventoryClient({
  products,
  inventory,
}: InventoryClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [bulkProductId, setBulkProductId] = useState(
    products.find((product) => product.product_type === "mass")?.id ?? "",
  );
  const [rawAccounts, setRawAccounts] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("0");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [modalStatus, setModalStatus] = useState<
    "available" | "disabled" | "problem" | "archived" | null
  >(null);
  const [reason, setReason] = useState("");

  const previewRows = useMemo(
    () => parsePreview(rawAccounts),
    [rawAccounts],
  );

  const validPreviewCount = previewRows.filter((row) => row.valid).length;
  const invalidPreviewCount = previewRows.filter(
    (row) => !row.valid,
  ).length;

  const filteredInventory = useMemo(() => {
    const supplierKeyword = supplierFilter.trim().toLowerCase();

    return inventory.filter((item) => {
      const productMatch =
        !productFilter || item.product_id === productFilter;
      const statusMatch =
        !statusFilter || item.status === statusFilter;
      const supplierMatch =
        !supplierKeyword ||
        (item.supplier ?? "").toLowerCase().includes(supplierKeyword);

      return productMatch && statusMatch && supplierMatch;
    });
  }, [inventory, productFilter, statusFilter, supplierFilter]);

  const counts = useMemo(() => {
    const result: Record<string, number> = {
      available: 0,
      reserved: 0,
      sold: 0,
      disabled: 0,
      problem: 0,
      archived: 0,
    };

    inventory.forEach((item) => {
      if (item.status in result) {
        result[item.status] += 1;
      }
    });

    return result;
  }, [inventory]);

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  function submitBulkImport() {
    setMessage(null);

    if (invalidPreviewCount > 0) {
      setMessage({
        type: "error",
        text: `Perbaiki ${invalidPreviewCount} baris bermasalah terlebih dahulu.`,
      });
      return;
    }

    startTransition(async () => {
      const result = await bulkAddInventory({
        productId: bulkProductId,
        rawAccounts,
        purchaseCost: Number(purchaseCost),
        supplier,
        notes,
      });

      setMessage({
        type: result.ok ? "success" : "error",
        text: result.message,
      });

      if (result.ok) {
        setRawAccounts("");
        setSupplier("");
        setNotes("");
        setPurchaseCost("0");
        router.refresh();
      }
    });
  }

  function submitStatusChange() {
    if (!modalStatus) return;

    startTransition(async () => {
      const result = await updateInventoryStatus({
        inventoryIds: selectedIds,
        newStatus: modalStatus,
        reason,
      });

      setMessage({
        type: result.ok ? "success" : "error",
        text: result.message,
      });

      if (result.ok) {
        setSelectedIds([]);
        setModalStatus(null);
        setReason("");
        router.refresh();
      }
    });
  }

  return (
    <>
      {message ? (
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="mb-5 rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-green-600">
            Bulk Paste
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            Tambah stok produk massal
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Satu Enter berarti satu akun berbeda.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Produk massal
            </label>
            <select
              value={bulkProductId}
              onChange={(event) => setBulkProductId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            >
              <option value="">Pilih produk</option>
              {products
                .filter((product) => product.product_type === "mass")
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.product_code})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Modal per akun
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={purchaseCost}
              onChange={(event) => setPurchaseCost(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            Data akun
          </label>
          <textarea
            rows={8}
            value={rawAccounts}
            onChange={(event) => setRawAccounts(event.target.value)}
            placeholder={
              "USER:PW|username1:password1\nUSER:PW|username2:password2"
            }
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-mono text-sm leading-6 outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">
            {previewRows.length} baris
          </span>
          <span className="rounded-lg bg-green-50 px-2 py-1 text-green-700">
            {validPreviewCount} valid
          </span>
          <span className="rounded-lg bg-red-50 px-2 py-1 text-red-700">
            {invalidPreviewCount} bermasalah
          </span>
        </div>

        {previewRows.length > 0 ? (
          <div className="mt-3 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px]">
            {previewRows.map((row) => (
              <div
                key={`${row.lineNumber}-${row.raw}`}
                className="flex items-center justify-between gap-3 border-b border-slate-200 py-1 last:border-0"
              >
                <span
                  className={`truncate ${
                    row.valid ? "text-slate-600" : "text-red-600"
                  }`}
                >
                  Baris {row.lineNumber}: {row.username || row.raw}
                </span>
                <span
                  className={`flex-shrink-0 font-semibold ${
                    row.valid ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {row.valid ? "VALID" : row.reason}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Supplier
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              placeholder="Opsional"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Catatan
            </label>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Opsional"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={isPending}
            onClick={submitBulkImport}
            className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700 disabled:opacity-60"
          >
            {isPending ? "Memproses..." : "Konfirmasi & Simpan Semua"}
          </button>
        </div>
      </section>

      <section className="mb-4 rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
          >
            <option value="">Semua produk</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
          >
            <option value="">Semua status</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="disabled">Disabled</option>
            <option value="problem">Problem</option>
            <option value="archived">Archived</option>
          </select>

          <input
            type="text"
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
            placeholder="Cari supplier"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
          />

          <button
            type="button"
            onClick={() => {
              setProductFilter("");
              setStatusFilter("");
              setSupplierFilter("");
            }}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600"
          >
            Reset Filter
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-6">
          {Object.entries(counts).map(([status, count]) => (
            <div
              key={status}
              className="rounded-xl bg-slate-50 p-2 text-center"
            >
              <p className="text-[9px] uppercase text-slate-500">
                {status}
              </p>
              <p className="font-bold text-slate-800">{count}</p>
            </div>
          ))}
        </div>
      </section>

      {selectedIds.length > 0 ? (
        <div className="sticky top-3 z-20 mb-4 rounded-2xl border border-green-200 bg-white p-3 shadow-lg">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <p className="text-sm font-semibold text-slate-700">
              {selectedIds.length} stok dipilih
            </p>
            <div className="flex flex-wrap gap-2">
              {(["available", "disabled", "problem", "archived"] as const).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setModalStatus(status);
                      setReason("");
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    {status}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                Batal pilih
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        {filteredInventory.length === 0 ? (
          <div className="rounded-3xl border border-green-100 bg-white p-10 text-center text-sm text-slate-400">
            Tidak ada stok yang cocok dengan filter.
          </div>
        ) : (
          filteredInventory.map((item) => {
            const product = item.products;
            const selectable = !["reserved", "sold", "archived"].includes(
              item.status,
            );

            return (
              <article
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  disabled={!selectable}
                  onChange={() => toggleSelection(item.id)}
                  className="h-4 w-4 accent-green-600 disabled:opacity-30"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {product?.name ?? "Produk"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {product?.product_code ?? "-"} · Modal{" "}
                    {formatRupiah(item.purchase_cost)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Supplier: {item.supplier ?? "-"} · Kredensial terenkripsi
                  </p>
                </div>

                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${getStatusClasses(
                    item.status,
                  )}`}
                >
                  {item.status}
                </span>
              </article>
            );
          })
        )}
      </section>

      {modalStatus ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              Ubah status stok?
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {selectedIds.length} stok akan diubah menjadi {modalStatus}.
            </p>

            <textarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                modalStatus === "available"
                  ? "Alasan opsional"
                  : "Alasan wajib"
              }
              className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setModalStatus(null);
                  setReason("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={submitStatusChange}
                className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isPending ? "Memproses..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
