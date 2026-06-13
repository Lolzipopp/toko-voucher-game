const KNOWN_MESSAGES: Array<[string, string]> = [
  ["insufficient_stock", "Stok tidak mencukupi untuk menyelesaikan proses ini."],
  ["reservation_expired", "Waktu reservasi sudah habis. Minta pembeli membuat pesanan baru."],
  ["order_not_payable", "Pesanan ini sudah tidak dapat dibayar."],
  ["duplicate", "Data yang sama sudah tersimpan."],
  ["23505", "Data yang sama sudah tersimpan."],
  ["not authorized", "Akses ditolak."],
  ["permission denied", "Akses ditolak."],
];

export function databaseErrorMessage(
  error: { message?: string | null; code?: string | null } | null | undefined,
  fallback = "Proses gagal. Silakan coba lagi.",
) {
  const raw = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  const match = KNOWN_MESSAGES.find(([needle]) => raw.includes(needle));
  return match?.[1] ?? fallback;
}
