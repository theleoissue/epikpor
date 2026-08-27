-- E-Pikpor — pendaftaran mandiri KHUSUS untuk Administrator pertama.
-- Semua akun sesudahnya tetap harus dibuat lewat Kelola Data oleh Admin yang
-- sudah ada (Dokumen Teknis Bagian 5.1) — dua fungsi ini cuma jalan sekali,
-- selama belum ada satu pun baris peran_sistem='ADMIN' di tabel pengguna.

-- Aman dipanggil sebelum login (anon) — cuma mengembalikan true/false, tidak
-- membocorkan data apa pun. Dipakai layar Login untuk memutuskan menampilkan
-- form "Daftar Admin Pertama" atau tidak.
create or replace function public.ada_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pengguna where peran_sistem = 'ADMIN')
$$;
grant execute on function public.ada_admin() to anon, authenticated;

-- Dipanggil SETELAH supabase.auth.signUp() berhasil (jadi auth.uid() sudah
-- terisi sesi milik pemanggil sendiri). Menolak kalau sudah ada Admin
-- manapun -- jadi tidak bisa disalahgunakan untuk bikin Admin tambahan.
create or replace function public.daftar_admin_pertama(p_nama text, p_nrp text, p_pangkat text, p_gelar text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.pengguna where peran_sistem = 'ADMIN') then
    raise exception 'Administrator pertama sudah pernah didaftarkan.';
  end if;
  if auth.uid() is null then
    raise exception 'Sesi tidak ditemukan, silakan coba lagi.';
  end if;

  insert into public.pengguna (id, nama, nrp, pangkat, gelar, peran_sistem, status_aktif)
  values (auth.uid(), p_nama, p_nrp, p_pangkat, p_gelar, 'ADMIN', true);
end;
$$;
grant execute on function public.daftar_admin_pertama(text, text, text, text) to authenticated;
