# PRD: Baitul Maal — Sistem Manajemen Keuangan Masjid

> Dokumen ini adalah spesifikasi lengkap untuk dikerjakan oleh AI coding agent (Qwen Code / Claude Code / dsb).
> Semua nilai (warna, ukuran, nama field, endpoint) yang tertulis di sini bersifat **final dan mengikat** — agent TIDAK BOLEH mengarang atau mengganti nilai lain kecuali diminta eksplisit oleh developer.

---

## 1. Ringkasan Produk

**Nama:** Baitul Maal
**Tagline:** "Sistem Manajemen Keuangan Masjid yang Transparan & Amanah"

**Tujuan:**
- Mencatat seluruh arus kas masjid (pemasukan & pengeluaran) secara terstruktur per kategori dana.
- Memudahkan bendahara mengelola dana dari input hingga pelaporan.
- Memberikan transparansi kepada jamaah melalui akses read-only.
- Menampilkan laporan real-time di Smart TV masjid (kios mode, tanpa interaksi).

**Non-tujuan (out of scope untuk v1):**
- Tidak ada fitur donasi online / payment gateway di v1 (QRIS hanya dicatat sebagai metode pembayaran manual, bukan integrasi otomatis).
- Tidak ada notifikasi push/email di v1.
- Tidak ada multi-masjid/multi-tenant di v1 — sistem ini untuk **satu masjid saja**.

---

## 2. Tech Stack (final, jangan diganti tanpa konfirmasi)

| Layer | Teknologi | Catatan |
|---|---|---|
| Frontend | Vite + React 18 + TypeScript | Bukan Next.js |
| Styling | Tailwind CSS | Lihat design tokens di bawah |
| State/data fetching | TanStack Query (react-query) | untuk caching & auto-refresh (dipakai di Mode TV) |
| Routing | React Router v6 | |
| Backend | Python FastAPI + Uvicorn | REST JSON API |
| ORM | SQLAlchemy 2.x + Alembic (migration) | |
| Database | PostgreSQL 15+ | |
| Auth | JWT (access token + refresh token), password hashing dengan `bcrypt` atau `argon2` | |
| File storage | Upload bukti transaksi disimpan di object storage (Supabase Storage bucket `bukti-transaksi`) — **jangan simpan di disk lokal backend**, karena platform hosting gratis (Railway) mereset filesystem setiap kali service redeploy/restart, sehingga file lokal akan hilang | |
| Deployment | Lihat §2.1 di bawah | |
| PDF generation | `reportlab` atau `weasyprint` di backend (bukan generate PDF di frontend) | |

### 2.1 Rencana Deployment Gratis (final)

| Bagian | Platform | Alasan |
|---|---|---|
| Frontend (static build Vite) | **Cloudflare Pages** (atau Vercel/Netlify) | Gratis tanpa batas waktu, tanpa kartu kredit, sudah familiar dari project portfolio sebelumnya. |
| Database PostgreSQL | **Supabase Free Tier** | 500MB database, tanpa kartu kredit. Batasan: project otomatis **pause setelah 7 hari tanpa request** — untuk app ini kemungkinan besar aman karena Mode TV melakukan polling tiap 30 detik selama TV menyala, yang otomatis menjaga project tetap aktif. |
| File storage bukti transaksi | **Supabase Storage** (bucket `bukti-transaksi`) | 1GB gratis. **Perlu kompresi gambar di sisi frontend sebelum upload** (resize + compress ke JPG kualitas menengah), karena bukti sekarang wajib untuk SEMUA transaksi (§5.3) sehingga jumlah file akan lebih cepat menumpuk. |
| Backend FastAPI | **Railway** (dengan Nixpacks) | Gratis $5 credit/bulan — cukup untuk 1 service kecil. **Trade-off:** service otomatis "tidur" (spin down) setelah ±30 menit tanpa traffic, dan butuh 5–10 detik untuk bangun kembali di request pertama setelah idle. Untuk Dashboard/Riwayat/Laporan ini hanya berdampak ke loading pertama yang lebih lambat di jam sepi. Untuk Mode TV, karena polling rutin tiap 30 detik, service akan cenderung tetap "warm" selama TV menyala; risiko cold-start hanya muncul kalau TV benar-benar dimatikan lebih dari 30 menit lalu dinyalakan lagi. |
| Alternatif (jika ingin tanpa cold-start sama sekali) | **VPS + Cloudflare Tunnel** (self-host, bukan gratis kecuali VPS sudah ada) | Cocok kalau developer sudah terbiasa dengan setup VPS + Nginx + Cloudflare Tunnel dari project-project sebelumnya. Backend jalan terus tanpa spin-down, tapi ini membutuhkan biaya VPS bulanan (bukan opsi $0). |

**Catatan untuk agent:** Gunakan `railway.json` (bukan `render.yaml`) untuk konfigurasi Railway, dan pastikan environment variable koneksi Supabase (connection string DB + storage keys) dibaca dari environment variables backend, bukan di-hardcode.

---

## 3. Design System (diambil dari prototype)

### 3.1 Warna (Tailwind custom colors — tambahkan ke `tailwind.config.js`)

```js
colors: {
  primary: {
    DEFAULT: '#0F3D2E',   // hijau tua utama (sidebar aktif, tombol utama, card saldo)
    dark: '#0A2E22',
    light: '#1B5E43',
  },
  accent: {
    DEFAULT: '#C8862D',   // amber/gold (tombol sekunder, link, badge pengumuman)
    light: '#E8A94F',
  },
  background: '#F4F6F5',  // background utama halaman dashboard
  surface: '#FFFFFF',     // card & sidebar
  danger: '#D64545',      // tombol Keluar / delete
  success: '#2E7D32',     // indikator kenaikan saldo (+12.5%)
  muted: '#8A9490',       // teks sekunder/placeholder
}
```

- Background halaman login: pattern diamond biru muda (`bg-blue-50` dengan svg pattern), bukan warna solid.
- Card selalu `rounded-2xl`, shadow lembut (`shadow-md`), padding `p-6`.
- Border input: `border border-gray-200 rounded-lg`, focus state ring warna `primary`.

### 3.2 Tipografi

| Elemen | Font | Keterangan |
|---|---|---|
| Judul/Headline | Poppins (600/700) | Nama aplikasi, judul halaman |
| Body/Paragraf | Inter (400/500) | Semua teks umum |
| Angka nominal & dashboard | JetBrains Mono (500/600) | Semua nilai Rupiah wajib pakai font ini agar rata angka |

Import via Google Fonts di `index.html` atau `@font-face` di `index.css`. Tidak pakai `next/font` (karena bukan Next.js).

### 3.3 Format angka & tanggal (WAJIB konsisten di seluruh app)

- Format Rupiah: `Rp` + titik sebagai pemisah ribuan, tanpa desimal. Contoh: `Rp245.850.000`. Gunakan `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })`.
- Format tanggal panjang (Mode TV, laporan): `Senin, 29 Juni 2026` → `Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })`.
- Format tanggal pendek (tabel riwayat): `29/06/2026` atau `29 Jun 2025` — pilih salah satu dan pakai konsisten di semua tabel (rekomendasi: `dd MMM yyyy`).
- Jam Mode TV: format 24 jam `HH:mm:ss`, update setiap detik di client (bukan fetch ke server tiap detik).

---

## 4. Role & Hak Akses

### 4.1 Role
- **Admin (Bendahara):** akses penuh. **v1 mendukung lebih dari satu akun Admin sekaligus** (misal beberapa bendahara/pengurus bisa punya akun Admin masing-masing). Tidak ada hierarki antar-Admin (semua Admin setara, tidak ada "super admin" khusus di v1).
- **Viewer (Jamaah):** akses baca saja.

**Alur persetujuan transaksi:** tidak ada approval/persetujuan berjenjang di v1. Setiap transaksi yang disimpan oleh Admin manapun langsung **final** dan langsung mempengaruhi saldo — tidak ada status "pending" atau "menunggu approval admin lain", termasuk untuk nominal besar. Kolom `created_by` di tabel `transaksi` tetap dicatat untuk keperluan audit trail (siapa yang input), bukan untuk approval.

### 4.2 Matrix Hak Akses (final)

| Fitur | Admin | Viewer |
|---|---|---|
| Login | ✅ | ✅ |
| Lihat Dashboard | ✅ | ✅ |
| Input Transaksi | ✅ | ❌ |
| Edit Transaksi | ✅ | ❌ |
| Delete Transaksi | ✅ | ❌ |
| Upload Bukti | ✅ | ❌ |
| Lihat Riwayat Keuangan | ✅ | ✅ |
| Generate/Download Laporan PDF | ✅ | ✅ (hanya lihat/download, tidak bisa generate ulang dengan filter custom — lihat 7.3) |
| Mode TV | ✅ | ✅ |
| Kelola Kategori Dana | ✅ | ❌ |
| Kelola Pengumuman (Mode TV) | ✅ | ❌ |
| Pengaturan Akun | ✅ | ❌ (v1: menu Pengaturan hanya muncul di sidebar Admin) |

**Aturan enforcement:** Semua pengecekan role WAJIB dilakukan di backend (dependency/middleware FastAPI), bukan hanya disembunyikan di UI. Endpoint yang butuh role Admin harus mengembalikan `403 Forbidden` jika diakses Viewer, walaupun request-nya valid secara auth.

---

## 5. Spesifikasi Halaman

### 5.1 Halaman Login (`/login`)

**Layout:** Card putih terpusat di atas background pattern diamond biru muda. Di atas card: logo kotak hijau tua dengan ikon kubah masjid putih, judul "Baitul Maal" (Poppins bold, hijau), subtitle "Sistem Manajemen Keuangan Masjid yang Transparan & Amanah".

**Form fields:**
| Field | Tipe | Wajib | Validasi |
|---|---|---|---|
| Username | text, ikon person di kiri | ya | non-empty, max 50 char |
| Password | password, ikon lock di kiri, toggle show/hide (ikon mata di kanan) | ya | non-empty, min 6 char |

**Elemen lain:**
- Link "Lupa Password?" (warna accent/amber) di kanan atas label Password — **v1: tampilkan link tapi arahkan ke halaman "Hubungi admin untuk reset password"**, tidak perlu flow reset password email (tidak ada di scope).
- Tombol "Masuk" (ikon panah masuk), full width, warna primary, hover jadi `primary-dark`.
- Teks bantuan di bawah tombol: "Butuh bantuan akses? Hubungi admin utama masjid."
- Dot pagination 3 titik di bawah card (dekoratif saja — mengindikasikan carousel info, opsional untuk v1, boleh dihilangkan jika tidak ada carousel).
- Footer: "© 2026 Baitul Maal Management System. Terkelola dengan Amanah."

**Behavior:**
- Submit → `POST /api/auth/login` dengan `{ username, password }`.
- Sukses → simpan JWT (access + refresh token) → redirect ke `/dashboard`.
- Gagal (401) → tampilkan pesan error inline di bawah form: "Username atau password salah." — jangan bedakan pesan error "user tidak ada" vs "password salah" (mencegah user enumeration).
- Rate limiting: maksimal 5 percobaan gagal per username per 15 menit → kunci sementara (429), tampilkan pesan "Terlalu banyak percobaan, coba lagi dalam beberapa menit."
- Setelah login sukses, redirect berdasarkan role: Admin dan Viewer sama-sama ke `/dashboard`, tapi sidebar & fitur yang tampil berbeda sesuai matrix di atas.

### 5.2 Dashboard (`/dashboard`)

**Sidebar (kiri, fixed):**
- Header: "Baitul Maal" + subtitle nama role user, contoh "Bendahara Utama" (Admin) atau nama jamaah (Viewer).
- Menu (ikon + label):
  - Ringkasan (`/dashboard`) — semua role
  - Input Transaksi (`/transaksi/baru`) — **Admin only**
  - Riwayat Keuangan (`/riwayat`) — semua role
  - Laporan (`/laporan`) — semua role
  - Layar TV (`/tv`) — semua role
  - Pengaturan (`/pengaturan`) — **Admin only**, tombol "Tambah Saldo" hijau juga hanya Admin
  - Keluar (logout, teks merah/danger) — semua role, posisi paling bawah
- Menu item aktif: background hijau muda, teks/ikon hijau tua, indikator kiri.

**Topbar:**
- Search bar "Cari transaksi..." (placeholder), search ini query ke `/riwayat` (bisa redirect ke halaman riwayat dengan query param `?q=`).
- Tombol "Unduh Laporan" (outline, warna accent) — shortcut ke halaman Laporan.
- Ikon notifikasi (lonceng) — v1: boleh statis/badge count dari pengumuman aktif, tidak perlu sistem notifikasi penuh.
- Avatar + nama user + role, contoh "H. Ahmad — Bendahara".

**Card utama "Total Saldo Terkonsolidasi":**
- Background hijau tua gradient, teks putih.
- Label "Total Saldo Terkonsolidasi" → nilai besar (font JetBrains Mono, ukuran besar) → contoh `Rp245.850.000`.
- Badge perubahan: panah naik/turun + persentase, contoh "+12.5% bln ini". **Perhitungan:** `((saldo_bulan_ini - saldo_bulan_lalu) / saldo_bulan_lalu) * 100`, dibulatkan 1 desimal. Jika saldo bulan lalu = 0, jangan hitung persentase (tampilkan "-" atau sembunyikan badge).
- Dua tombol: "Input Transaksi Baru" (amber, hanya Admin — untuk Viewer diganti/disembunyikan) dan "Lihat Rincian" (hijau gelap, ke halaman Riwayat, semua role).

**Card samping (quick shortcuts, 2 buah):**
- Contoh: "Kotak Jumat" dengan subtitle "Terakhir input: 2 jam yang lalu", dan "Bayar Operasional" dengan subtitle "Listrik, Air, & Kebersihan".
- Ini adalah shortcut ke form Input Transaksi dengan kategori pre-filled (Admin only). Untuk Viewer, card ini disembunyikan atau diganti dengan info statis (misal ringkasan kategori teratas).

**Section "Alokasi Dana":**
- Grid card per kategori (Zakat, Infaq, Shadaqah, Operasional — tampilkan 4 kategori dengan saldo terbesar/teratas, sisanya di balik link "Lihat Semua Kategori").
- Tiap card: ikon kategori, nama kategori, nominal saldo kategori, progress bar (proporsi saldo kategori terhadap total saldo keseluruhan).
- Link "Lihat Semua Kategori" → ke halaman/modal daftar semua 8 kategori dana (lihat §9).

**Section "Transaksi Terakhir":**
- Tabel ringkas (5 baris terbaru): kolom Tanggal, Deskripsi, Kategori (badge warna sesuai kategori), Jumlah (hijau untuk pemasukan/`+`, merah untuk pengeluaran/`-`), Status (badge, contoh "Selesai"/"Verified").
- Widget kecil di kanan bawah: foto masjid + label "Masjid Al-Istiqomah — Pelaporan Transparansi & Amanah" + ikon TV kecil yang jadi shortcut ke Mode TV.

**Empty state:** jika belum ada transaksi sama sekali, tampilkan ilustrasi/teks "Belum ada transaksi tercatat" di section Transaksi Terakhir, dan saldo semua kategori = Rp0.

### 5.3 Input Transaksi (`/transaksi/baru`) — Admin only

**Layout:** dua kolom. Kiri: form utama "Detail Transaksi". Kanan: upload bukti + panduan.

**Form fields (kiri):**
| Field | Tipe komponen | Wajib | Validasi |
|---|---|---|---|
| Tanggal Transaksi | date picker (`mm/dd/yyyy` di UI browser native, tapi simpan & kirim sebagai ISO `YYYY-MM-DD`) | ya | tidak boleh tanggal di masa depan |
| Tipe Transaksi | toggle 2 pilihan: **Pemasukan** (hijau, default aktif) / **Pengeluaran** | ya | salah satu harus terpilih |
| Jumlah Nominal (Rp) | number input dengan prefix "Rp", auto-format ribuan saat mengetik | ya | integer, > 0, max 15 digit |
| Kategori/Post Dana | dropdown select, pilihan dari 8 kategori (§9) | ya | harus salah satu kategori valid |
| Metode Pembayaran | dropdown: Tunai (Cash) / Transfer / QRIS | ya | default "Tunai (Cash)" |
| Keterangan/Deskripsi | textarea | tidak wajib, tapi rekomendasi wajib jika tipe = Pengeluaran | max 500 char |

**Upload bukti (kanan):**
- Drag & drop area / klik untuk pilih file, ikon kamera.
- Format diterima: JPG, PNG, atau PDF. Maksimal ukuran **5MB** (setelah kompresi, lihat aturan kompresi di bawah).
- Jika file di luar format/ukuran → tolak di client dengan pesan jelas sebelum submit, jangan kirim ke server.
- Preview thumbnail setelah upload berhasil dipilih, dengan tombol hapus/ganti file.
- **Aturan kompresi gambar (WAJIB, konkret, jangan diinterpretasikan bebas):** untuk file JPG/PNG (bukan PDF), kompres di sisi frontend sebelum upload menggunakan library `browser-image-compression`, dengan parameter: `maxWidthOrHeight: 1600` (px), `initialQuality: 0.7` (setara JPEG quality 70%), `maxSizeMB: 1` (target hasil kompresi di bawah 1MB per file, jauh di bawah limit 5MB). Konversi output selalu ke format JPEG walau input PNG (kecuali gambar butuh transparansi, yang tidak relevan untuk foto kuitansi). File PDF tidak dikompres, hanya dicek batas 5MB.
- Bukti **wajib untuk semua transaksi**, baik Pemasukan maupun Pengeluaran (final, dikonfirmasi developer). Tombol "Simpan Transaksi" harus **disabled** sampai file bukti berhasil di-attach. Validasi ini juga wajib ditegakkan di backend (`bukti_path` tidak boleh NULL saat create), jangan hanya di frontend.

**Panduan Amanah (box info hijau, kanan bawah):** teks statis (bukan dari database), berisi 3 poin tips:
1. Pastikan nominal sesuai dengan kuitansi/bukti fisik.
2. Pilih kategori dana yang tepat untuk laporan berkala.
3. Unggah bukti transaksi sebagai transparansi digital.

**Tombol:**
- "Batalkan" (outline) → kembali ke Dashboard, buang perubahan form (konfirmasi dialog jika ada input yang sudah diisi).
- "Simpan Transaksi" (hijau tua, solid) → submit ke `POST /api/transaksi` (multipart/form-data karena ada file upload).

**Behavior setelah simpan:**
- Sukses → toast/notifikasi "Transaksi berhasil disimpan", redirect ke Riwayat Keuangan atau Dashboard, saldo kategori & saldo total ter-update.
- Gagal validasi backend → tampilkan pesan error per field (jangan generic error saja).

### 5.4 Riwayat Keuangan (`/riwayat`)

**Summary box di atas tabel (3 kartu):** Total Kas (saldo saat ini), Total Pemasukan (akumulasi filter aktif), Total Pengeluaran (akumulasi filter aktif).

**Filter:** by tanggal (range), kategori, tipe (pemasukan/pengeluaran), metode pembayaran. Search bar dari topbar juga mengarah ke sini (query deskripsi).

**Tabel kolom:** ID, Tanggal, Kategori (badge warna), Keterangan, Nominal (hijau `+` / merah `-`), Bukti (ikon lihat/download jika ada file, "-" jika tidak ada), Aksi.

**Aksi per baris:**
- Admin: Detail (lihat modal read-only), Edit (buka form Input Transaksi ter-prefill, `PUT /api/transaksi/{id}`), Delete (konfirmasi dialog sebelum hapus, `DELETE /api/transaksi/{id}`).
- Viewer: hanya Detail.

**Delete behavior:** delete adalah **soft delete** (kolom `deleted_at`), bukan hard delete — agar histori laporan tetap konsisten dan bisa diaudit. Saldo kategori & total harus otomatis dikurangi/dikembalikan sesuai efek transaksi yang dihapus.

**Pagination:** server-side pagination, default 20 baris per halaman.

**Empty state:** "Tidak ada transaksi yang cocok dengan filter" jika hasil filter kosong.

### 5.5 Laporan (`/laporan`)

**Filter:** dropdown Bulan + Tahun (wajib pilih sebelum generate).

**Isi PDF (final, urutan tetap):**
1. Header: nama masjid (dari data Pengaturan, contoh "Masjid Jami' Al-Ikhlas"), logo masjid.
2. Periode laporan (contoh: "Juni 2026").
3. Saldo Awal periode.
4. Daftar Pemasukan (tabel: tanggal, kategori, keterangan, nominal), subtotal.
5. Daftar Pengeluaran (tabel: tanggal, kategori, keterangan, nominal), subtotal.
6. Saldo Akhir periode = Saldo Awal + Total Pemasukan − Total Pengeluaran.
7. Tanda tangan Bendahara (nama + placeholder ruang tanda tangan tertulis, bukan tanda tangan digital di v1).

**Hak akses generate:**
- Admin: bisa generate PDF dengan filter bebas (bulan+tahun apapun), tombol "Generate PDF" → `POST /api/laporan/generate` → response file PDF/link download.
- Viewer: bisa **melihat/download** laporan yang sudah pernah digenerate (v1: Viewer tidak generate laporan custom baru, hanya akses laporan yang sudah ada di arsip). Jika Viewer memilih bulan/tahun yang belum pernah digenerate Admin, tampilkan pesan "Laporan belum tersedia untuk periode ini, hubungi bendahara."

### 5.6 Mode TV (`/tv`) — kios fullscreen

**Karakteristik wajib:**
- Fullscreen, **tanpa sidebar, tanpa tombol navigasi apapun** yang terlihat (kecuali mungkin tombol kecil "Exit" tersembunyi/muncul on-hover untuk keluar dari mode ini).
- Bisa diakses Admin & Viewer, tapi **tidak memerlukan re-login setiap kali** — gunakan long-lived token khusus TV (lihat §8, poin 6) agar TV bisa dibiarkan menyala terus tanpa sesi expired.

**Elemen tampilan:**
- Header kiri: "Baitul Maal" + subtitle "Laporan Keuangan Masjid [Nama Masjid]".
- Header kanan: jam digital besar `HH:mm:ss` (update tiap detik di client-side, tidak fetch server) + tanggal lengkap format Indonesia di bawahnya.
- Card besar hijau: "Total Saldo Kas Utama" + nominal besar + "Update Terakhir: [waktu update terakhir data]" + badge status audit (contoh "Terverifikasi" — ini bisa berupa flag manual dari Admin di Pengaturan, bukan otomatis).
- 3 card kategori di kanan atas: Saldo Zakat, Saldo Infaq/Shadaqah (digabung), Saldo Wakaf/Anak Yatim (digabung) — masing-masing dengan ikon.
- Bawah kiri: "Transaksi Terakhir" (10 data terbaru) — kolom Keterangan, Kategori (badge), Jumlah (`+`/`-` berwarna).
- Bawah kanan: "Pengumuman Penting" — card amber, list pengumuman aktif (tanggal + isi), diambil dari tabel `pengumuman` yang `aktif = true`, dikelola Admin di halaman Pengaturan.

**Auto-refresh:** Data (saldo, transaksi terakhir, pengumuman) di-fetch ulang setiap **30 detik** (gunakan polling via TanStack Query `refetchInterval: 30000`, bukan websocket di v1). Jam tetap update tiap detik secara independen dari fetch data.

### 5.7 Pengaturan (`/pengaturan`) — Admin only

Halaman ini disebut di sidebar tapi belum detail di gambar prototype — spesifikasi minimal untuk v1:
- Kelola profil masjid: nama masjid, logo, alamat (dipakai di header Laporan PDF & Mode TV).
- Kelola Kategori Dana: tambah/edit/nonaktifkan kategori (§9) — tidak bisa hapus kategori yang sudah punya transaksi, hanya bisa nonaktifkan.
- Kelola Pengumuman Mode TV: CRUD pengumuman (judul, isi, aktif/tidak).
- Kelola User: tambah/edit/nonaktifkan akun Admin/Viewer lain. **v1 mendukung banyak Admin sekaligus** — halaman ini wajib ada CRUD user dengan pilihan role (admin/viewer), dan hanya Admin yang bisa mengakses halaman ini (Admin lain juga bisa menambah/menonaktifkan Admin baru, tidak ada pembatasan "hanya admin pertama yang boleh").
- Toggle "Status Audit Terverifikasi" yang tampil di Mode TV (manual flag oleh bendahara).

---

## 6. Struktur Data (Database Schema — PostgreSQL)

```sql
-- Tabel users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel kategori
CREATE TABLE kategori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(50) NOT NULL UNIQUE, -- Zakat, Infaq, Shadaqah, Wakaf, Operasional, Anak Yatim, Pembangunan, Lainnya
  saldo BIGINT NOT NULL DEFAULT 0, -- dalam rupiah (integer, bukan float, hindari floating point error)
  is_active BOOLEAN NOT NULL DEFAULT true,
  urutan_tampil INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel transaksi
CREATE TABLE transaksi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  tipe VARCHAR(11) NOT NULL CHECK (tipe IN ('pemasukan', 'pengeluaran')),
  kategori_id UUID NOT NULL REFERENCES kategori(id),
  nominal BIGINT NOT NULL CHECK (nominal > 0),
  metode VARCHAR(10) NOT NULL CHECK (metode IN ('cash', 'transfer', 'qris')),
  deskripsi TEXT,
  bukti_path TEXT NOT NULL, -- path/URL file di storage, WAJIB diisi untuk semua transaksi (pemasukan & pengeluaran)
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ -- soft delete
);
CREATE INDEX idx_transaksi_tanggal ON transaksi(tanggal) WHERE deleted_at IS NULL;
CREATE INDEX idx_transaksi_kategori ON transaksi(kategori_id) WHERE deleted_at IS NULL;

-- Tabel pengumuman (Mode TV)
CREATE TABLE pengumuman (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul VARCHAR(150) NOT NULL,
  isi TEXT NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel profil masjid (single row, dikelola bebas via halaman Pengaturan)
CREATE TABLE profil_masjid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_masjid VARCHAR(150) NOT NULL, -- diisi Admin sendiri lewat Pengaturan, TIDAK di-hardcode/seed dengan nama tertentu
  alamat TEXT,
  logo_path TEXT,
  status_audit_terverifikasi BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel laporan_arsip (menyimpan PDF yang sudah pernah digenerate, untuk akses Viewer)
CREATE TABLE laporan_arsip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bulan, tahun)
);
```

**Catatan penting untuk agent:**
- Semua nominal uang disimpan sebagai `BIGINT` (satuan rupiah penuh, bukan sen/desimal) — **jangan gunakan FLOAT/DOUBLE** untuk uang.
- `kategori.saldo` adalah **saldo ter-cache**; harus di-update (increment/decrement) setiap kali transaksi dibuat/diedit/dihapus, dalam satu transaction DB yang sama (atomic) agar tidak drift dari total sesungguhnya. Sediakan juga job/endpoint rekonsiliasi untuk recompute saldo dari SUM(transaksi) jika diperlukan.
- Total saldo keseluruhan = `SUM(kategori.saldo)`, dihitung on the fly, jangan simpan sebagai kolom terpisah yang bisa out of sync.

---

## 7. API Contract (kontrak request/response penuh — final, jangan diubah nama field)

> Semua response sukses dibungkus `{ "data": ... }`. Semua response gagal dibungkus format error standar di akhir section ini. Semua field nominal di JSON adalah **integer** (bukan string, bukan float).

### 7.1 Auth

**`POST /api/auth/login`** — public
Request:
```json
{ "username": "ahmad_bendahara", "password": "rahasia123" }
```
Response 200:
```json
{
  "data": {
    "access_token": "eyJhbGciOi...",
    "user": { "id": "uuid", "username": "ahmad_bendahara", "full_name": "H. Ahmad Fauzi", "role": "admin" }
  }
}
```
Refresh token dikirim sebagai `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict`, tidak muncul di body JSON.
Response 401: format error standar, pesan generik "Username atau password salah."
Response 429: format error standar, kode `TOO_MANY_ATTEMPTS`.

**`POST /api/auth/refresh`** — authenticated (via cookie refresh_token)
Request: body kosong, cookie otomatis terkirim browser.
Response 200: `{ "data": { "access_token": "eyJ..." } }`

**`POST /api/auth/logout`** — authenticated
Response 200: `{ "data": { "success": true } }`, backend menghapus/invalidate refresh token & cookie.

### 7.2 Dashboard

**`GET /api/dashboard/summary`** — admin, viewer
Response 200:
```json
{
  "data": {
    "total_saldo": 245850000,
    "perubahan_persen_bulan_ini": 12.5,
    "kategori": [
      { "id": "uuid", "nama": "Zakat", "saldo": 42100000 },
      { "id": "uuid", "nama": "Infaq", "saldo": 108450000 }
    ],
    "transaksi_terakhir": [
      {
        "id": "uuid", "tanggal": "2026-06-29", "deskripsi": "Infaq Kotak Jumat",
        "kategori": "Infaq", "tipe": "pemasukan", "nominal": 12450000, "status": "selesai"
      }
    ]
  }
}
```
`perubahan_persen_bulan_ini` bernilai `null` (bukan `0`) jika saldo bulan lalu = 0 (lihat aturan §5.2).

### 7.3 Transaksi

**`GET /api/transaksi`** — admin, viewer
Query params: `page` (default 1), `page_size` (default 20), `tanggal_mulai`, `tanggal_akhir`, `kategori_id`, `tipe` (`pemasukan`/`pengeluaran`), `metode`, `q` (search deskripsi).
Response 200:
```json
{
  "data": {
    "items": [ /* array objek transaksi, sama bentuknya seperti detail di bawah */ ],
    "page": 1, "page_size": 20, "total_items": 143, "total_pages": 8,
    "summary": { "total_kas": 245850000, "total_pemasukan": 12450000, "total_pengeluaran": 1850000 }
  }
}
```

**`POST /api/transaksi`** — admin only. Content-Type: `multipart/form-data` (karena ada file bukti).
Form fields: `tanggal` (string `YYYY-MM-DD`), `tipe` (`pemasukan`/`pengeluaran`), `nominal` (integer, dikirim sebagai string form field lalu di-parse int di backend), `kategori_id` (uuid), `metode` (`cash`/`transfer`/`qris`), `deskripsi` (string, opsional), `bukti` (file, **wajib**, lihat §5.3).
Response 201:
```json
{
  "data": {
    "id": "uuid", "tanggal": "2026-06-29", "tipe": "pemasukan", "nominal": 2500000,
    "kategori": { "id": "uuid", "nama": "Infaq" }, "metode": "cash", "deskripsi": "Hamba Allah - Jumat Berkah",
    "bukti_url": "https://.../bukti-transaksi/xxxx.jpg",
    "created_by": { "id": "uuid", "full_name": "H. Ahmad Fauzi" },
    "created_at": "2026-06-29T14:20:00Z"
  }
}
```
Response 422 (validasi gagal, contoh nominal ≤ 0 atau bukti tidak ada): format error standar dengan `field` menunjuk field yang salah.

**`GET /api/transaksi/{id}`** — admin, viewer → response 200 bentuk sama seperti objek di atas.

**`PUT /api/transaksi/{id}`** — admin only. Sama seperti POST, semua field bisa dikirim ulang (partial update tidak didukung di v1 — kirim semua field, termasuk `bukti` hanya jika ingin mengganti file, jika tidak ada file baru di form, backend pertahankan `bukti_path` lama).

**`DELETE /api/transaksi/{id}`** — admin only.
Response 200: `{ "data": { "success": true, "id": "uuid" } }`. Backend set `deleted_at`, lalu kembalikan (kurangi/tambah) saldo kategori sesuai efek transaksi yang dihapus.

### 7.4 Kategori

**`GET /api/kategori`** → `{ "data": [ { "id": "uuid", "nama": "Zakat", "saldo": 42100000, "is_active": true, "urutan_tampil": 1 } ] }`

**`POST /api/kategori`** — admin. Request: `{ "nama": "Lainnya", "urutan_tampil": 8 }`. Response 201 objek kategori baru, `saldo` default 0.

**`PUT /api/kategori/{id}`** — admin. Request: `{ "nama": "...", "is_active": false, "urutan_tampil": 3 }`. Jika kategori punya transaksi dan request mencoba set `is_active: false → true` tidak masalah, tapi tidak ada endpoint DELETE kategori di v1 (sesuai §9, hanya nonaktifkan).

### 7.5 Laporan

**`GET /api/laporan/arsip`** → `{ "data": [ { "id": "uuid", "bulan": 6, "tahun": 2026, "generated_at": "...", "download_url": "/api/laporan/uuid/download" } ] }`

**`POST /api/laporan/generate`** — admin. Request: `{ "bulan": 6, "tahun": 2026 }`. Response 201: objek arsip baru sama seperti item di atas. Jika laporan untuk bulan/tahun tsb sudah pernah digenerate, response 409 `{ "error": { "code": "ALREADY_EXISTS", "message": "Laporan untuk periode ini sudah pernah dibuat" } }` — Admin harus hapus dulu jika ingin generate ulang (endpoint delete arsip opsional, atau overwrite — putuskan sendiri saat implementasi, defaultnya overwrite: `POST` yang sama dengan bulan/tahun yang sama akan replace arsip lama).

**`GET /api/laporan/{id}/download`** — admin, viewer → response adalah file PDF (`Content-Type: application/pdf`), bukan JSON.

### 7.6 Pengumuman

**`GET /api/pengumuman`** — admin: semua pengumuman. viewer/TV: hanya `aktif: true`.
Response: `{ "data": [ { "id": "uuid", "judul": "...", "isi": "...", "aktif": true, "created_at": "..." } ] }`

**`POST /api/pengumuman`** — admin. Request: `{ "judul": "...", "isi": "...", "aktif": true }`.
**`PUT /api/pengumuman/{id}`** — admin. Request sama seperti POST, semua field.

### 7.7 Mode TV

**`GET /api/tv/data`** — token TV khusus (lihat §8, poin 6).
Response 200:
```json
{
  "data": {
    "total_saldo": 142850000,
    "saldo_zakat": 42300000,
    "saldo_infaq_shadaqah": 85150000,
    "saldo_wakaf_anak_yatim": 15400000,
    "status_audit_terverifikasi": true,
    "update_terakhir": "2026-06-29T14:20:00Z",
    "transaksi_terakhir": [ /* 10 item, bentuk sama seperti §7.3 */ ],
    "pengumuman": [ { "judul": "...", "isi": "...", "created_at": "..." } ],
    "profil_masjid": { "nama_masjid": "...", "logo_url": "..." }
  }
}
```

### 7.8 Profil Masjid

**`GET /api/profil-masjid`** — semua role (dibutuhkan untuk render header di Laporan & TV).
**`PUT /api/profil-masjid`** — admin only. Request: `{ "nama_masjid": "...", "alamat": "...", "status_audit_terverifikasi": true }` (logo diupload terpisah lewat multipart jika field `logo` disertakan).

### 7.9 Format Response Error Standar (berlaku untuk SEMUA endpoint di atas)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Nominal harus lebih besar dari 0", "field": "nominal" } }
```
Kode error baku yang wajib dipakai konsisten: `VALIDATION_ERROR` (422), `UNAUTHORIZED` (401), `FORBIDDEN` (403 — dipakai saat Viewer coba akses endpoint admin-only), `NOT_FOUND` (404), `TOO_MANY_ATTEMPTS` (429), `ALREADY_EXISTS` (409), `INTERNAL_ERROR` (500). Field `field` hanya diisi untuk `VALIDATION_ERROR`, kosongkan/null untuk kode lain.

---

## 8. Autentikasi & Keamanan

1. Password di-hash dengan `bcrypt` (cost factor ≥ 12) atau `argon2id` — jangan pernah simpan plaintext.
2. JWT access token expiry: 15 menit. Refresh token expiry: 7 hari, disimpan sebagai httpOnly cookie (bukan localStorage) untuk mencegah XSS token theft.
3. Semua endpoint selain `/api/auth/login` wajib memvalidasi JWT dan role di backend (dependency injection FastAPI).
4. Rate limiting login: lihat §5.1.
5. Upload file: validasi MIME type di server (bukan hanya ekstensi nama file), batasi ukuran 5MB, simpan dengan nama file random (UUID) bukan nama asli, scan tipe file agar tidak bisa upload `.php`/`.exe` yang disamarkan jadi `.jpg`.
6. **Token khusus Mode TV:** buat token terpisah dengan scope terbatas (hanya bisa akses `GET /api/tv/data`), expiry panjang (misal 30 hari) atau tanpa expiry tapi bisa di-revoke manual dari halaman Pengaturan. Jangan pakai access token biasa untuk TV karena akan expired dalam 15 menit dan memutus tampilan.
7. Semua request dari frontend wajib pakai HTTPS di production.
8. CORS: whitelist origin frontend saja, jangan `*` di production.

---

## 9. Kategori Dana (data referensi, seed awal)

Urutan tampil default:
1. Zakat
2. Infaq
3. Shadaqah
4. Wakaf
5. Operasional
6. Anak Yatim
7. Pembangunan
8. Lainnya

Setiap kategori punya saldo independen (lihat §6). Kategori bisa dinonaktifkan (`is_active = false`) oleh Admin tapi tidak dihapus jika sudah punya histori transaksi (constraint: cek `EXISTS` transaksi sebelum izinkan hapus, kalau ada transaksi maka tombol Delete diganti jadi Nonaktifkan saja).

---

## 10. Responsive & Mobile

Semua mockup yang jadi acuan desain adalah tampilan desktop. Aturan berikut wajib diikuti agar aplikasi tetap terpakai di HP (penting untuk Viewer/jamaah yang kemungkinan besar akses dari HP):

- **Breakpoint (Tailwind default):** `sm` 640px, `md` 768px, `lg` 1024px. Layout sidebar+konten (Dashboard, Riwayat, dst) memakai layout desktop di ≥ `lg`; di bawah itu:
  - Sidebar berubah jadi **bottom navigation bar** (untuk role Viewer, cukup 4 ikon: Ringkasan, Riwayat, Laporan, Layar TV) atau **hamburger menu** yang membuka drawer dari kiri (untuk Admin dengan menu lebih banyak). Pilih salah satu pola dan konsisten di semua halaman — rekomendasi: hamburger drawer untuk semua role agar satu pola saja yang perlu dikerjakan.
  - Card "Alokasi Dana" (4 kolom di desktop) menjadi 2 kolom di `sm`, 1 kolom di bawah `sm`.
  - Tabel (Riwayat Keuangan, Transaksi Terakhir) di layar < `md`: jangan render tabel HTML biasa (kolom akan terpotong) — ubah jadi list of cards, satu transaksi = satu card berisi tanggal, kategori, nominal, status disusun vertikal.
- **Mode TV tidak perlu responsive** — ini secara desain hanya untuk layar TV/monitor besar (landscape, minimal asumsi lebar 1280px), tidak perlu dioptimalkan untuk HP.
- **Form Input Transaksi** di mobile: dua kolom (form + upload bukti) di desktop menjadi satu kolom stack (form dulu, upload bukti di bawahnya) di bawah `md`.
- Semua target tap (tombol, link, ikon aksi tabel) minimal 44x44px di mobile untuk kenyamanan sentuh.

---

## 11. Onboarding & Setup Awal (First-Time Setup)

Ini wajib jelas supaya agent tidak bingung "siapa user pertama yang login".

1. **Seed admin pertama** dilakukan lewat migration/seed script backend (bukan lewat UI signup — v1 tidak punya halaman "Daftar Akun" publik, karena semua akun dibuat manual oleh Admin lewat Pengaturan → Kelola User setelah admin pertama ada).
2. Buat file `backend/scripts/seed_admin.py` (dijalankan manual sekali oleh developer setelah deploy pertama kali, bukan otomatis jalan tiap start server) yang membaca username/password admin pertama dari environment variables `INITIAL_ADMIN_USERNAME` dan `INITIAL_ADMIN_PASSWORD` (lihat §12), lalu insert ke tabel `users` dengan role `admin` jika tabel `users` masih kosong. Jika tabel sudah ada isi, script tidak melakukan apa-apa (idempotent, aman dijalankan berkali-kali).
3. Seed 8 kategori dana (§9) dan buat 1 baris kosong di tabel `profil_masjid` (field `nama_masjid` diisi placeholder seperti `"Nama Masjid Anda"` sampai Admin ubah sendiri) dilakukan di script/migration yang sama.
4. Setelah admin pertama login, dia diarahkan langsung ke Dashboard seperti biasa — **tidak ada wizard onboarding khusus di v1** (misal tidak ada langkah "isi profil masjid dulu sebelum lanjut"). Admin bisa mengisi profil masjid kapan saja lewat menu Pengaturan.
5. Developer bertanggung jawab menjalankan `seed_admin.py` sekali secara manual setelah database Supabase pertama kali di-migrate — bukan bagian dari runtime aplikasi.

---

## 12. Environment Variables (lengkap — final)

### Backend (`backend/.env`, diisi lewat Render Environment Variables dashboard di production)
| Variable | Contoh nilai | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:xxxx@xxxx.supabase.co:5432/postgres` | Connection string Supabase Postgres |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Untuk akses Supabase Storage API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Key untuk backend upload/hapus file ke bucket `bukti-transaksi` (JANGAN pernah dipakai di frontend) |
| `JWT_SECRET` | (random string ≥ 32 karakter) | Untuk sign access & refresh token |
| `JWT_ACCESS_EXPIRE_MINUTES` | `15` | |
| `JWT_REFRESH_EXPIRE_DAYS` | `7` | |
| `TV_TOKEN_SECRET` | (random string ≥ 32 karakter, berbeda dari `JWT_SECRET`) | Untuk sign token khusus Mode TV yang scope-nya terbatas |
| `CORS_ALLOWED_ORIGINS` | `https://baitul-maal.pages.dev` | Domain frontend Cloudflare Pages, diisi setelah frontend pertama kali deploy |
| `INITIAL_ADMIN_USERNAME` | `admin` | Dipakai sekali oleh `seed_admin.py`, lihat §11 |
| `INITIAL_ADMIN_PASSWORD` | (password kuat, ganti setelah login pertama) | Dipakai sekali oleh `seed_admin.py` |
| `ENVIRONMENT` | `production` / `development` | Dipakai untuk toggle logging verbose (lihat §13) |

### Frontend (`frontend/.env`, diisi lewat Cloudflare Pages Environment Variables)
| Variable | Contoh nilai | Keterangan |
|---|---|---|
| `VITE_API_BASE_URL` | `https://baitul-maal-backend.up.railway.app` | URL backend Railway, diisi setelah backend pertama kali deploy |

**Catatan untuk agent:** jangan pernah commit file `.env` asli ke repo — hanya commit `.env.example` berisi nama variable tanpa nilai asli. `SUPABASE_SERVICE_ROLE_KEY` dan `JWT_SECRET`/`TV_TOKEN_SECRET` adalah rahasia, jangan pernah diekspos ke response API atau log.

---

## 13. Monitoring & Error Logging

- Backend memakai logging standar Python (`logging` module), format terstruktur (minimal timestamp, level, message). Di `ENVIRONMENT=development`, level `DEBUG`; di `ENVIRONMENT=production`, level `INFO` ke atas saja (jangan log data sensitif seperti password atau JWT penuh).
- Semua exception yang tidak tertangani di endpoint wajib di-log dengan stack trace di server (bukan dikirim ke response — response ke client tetap format error standar §7.9 dengan kode `INTERNAL_ERROR`, tanpa membocorkan detail stack trace ke client).
- **v1 tidak memakai layanan monitoring eksternal berbayar** (misal Sentry berbayar) — cukup log ke stdout, karena Railway menyediakan log viewer bawaan gratis yang bisa dibuka lewat dashboard Railway untuk debugging.
- Endpoint health check: `GET /api/health` (public, tanpa auth) mengembalikan `{ "data": { "status": "ok" } }` — berguna untuk dipakai cron/uptime-monitor eksternal (misal UptimeRobot gratis) untuk ping berkala, sekaligus membantu mencegah Render free tier spin-down di jam-jam sepi (lihat §2.1).

---

## 14. Struktur Folder yang Disarankan

```
baitul-maal/
├── frontend/                 # Vite + React + TS (deploy ke Cloudflare Pages)
│   ├── src/
│   │   ├── pages/            # Login, Dashboard, InputTransaksi, Riwayat, Laporan, ModeTV, Pengaturan
│   │   ├── components/
│   │   ├── layouts/           # AdminLayout (sidebar), TVLayout (fullscreen no-chrome)
│   │   ├── hooks/
│   │   ├── lib/api.ts          # axios/fetch wrapper + auth interceptor
│   │   └── types/
│   ├── .env.example            # VITE_API_BASE_URL, dll
│   └── tailwind.config.js
├── backend/                   # FastAPI (deploy ke Railway)
│   ├── app/
│   │   ├── routers/            # auth, transaksi, kategori, laporan, pengumuman, tv, profil
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/             # business logic (saldo update, pdf generation)
│   │   ├── core/                  # security, config, deps (get_current_user, require_role)
│   │   └── main.py
│   ├── alembic/                    # migrations
│   ├── .env.example                  # DATABASE_URL (Supabase), SUPABASE_STORAGE_KEY, JWT_SECRET, dll — jangan commit .env asli
│   ├── railway.json                     # konfigurasi deploy Railway (auto-build dengan Nixpacks)
│   └── requirements.txt
└── PRD.md
```

**Catatan Railway:** Railway menggunakan Nixpacks untuk auto-detect Python/FastAPI dari `requirements.txt`. Start command didefinisikan di `Procfile` (`web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`). Semua kredensial (koneksi Supabase, JWT secret) diisi lewat Railway Environment Variables dashboard, bukan ditulis di `railway.json`.

---

## 15. Checklist Implementasi (untuk agent, urutan disarankan)

1. Setup backend: FastAPI project, koneksi PostgreSQL, model + migration Alembic sesuai §6, tambah endpoint `GET /api/health` (§13).
2. Auth: jalankan `seed_admin.py` (§11) untuk admin pertama, login, JWT, middleware role-check.
3. Endpoint Kategori (seed 8 kategori awal dari §9).
4. Endpoint Transaksi (CRUD + soft delete + update saldo kategori atomic), sesuai kontrak request/response §7.3.
5. Endpoint Dashboard summary (agregasi saldo & transaksi terakhir), sesuai kontrak §7.2.
6. Frontend: layout Login → Dashboard (AdminLayout dengan sidebar sesuai §3 & §5.2), terapkan aturan responsive §10.
7. Frontend: Input Transaksi + upload bukti + kompresi gambar (§5.3).
8. Frontend: Riwayat Keuangan + filter + pagination, termasuk tampilan list-card di mobile (§10).
9. Backend + Frontend: Laporan (generate PDF, arsip, download).
10. Backend + Frontend: Mode TV (token khusus, auto-refresh 30 detik, fullscreen layout tanpa sidebar).
11. Pengaturan (kategori, pengumuman, profil masjid dengan field kosong/placeholder generik — bukan nama masjid tertentu, harus diisi manual oleh Admin — dan kelola user dengan dukungan multi-Admin).
12. Testing role-based access (pastikan Viewer benar-benar tidak bisa POST/PUT/DELETE transaksi meski memaksa lewat API langsung).
13. Deployment: buat project Supabase (DB + Storage bucket `bukti-transaksi`), isi semua environment variables (§12), deploy backend ke Railway (`railway.json` + `Procfile`), deploy frontend ke Cloudflare Pages. Uji Mode TV berjalan stabil selama beberapa jam untuk memastikan polling 30 detik menjaga backend & Supabase tetap aktif (lihat §2.1). Verifikasi checklist acceptance criteria (§16) sebelum menyatakan selesai.

---

## 16. Kriteria Selesai / Acceptance Criteria (per fitur)

Agent wajib memverifikasi poin-poin berikut sebelum melaporkan sebuah fitur "selesai":

- [ ] **Login:** salah login 5x berturut-turut memicu 429; login benar mengembalikan `access_token` sesuai §7.1; Viewer dan Admin diarahkan ke Dashboard yang sama tapi sidebar berbeda sesuai §4.2.
- [ ] **Input Transaksi:** submit tanpa file bukti ditolak (baik tombol disabled di frontend maupun 422 di backend jika dipaksa lewat API langsung); nominal 0 atau negatif ditolak; tanggal masa depan ditolak; saldo kategori & total ter-update benar setelah submit.
- [ ] **Edit/Delete Transaksi:** setelah delete, transaksi tidak muncul lagi di Riwayat tapi baris di DB masih ada dengan `deleted_at` terisi; saldo kategori kembali ke nilai sebelum transaksi tsb dibuat.
- [ ] **RBAC:** panggil langsung `POST /api/transaksi`, `PUT /api/kategori/{id}`, dan `POST /api/pengumuman` pakai token Viewer → semua harus 403, bukan 200.
- [ ] **Mode TV:** buka halaman `/tv`, tunggu ≥ 60 detik, pastikan data ter-refresh otomatis tanpa reload manual (network tab menunjukkan request `GET /api/tv/data` berulang tiap 30 detik).
- [ ] **Laporan PDF:** generate untuk bulan yang sama dua kali menghasilkan overwrite (bukan duplikat), isi PDF berurutan sesuai §5.5 poin 1–7.
- [ ] **Responsive:** buka Dashboard & Riwayat di viewport ≤ 375px lebar, pastikan tidak ada horizontal scroll dan tabel berubah jadi list-card sesuai §10.
- [ ] **Environment variables:** aplikasi tidak crash saat start jika semua variable di §12 terisi; aplikasi menolak start dengan pesan jelas (bukan crash silent) jika `JWT_SECRET` atau `DATABASE_URL` kosong.

---

## 17. Keputusan Final (sudah dikonfirmasi developer — tidak perlu ditanya ulang oleh agent)

| Pertanyaan | Keputusan |
|---|---|
| Jumlah akun Admin di v1? | **Mendukung lebih dari satu akun Admin.** Semua Admin setara (tidak ada super-admin), dikelola lewat halaman Pengaturan → Kelola User. |
| Apakah bukti transaksi Pemasukan wajib? | **Wajib untuk semua transaksi**, baik Pemasukan maupun Pengeluaran. Tombol simpan disabled sampai file bukti diunggah, dan backend menolak request tanpa `bukti_path`. |
| Apakah ada approval/persetujuan transaksi? | **Tidak ada.** Semua transaksi yang disimpan Admin langsung final dan langsung mempengaruhi saldo, tanpa status pending, berapa pun nominalnya. |
| Nama masjid, logo, alamat — hardcode atau dinamis? | **Sepenuhnya dinamis/fleksibel**, diatur oleh Admin sendiri lewat halaman Pengaturan → Profil Masjid (tabel `profil_masjid`). Jangan hardcode nama masjid apapun di kode maupun seed data — biarkan field kosong/placeholder generik sampai Admin mengisinya sendiri pertama kali (misal saat first setup/onboarding). Nama yang muncul di prototype ("Masjid Jami' Al-Ikhlas", "Masjid Al-Istiqomah") hanya contoh dummy, bukan nilai final. |
