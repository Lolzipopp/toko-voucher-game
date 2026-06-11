"use client";

import type { PublicAttribute } from "@/lib/public-store/types";

export type CompareProduct = {
  id: string;
  slug: string;
  name: string;
  gameName: string;
  price: number;
  normalPrice: number;
  imageUrl: string | null;
  availableStock: number;
  warrantyDays: number;
  productType: "mass" | "unique";
  attributes: PublicAttribute[];
};

const KEY = "riku-store:compare:v1";
const MAX = 3;

export function getCompareProducts(): CompareProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as CompareProduct[]) : [];
  } catch {
    return [];
  }
}

function save(items: CompareProduct[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("riku-store:compare-change"));
}

export function toggleCompare(product: CompareProduct) {
  const current = getCompareProducts();
  const exists = current.some((item) => item.id === product.id);
  if (exists) {
    save(current.filter((item) => item.id !== product.id));
    return { active: false, full: false };
  }
  if (current.length >= MAX) return { active: false, full: true };
  save([...current, product]);
  return { active: true, full: false };
}

export function removeCompare(productId: string) {
  save(getCompareProducts().filter((item) => item.id !== productId));
}

export function clearCompare() {
  save([]);
}
