-- E-Pikpor — trigger untuk jejak audit, notifikasi otomatis, dan reset status
-- verifikasi saat laporan diedit. Semua ditulis di sisi server (security
-- definer) supaya tidak bisa dipalsukan dari client — beda dengan mockup yang
-- menulis editLog dari JS di browser.

-- ============================================================
-- 1. updated_at otomatis
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_laporan_kegiatan_updated_at before update on public.laporan_kegiatan
  for each row execute function public.set_updated_at();
create trigger trg_laporan_kejadian_updated_at before update on public.laporan_kejadian
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. Reset status ke MENUNGGU_VERIFIKASI kalau pelapor mengedit laporan yang
--    sudah TERVERIFIKASI. Terdeteksi dari: status tidak diubah eksplisit oleh
--    pemanggil (NEW.status masuk sama dengan OLD.status) tapi ada field isi
--    yang berubah. Kalau memang verifier yang mengubah status, NEW.status
--    akan beda dari OLD.status, jadi blok ini tidak kena.
-- ============================================================

-- security definer: fungsi ini insert ke log_aktivitas, yang sengaja tidak
-- punya policy insert untuk client (RLS-09 cuma punya policy select).
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
  return new;
end;
$$;

create trigger trg_kegiatan_reset_status before update on public.laporan_kegiatan
  for each row execute function public.reset_status_kegiatan_saat_edit();

create or replace function public.reset_status_kejadian_saat_edit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  perubahan jsonb := '[]'::jsonb;
begin
  if old.w1 is distinct from new.w1 then perubahan := perubahan || jsonb_build_object('field', 'W1', 'dari', old.w1, 'ke', new.w1); end if;
  if old.w2 is distinct from new.w2 then perubahan := perubahan || jsonb_build_object('field', 'W2', 'dari', old.w2, 'ke', new.w2); end if;
  if old.w3 is distinct from new.w3 then perubahan := perubahan || jsonb_build_object('field', 'W3', 'dari', old.w3, 'ke', new.w3); end if;
  if old.w4 is distinct from new.w4 then perubahan := perubahan || jsonb_build_object('field', 'W4', 'dari', old.w4, 'ke', new.w4); end if;
  if old.w5 is distinct from new.w5 then perubahan := perubahan || jsonb_build_object('field', 'W5', 'dari', old.w5, 'ke', new.w5); end if;

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

  if old.status is distinct from new.status and new.status = 'TERVERIFIKASI' then
    new.diverifikasi_oleh := auth.uid();
    new.diverifikasi_pada := now();
  end if;

  return new;
end;
$$;

create trigger trg_kejadian_reset_status before update on public.laporan_kejadian
  for each row execute function public.reset_status_kejadian_saat_edit();

-- Verifikasi laporan_kegiatan juga catat siapa & kapan (kolomnya diisi manual
-- di sini karena laporan_kegiatan tidak punya trigger W1-W5 seperti di atas).
create or replace function public.catat_verifikasi_kegiatan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status and new.status = 'TERVERIFIKASI' then
    new.diverifikasi_oleh := auth.uid();
    new.diverifikasi_pada := now();
    insert into public.log_aktivitas (entity_type, entity_id, aktor_id, aksi, detail)
      values ('LAPORAN_KEGIATAN', new.id, auth.uid(), 'Laporan diverifikasi', null);
  end if;
  return new;
end;
$$;

create trigger trg_kegiatan_catat_verifikasi before update on public.laporan_kegiatan
  for each row execute function public.catat_verifikasi_kegiatan();

-- ============================================================
-- 3. Notifikasi otomatis ke Kasubnit zona terkait + Kanit Gakkum saat
--    kejadian kecelakaan baru dilaporkan (Bagian 5.8, alur kerja langkah 6).
--    Security definer supaya bisa insert notifikasi untuk pengguna lain,
--    melewati RLS-08 yang sengaja tidak punya policy insert untuk client.
-- ============================================================

create or replace function public.notifikasi_kejadian_baru()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  nama_zona text;
begin
  select nama into nama_zona from public.zona where id = new.zona_id;

  insert into public.notifikasi (untuk_pengguna_id, teks, tipe, ref_id)
  select id, format('Kejadian kecelakaan baru dilaporkan di %s (Zona %s).', new.lokasi, coalesce(nama_zona, '-')), 'KEJADIAN', new.id
  from public.pengguna
  where status_aktif and (
    (peran_sistem = 'KASUBNIT' and zona_id = new.zona_id)
    or peran_sistem = 'KANIT_GAKKUM'
  );

  return new;
end;
$$;

create trigger trg_notifikasi_kejadian_baru after insert on public.laporan_kejadian
  for each row execute function public.notifikasi_kejadian_baru();

-- Notifikasi ke pelapor saat laporannya (kegiatan/kejadian) diverifikasi.
create or replace function public.notifikasi_laporan_diverifikasi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status and new.status = 'TERVERIFIKASI' then
    insert into public.notifikasi (untuk_pengguna_id, teks, tipe, ref_id)
    values (new.pelapor_id, format('Laporan Anda di %s telah diverifikasi.', new.lokasi), TG_ARGV[0], new.id);
  end if;
  return new;
end;
$$;

create trigger trg_notif_verif_kegiatan after update on public.laporan_kegiatan
  for each row execute function public.notifikasi_laporan_diverifikasi('KEGIATAN');
create trigger trg_notif_verif_kejadian after update on public.laporan_kejadian
  for each row execute function public.notifikasi_laporan_diverifikasi('KEJADIAN');

-- ============================================================
-- 4. Jejak aktivitas sesi piket: buka, tutup, verifikasi, pengecualian.
-- ============================================================

create or replace function public.log_sesi_piket_buka()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.log_aktivitas (entity_type, entity_id, aktor_id, aksi, detail)
  values ('SESI_PIKET', new.id, new.pengguna_id, 'Membuka sesi piket', null);
  return new;
end;
$$;

create trigger trg_sesi_piket_buka after insert on public.sesi_piket
  for each row execute function public.log_sesi_piket_buka();

create or replace function public.log_sesi_piket_ubah()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.waktu_tutup is null and new.waktu_tutup is not null then
    insert into public.log_aktivitas (entity_type, entity_id, aktor_id, aksi, detail)
    values ('SESI_PIKET', new.id, auth.uid(), 'Menutup sesi dengan sebab ' || coalesce(new.sebab_tutup::text, '-'), null);
  end if;
  if old.status is distinct from new.status and new.status = 'TERTUTUP' then
    insert into public.log_aktivitas (entity_type, entity_id, aktor_id, aksi, detail)
    values ('SESI_PIKET', new.id, auth.uid(), 'Sesi piket diverifikasi', null);
    insert into public.notifikasi (untuk_pengguna_id, teks, tipe, ref_id)
    values (new.pengguna_id, 'Sesi piket Anda telah diverifikasi.', 'SESI', new.id);
  end if;
  if old.status is distinct from new.status and new.status = 'DIKECUALIKAN' then
    insert into public.log_aktivitas (entity_type, entity_id, aktor_id, aksi, detail)
    values ('SESI_PIKET', new.id, auth.uid(), 'Diberi pengecualian: ' || coalesce(new.catatan_kanit, '-'), null);
  end if;
  return new;
end;
$$;

create trigger trg_sesi_piket_ubah after update on public.sesi_piket
  for each row execute function public.log_sesi_piket_ubah();
