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
   6. `20260826000005_deteksi_sesi_lewat_18_jam.sql`
   7. `20260827000006_bootstrap_admin_pertama.sql`
3. Buka **Edge Functions** → **Deploy a new function** → beri nama `admin-kelola-akun` → tempel isi `supabase/functions/admin-kelola-akun/index.ts`. (Env `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` otomatis tersedia, tidak perlu diisi manual.)
4. Buka **Authentication → Sign In / Providers** (atau **Authentication → Settings**, tergantung versi dashboard), cari pengaturan **Email** provider, dan **matikan "Confirm email"**. Ini wajib — NRP disintesis jadi alamat email palsu (`nrp<NRP>@epikpor.app`) yang memang tidak bisa menerima email konfirmasi apa pun.
5. Buka **Project Settings → API**, catat **Project URL** dan **anon public key** untuk langkah berikutnya.
6. Jalankan aplikasinya (lihat "Menjalankan lokal" di bawah, atau setelah di-deploy ke Vercel). Karena belum ada satu pun akun Administrator, halaman Login akan otomatis menampilkan layar **"Pengaturan Awal"** — isi nama, NRP, pangkat, dan kata sandi Anda sendiri di situ untuk mendaftar sebagai Administrator pertama. **Tidak perlu lagi bikin user manual lewat dashboard Supabase.** Setelah ini, layar itu tidak akan muncul lagi untuk siapa pun — akun-akun berikutnya (semua peran) dibuat lewat layar **Kelola Data** di dalam aplikasi oleh Administrator ini.
7. (Boleh menyusul, tidak wajib sebelum uji coba pertama) Jadwalkan penutupan otomatis sesi piket yang lewat 18 jam — lihat komentar di kepala file `20260826000005_deteksi_sesi_lewat_18_jam.sql` untuk dua cara (pg_cron atau Scheduled Trigger dashboard). Sebelum dijadwalkan, sesi yang lupa ditutup tidak akan otomatis masuk status pelanggaran.

## 2. Push ke GitHub

1. Buka **GitHub Desktop**, `Add Local Repository` → pilih folder ini (`C:\EPIKPOR`).
2. `Publish repository` → nama `EPIKPOR` → pilih **Private** (data ini menyangkut personel & TKP, sebaiknya tidak publik).

## 3. Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New → Project** → import repo `EPIKPOR` dari GitHub.
2. Vercel otomatis mendeteksi ini sebagai project Vite — tidak perlu ubah build command.
3. Sebelum **Deploy**, buka **Environment Variables**, isi:
   - `VITE_SUPABASE_URL` = Project URL dari langkah 1.5
   - `VITE_SUPABASE_ANON_KEY` = anon public key dari langkah 1.5
4. Klik **Deploy**.

## Menjalankan lokal

```bash
npm install
cp .env.example .env   # isi dengan Project URL & anon key yang sama
npm run dev
```

## Peta modul vs Dokumen Teknis

Semua peran dari Bagian 4 (Kasat Lantas, Wakasat Lantas, Kanit Gakkum, Kaur Bin Ops, Kasubnit, Banit, Administrator) sudah punya menu masing-masing — lihat `src/lib/menu.js`. Perbaikan hak akses dibanding mockup: **Kasubnit bisa memverifikasi laporan zonanya sendiri**, **Administrator tidak bisa memverifikasi laporan** (cuma kelola data induk).

Modul yang sebelumnya tidak ada di mockup dan sudah dibangun di sini: **Roster Piket** (`/roster`), **notifikasi otomatis** ke Kasubnit & Kanit saat kejadian dilaporkan (trigger database, bukan kode klien), **antrean luring** (`src/lib/offlineQueue.js`, IndexedDB), **rekap bulanan yang dihitung dari data asli** (Papan Pemantauan), **pencarian arsip 7 kriteria**, **PWA installable** (ikon sudah ada di `public/icons/`), dan **galeri foto + komentar** di halaman Verifikasi & Arsip lewat `DetailModal` (`src/components/DetailModal.jsx`) yang mengambil foto dari Storage lewat signed URL.

### Belum diporting / belum ada mekanismenya (sengaja ditunda)

- **Kolase foto TKP** (gambar gabungan 4 foto ala mockup, murni dekoratif) — belum ada.
- **Edit lengkap Kejadian Kecelakaan** (ubah kembali orang/kendaraan/faktor penyebab setelah terkirim) — `DetailModal` cuma bisa mengedit lokasi & keterangan Laporan Kegiatan; API `gantiOrangDanKendaraan` sudah ada di `laporanKejadianApi.js` tapi belum ada form yang memakainya.
- **Penyuntingan manual satu stempel waktu** (kalau telat mengetuk) — cuma bisa ketuk-batal-ketuk ulang, belum ada input jam manual.
- **Deteksi "dijadwalkan tapi tidak buka sesi"** (status `PELANGGARAN_TIDAK_BUKA`) — belum ada mekanismenya sama sekali, beda dengan auto-tutup 18 jam yang fungsinya sudah ada (lihat langkah 1.7).
- **Notifikasi pra-piket** ("personel menerima pemberitahuan sebelum jam piket dimulai", Bagian 5.8) — perlu scheduled job yang membandingkan roster dengan jam sekarang, belum dibangun.

Semuanya aman ditambahkan belakangan tanpa mengubah skema database yang sudah ada.
