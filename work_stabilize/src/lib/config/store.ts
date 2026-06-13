export const STORE_CONFIG = {
  name: "RIKU STORE",
  paymentWindowMinutes: 20,
  defaultWarrantyDays: 3,
  credentialVisibilityDays: 7,
  maxCartLines: 20,
  maxQuantityPerLine: 20,
  maxTotalQuantity: 50,
} as const;

export const INTERNAL_TEST_TOOLS_ENABLED =
  process.env.ENABLE_INTERNAL_TEST_TOOLS === "true";
