import "server-only";

export function internalToolsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_INTERNAL_TEST_TOOLS === "true"
  );
}

export function assertInternalToolsEnabled(): void {
  if (!internalToolsEnabled()) {
    throw new Error(
      "Tool internal hanya boleh dijalankan di lingkungan lokal dan sedang dinonaktifkan.",
    );
  }
}
