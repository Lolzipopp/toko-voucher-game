import { describe, expect, it } from "vitest";
import { buildWhatsappUrl, normalizeWhatsappNumber } from "../src/lib/whatsapp/url";

describe("whatsapp helpers", () => {
  it("normalizes phone numbers", () => {
    expect(normalizeWhatsappNumber("+62 812-3456-7890")).toBe("6281234567890");
  });

  it("builds encoded whatsapp urls", () => {
    const url = buildWhatsappUrl("+62 812", "Halo\nRIKU STORE");
    expect(url).toBe("https://wa.me/62812?text=Halo%0ARIKU%20STORE");
  });

  it("returns null without a number", () => {
    expect(buildWhatsappUrl(null, "Halo")).toBeNull();
  });
});
