-- E-Pikpor — titik rawan (blackspot) dan rekap historis sebelum E-Pikpor
-- berjalan. Sumber: Blackspot 2025-2026.pdf dan E-PIKPOR.pdf (Laporan
-- Bulanan Jan-Jul 2026) yang diberikan client.

create table public.titik_rawan (
  id uuid primary key default gen_random_uuid(),
  nama_jalan text not null,
  latitude numeric not null,
  longitude numeric not null,
  jumlah_laka int not null default 0,
  jumlah_point int not null default 0,
  md int not null default 0,
  lb int not null default 0,
  lr int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.titik_rawan enable row level security;
create policy "titik_rawan: baca semua" on public.titik_rawan for select using (public.pengguna_aktif());
create policy "titik_rawan: kelola admin" on public.titik_rawan for all using (public.peran_saya() = 'ADMIN') with check (public.peran_saya() = 'ADMIN');

insert into public.titik_rawan (nama_jalan, latitude, longitude, jumlah_laka, jumlah_point, md, lb, lr) values
  ('Jl. DR. Setiabudhi depan Toko Komala No. 371', -6.87327954862527, 107.59525724113922, 6, 42, 5, 0, 4),
  ('Jl. A. Yani depan Gg. Babakan H. Tamim', -6.906489820531188, 107.64745157841132, 4, 31, 3, 2, 7),
  ('Jl. Raya Cipadung No. 82, Cipadung Wetan', -6.933011933, 107.7160711, 5, 32, 3, 1, 6),
  ('Jl. Pajajaran No. 92, Pamoyanan', -6.907025104, 107.5926662, 7, 42, 3, 3, 5);

-- Rekap bulanan SEBELUM E-Pikpor berjalan (data historis dari Laporan Bulanan
-- fisik) -- beda dengan rekap yang dihitung Dashboard dari laporan_kejadian,
-- yang cuma punya data sejak aplikasi ini dipakai.
create table public.rekap_historis (
  id uuid primary key default gen_random_uuid(),
  tahun int not null,
  bulan int not null check (bulan between 1 and 12),
  jumlah_kejadian int not null default 0,
  korban_md int not null default 0,
  korban_lb int not null default 0,
  korban_lr int not null default 0,
  kerugian_total numeric not null default 0,
  unique (tahun, bulan)
);
alter table public.rekap_historis enable row level security;
create policy "rekap_historis: baca semua" on public.rekap_historis for select using (public.pengguna_aktif());
create policy "rekap_historis: kelola admin" on public.rekap_historis for all using (public.peran_saya() = 'ADMIN') with check (public.peran_saya() = 'ADMIN');

insert into public.rekap_historis (tahun, bulan, jumlah_kejadian, korban_md, korban_lb, korban_lr, kerugian_total) values
  (2026, 1, 58, 15, 20, 59, 117800000),
  (2026, 2, 51, 7, 11, 62, 188850000),
  (2026, 3, 41, 10, 12, 40, 93250000),
  (2026, 4, 66, 14, 39, 53, 59450000),
  (2026, 5, 50, 5, 38, 38, 94800000),
  (2026, 6, 55, 15, 31, 38, 71300000),
  (2026, 7, 46, 10, 32, 32, 99100000);
