export function humanizeProductSpec(value: string) {
  const normalized = value.trim();
  const searchable = normalized.toLowerCase();

  const mentionsAllFightingStyles =
    searchable.includes("all on") ||
    searchable.includes("all fighting style") ||
    searchable.includes("all fighting styles");

  if (mentionsAllFightingStyles && searchable.includes("sanguine")) {
    return "Semua Fighting Style aktif, kecuali Sanguine";
  }

  return normalized;
}

export function humanizeProductDescription(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => humanizeProductSpec(line))
    .join("\n");
}
