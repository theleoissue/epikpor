-- RLS-09 log_aktivitas cuma mengizinkan baca untuk entity_type LAPORAN_KEGIATAN/
-- LAPORAN_KEJADIAN/SESI_PIKET -- baris entity_type='PENGGUNA' yang ditulis
-- admin-kelola-akun (aksi 'impersonate') tidak pernah terbaca lewat client
-- sebelum ini, meskipun sudah tersimpan. Dibatasi ke ADMIN saja karena isinya
-- jejak "siapa masuk sebagai siapa", bukan sesuatu yang perlu dilihat semua peran.
create policy "RLS-09 log_aktivitas: baca log impersonasi (admin)" on public.log_aktivitas for select using (
  entity_type = 'PENGGUNA' and public.peran_saya() = 'ADMIN'
);
