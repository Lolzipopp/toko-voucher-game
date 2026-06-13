export function normalizeWhatsappNumber(value: string | null | undefined) {
  const number = value?.replace(/\D/g, "") ?? "";
  return number || null;
}

export function buildWhatsappUrl(
  number: string | null | undefined,
  message: string,
) {
  const normalizedNumber = normalizeWhatsappNumber(number);
  if (!normalizedNumber) return null;
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsappShareUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
