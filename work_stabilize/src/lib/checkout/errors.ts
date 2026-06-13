const CHECKOUT_MESSAGES: Record<string, string> = {
  INVALID_CUSTOMER_EMAIL: "Email pembeli tidak valid.",
  INVALID_CART: "Keranjang tidak valid.",
  INVALID_QUANTITY: "Jumlah produk tidak valid.",
  DUPLICATE_PRODUCT_IN_CART: "Produk yang sama terduplikasi di keranjang.",
  PRODUCT_UNAVAILABLE: "Salah satu produk sudah tidak tersedia.",
  INSUFFICIENT_STOCK: "Stok tidak mencukupi. Perbarui keranjang dan coba lagi.",
  UNIQUE_PRODUCT_QUANTITY: "Produk unik hanya dapat dibeli satu akun.",
  PROMO_INVALID: "Kode promo tidak valid atau sudah berakhir.",
  PROMO_MINIMUM_NOT_MET: "Minimum belanja untuk promo belum terpenuhi.",
  PROMO_NOT_APPLICABLE: "Promo tidak berlaku untuk produk ini.",
  PROMO_CUSTOMER_LIMIT: "Email ini sudah mencapai batas penggunaan promo.",
  PROMO_USAGE_LIMIT: "Kuota kode promo sudah habis.",
  CHECKOUT_RATE_LIMIT: "Terlalu banyak percobaan checkout. Tunggu beberapa menit lalu coba lagi.",
  ACTIVE_ORDER_EXISTS: "Email ini masih memiliki pesanan yang menunggu pembayaran.",
};

export function checkoutErrorMessage(message?: string | null) {
  if (!message) return "Checkout gagal dibuat. Silakan coba lagi.";
  const code = message.match(/RIKU_ERROR:([A-Z0-9_]+)/)?.[1];
  return (code && CHECKOUT_MESSAGES[code]) || "Checkout gagal dibuat. Silakan coba lagi.";
}
