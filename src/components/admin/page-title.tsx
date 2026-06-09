import type { ReactNode } from "react";

type Props = { eyebrow: string; title: string; description: string; action?: ReactNode };
export default function PageTitle({ eyebrow, title, description, action }: Props) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">{eyebrow}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div>{action}</div>;
}
