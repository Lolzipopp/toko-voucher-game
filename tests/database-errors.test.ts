import { describe, expect, it } from "vitest";

import { databaseErrorMessage } from "../src/lib/errors/database";

describe("databaseErrorMessage", () => {
  it("tidak membocorkan pesan database mentah", () => {
    const message = databaseErrorMessage({
      code: "XX000",
      message: "select * from inventory_account_secrets failed",
    });

    expect(message).toBe("Proses gagal. Silakan coba lagi.");
    expect(message).not.toContain("inventory_account_secrets");
  });

  it("memetakan stok tidak cukup ke pesan yang mudah dipahami", () => {
    expect(databaseErrorMessage({ message: "insufficient_stock" })).toBe(
      "Stok tidak mencukupi untuk menyelesaikan proses ini.",
    );
  });
});
