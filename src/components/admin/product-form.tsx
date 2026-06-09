import Link from "next/link";

type Game = { id: string; name: string };
type Defaults = { gameId?: string; name?: string; productCode?: string; productType?: string; priceNormal?: number; status?: string; attributes?: string };
type Props = { games: Game[]; action: (formData: FormData) => void | Promise<void>; submitLabel: string; defaults?: Defaults };

const field = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

export default function ProductForm({ games, action, submitLabel, defaults = {} }: Props) {
  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="game_id" className="mb-2 block text-xs font-bold text-slate-600">Game</label><select id="game_id" name="game_id" required defaultValue={defaults.gameId ?? games[0]?.id} className={field}>{games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></div>
        <div><label htmlFor="product_type" className="mb-2 block text-xs font-bold text-slate-600">Tipe produk</label><select id="product_type" name="product_type" required defaultValue={defaults.productType ?? "mass"} className={field}><option value="mass">Massal — banyak stok akun</option><option value="unique">Unik — satu akun khusus</option></select></div>
      </div>

      <div><label htmlFor="name" className="mb-2 block text-xs font-bold text-slate-600">Nama produk</label><input id="name" name="name" type="text" required defaultValue={defaults.name} placeholder="Akun Blox Fruits Level Max" className={field}/></div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="product_code" className="mb-2 block text-xs font-bold text-slate-600">Kode produk</label><input id="product_code" name="product_code" type="text" required defaultValue={defaults.productCode} placeholder="BF-MAX-001" className={`${field} uppercase`}/></div>
        <div><label htmlFor="price_normal" className="mb-2 block text-xs font-bold text-slate-600">Harga IDR</label><input id="price_normal" name="price_normal" type="number" required min="1" step="1" defaultValue={defaults.priceNormal} placeholder="15000" className={field}/></div>
      </div>

      <div><label htmlFor="status" className="mb-2 block text-xs font-bold text-slate-600">Status</label><select id="status" name="status" required defaultValue={defaults.status ?? "active"} className={field}><option value="active">Aktif</option><option value="draft">Draft</option><option value="preorder">Preorder</option><option value="out_of_stock">Habis</option></select></div>

      <div><label htmlFor="attributes" className="mb-2 block text-xs font-bold text-slate-600">Atribut produk</label><textarea id="attributes" name="attributes" rows={8} defaultValue={defaults.attributes} placeholder={"level=2800\nfighting_style=Godhuman\nsword=CDK\nbonus=Jika hoki"} className={`${field} resize-y font-mono leading-6`}/><p className="mt-2 text-[11px] leading-5 text-slate-400">Satu baris satu atribut dengan format <b>key=value</b>. Key tidak boleh duplikat.</p></div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end"><Link href="/admin/products" className="rounded-2xl border border-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-600 transition hover:bg-slate-50">Batal</Link><button type="submit" className="rounded-2xl bg-[#103d2b] px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-950/15 transition hover:bg-[#0b2f21]">{submitLabel}</button></div>
    </form>
  );
}
