export type EngagementProduct = {
  id: string;
  slug: string;
  name: string;
  gameName: string;
  price: number;
  imageUrl: string | null;
  availableStock: number;
};

export const FAVORITES_KEY = "riku-store:favorites:v1";
export const RECENTLY_VIEWED_KEY = "riku-store:recently-viewed:v1";
export const MAX_RECENTLY_VIEWED = 8;
