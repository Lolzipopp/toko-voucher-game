import Link from "next/link";

type FinanceTabsProps = {
  active: "payments" | "refunds";
};

export default function FinanceTabs({ active }: FinanceTabsProps) {
  const items = [
    { key: "payments" as const, href: "/admin/finance", label: "Pembayaran" },
    { key: "refunds" as const, href: "/admin/finance/refunds", label: "Refund" },
  ];

  return (
    <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
            active === item.key
              ? "bg-[#103d2b] text-white"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
