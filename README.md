# E-Pikpor

Sistem Pelaporan Piket Operasional Digital — Unit Gakkum Satlantas Polrestabes Bandung.

Stack: Vite + React 19 + Tailwind v4 + Supabase (Postgres, Auth, Storage) + `react-router-dom`. Pola project sama dengan SIANDI: kode di GitHub, database di Supabase, hosting di Vercel — semua lewat GitHub Desktop dan dashboard web, tanpa CLI.

## 1. Buat project Supabase

1. Buka [supabase.com](https://supabase.com) → **New project**, beri nama `EPIKPOR`.
2. Buka **SQL Editor**, jalankan file di `supabase/migrations/` **satu per satu, berurutan sesuai nama filenya** (nomornya menandakan urutan):
   1. `20260826000000_init_schema.sql`
   2. `20260826000001_rls.sql`
   3. `20260826000002_triggers.sql`
   4. `20260826000003_storage.sql`
   5. `20260826000004_seed_referensi.sql`
3. Buka **Edge Functions** → **Deploy a new function** → beri nama `admin-kelola-akun` → tempel isi `supabase/functions/admin-kelola-akun/index.ts`. (Env `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` otomatis tersedia, tidak perlu diisi manual.)
4. Buka **Authentication → Users → Add user**, buat akun bootstrap pertama secara manual:
   - Email: `nrp<NRP-admin-pertama>@epikpor.app` (contoh: NRP `99050655` → `nrp99050655@epikpor.app`)
   - Password: sesuai keinginan
   - Catat **User UID** yang muncul.
5. Kembali ke **SQL Editor**, jalankan satu baris untuk menautkan akun itu sebagai Administrator pertama (ganti `<UID>`, `<NRP>`, `<NAMA>`):
   ```sql
   insert into public.pengguna (id, nama, nrp, peran_sistem, status_aktif)
   values ('<UID>', '<NAMA>', '<NRP>', 'ADMIN', true);
   ```
   Setelah ini, akun-akun lain (semua peran) dibuat lewat layar **Kelola Data** di aplikasi — tidak perlu lagi lewat dashboard.
6. Buka **Project Settings → API**, catat **Project URL** dan **anon public key** untuk langkah 3.

## 2. Push ke GitHub

1. Buka **GitHub Desktop**, `Add Local Repository` → pilih folder ini (`C:\EPIKPOR`).
2. `Publish repository` → nama `EPIKPOR` → pilih **Private** (data ini menyangkut personel & TKP, sebaiknya tidak publik).

## 3. Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New → Project** → import repo `EPIKPOR` dari GitHub.
2. Vercel otomatis mendeteksi ini sebagai project Vite — tidak perlu ubah build command.
3. Sebelum **Deploy**, buka **Environment Variables**, isi:
   - `VITE_SUPABASE_URL` = Project URL dari langkah 1.6
   - `VITE_SUPABASE_ANON_KEY` = anon public key dari langkah 1.6
4. Klik **Deploy**.

## Menjalankan lokal

```bash
npm install
cp .env.example .env   # isi dengan Project URL & anon key yang sama
npm run dev
```

## Peta modul vs Dokumen Teknis

Semua peran dari Bagian 4 (Kasat Lantas, Wakasat Lantas, Kanit Gakkum, Kaur Bin Ops, Kasubnit, Banit, Administrator) sudah punya menu masing-masing — lihat `src/lib/menu.js`. Perbaikan hak akses dibanding mockup: **Kasubnit bisa memverifikasi laporan zonanya sendiri**, **Administrator tidak bisa memverifikasi laporan** (cuma kelola data induk).

Modul yang sebelumnya tidak ada di mockup dan sudah dibangun di sini: **Roster Piket** (`/roster`), **notifikasi otomatis** ke Kasubnit & Kanit saat kejadian dilaporkan (trigger database, bukan kode klien), **antrean luring** (`src/lib/offlineQueue.js`, IndexedDB), **rekap bulanan yang dihitung dari data asli** (Papan Pemantauan), **pencarian arsip 7 kriteria**, dan **PWA installable**.

### Belum diporting dari diskusi mockup (sengaja ditunda)

Dua fitur ekspor yang murni dekoratif belum dibuat di versi ini, supaya fokus dulu ke alur data & keamanan:
- **Kolase foto TKP** (gambar gabungan 4 foto ala mockup) — belum ada.
- Generator **teks laporan WhatsApp** untuk kejadian kecelakaan sudah ada (`src/lib/waReport.js`, tombol "💬 Laporan WA" di halaman Verifikasi), tapi belum di halaman Arsip.

Keduanya aman ditambahkan belakangan tanpa mengubah skema database.
