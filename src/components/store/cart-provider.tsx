"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AddCartItem, CartItem } from "@/lib/cart/types";

const STORAGE_KEY = "riku-store-cart-v1";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  hydrated: boolean;
  addItem: (item: AddCartItem, quantity?: number) => void;
  setItemQuantity: (item: AddCartItem, quantity: number) => void;
  replaceCartWithItem: (item: AddCartItem, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function sanitizeItems(value: unknown): CartItem[] {
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

    const max = item.productType === "unique" ? 1 : Math.max(1, Math.floor(item.availableStock));
    const quantity = Math.min(max, Math.max(1, Math.floor(item.quantity)));

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
        quantity,
      },
    ];
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        setItems(stored ? sanitizeItems(JSON.parse(stored)) : []);
      } catch {
        setItems([]);
      } finally {
        setHydrated(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const addItem = useCallback((item: AddCartItem, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((entry) => entry.productId === item.productId);
      const max = item.productType === "unique" ? 1 : Math.max(1, item.availableStock);

      if (existing) {
        return current.map((entry) =>
          entry.productId === item.productId
            ? {
                ...entry,
                ...item,
                quantity: Math.min(max, entry.quantity + Math.max(1, quantity)),
              }
            : entry,
        );
      }

      return [
        ...current,
        {
          ...item,
          quantity: Math.min(max, Math.max(1, quantity)),
        },
      ];
    });
  }, []);

  const setItemQuantity = useCallback((item: AddCartItem, quantity: number) => {
    setItems((current) => {
      const max = item.productType === "unique"
        ? 1
        : Math.max(1, Math.floor(item.availableStock));
      const safeQuantity = Math.min(max, Math.max(1, Math.floor(quantity)));
      const existing = current.some((entry) => entry.productId === item.productId);

      if (existing) {
        return current.map((entry) =>
          entry.productId === item.productId
            ? { ...entry, ...item, quantity: safeQuantity }
            : entry,
        );
      }

      return [...current, { ...item, quantity: safeQuantity }];
    });
  }, []);


  const replaceCartWithItem = useCallback((item: AddCartItem, quantity = 1) => {
    const max = item.productType === "unique"
      ? 1
      : Math.max(1, Math.floor(item.availableStock));
    const safeQuantity = Math.min(max, Math.max(1, Math.floor(quantity)));
    const nextItems: CartItem[] = [{ ...item, quantity: safeQuantity }];

    setItems(nextItems);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    }
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      current.map((item) => {
        if (item.productId !== productId) return item;
        const max = item.productType === "unique" ? 1 : Math.max(1, item.availableStock);
        return { ...item, quantity: Math.min(max, Math.max(1, Math.floor(quantity))) };
      }),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      subtotal: items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
      hydrated,
      addItem,
      setItemQuantity,
      replaceCartWithItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items, hydrated, addItem, setItemQuantity, replaceCartWithItem, updateQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart harus digunakan di dalam CartProvider.");
  return value;
}
