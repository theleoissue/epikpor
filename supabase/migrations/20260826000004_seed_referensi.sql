-- E-Pikpor — data referensi awal (zona, regu, daftar terkendali).
-- Zona Tengah sengaja tidak diisi kasubnit_id — penanggung jawabnya belum
-- ditetapkan (Dokumen Teknis Bagian 15), diputuskan lewat layar Kelola Data
-- setelah personel yang bersangkutan punya akun.

insert into public.zona (nama, urutan_tampil) values
  ('Timur', 1), ('Tengah', 2), ('Barat', 3)
on conflict (nama) do nothing;

insert into public.regu (nomor) values ('1'), ('2'), ('3')
on conflict (nomor) do nothing;

insert into public.jenis_kegiatan (nama) values
  ('Pengaturan'), ('Penjagaan'), ('Pengawalan'), ('Patroli'), ('Penindakan')
on conflict (nama) do nothing;

insert into public.jenis_kecelakaan (nama) values
  ('Tunggal'), ('Ganda (dua kendaraan)'), ('Beruntun (lebih dari dua kendaraan)'), ('Melibatkan Pejalan Kaki')
on conflict (nama) do nothing;

insert into public.tipe_tabrakan (nama) values
  ('Depan – Depan'), ('Depan – Belakang'), ('Depan – Samping'),
  ('Sudut / Menyerong'), ('Serempetan'), ('Terguling / Tunggal'), ('Lainnya')
on conflict (nama) do nothing;
