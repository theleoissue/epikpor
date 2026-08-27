-- Menyederhanakan stempel waktu kejadian dari lima (W1-W5, Dokumen Teknis
-- Bagian 7) menjadi tiga tahap sesuai permintaan client:
--   W1 (panggilan masuk)        -> waktu_diterima   "Laporan diterima"
--   W3 (tiba di TKP)            -> waktu_penanganan "Dalam penanganan"
--   W5 (laporan selesai)        -> waktu_selesai    "Laporan selesai"
-- W2 (laporan diterima petugas) dan W4 (kronologis selesai) dihapus.
--
-- Data lama dipindahkan lebih dulu supaya laporan yang sudah tersimpan tidak
-- kehilangan jamnya. Kolom lama baru di-drop setelah penyalinan selesai.

alter table public.laporan_kejadian
  add column waktu_diterima   timestamptz,
  add column waktu_penanganan timestamptz,
  add column waktu_selesai    timestamptz;

update public.laporan_kejadian
set waktu_diterima   = w1,
    waktu_penanganan = w3,
    waktu_selesai    = w5;

-- Trigger lama masih menyebut w1-w5; diganti lebih dulu supaya drop column
-- di bawah tidak gagal karena fungsi yang masih bergantung padanya.
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

  if old.status is distinct from new.status and new.status = 'TERVERIFIKASI' then
    new.diverifikasi_oleh := auth.uid();
    new.diverifikasi_pada := now();
  end if;

  return new;
end;
$$;

alter table public.laporan_kejadian
  drop column w1,
  drop column w2,
  drop column w3,
  drop column w4,
  drop column w5;
