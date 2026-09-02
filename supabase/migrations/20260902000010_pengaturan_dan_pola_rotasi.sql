-- Tabel pengaturan umum: nilai yang boleh diubah pengelola dari dalam
-- aplikasi, bukan lewat perubahan kode dan deploy ulang.
--
-- Pemakai pertamanya adalah pola rotasi piket. RAP Tabel 1.1 & 1.2 hanya
-- memuat dua minggu, dan Unit Gakkum menyatakan belum punya aturan baku untuk
-- minggu berikutnya. Karena itu polanya disimpan sebagai data, bukan ditanam
-- di kode — panjang siklus dan susunan regu tiap harinya bisa disetel sendiri.

create table public.pengaturan (
  kunci text primary key,
  nilai jsonb not null,
  diperbarui_oleh uuid references public.pengguna(id),
  diperbarui_pada timestamptz not null default now()
);

alter table public.pengaturan enable row level security;

-- Dibaca semua pengguna aktif (penyusun roster perlu tahu polanya), tetapi
-- hanya Administrator yang boleh mengubahnya.
create policy "RLS-10 pengaturan: baca" on public.pengaturan for select using (public.pengguna_aktif());
create policy "RLS-10 pengaturan: kelola admin" on public.pengaturan for all
  using (public.peran_saya() = 'ADMIN') with check (public.peran_saya() = 'ADMIN');

-- Nilai awal = pola RAP Tabel 1.1 & 1.2, siklus dua minggu.
-- Bentuk: { "jumlahMinggu": 2, "minggu": { "1": { "1": [1], ... "7": [2,3] }, "2": {...} } }
-- Kunci hari memakai penomoran ISO: 1 Senin ... 7 Minggu. Isinya nomor regu.
insert into public.pengaturan (kunci, nilai) values (
  'pola_rotasi_piket',
  '{
    "jumlahMinggu": 2,
    "minggu": {
      "1": { "1": [1], "2": [2], "3": [3], "4": [1], "5": [2], "6": [1,2], "7": [2,3] },
      "2": { "1": [3], "2": [1], "3": [2], "4": [3], "5": [1], "6": [2,3], "7": [1,3] }
    }
  }'::jsonb
) on conflict (kunci) do nothing;
