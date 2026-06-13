"use client";

type ClientErrorPayload = {
  message: string;
  digest?: string;
  pathname?: string;
  source?: "app-error" | "global-error";
};

export function reportClientError(payload: ClientErrorPayload) {
  const body = JSON.stringify({
    message: payload.message.slice(0, 500),
    digest: payload.digest?.slice(0, 120),
    pathname: (payload.pathname ?? window.location.pathname).slice(0, 300),
    source: payload.source ?? "app-error",
    userAgent: navigator.userAgent.slice(0, 500),
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/monitoring/client-error", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/monitoring/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Monitoring tidak boleh mengganggu halaman error.
  }
}
