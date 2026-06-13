import { describe, expect, it } from "vitest";

import { productMatchesSearch } from "../src/lib/catalog/search";
import type { PublicCatalogProduct } from "../src/lib/public-store/types";

function product(
  overrides: Partial<PublicCatalogProduct>,
): PublicCatalogProduct {
  return {
    id: "1",
    slug: "sample",
    name: "Akun Blox Fruits",
    description: null,
    product_type: "unique",
    price_normal: 100_000,
    price_promo: null,
    promo_ends_at: null,
    warranty_days: 3,
    is_popular: false,
    allow_negotiation: true,
    negotiation_min_price: null,
    game: { name: "Blox Fruits", slug: "blox-fruits" },
    available_stock: 1,
    primary_image_path: null,
    attributes: [],
    ...overrides,
  };
}

describe("catalog search", () => {
  it("fruit dough cocok dengan permanent dough", () => {
    const item = product({
      attributes: [{ key: "Fruit Permanent", value: "Dough" }],
    });

    expect(productMatchesSearch(item, "fruit dough")).toBe(true);
    expect(productMatchesSearch(item, "dough")).toBe(true);
  });

  it("fruit dough cocok dengan fruit yang sedang digunakan", () => {
    const item = product({
      description: "Fruit : DOUGH\nMelee : GODHUMAN",
    });

    expect(productMatchesSearch(item, "fruit dough")).toBe(true);
    expect(productMatchesSearch(item, "dough")).toBe(true);
  });

  it("dough tidak cocok jika hanya disebut sebagai awakening", () => {
    const item = product({
      attributes: [{ key: "Awakening Fruit", value: "Dough full awk" }],
    });

    expect(productMatchesSearch(item, "fruit dough")).toBe(false);
    expect(productMatchesSearch(item, "dough")).toBe(false);
  });

  it.each(["kitsune", "dragon", "gas", "buddha", "tiger", "portal"])(
    "aturan permanent/equip berlaku untuk fruit %s",
    (fruit) => {
      const permanent = product({
        attributes: [{ key: "Permanent Fruit", value: fruit }],
      });
      const equipped = product({
        description: `Fruit: ${fruit}`,
      });
      const awakeningOnly = product({
        attributes: [{ key: "Awakening Fruit", value: `${fruit} full awk` }],
      });

      expect(productMatchesSearch(permanent, fruit)).toBe(true);
      expect(productMatchesSearch(equipped, `fruit ${fruit}`)).toBe(true);
      expect(productMatchesSearch(awakeningOnly, fruit)).toBe(false);
    },
  );

  it("pencarian biasa tetap memeriksa semua spesifikasi", () => {
    const item = product({
      attributes: [{ key: "Race", value: "Ghoul V4" }],
    });

    expect(productMatchesSearch(item, "ghoul v4")).toBe(true);
  });
});
