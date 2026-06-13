import { describe, expect, it } from "vitest";

import {
  addCartItem,
  replaceCartWithItem,
  sanitizeCartItems,
  setCartItemQuantity,
} from "../src/lib/cart/operations";
import type { AddCartItem } from "../src/lib/cart/types";

const productA: AddCartItem = {
  productId: "A",
  slug: "product-a",
  name: "Product A",
  gameName: "Blox Fruits",
  productType: "mass",
  unitPrice: 10_000,
  availableStock: 5,
  imagePath: null,
};

const productB: AddCartItem = {
  ...productA,
  productId: "B",
  slug: "product-b",
  name: "Product B",
  productType: "unique",
  availableStock: 1,
};

describe("cart operations", () => {
  it("Beli sekarang mengganti keranjang lama dan hanya menyimpan produk pilihan", () => {
    const cart = addCartItem([], productA, 2);
    const buyNowCart = replaceCartWithItem(productB, 1);

    expect(cart).toHaveLength(1);
    expect(buyNowCart).toEqual([{ ...productB, quantity: 1 }]);
  });

  it("produk unik selalu dibatasi satu unit", () => {
    expect(addCartItem([], productB, 99)[0]?.quantity).toBe(1);
    expect(setCartItemQuantity([], productB, 4)[0]?.quantity).toBe(1);
  });

  it("produk massal tidak dapat melebihi stok tersedia", () => {
    expect(addCartItem([], productA, 99)[0]?.quantity).toBe(5);
  });

  it("data localStorage yang rusak atau tidak valid dibuang", () => {
    expect(sanitizeCartItems({})).toEqual([]);
    expect(sanitizeCartItems([{ productId: "broken" }])).toEqual([]);
  });
});
