import Link from "next/link";

type Game = { id: string; name: string };
type Defaults = { gameId?: string; name?: string; productCode?: string; productType?: string; priceNormal?: number; status?: string; attributes?: string; description?: string; pricePromo?: number | null; promoEndsAt?: string | null; warrantyDays?: number; isPopular?: boolean; sortOrder?: number; allowNegotiation?: boolean; negotiationMinPrice?: number | null };
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
      <div><label htmlFor="description" className="mb-2 block text-xs font-bold text-slate-600">Deskripsi publik</label><textarea id="description" name="description" rows={4} defaultValue={defaults.description} placeholder="Jelaskan produk dengan bahasa yang mudah dipahami pembeli." className={`${field} resize-y`}/></div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="price_promo" className="mb-2 block text-xs font-bold text-slate-600">Harga promo (opsional)</label><input id="price_promo" name="price_promo" type="number" min="1" step="1" defaultValue={defaults.pricePromo ?? undefined} placeholder="Kosongkan jika tidak promo" className={field}/></div>
        <div><label htmlFor="promo_ends_at" className="mb-2 block text-xs font-bold text-slate-600">Promo berakhir</label><input id="promo_ends_at" name="promo_ends_at" type="datetime-local" defaultValue={defaults.promoEndsAt ? defaults.promoEndsAt.slice(0,16) : undefined} className={field}/></div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div><label htmlFor="warranty_days" className="mb-2 block text-xs font-bold text-slate-600">Garansi (hari)</label><input id="warranty_days" name="warranty_days" type="number" min="0" max="365" step="1" defaultValue={defaults.warrantyDays ?? 3} className={field}/></div>
        <div><label htmlFor="sort_order" className="mb-2 block text-xs font-bold text-slate-600">Urutan katalog</label><input id="sort_order" name="sort_order" type="number" min="0" step="1" defaultValue={defaults.sortOrder ?? 100} className={field}/></div>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-700"><input name="is_popular" type="checkbox" defaultChecked={defaults.isPopular} className="h-4 w-4 accent-emerald-600"/> Tandai populer</label>
      </div>


      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="product_code" className="mb-2 block text-xs font-bold text-slate-600">Kode produk</label><input id="product_code" name="product_code" type="text" required defaultValue={defaults.productCode} placeholder="BF-MAX-001" className={`${field} uppercase`}/></div>
        <div><label htmlFor="price_normal" className="mb-2 block text-xs font-bold text-slate-600">Harga IDR</label><input id="price_normal" name="price_normal" type="number" required min="1" step="1" defaultValue={defaults.priceNormal} placeholder="15000" className={field}/></div>
      </div>


      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <label className="flex items-center gap-3 text-sm font-black text-emerald-950">
          <input
            name="allow_negotiation"
            type="checkbox"
            defaultChecked={defaults.allowNegotiation}
            className="h-5 w-5 accent-emerald-600"
          />
          Izinkan pembeli mengajukan nego
        </label>

        <p className="mt-2 text-xs leading-5 text-emerald-900/65">
          Nego dilakukan melalui WhatsApp. Harga produk di
          checkout tidak berubah otomatis sampai kamu menyetujui
          kesepakatan dan membuat promo atau mengubah harga.
        </p>

        <div className="mt-4">
          <label
            htmlFor="negotiation_min_price"
            className="mb-2 block text-xs font-bold text-slate-600"
          >
            Batas minimum penawaran (opsional)
          </label>

          <input
            id="negotiation_min_price"
            name="negotiation_min_price"
            type="number"
            min="1"
            step="1"
            defaultValue={
              defaults.negotiationMinPrice ?? undefined
            }
            placeholder="Contoh: 12000"
            className={field}
          />

          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Nilai ini tidak ditampilkan sebagai harga pasti.
            Penawaran di bawah batas akan ditolak oleh form.
          </p>
        </div>
      </div>

      <div><label htmlFor="status" className="mb-2 block text-xs font-bold text-slate-600">Status</label><select id="status" name="status" required defaultValue={defaults.status ?? "active"} className={field}><option value="active">Aktif</option><option value="draft">Draft</option><option value="preorder">Preorder</option><option value="out_of_stock">Habis</option></select></div>

      <div><label htmlFor="attributes" className="mb-2 block text-xs font-bold text-slate-600">Atribut produk</label><textarea id="attributes" name="attributes" rows={8} defaultValue={defaults.attributes} placeholder={"level=2800\nfighting_style=Godhuman\nsword=CDK\nbonus=Jika hoki"} className={`${field} resize-y font-mono leading-6`}/><p className="mt-2 text-[11px] leading-5 text-slate-400">Satu baris satu atribut dengan format <b>key=value</b>. Key tidak boleh duplikat.</p></div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end"><Link href="/admin/products" className="rounded-2xl border border-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-600 transition hover:bg-slate-50">Batal</Link><button type="submit" className="rounded-2xl bg-[#103d2b] px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-950/15 transition hover:bg-[#0b2f21]">{submitLabel}</button></div>
    </form>
  );
}
