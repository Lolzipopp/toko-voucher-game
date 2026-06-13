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

import {
  addCartItem,
  CART_STORAGE_KEY,
  replaceCartWithItem as buildSingleItemCart,
  sanitizeCartItems,
  setCartItemQuantity as setCartItemQuantityState,
  updateCartItemQuantity,
} from "@/lib/cart/operations";
import type { AddCartItem, CartItem } from "@/lib/cart/types";

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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = window.localStorage.getItem(CART_STORAGE_KEY);
        setItems(stored ? sanitizeCartItems(JSON.parse(stored)) : []);
      } catch {
        setItems([]);
      } finally {
        setHydrated(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const addItem = useCallback((item: AddCartItem, quantity = 1) => {
    setItems((current) => addCartItem(current, item, quantity));
  }, []);

  const setItemQuantity = useCallback((item: AddCartItem, quantity: number) => {
    setItems((current) => setCartItemQuantityState(current, item, quantity));
  }, []);


  const replaceCartWithItem = useCallback((item: AddCartItem, quantity = 1) => {
    const nextItems = buildSingleItemCart(item, quantity);
    setItems(nextItems);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
    }
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) => updateCartItemQuantity(current, productId, quantity));
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
