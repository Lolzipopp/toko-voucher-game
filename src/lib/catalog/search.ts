import type { PublicCatalogProduct } from "@/lib/public-store/types";

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type SearchSegment = {
  text: string;
  source: "name" | "game" | "description" | "attribute";
};

function productSegments(product: PublicCatalogProduct): SearchSegment[] {
  const segments: SearchSegment[] = [
    { text: product.name, source: "name" },
    { text: product.game.name, source: "game" },
    { text: product.game.slug, source: "game" },
    ...(product.description ?? "")
      .split(/\r?\n|\|/)
      .map((text) => ({ text, source: "description" as const })),
    ...product.attributes.map((attribute) => ({
      text: `${attribute.key}: ${attribute.value}`,
      source: "attribute" as const,
    })),
  ];

  return segments
    .map((segment) => ({ ...segment, text: normalizeSearchText(segment.text) }))
    .filter((segment) => Boolean(segment.text));
}

const awakeningMarkers = [
  "awakening",
  "awakened",
  "awake",
  "full awk",
  " awk ",
  "v2 awk",
];

const ownedOrEquippedMarkers = [
  "perm",
  "permanent",
  "owned",
  "equip",
  "equipped",
  "sedang dipakai",
  "digunakan",
];

function includesMarker(segment: string, marker: string) {
  return ` ${segment} `.includes(` ${marker.trim()} `);
}

function isAwakeningFruitSegment(segment: string) {
  return awakeningMarkers.some((marker) => includesMarker(segment, marker));
}

function isFruitContextSegment(segment: string) {
  return (
    includesMarker(segment, "fruit") ||
    includesMarker(segment, "buah") ||
    ownedOrEquippedMarkers.some((marker) => includesMarker(segment, marker)) ||
    isAwakeningFruitSegment(segment)
  );
}

function isOwnedOrEquippedFruitSegment(segment: string) {
  if (isAwakeningFruitSegment(segment)) return false;

  const explicitOwnedOrEquipped = ownedOrEquippedMarkers.some((marker) =>
    includesMarker(segment, marker),
  );

  // Baris seperti "Fruit: DOUGH" atau "Buah: KITSUNE" berarti fruit sedang
  // digunakan/equip, selama bukan bagian awakening.
  const equippedFruitField = /^(fruit|buah)\s+/.test(segment);

  return explicitOwnedOrEquipped || equippedFruitField;
}

function queryTerms(normalizedQuery: string) {
  return normalizedQuery
    .split(/\s+/)
    .filter((term) => term && term !== "fruit" && term !== "buah");
}

function segmentMatchesTerms(segment: string, terms: string[]) {
  return terms.every((term) => segment.includes(term));
}

/**
 * Berlaku untuk SEMUA nama fruit, tanpa daftar nama hardcoded.
 * Jika kata yang dicari hanya muncul pada spesifikasi awakening, produk ditolak.
 * Produk diterima bila fruit tersebut Permanent/Owned atau sedang Equip.
 */
function matchesFruitOwnershipIntent(
  segments: SearchSegment[],
  normalizedQuery: string,
) {
  const terms = queryTerms(normalizedQuery);
  if (!terms.length) return null;

  const matchingSegments = segments.filter((segment) =>
    segmentMatchesTerms(segment.text, terms),
  );

  if (!matchingSegments.length) return null;

  const fruitContextMatches = matchingSegments.filter((segment) =>
    isFruitContextSegment(segment.text),
  );

  // Bukan pencarian fruit: lanjutkan ke pencarian spesifikasi biasa.
  if (!fruitContextMatches.length) return null;

  return fruitContextMatches.some((segment) =>
    isOwnedOrEquippedFruitSegment(segment.text),
  );
}

export function productMatchesSearch(
  product: PublicCatalogProduct,
  rawQuery?: string,
) {
  const normalizedQuery = normalizeSearchText(rawQuery ?? "");
  if (!normalizedQuery) return true;

  const segments = productSegments(product);
  const fruitOwnershipMatch = matchesFruitOwnershipIntent(
    segments,
    normalizedQuery,
  );

  if (fruitOwnershipMatch !== null) {
    return fruitOwnershipMatch;
  }

  const searchableText = segments.map((segment) => segment.text).join(" ");
  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => searchableText.includes(term));
}
