import "server-only";

export type PakasirWebhookPayload = {
  amount?: number | string;
  order_id?: string;
  project?: string;
  status?: string;
  payment_method?: string;
  completed_at?: string;
  [key: string]: unknown;
};

type PakasirDetailResponse = {
  transaction?: {
    amount?: number | string;
    order_id?: string;
    project?: string;
    status?: string;
    payment_method?: string;
    completed_at?: string;
    [key: string]: unknown;
  };
  amount?: number | string;
  order_id?: string;
  project?: string;
  status?: string;
  payment_method?: string;
  completed_at?: string;
  [key: string]: unknown;
};

const DEFAULT_BASE_URL = "https://app.pakasir.com";

function env(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getPakasirConfig() {
  const slug = env("PAKASIR_PROJECT_SLUG");
  const apiKey = env("PAKASIR_API_KEY");
  const baseUrl = (env("PAKASIR_BASE_URL") ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const enabled = env("PAKASIR_ENABLED") !== "false";

  return { enabled, slug, apiKey, baseUrl };
}

export function isPakasirConfigured() {
  const config = getPakasirConfig();
  return Boolean(config.enabled && config.slug && config.apiKey);
}

export function createPakasirPaymentUrl(input: {
  orderNumber: string;
  amount: number;
  redirectUrl?: string;
  qrisOnly?: boolean;
}) {
  const { slug, baseUrl } = getPakasirConfig();
  if (!slug) return null;

  const amount = Math.floor(input.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;

  const url = new URL(`${baseUrl}/pay/${encodeURIComponent(slug)}/${amount}`);
  url.searchParams.set("order_id", input.orderNumber);
  if (input.redirectUrl) url.searchParams.set("redirect", input.redirectUrl);
  if (input.qrisOnly ?? true) url.searchParams.set("qris_only", "1");

  return url.toString();
}

export function normalizePakasirStatus(status: string | null | undefined) {
  const value = String(status ?? "").toLowerCase();
  if (["completed", "paid", "success", "settlement"].includes(value)) {
    return "paid" as const;
  }
  if (["pending", "unpaid"].includes(value)) return "pending" as const;
  if (["expired"].includes(value)) return "expired" as const;
  if (["failed", "cancelled", "canceled"].includes(value)) return "failed" as const;
  return "processing" as const;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number.NaN;
}

export function amountMatches(a: unknown, b: unknown) {
  return Math.floor(toNumber(a)) === Math.floor(toNumber(b));
}

export async function fetchPakasirTransactionDetail(input: {
  orderNumber: string;
  amount: number;
}) {
  const { apiKey, baseUrl } = getPakasirConfig();
  if (!apiKey) throw new Error("PAKASIR_API_KEY belum dikonfigurasi.");

  const url = new URL(`${baseUrl}/api/transactiondetail`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("order_id", input.orderNumber);
  url.searchParams.set("amount", String(Math.floor(input.amount)));

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Pakasir detail failed: ${response.status}`);
  }

  const payload = (await response.json()) as PakasirDetailResponse;
  return payload.transaction ?? payload;
}
