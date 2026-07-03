import "server-only";

import { createPakasirPaymentUrl, isPakasirConfigured } from "./client";

export type PakasirPublicOrderPayment = {
  enabled: boolean;
  paymentUrl: string | null;
};

export function buildPublicOrderPakasirPayment(input: {
  orderNumber?: string;
  totalAmount?: number;
  accessToken: string;
}) : PakasirPublicOrderPayment {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");

  if (!isPakasirConfigured() || !input.orderNumber || !input.totalAmount) {
    return { enabled: false, paymentUrl: null };
  }

  const paymentUrl = createPakasirPaymentUrl({
    orderNumber: input.orderNumber,
    amount: input.totalAmount,
    redirectUrl: `${siteUrl}/checkout/success/${encodeURIComponent(input.accessToken)}`,
    qrisOnly: true,
  });

  return { enabled: Boolean(paymentUrl), paymentUrl };
}
