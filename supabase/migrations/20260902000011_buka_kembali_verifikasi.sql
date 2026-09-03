-- "Buka kembali" verifikasi.
--
-- Sebelum ini, laporan yang sudah TERVERIFIKASI tidak dapat dikoreksi siapa
-- pun: pelapor hanya boleh menyunting selama masih MENUNGGU_VERIFIKASI, dan
-- verifikator tidak punya jalur koreksi sama sekali. Jam atau lokasi yang
-- keliru dan terlanjur disahkan menjadi salah secara permanen — tidak layak
-- untuk catatan yang dipakai sebagai dasar administrasi perkara.
--
-- Yang ditambahkan BUKAN wewenang menyunting diam-diam atas dokumen yang sudah
-- disahkan, melainkan pembatalan pengesahan yang tercatat: verifikator
-- mengembalikan laporan ke MENUNGGU_VERIFIKASI, pelapor memperbaiki lewat
-- jalur biasa, lalu laporan diverifikasi ulang. Pemisahan wewenang tetap utuh.
--
-- Perubahan status itu sendiri sudah diizinkan RLS (Kasubnit pada zonanya,
-- Kanit pada semua zona). Yang belum ada adalah jejaknya — trigger lama hanya
-- mencatat bila ISI laporan berubah, bukan bila pengesahannya dibatalkan.

create or replace function public.reset_status_kegiatan_saat_edit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'TERVERIFIKASI' and new.status = 'TERVERIFIKASI' and (
    old.jenis_kegiatan_id is distinct from new.jenis_kegiatan_id or
    old.lokasi is distinct from new.lokasi or
    old.keterangan is distinct from new.keterangan
  ) then
    new.status := 'MENUNGGU_VERIFIKASI';
    new.diverifikasi_oleh := null;
    new.diverifikasi_pada := null;
    insert into public.log_aktivitas (entity_type, entity_id, aktor_id, aksi, detail)
      values ('LAPORAN_KEGIATAN', new.id, auth.uid(), 'Laporan diedit, status dikembalikan ke Menunggu Verifikasi', null);
  end if;

  -- Pembatalan pengesahan oleh verifikator.
  if old.status = 'TERVERIFIKASI' and new.status = 'MENUNGGU_VERIFIKASI' then
    new.diverifikasi_oleh := null;
    new.diverifikasi_pada := null;
    insert into public.log_aktivitas (entity_type, entity_id, aktor_id, aksi, detail)
      values ('LAPORAN_KEGIATAN', new.id, auth.uid(), 'Verifikasi dibuka kembali untuk perbaikan', null);
  end if;

  return new;
end;
$$;

create or replace function public.reset_status_kejadian_saat_edit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  perubahan jsonb := '[]'::jsonb;
begin
  if old.waktu_diterima is distinct from new.waktu_diterima then
    perubahan := perubahan || jsonb_build_object('field', 'Laporan diterima', 'dari', old.waktu_diterima, 'ke', new.waktu_diterima);
  end if;
  if old.waktu_penanganan is distinct from new.waktu_penanganan then
    perubahan := perubahan || jsonb_build_object('field', 'Dalam penanganan', 'dari', old.waktu_penanganan, 'ke', new.waktu_penanganan);
  end if;
  if old.waktu_selesai is distinct from new.waktu_selesai then
    perubahan := perubahan || jsonb_build_object('field', 'Laporan selesai', 'dari', old.waktu_selesai, 'ke', new.waktu_selesai);
  end if;

  if jsonb_array_length(perubahan) > 0 then
    insert into public.log_aktivitas (entity_type, entity_id, aktor_id, aksi, detail)
      values ('LAPORAN_KEJADIAN', new.id, auth.uid(), 'Penyuntingan stempel waktu', perubahan);
  end if;

  if old.status = 'TERVERIFIKASI' and new.status = 'TERVERIFIKASI' and (
    jsonb_array_length(perubahan) > 0 or
    old.lokasi is distinct from new.lokasi or
    old.kronologis_pra is distinct from new.kronologis_pra or
    old.kronologis_saat is distinct from new.kronologis_saat or
    old.kronologis_pasca is distinct from new.kronologis_pasca
  ) then
    new.status := 'MENUNGGU_VERIFIKASI';
    new.diverifikasi_oleh := null;
    new.diverifikasi_pada := null;
    insert into public.log_aktivitas (entity_type, entity_id, aktor_id, aksi, detail)
      values ('LAPORAN_KEJADIAN', new.id, auth.uid(), 'Laporan diedit, status dikembalikan ke Menunggu Verifikasi', null);
  end if;

  -- Pembatalan pengesahan oleh verifikator.
  if old.status = 'TERVERIFIKASI' and new.status = 'MENUNGGU_VERIFIKASI' then
    new.diverifikasi_oleh := null;
    new.diverifikasi_pada := null;
    insert into public.log_aktivitas (entity_type, entity_id, aktor_id, aksi, detail)
      values ('LAPORAN_KEJADIAN', new.id, auth.uid(), 'Verifikasi dibuka kembali untuk perbaikan', null);
  end if;

  if old.status is distinct from new.status and new.status = 'TERVERIFIKASI' then
    new.diverifikasi_oleh := auth.uid();
    new.diverifikasi_pada := now();
  end if;

  return new;
end;
$$;
