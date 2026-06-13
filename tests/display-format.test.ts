import { describe, expect, it } from "vitest";
import { formatDateTime, formatRupiah } from "../src/lib/format/display";

describe("display formatters", () => {
  it("formats rupiah consistently", () => {
    expect(formatRupiah(15000)).toContain("15.000");
    expect(formatRupiah(null)).toContain("0");
  });

  it("returns fallback for invalid dates", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime("invalid-date")).toBe("-");
  });
});
