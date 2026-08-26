-- E-Pikpor — Storage privat untuk foto (bukan bucket publik: berisi foto TKP
-- dan data yang menyangkut orang, diakses lewat signed URL saja).

insert into storage.buckets (id, name, public)
values
  ('foto-kegiatan', 'foto-kegiatan', false),
  ('foto-kejadian', 'foto-kejadian', false),
  ('foto-sesi', 'foto-sesi', false)
on conflict (id) do nothing;

-- Semua pengguna aktif yang login boleh upload (insert) ke bucket-nya sendiri;
-- baca dibatasi ke pengguna aktif juga (kontrol lebih rinci per baris tetap
-- lewat tabel lampiran_*/sesi_piket yang menyimpan path-nya).
create policy "epikpor storage: baca" on storage.objects for select using (
  bucket_id in ('foto-kegiatan', 'foto-kejadian', 'foto-sesi') and public.pengguna_aktif()
);
create policy "epikpor storage: upload" on storage.objects for insert with check (
  bucket_id in ('foto-kegiatan', 'foto-kejadian', 'foto-sesi') and public.pengguna_aktif()
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "epikpor storage: hapus milik sendiri" on storage.objects for delete using (
  bucket_id in ('foto-kegiatan', 'foto-kejadian', 'foto-sesi')
  and (storage.foldername(name))[1] = auth.uid()::text
);
