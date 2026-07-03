import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  amountMatches,
  createPakasirPaymentUrl,
  normalizePakasirStatus,
} from "../src/lib/payments/pakasir/client";

const OLD_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe("Pakasir payment helpers", () => {
  it("creates a QRIS-only payment URL without exposing api key", () => {
    process.env.PAKASIR_PROJECT_SLUG = "riku-store";
    process.env.PAKASIR_API_KEY = "dummy-key";
    process.env.PAKASIR_BASE_URL = "https://app.pakasir.com";

    const url = createPakasirPaymentUrl({
      orderNumber: "RS-TEST-001",
      amount: 15000,
      redirectUrl: "https://rikustore.my.id/checkout/success/token",
      qrisOnly: true,
    });

    expect(url).toBe(
      "https://app.pakasir.com/pay/riku-store/15000?order_id=RS-TEST-001&redirect=https%3A%2F%2Frikustore.my.id%2Fcheckout%2Fsuccess%2Ftoken&qris_only=1",
    );
    expect(url).not.toContain("dummy-key");
  });

  it("rejects invalid amount for payment URL", () => {
    process.env.PAKASIR_PROJECT_SLUG = "riku-store";
    expect(
      createPakasirPaymentUrl({
        orderNumber: "RS-TEST-002",
        amount: 0,
      }),
    ).toBeNull();
  });

  it("normalizes paid and non-paid statuses", () => {
    expect(normalizePakasirStatus("completed")).toBe("paid");
    expect(normalizePakasirStatus("paid")).toBe("paid");
    expect(normalizePakasirStatus("pending")).toBe("pending");
    expect(normalizePakasirStatus("failed")).toBe("failed");
    expect(normalizePakasirStatus("unknown")).toBe("processing");
  });

  it("compares amounts after flooring numeric values", () => {
    expect(amountMatches("15000", 15000)).toBe(true);
    expect(amountMatches(15000.9, 15000)).toBe(true);
    expect(amountMatches("14999", 15000)).toBe(false);
  });
});
