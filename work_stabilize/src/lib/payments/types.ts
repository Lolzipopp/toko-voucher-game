export type NormalizedPaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "expired"
  | "refunded";

export type VerifiedProviderEvent = {
  provider: string;
  externalEventId: string;
  eventType: string;
  externalOrderId: string | null;
  status: NormalizedPaymentStatus;
  grossAmount: number | null;
  rawPayload: Record<string, unknown>;
};

export interface PaymentProviderAdapter {
  readonly name: string;

  verifyWebhook(input: {
    rawBody: string;
    headers: Headers;
  }): Promise<VerifiedProviderEvent>;

  createPaymentSession(input: {
    orderId: string;
    orderNumber: string;
    amount: number;
    customerEmail: string;
    expiresAt: string;
  }): Promise<{
    externalId: string;
    redirectUrl?: string;
    token?: string;
    rawPayload: Record<string, unknown>;
  }>;
}
