import type { AddCartItem, CartItem } from "@/lib/cart/types";

export const CART_STORAGE_KEY = "riku-store-cart-v1";

function maxQuantity(item: Pick<AddCartItem, "productType" | "availableStock">) {
  return item.productType === "unique"
    ? 1
    : Math.max(1, Math.floor(item.availableStock));
}

export function normalizeQuantity(
  item: Pick<AddCartItem, "productType" | "availableStock">,
  quantity: number,
) {
  return Math.min(maxQuantity(item), Math.max(1, Math.floor(quantity)));
}

export function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];

    const item = raw as Partial<CartItem>;

    if (
      typeof item.productId !== "string" ||
      typeof item.slug !== "string" ||
      typeof item.name !== "string" ||
      typeof item.gameName !== "string" ||
      (item.productType !== "mass" && item.productType !== "unique") ||
      typeof item.unitPrice !== "number" ||
      !Number.isFinite(item.unitPrice) ||
      typeof item.availableStock !== "number" ||
      !Number.isFinite(item.availableStock) ||
      typeof item.quantity !== "number" ||
      !Number.isFinite(item.quantity)
    ) {
      return [];
    }

    return [
      {
        productId: item.productId,
        slug: item.slug,
        name: item.name,
        gameName: item.gameName,
        productType: item.productType,
        unitPrice: Math.max(0, Math.floor(item.unitPrice)),
        availableStock: Math.max(0, Math.floor(item.availableStock)),
        imagePath: typeof item.imagePath === "string" ? item.imagePath : null,
        quantity: normalizeQuantity(
          {
            productType: item.productType,
            availableStock: item.availableStock,
          },
          item.quantity,
        ),
      },
    ];
  });
}

export function addCartItem(
  current: CartItem[],
  item: AddCartItem,
  quantity = 1,
): CartItem[] {
  const existing = current.find((entry) => entry.productId === item.productId);

  if (existing) {
    return current.map((entry) =>
      entry.productId === item.productId
        ? {
            ...entry,
            ...item,
            quantity: normalizeQuantity(item, entry.quantity + Math.max(1, quantity)),
          }
        : entry,
    );
  }

  return [...current, { ...item, quantity: normalizeQuantity(item, quantity) }];
}

export function setCartItemQuantity(
  current: CartItem[],
  item: AddCartItem,
  quantity: number,
): CartItem[] {
  const safeQuantity = normalizeQuantity(item, quantity);
  const existing = current.some((entry) => entry.productId === item.productId);

  if (existing) {
    return current.map((entry) =>
      entry.productId === item.productId
        ? { ...entry, ...item, quantity: safeQuantity }
        : entry,
    );
  }

  return [...current, { ...item, quantity: safeQuantity }];
}

export function replaceCartWithItem(
  item: AddCartItem,
  quantity = 1,
): CartItem[] {
  return [{ ...item, quantity: normalizeQuantity(item, quantity) }];
}

export function updateCartItemQuantity(
  current: CartItem[],
  productId: string,
  quantity: number,
): CartItem[] {
  return current.map((item) =>
    item.productId === productId
      ? { ...item, quantity: normalizeQuantity(item, quantity) }
      : item,
  );
}
