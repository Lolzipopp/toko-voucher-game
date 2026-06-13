import type { PaymentProviderAdapter } from "./types";

const adapters = new Map<string, PaymentProviderAdapter>();

export function registerPaymentProvider(adapter: PaymentProviderAdapter) {
  adapters.set(adapter.name.toLowerCase(), adapter);
}

export function getPaymentProvider(name: string) {
  return adapters.get(name.toLowerCase()) ?? null;
}

export function listPaymentProviders() {
  return Array.from(adapters.keys());
}
