import { describe, expect, it } from "vitest";

import {
  humanizeProductDescription,
  humanizeProductSpec,
} from "../src/lib/catalog/display-text";

describe("product display text", () => {
  it("menjelaskan all on -sanguine dengan benar", () => {
    expect(humanizeProductSpec("ALL ON, -SANGUINE")).toBe(
      "Semua Fighting Style aktif, kecuali Sanguine",
    );
  });

  it("memperbaiki baris spesifikasi dalam deskripsi", () => {
    expect(
      humanizeProductDescription("Level MAX\nALL FIGHTING STYLE ON - SANGUINE"),
    ).toContain("Semua Fighting Style aktif, kecuali Sanguine");
  });
});
