-- Melengkapi RLS-11 (lihat 20260904000016_tambah_foto_kejadian_admin_kanit.sql)
-- yang cuma mencakup lampiran_kejadian — kelewat waktu fitur "+ Tambah Foto"
-- diperluas ke Laporan Kegiatan juga (DetailModal.jsx, tambahLampiranKegiatan),
-- sehingga upload dari UI gagal dengan error RLS ("new row violates row-level
-- security policy for table lampiran_kegiatan"). Sama seperti wewenang hapus
-- arsip (RLS-10) dan tambah foto kejadian (RLS-11).

create policy "RLS-11 lampiran_kegiatan: tambah admin/kanit" on public.lampiran_kegiatan for insert with check (
  public.peran_saya() in ('ADMIN', 'KANIT_GAKKUM')
);
