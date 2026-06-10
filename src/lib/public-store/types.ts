export type PublicAttribute = { key: string; value: string };
export type PublicGame = { name: string; slug: string };
export type PublicCatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  product_type: "mass" | "unique";
  price_normal: number;
  price_promo: number | null;
  promo_ends_at: string | null;
  warranty_days: number;
  is_popular: boolean;
  game: PublicGame;
  available_stock: number;
  primary_image_path: string | null;
  attributes: PublicAttribute[];
};
export type PublicProductImage = { path: string; alt: string; is_primary: boolean };
export type PublicProductDetail = Omit<PublicCatalogProduct, "primary_image_path"> & {
  images: PublicProductImage[];
};
