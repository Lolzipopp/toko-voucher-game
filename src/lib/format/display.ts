const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatRupiah(value: number | string | null | undefined) {
  const numericValue = Number(value ?? 0);
  return rupiahFormatter.format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function formatDateTime(value: string | Date | null | undefined, fallback = "-") {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return dateTimeFormatter.format(date);
}
