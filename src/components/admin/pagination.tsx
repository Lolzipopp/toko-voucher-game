import Link from "next/link";

type PaginationProps = {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  params?: Record<string, string | undefined>;
};

function hrefFor(basePath: string, page: number, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export default function Pagination({ basePath, page, pageSize, total, params = {} }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Navigasi halaman">
      <p className="text-xs font-semibold text-slate-500">Halaman {page} dari {totalPages} · {total} data</p>
      <div className="flex gap-2">
        <Link aria-disabled={page <= 1} href={page <= 1 ? hrefFor(basePath, 1, params) : hrefFor(basePath, page - 1, params)} className={`rounded-xl border px-4 py-2 text-xs font-black ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>← Sebelumnya</Link>
        <Link aria-disabled={page >= totalPages} href={page >= totalPages ? hrefFor(basePath, totalPages, params) : hrefFor(basePath, page + 1, params)} className={`rounded-xl px-4 py-2 text-xs font-black ${page >= totalPages ? "pointer-events-none bg-slate-100 text-slate-300" : "bg-[#103d2b] text-white hover:bg-[#0b2f21]"}`}>Berikutnya →</Link>
      </div>
    </nav>
  );
}
