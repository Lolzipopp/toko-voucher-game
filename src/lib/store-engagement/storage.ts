"use client";

import {
  FAVORITES_KEY,
  MAX_RECENTLY_VIEWED,
  RECENTLY_VIEWED_KEY,
  type EngagementProduct,
} from "./types";

function readProducts(key: string): EngagementProduct[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is EngagementProduct => {
      if (!item || typeof item !== "object") return false;
      const product = item as Partial<EngagementProduct>;

      return (
        typeof product.id === "string" &&
        typeof product.slug === "string" &&
        typeof product.name === "string" &&
        typeof product.gameName === "string" &&
        typeof product.price === "number"
      );
    });
  } catch {
    return [];
  }
}

function writeProducts(key: string, products: EngagementProduct[]) {
  window.localStorage.setItem(key, JSON.stringify(products));
  window.dispatchEvent(
    new CustomEvent("riku-store:engagement-change", {
      detail: { key },
    }),
  );
}

export function getFavorites() {
  return readProducts(FAVORITES_KEY);
}

export function isFavorite(productId: string) {
  return getFavorites().some((product) => product.id === productId);
}

export function toggleFavorite(product: EngagementProduct) {
  const current = getFavorites();
  const exists = current.some((item) => item.id === product.id);

  const next = exists
    ? current.filter((item) => item.id !== product.id)
    : [product, ...current];

  writeProducts(FAVORITES_KEY, next);
  return !exists;
}

export function removeFavorite(productId: string) {
  writeProducts(
    FAVORITES_KEY,
    getFavorites().filter((product) => product.id !== productId),
  );
}

export function getRecentlyViewed() {
  return readProducts(RECENTLY_VIEWED_KEY);
}

export function recordRecentlyViewed(product: EngagementProduct) {
  const next = [
    product,
    ...getRecentlyViewed().filter((item) => item.id !== product.id),
  ].slice(0, MAX_RECENTLY_VIEWED);

  writeProducts(RECENTLY_VIEWED_KEY, next);
}

export function clearRecentlyViewed() {
  writeProducts(RECENTLY_VIEWED_KEY, []);
}
