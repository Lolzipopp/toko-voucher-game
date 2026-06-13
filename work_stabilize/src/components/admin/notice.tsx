import type { ReactNode } from "react";

type Props = { type: "success" | "error"; children: ReactNode };
export default function Notice({ type, children }: Props) {
  return <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{children}</div>;
}
