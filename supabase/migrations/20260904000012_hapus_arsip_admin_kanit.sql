-- E-Pikpor — Hapus permanen dari Arsip, khusus ADMIN & KANIT_GAKKUM.
-- Sebelum ini tidak ada jalur hapus sama sekali untuk laporan_kegiatan,
-- laporan_kejadian, dan sesi_piket (kecuali draf milik sendiri yang belum
-- diverifikasi). Ini permanen (bukan soft-delete) sesuai permintaan client —
-- konfirmasi "ketik HAPUS" ditegakkan di sisi UI (src/pages/Arsip.jsx).

-- Tabel anak ikut kena DELETE lewat ON DELETE CASCADE saat induknya dihapus,
-- dan cascade tetap dievaluasi terhadap RLS tabel anak untuk role yang
-- menjalankan DELETE-nya — jadi policy ini juga perlu ada di tabel anak,
-- bukan cuma di laporan_kegiatan/laporan_kejadian/sesi_piket saja.

create policy "RLS-10 laporan_kegiatan: hapus admin/kanit" on public.laporan_kegiatan for delete using (
  public.peran_saya() in ('ADMIN', 'KANIT_GAKKUM')
);
create policy "RLS-10 lampiran_kegiatan: hapus admin/kanit" on public.lampiran_kegiatan for delete using (
  public.peran_saya() in ('ADMIN', 'KANIT_GAKKUM')
);

create policy "RLS-10 laporan_kejadian: hapus admin/kanit" on public.laporan_kejadian for delete using (
  public.peran_saya() in ('ADMIN', 'KANIT_GAKKUM')
);
create policy "RLS-10 kejadian_orang: hapus admin/kanit" on public.kejadian_orang for delete using (
  public.peran_saya() in ('ADMIN', 'KANIT_GAKKUM')
);
create policy "RLS-10 kejadian_kendaraan: hapus admin/kanit" on public.kejadian_kendaraan for delete using (
  public.peran_saya() in ('ADMIN', 'KANIT_GAKKUM')
);
create policy "RLS-10 lampiran_kejadian: hapus admin/kanit" on public.lampiran_kejadian for delete using (
  public.peran_saya() in ('ADMIN', 'KANIT_GAKKUM')
);

create policy "RLS-10 sesi_piket: hapus admin/kanit" on public.sesi_piket for delete using (
  public.peran_saya() in ('ADMIN', 'KANIT_GAKKUM')
);

-- Storage: policy "hapus milik sendiri" yang sudah ada cuma izinkan uploader
-- aslinya menghapus filenya sendiri — ditambah policy ini supaya ADMIN/KANIT
-- bisa ikut membersihkan file foto saat menghapus laporan/sesi milik orang lain.
create policy "epikpor storage: hapus admin/kanit" on storage.objects for delete using (
  bucket_id in ('foto-kegiatan', 'foto-kejadian', 'foto-sesi') and public.peran_saya() in ('ADMIN', 'KANIT_GAKKUM')
);
