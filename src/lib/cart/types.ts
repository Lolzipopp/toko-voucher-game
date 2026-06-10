export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  gameName: string;
  productType: "mass" | "unique";
  unitPrice: number;
  availableStock: number;
  imagePath: string | null;
  quantity: number;
};

export type AddCartItem = Omit<CartItem, "quantity">;
