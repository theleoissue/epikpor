-- Sebelumnya foto kejadian cuma bisa dilampirkan pelapor saat pertama kali
-- mengirim laporan (RLS-06d membatasi ke pelapor & status MENUNGGU_VERIFIKASI)
-- — tidak ada jalur menambah foto susulan ke laporan yang sudah terkirim.
-- Ditambah di sini supaya ADMIN/KANIT_GAKKUM bisa melampirkan foto TKP yang
-- menyusul (mis. dari dokumentasi manual/WhatsApp lama), permanen tanpa
-- batas status — sama seperti wewenang hapus arsip (RLS-10).

create policy "RLS-11 lampiran_kejadian: tambah admin/kanit" on public.lampiran_kejadian for insert with check (
  public.peran_saya() in ('ADMIN', 'KANIT_GAKKUM')
);
