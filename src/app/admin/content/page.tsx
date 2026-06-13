import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import ImageCropUpload from "@/components/admin/image-crop-upload";
import Notice from "@/components/admin/notice";
import PageTitle from "@/components/admin/page-title";
import { createClient } from "@/lib/supabase/server";

import {
  createAnnouncement,
  createFaq,
  createTestimonial,
  deleteAnnouncement,
  deleteFaq,
  deleteTestimonial,
  toggleAnnouncement,
  toggleFaq,
  toggleTestimonial,
} from "./actions";

type Props = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  button_label: string | null;
  button_url: string | null;
  tone: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  image_path: string | null;
};

type Testimonial = {
  id: string;
  customer_name: string;
  customer_role: string | null;
  content: string;
  rating: number;
  product_label: string | null;
  is_approved: boolean;
  is_featured: boolean;
  created_at: string;
};

type Faq = {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
};

function date(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ContentPage({ searchParams }: Props) {
  const query = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const [
    { data: admin },
    announcementsResult,
    testimonialsResult,
    faqResult,
  ] = await Promise.all([
    supabase
      .from("admin_users")
      .select("full_name, email, role, is_active")
      .eq("id", user.id)
      .single(),
    supabase
      .from("site_announcements")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_testimonials")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("faq_items")
      .select("*")
      .order("sort_order")
      .order("created_at"),
  ]);

  if (!admin?.is_active) redirect("/admin/login");
  if (announcementsResult.error) {
    throw new Error(
      `Gagal mengambil pengumuman: ${announcementsResult.error.message}`,
    );
  }
  if (testimonialsResult.error) {
    throw new Error(
      `Gagal mengambil testimoni: ${testimonialsResult.error.message}`,
    );
  }
  if (faqResult.error) {
    throw new Error(`Gagal mengambil FAQ: ${faqResult.error.message}`);
  }

  const announcements =
    (announcementsResult.data ?? []) as Announcement[];
  const testimonials =
    (testimonialsResult.data ?? []) as Testimonial[];
  const faqs = (faqResult.data ?? []) as Faq[];

  const field =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

  return (
    <AdminShell active="content" admin={admin}>
      <PageTitle
        eyebrow="Homepage"
        title="Konten Website"
        description="Kelola banner carousel, testimoni asli, dan FAQ tanpa mengedit code."
      />

      {query.success ? <Notice type="success">{query.success}</Notice> : null}
      {query.error ? <Notice type="error">{query.error}</Notice> : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          Banner Carousel Homepage
        </p>
        <h2 className="mt-2 text-xl font-black">Tambah banner event atau promosi</h2>
        <p className="mt-1 text-sm text-slate-500">Banner berpindah otomatis setiap 5 detik dan dapat digeser pembeli.</p>

        <form action={createAnnouncement} className="mt-5 grid gap-4 md:grid-cols-2">
          <input name="title" required placeholder="Judul banner" className={field} />
          <select name="tone" defaultValue="promo" className={field}>
            <option value="promo">Promo hijau</option>
            <option value="info">Informasi biru</option>
            <option value="warning">Peringatan kuning</option>
          </select>
          <textarea
            name="message"
            required
            rows={3}
            placeholder="Teks singkat pada banner"
            className={`${field} resize-y md:col-span-2`}
          />
          <div className="md:col-span-2">
            <ImageCropUpload
              label="Foto banner (opsional, maksimal 4 MB)"
              maxSizeMb={4}
              helpText="Setelah memilih gambar, atur crop. File akan otomatis dibuat menjadi 1600 × 800 px sebelum diupload."
            />
          </div>
          <input name="button_label" placeholder="Teks tombol, contoh: Lihat promo" className={field} />
          <input name="button_url" placeholder="/#produk" className={field} />
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600">
              Mulai tampil
            </label>
            <input name="starts_at" type="datetime-local" className={field} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600">
              Berakhir
            </label>
            <input name="ends_at" type="datetime-local" className={field} />
          </div>
          <input name="sort_order" type="number" min="0" defaultValue={100} className={field} />
          <button className="rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white">
            Tambah banner
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {announcements.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{item.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                      item.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}>
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.message}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {date(item.starts_at)} — {date(item.ends_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={toggleAnnouncement}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="current" value={String(item.is_active)} />
                    <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                      {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </form>
                  <form action={deleteAnnouncement}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600">
                      Hapus
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          Testimoni
        </p>
        <h2 className="mt-2 text-xl font-black">Tambah testimoni asli</h2>
        <p className="mt-1 text-sm text-slate-500">
          Masukkan hanya testimoni yang benar-benar diberikan pembeli.
        </p>

        <form action={createTestimonial} className="mt-5 grid gap-4 md:grid-cols-2">
          <input name="customer_name" required placeholder="Nama pembeli" className={field} />
          <input name="customer_role" placeholder="Contoh: Pembeli Roblox" className={field} />
          <textarea name="content" required rows={3} placeholder="Isi testimoni" className={`${field} resize-y md:col-span-2`} />
          <input name="product_label" placeholder="Produk yang dibeli" className={field} />
          <select name="rating" defaultValue="5" className={field}>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>{rating} bintang</option>
            ))}
          </select>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            <input name="is_featured" type="checkbox" className="h-4 w-4 accent-emerald-600" />
            Tampilkan sebagai unggulan
          </label>
          <button className="rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white">
            Tambah testimoni
          </button>
        </form>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {testimonials.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{item.customer_name}</h3>
                  <p className="text-xs text-slate-400">
                    {item.customer_role || item.product_label || "Pembeli"}
                  </p>
                </div>
                <span className="text-sm text-amber-500">
                  {"★".repeat(item.rating)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                “{item.content}”
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={toggleTestimonial}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="field" value="is_approved" />
                  <input type="hidden" name="current" value={String(item.is_approved)} />
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                    {item.is_approved ? "Sembunyikan" : "Setujui"}
                  </button>
                </form>
                <form action={toggleTestimonial}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="field" value="is_featured" />
                  <input type="hidden" name="current" value={String(item.is_featured)} />
                  <button className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-black text-amber-700">
                    {item.is_featured ? "Hapus unggulan" : "Jadikan unggulan"}
                  </button>
                </form>
                <form action={deleteTestimonial}>
                  <input type="hidden" name="id" value={item.id} />
                  <button className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600">
                    Hapus
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          FAQ
        </p>
        <h2 className="mt-2 text-xl font-black">Kelola pertanyaan umum</h2>

        <form action={createFaq} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_140px_auto]">
          <input name="question" required placeholder="Pertanyaan" className={field} />
          <input name="answer" required placeholder="Jawaban singkat dan jelas" className={field} />
          <input name="sort_order" type="number" min="0" defaultValue={100} className={field} />
          <button className="rounded-2xl bg-[#103d2b] px-5 py-3 text-sm font-black text-white">
            Tambah FAQ
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {faqs.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black">{item.question}</h3>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                      item.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}>
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.answer}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={toggleFaq}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="current" value={String(item.is_active)} />
                    <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                      {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </form>
                  <form action={deleteFaq}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600">
                      Hapus
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
