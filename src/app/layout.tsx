import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/store/cart-provider";
import MobileQuickNav from "@/components/store/mobile-quick-nav";

export const metadata: Metadata = {
  title: { default: "RIKU STORE", template: "%s | RIKU STORE" },
  description: "Akun Roblox dengan stok nyata, pengiriman instan, dan garansi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><CartProvider>{children}<MobileQuickNav /></CartProvider></body>
    </html>
  );
}
