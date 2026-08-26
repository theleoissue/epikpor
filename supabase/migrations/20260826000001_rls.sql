-- E-Pikpor — Row Level Security
-- Perbaikan kunci dibanding mockup: KASUBNIT bisa verifikasi laporan zonanya
-- sendiri (RLS-05/08), ADMIN TIDAK bisa verifikasi laporan sama sekali (cuma
-- kelola data induk) — kebalikan dari yang salah di mockup.

alter table public.zona enable row level security;
alter table public.regu enable row level security;
alter table public.pengguna enable row level security;
alter table public.jenis_kegiatan enable row level security;
alter table public.jenis_kecelakaan enable row level security;
alter table public.tipe_tabrakan enable row level security;
alter table public.roster_piket enable row level security;
alter table public.roster_personel enable row level security;
alter table public.sesi_piket enable row level security;
alter table public.laporan_kegiatan enable row level security;
alter table public.lampiran_kegiatan enable row level security;
alter table public.laporan_kejadian enable row level security;
alter table public.kejadian_orang enable row level security;
alter table public.kejadian_kendaraan enable row level security;
alter table public.lampiran_kejadian enable row level security;
alter table public.komentar enable row level security;
alter table public.notifikasi enable row level security;
alter table public.log_aktivitas enable row level security;

-- ---------- RLS-01: data induk (zona, regu, jenis_*, tipe_tabrakan) ----------
-- Dibaca semua pengguna aktif; dikelola cuma ADMIN.
create policy "RLS-01 data induk: baca semua" on public.zona for select using (public.pengguna_aktif());
create policy "RLS-01 data induk: kelola admin" on public.zona for all using (public.peran_saya() = 'ADMIN') with check (public.peran_saya() = 'ADMIN');

create policy "RLS-01 regu: baca semua" on public.regu for select using (public.pengguna_aktif());
create policy "RLS-01 regu: kelola admin" on public.regu for all using (public.peran_saya() = 'ADMIN') with check (public.peran_saya() = 'ADMIN');

create policy "RLS-01 jenis_kegiatan: baca semua" on public.jenis_kegiatan for select using (public.pengguna_aktif());
create policy "RLS-01 jenis_kegiatan: kelola admin" on public.jenis_kegiatan for all using (public.peran_saya() = 'ADMIN') with check (public.peran_saya() = 'ADMIN');

create policy "RLS-01 jenis_kecelakaan: baca semua" on public.jenis_kecelakaan for select using (public.pengguna_aktif());
create policy "RLS-01 jenis_kecelakaan: kelola admin" on public.jenis_kecelakaan for all using (public.peran_saya() = 'ADMIN') with check (public.peran_saya() = 'ADMIN');

create policy "RLS-01 tipe_tabrakan: baca semua" on public.tipe_tabrakan for select using (public.pengguna_aktif());
create policy "RLS-01 tipe_tabrakan: kelola admin" on public.tipe_tabrakan for all using (public.peran_saya() = 'ADMIN') with check (public.peran_saya() = 'ADMIN');

-- ---------- RLS-02: pengguna ----------
-- Direktori personel bukan data sensitif (nama/peran/zona) — dibaca semua
-- pengguna aktif supaya roster & pemilihan Kasubnit/Kanit di formulir bisa
-- jalan. Insert akun sesungguhnya lewat Edge Function (service role), tapi
-- policy ini tetap disiapkan untuk operasi lain (update oleh admin).
create policy "RLS-02 pengguna: baca semua" on public.pengguna for select using (public.pengguna_aktif() or id = auth.uid());
create policy "RLS-02 pengguna: admin kelola" on public.pengguna for update using (public.peran_saya() = 'ADMIN') with check (public.peran_saya() = 'ADMIN');
create policy "RLS-02 pengguna: admin hapus" on public.pengguna for delete using (public.peran_saya() = 'ADMIN');

-- ---------- RLS-03: roster ----------
-- Dibaca semua (personel perlu tahu jadwalnya sendiri); dikelola cuma admin.
create policy "RLS-03 roster_piket: baca semua" on public.roster_piket for select using (public.pengguna_aktif());
create policy "RLS-03 roster_piket: kelola admin" on public.roster_piket for all using (public.peran_saya() = 'ADMIN') with check (public.peran_saya() = 'ADMIN');
create policy "RLS-03 roster_personel: baca semua" on public.roster_personel for select using (public.pengguna_aktif());
create policy "RLS-03 roster_personel: kelola admin" on public.roster_personel for all using (public.peran_saya() = 'ADMIN') with check (public.peran_saya() = 'ADMIN');

-- ---------- RLS-04: sesi_piket ----------
-- Baca: pemilik sesi sendiri, Kasubnit zonanya, Kanit/Kasat/Wakasat/KaurBinOps semua zona.
create policy "RLS-04 sesi_piket: baca" on public.sesi_piket for select using (
  pengguna_id = auth.uid()
  or (public.peran_saya() = 'KASUBNIT' and zona_id = public.zona_saya())
  or public.peran_saya() in ('KANIT_GAKKUM', 'KASAT_LANTAS', 'WAKASAT_LANTAS', 'KAUR_BIN_OPS')
);
-- Insert: Banit membuka sesi atas nama sendiri. Dibatasi ke BANIT saja karena
-- sesi_piket.regu_id NOT NULL — Kasubnit tidak punya regu tunggal untuk diisi
-- di sini (perannya mengawasi regu di zonanya, bukan check-in personal).
create policy "RLS-04 sesi_piket: buka sesi sendiri" on public.sesi_piket for insert with check (
  pengguna_id = auth.uid() and public.peran_saya() = 'BANIT'
);
-- Update: pemilik menutup sesi sendiri; Kasubnit zonanya & Kanit boleh verifikasi/kecualikan.
-- WITH CHECK membatasi pemilik cuma boleh membawa status ke MENUNGGU_VERIFIKASI
-- (menutup), bukan langsung ke TERTUTUP/DIKECUALIKAN — kedua status itu cuma
-- tercapai lewat policy verifikasi Kasubnit/Kanit di bawah.
create policy "RLS-04 sesi_piket: tutup sendiri" on public.sesi_piket for update using (
  pengguna_id = auth.uid()
) with check (pengguna_id = auth.uid() and status in ('AKTIF', 'MENUNGGU_VERIFIKASI'));
create policy "RLS-04 sesi_piket: verifikasi kasubnit" on public.sesi_piket for update using (
  public.peran_saya() = 'KASUBNIT' and zona_id = public.zona_saya()
) with check (public.peran_saya() = 'KASUBNIT' and zona_id = public.zona_saya());
create policy "RLS-04 sesi_piket: verifikasi kanit" on public.sesi_piket for update using (
  public.peran_saya() = 'KANIT_GAKKUM'
) with check (public.peran_saya() = 'KANIT_GAKKUM');

-- ---------- RLS-05: laporan_kegiatan ----------
-- Baca: pelapor sendiri; Kasubnit dibatasi zonanya; Kanit/Kasat/Wakasat/KaurBinOps semua zona.
-- ADMIN sengaja TIDAK diberi akses baca di sini — tugasnya cuma data induk (Bagian 4).
create policy "RLS-05 laporan_kegiatan: baca" on public.laporan_kegiatan for select using (
  pelapor_id = auth.uid()
  or (public.peran_saya() = 'KASUBNIT' and zona_id = public.zona_saya())
  or public.peran_saya() in ('KANIT_GAKKUM', 'KASAT_LANTAS', 'WAKASAT_LANTAS', 'KAUR_BIN_OPS')
);
create policy "RLS-05 laporan_kegiatan: lapor" on public.laporan_kegiatan for insert with check (
  pelapor_id = auth.uid() and public.peran_saya() = 'BANIT'
);
-- Pelapor boleh edit laporannya sendiri (isi/lampiran). WITH CHECK sengaja
-- menolak status selain MENUNGGU_VERIFIKASI dan menolak diverifikasi_oleh/pada
-- terisi, supaya pelapor tidak bisa mem-verifikasi laporannya sendiri lewat
-- update langsung — trigger reset_status_kegiatan_saat_edit (lihat migrasi
-- triggers) sudah menormalkan kedua kolom ini SEBELUM check ini dievaluasi,
-- jadi alur "edit laporan yang sudah terverifikasi" tetap lolos.
create policy "RLS-05 laporan_kegiatan: edit sendiri" on public.laporan_kegiatan for update using (
  pelapor_id = auth.uid()
) with check (
  pelapor_id = auth.uid() and status = 'MENUNGGU_VERIFIKASI'
  and diverifikasi_oleh is null and diverifikasi_pada is null
);
-- Verifikasi: Kasubnit zonanya sendiri, Kanit semua zona.
create policy "RLS-05 laporan_kegiatan: verifikasi kasubnit" on public.laporan_kegiatan for update using (
  public.peran_saya() = 'KASUBNIT' and zona_id = public.zona_saya()
) with check (public.peran_saya() = 'KASUBNIT' and zona_id = public.zona_saya());
create policy "RLS-05 laporan_kegiatan: verifikasi kanit" on public.laporan_kegiatan for update using (
  public.peran_saya() = 'KANIT_GAKKUM'
) with check (public.peran_saya() = 'KANIT_GAKKUM');

create policy "RLS-05b lampiran_kegiatan: ikut laporan" on public.lampiran_kegiatan for select using (
  exists (select 1 from public.laporan_kegiatan l where l.id = laporan_kegiatan_id)
);
-- Dibatasi ke laporan yang masih MENUNGGU_VERIFIKASI, supaya lampiran laporan
-- yang sudah diverifikasi tidak bisa diam-diam ditambah/dihapus pelapor.
create policy "RLS-05b lampiran_kegiatan: insert oleh pelapor" on public.lampiran_kegiatan for insert with check (
  exists (select 1 from public.laporan_kegiatan l where l.id = laporan_kegiatan_id and l.pelapor_id = auth.uid() and l.status = 'MENUNGGU_VERIFIKASI')
);
create policy "RLS-05b lampiran_kegiatan: hapus oleh pelapor" on public.lampiran_kegiatan for delete using (
  exists (select 1 from public.laporan_kegiatan l where l.id = laporan_kegiatan_id and l.pelapor_id = auth.uid() and l.status = 'MENUNGGU_VERIFIKASI')
);

-- ---------- RLS-06: laporan_kejadian (+ anak tabelnya) ----------
create policy "RLS-06 laporan_kejadian: baca" on public.laporan_kejadian for select using (
  pelapor_id = auth.uid()
  or (public.peran_saya() = 'KASUBNIT' and zona_id = public.zona_saya())
  or public.peran_saya() in ('KANIT_GAKKUM', 'KASAT_LANTAS', 'WAKASAT_LANTAS', 'KAUR_BIN_OPS')
);
create policy "RLS-06 laporan_kejadian: lapor" on public.laporan_kejadian for insert with check (
  pelapor_id = auth.uid() and public.peran_saya() = 'BANIT'
);
-- Sama seperti RLS-05 laporan_kegiatan: WITH CHECK menolak pelapor
-- mem-verifikasi laporannya sendiri lewat update langsung.
create policy "RLS-06 laporan_kejadian: edit sendiri" on public.laporan_kejadian for update using (
  pelapor_id = auth.uid()
) with check (
  pelapor_id = auth.uid() and status = 'MENUNGGU_VERIFIKASI'
  and diverifikasi_oleh is null and diverifikasi_pada is null
);
create policy "RLS-06 laporan_kejadian: verifikasi kasubnit" on public.laporan_kejadian for update using (
  public.peran_saya() = 'KASUBNIT' and zona_id = public.zona_saya()
) with check (public.peran_saya() = 'KASUBNIT' and zona_id = public.zona_saya());
create policy "RLS-06 laporan_kejadian: verifikasi kanit" on public.laporan_kejadian for update using (
  public.peran_saya() = 'KANIT_GAKKUM'
) with check (public.peran_saya() = 'KANIT_GAKKUM');
-- Dibutuhkan supaya kirimLaporanKejadian() bisa membatalkan (rollback manual)
-- laporan yang baru dibuat kalau insert kendaraan/orang di langkah berikutnya
-- gagal — dibatasi ke laporan milik sendiri yang masih MENUNGGU_VERIFIKASI,
-- jadi laporan yang sudah pernah dilihat/diverifikasi tidak pernah bisa dihapus.
create policy "RLS-06 laporan_kejadian: hapus draf sendiri" on public.laporan_kejadian for delete using (
  pelapor_id = auth.uid() and status = 'MENUNGGU_VERIFIKASI'
);

create policy "RLS-06b kejadian_orang: ikut laporan" on public.kejadian_orang for select using (
  exists (select 1 from public.laporan_kejadian l where l.id = laporan_kejadian_id)
);
-- Dibatasi ke laporan yang masih MENUNGGU_VERIFIKASI di USING juga (bukan cuma
-- WITH CHECK), supaya DELETE pun ikut terblokir setelah laporan diverifikasi
-- (DELETE tidak mengevaluasi WITH CHECK karena tidak ada baris baru).
create policy "RLS-06b kejadian_orang: kelola oleh pelapor" on public.kejadian_orang for all using (
  exists (select 1 from public.laporan_kejadian l where l.id = laporan_kejadian_id and l.pelapor_id = auth.uid() and l.status = 'MENUNGGU_VERIFIKASI')
) with check (
  exists (select 1 from public.laporan_kejadian l where l.id = laporan_kejadian_id and l.pelapor_id = auth.uid() and l.status = 'MENUNGGU_VERIFIKASI')
);

create policy "RLS-06c kejadian_kendaraan: ikut laporan" on public.kejadian_kendaraan for select using (
  exists (select 1 from public.laporan_kejadian l where l.id = laporan_kejadian_id)
);
create policy "RLS-06c kejadian_kendaraan: kelola oleh pelapor" on public.kejadian_kendaraan for all using (
  exists (select 1 from public.laporan_kejadian l where l.id = laporan_kejadian_id and l.pelapor_id = auth.uid() and l.status = 'MENUNGGU_VERIFIKASI')
) with check (
  exists (select 1 from public.laporan_kejadian l where l.id = laporan_kejadian_id and l.pelapor_id = auth.uid() and l.status = 'MENUNGGU_VERIFIKASI')
);

create policy "RLS-06d lampiran_kejadian: ikut laporan" on public.lampiran_kejadian for select using (
  exists (select 1 from public.laporan_kejadian l where l.id = laporan_kejadian_id)
);
create policy "RLS-06d lampiran_kejadian: kelola oleh pelapor" on public.lampiran_kejadian for all using (
  exists (select 1 from public.laporan_kejadian l where l.id = laporan_kejadian_id and l.pelapor_id = auth.uid() and l.status = 'MENUNGGU_VERIFIKASI')
) with check (
  exists (select 1 from public.laporan_kejadian l where l.id = laporan_kejadian_id and l.pelapor_id = auth.uid() and l.status = 'MENUNGGU_VERIFIKASI')
);

-- ---------- RLS-07: komentar ----------
-- Ikut visibilitas laporan induknya (kegiatan/kejadian).
create policy "RLS-07 komentar: baca" on public.komentar for select using (
  (tipe = 'KEGIATAN' and exists (select 1 from public.laporan_kegiatan l where l.id = ref_id))
  or (tipe = 'KEJADIAN' and exists (select 1 from public.laporan_kejadian l where l.id = ref_id))
);
create policy "RLS-07 komentar: tulis" on public.komentar for insert with check (
  author_id = auth.uid() and (
    (tipe = 'KEGIATAN' and exists (select 1 from public.laporan_kegiatan l where l.id = ref_id))
    or (tipe = 'KEJADIAN' and exists (select 1 from public.laporan_kejadian l where l.id = ref_id))
  )
);

-- ---------- RLS-08: notifikasi ----------
-- Cuma pemilik yang bisa baca/tandai terbaca. Insert cuma lewat trigger
-- security definer (lihat migrasi triggers) — tidak ada policy insert untuk
-- client, jadi default-deny berlaku.
create policy "RLS-08 notifikasi: baca sendiri" on public.notifikasi for select using (untuk_pengguna_id = auth.uid());
create policy "RLS-08 notifikasi: tandai terbaca" on public.notifikasi for update using (untuk_pengguna_id = auth.uid()) with check (untuk_pengguna_id = auth.uid());

-- ---------- RLS-09: log_aktivitas ----------
-- Baca saja, ikut visibilitas entitasnya; ditulis cuma lewat trigger.
create policy "RLS-09 log_aktivitas: baca" on public.log_aktivitas for select using (
  (entity_type = 'LAPORAN_KEGIATAN' and exists (select 1 from public.laporan_kegiatan l where l.id = entity_id))
  or (entity_type = 'LAPORAN_KEJADIAN' and exists (select 1 from public.laporan_kejadian l where l.id = entity_id))
  or (entity_type = 'SESI_PIKET' and exists (select 1 from public.sesi_piket s where s.id = entity_id))
);
