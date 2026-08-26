-- E-Pikpor — deteksi sesi piket yang terlupa ditutup (Dokumen Teknis Bagian
-- 5.3: "Sesi yang terlupa ditutup akan ditutup sistem setelah lewat delapan
-- belas jam, dengan sebab yang tercatat, dan tidak menghalangi pemiliknya
-- membuka sesi berikutnya.").
--
-- Fungsi ini TIDAK terjadwal otomatis — supabase-js tidak bisa membuat cron
-- job dari migrasi biasa. Jadwalkan lewat salah satu cara berikut setelah
-- migrasi ini berhasil dijalankan:
--   a) Kalau ekstensi pg_cron tersedia di plan Supabase Anda: jalankan sekali
--      lewat SQL Editor:
--        select cron.schedule('tutup-sesi-lewat-18-jam', '0 * * * *',
--          'select public.tutup_sesi_lewat_18_jam()');
--   b) Kalau tidak: buat Edge Function tipis yang memanggil
--      supabase.rpc('tutup_sesi_lewat_18_jam') dan jadwalkan lewat
--      Database Webhooks / Scheduled Triggers di dashboard Supabase.
-- Sebelum salah satu di atas terpasang, sesi yang lewat 18 jam TIDAK akan
-- tertutup sendiri — halaman Verifikasi > tab Sesi Piket akan tetap kosong
-- untuk kasus ini sampai fungsi ini benar-benar dijadwalkan berjalan.

create or replace function public.tutup_sesi_lewat_18_jam()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.sesi_piket
  set status = 'PELANGGARAN_TIDAK_DITUTUP',
      sebab_tutup = 'DITUTUP_SISTEM',
      waktu_tutup = now()
  where status = 'AKTIF' and waktu_buka < now() - interval '18 hours';
end;
$$;
