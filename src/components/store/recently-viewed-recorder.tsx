"use client";

import { useEffect } from "react";

import { recordRecentlyViewed } from "@/lib/store-engagement/storage";
import type { EngagementProduct } from "@/lib/store-engagement/types";

export default function RecentlyViewedRecorder({
  product,
}: {
  product: EngagementProduct;
}) {
  useEffect(() => {
    recordRecentlyViewed(product);
  }, [product]);

  return null;
}
