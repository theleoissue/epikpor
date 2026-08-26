-- E-Pikpor — skema awal
-- Sumber: Dokumen_Teknis_E-PIKPOR_v1.docx Bagian 4 (peran & akses), Bagian 7-9 (waktu
-- tanggap & keutuhan data), Bagian 11 (struktur data), diperluas sesuai permintaan
-- langsung client untuk formulir Kejadian Kecelakaan (identitas orang/kendaraan,
-- faktor penyebab, tindakan, RTL).

-- ============================================================
-- 1. ENUM
-- ============================================================

create type peran_sistem as enum (
  'KASAT_LANTAS', 'WAKASAT_LANTAS', 'KANIT_GAKKUM', 'KAUR_BIN_OPS', 'KASUBNIT', 'BANIT', 'ADMIN'
);

create type mode_hari as enum (
  'HARI_KERJA', 'AKHIR_PEKAN', 'LIBUR_NASIONAL_BIASA', 'LIBUR_PANJANG', 'OPERASI_KEPOLISIAN', 'KEADAAN_DARURAT'
);

create type sebab_tutup_sesi as enum ('SERAH_TERIMA', 'DITUTUP_PENGAWAS', 'DITUTUP_SISTEM');

create type status_sesi_piket as enum (
  'AKTIF', 'MENUNGGU_VERIFIKASI', 'TERTUTUP',
  'PELANGGARAN_TIDAK_DITUTUP', 'PELANGGARAN_TIDAK_BUKA', 'DIKECUALIKAN'
);

create type status_laporan as enum ('MENUNGGU_VERIFIKASI', 'TERVERIFIKASI');

create type status_penanganan_kejadian as enum ('MASIH_DALAM_PENANGANAN', 'SELESAI_DITANGANI_DI_TKP');

create type status_tersangka_kejadian as enum ('BELUM_DIKETAHUI', 'SUDAH_DIKETAHUI');

create type kondisi_korban as enum (
  'SELAMAT', 'LUKA_RINGAN', 'LUKA_BERAT', 'MENINGGAL_DUNIA', 'DALAM_PERAWATAN'
);

-- ============================================================
-- 2. DATA INDUK
-- ============================================================

create table public.zona (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  urutan_tampil int not null default 0
);

create table public.regu (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique
);

-- id = auth.users.id, sesuai pola Supabase standar, supaya auth.uid() bisa
-- dibandingkan langsung di RLS tanpa join (pola yang sama dipakai di SIANDI).
create table public.pengguna (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  nrp text not null unique,
  pangkat text,
  gelar text,
  peran_sistem peran_sistem not null,
  zona_id uuid references public.zona(id),
  regu_id uuid references public.regu(id),
  status_aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Zona menunjuk kasubnit-nya lewat kolom ini (boleh null — merepresentasikan
-- Zona Tengah yang penanggung jawabnya belum ditetapkan, Dokumen Teknis Bagian 15).
alter table public.zona add column kasubnit_id uuid references public.pengguna(id);

create table public.jenis_kegiatan (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  aktif boolean not null default true
);

create table public.jenis_kecelakaan (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  aktif boolean not null default true
);

create table public.tipe_tabrakan (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  aktif boolean not null default true
);

-- ============================================================
-- 3. ROSTER PIKET (modul yang belum ada sama sekali di mockup)
-- ============================================================

create table public.roster_piket (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  mode_hari mode_hari not null,
  zona_id uuid not null references public.zona(id),
  regu_id uuid not null references public.regu(id),
  disusun_oleh uuid not null references public.pengguna(id),
  created_at timestamptz not null default now(),
  unique (tanggal, zona_id, regu_id)
);

create table public.roster_personel (
  id uuid primary key default gen_random_uuid(),
  roster_piket_id uuid not null references public.roster_piket(id) on delete cascade,
  pengguna_id uuid not null references public.pengguna(id),
  unique (roster_piket_id, pengguna_id)
);

-- ============================================================
-- 4. SESI PIKET
-- ============================================================

create table public.sesi_piket (
  id uuid primary key default gen_random_uuid(),
  pengguna_id uuid not null references public.pengguna(id),
  zona_id uuid not null references public.zona(id),
  regu_id uuid not null references public.regu(id),
  waktu_buka timestamptz not null default now(),
  foto_swafoto_path text,
  foto_lokasi_path text,
  koordinat_buka jsonb,
  waktu_tutup timestamptz,
  sebab_tutup sebab_tutup_sesi,
  foto_serah_terima_path text,
  status status_sesi_piket not null default 'AKTIF',
  ditutup_oleh uuid references public.pengguna(id),
  catatan_kanit text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. LAPORAN KEGIATAN
-- ============================================================

create table public.laporan_kegiatan (
  id uuid primary key default gen_random_uuid(),
  jenis_kegiatan_id uuid not null references public.jenis_kegiatan(id),
  lokasi text not null,
  koordinat jsonb,
  keterangan text,
  waktu_kirim timestamptz not null default now(),
  lama_pengisian_detik int,
  zona_id uuid not null references public.zona(id),
  regu_id uuid not null references public.regu(id),
  sesi_piket_id uuid references public.sesi_piket(id),
  -- salinan data pelapor sesuai Bagian 9 (keutuhan data terhadap mutasi personel)
  pelapor_id uuid not null references public.pengguna(id),
  pelapor_nama text not null,
  pelapor_pangkat text,
  pelapor_nrp text,
  status status_laporan not null default 'MENUNGGU_VERIFIKASI',
  diverifikasi_oleh uuid references public.pengguna(id),
  diverifikasi_pada timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lampiran_kegiatan (
  id uuid primary key default gen_random_uuid(),
  laporan_kegiatan_id uuid not null references public.laporan_kegiatan(id) on delete cascade,
  storage_path text not null,
  urutan int not null default 0
);

-- ============================================================
-- 6. LAPORAN KEJADIAN KECELAKAAN (diperluas sesuai permintaan client)
-- ============================================================

create table public.laporan_kejadian (
  id uuid primary key default gen_random_uuid(),
  -- lima stempel waktu, Bagian 7
  w1 timestamptz,
  w2 timestamptz,
  w3 timestamptz,
  w4 timestamptz,
  w5 timestamptz,
  lokasi text not null,
  koordinat jsonb,
  jenis_kecelakaan_id uuid references public.jenis_kecelakaan(id),
  tipe_tabrakan_id uuid references public.tipe_tabrakan(id),
  status_penanganan status_penanganan_kejadian not null default 'MASIH_DALAM_PENANGANAN',
  tabrak_lari boolean not null default false,
  tkp_ditangani boolean not null default true,
  kendaraan_diamankan boolean not null default false,
  status_tersangka status_tersangka_kejadian not null default 'BELUM_DIKETAHUI',
  nama_tersangka text,
  kerugian_materiil numeric,
  kronologis_pra text,
  kronologis_saat text,
  kronologis_pasca text,
  -- {checked: string[], lainnya: string} — bentuk data persis seperti yang dipakai client
  faktor_manusia jsonb not null default '{"checked":[],"lainnya":""}',
  faktor_kendaraan jsonb not null default '{"checked":[],"lainnya":""}',
  faktor_jalan jsonb not null default '{}',
  faktor_cuaca jsonb not null default '{}',
  tindakan jsonb not null default '{"checked":[],"lainnya":""}',
  rtl jsonb not null default '[]',
  personel_tambahan jsonb not null default '[]',
  zona_id uuid not null references public.zona(id),
  regu_id uuid not null references public.regu(id),
  sesi_piket_id uuid references public.sesi_piket(id),
  pelapor_id uuid not null references public.pengguna(id),
  pelapor_nama text not null,
  pelapor_pangkat text,
  pelapor_nrp text,
  status status_laporan not null default 'MENUNGGU_VERIFIKASI',
  diverifikasi_oleh uuid references public.pengguna(id),
  diverifikasi_pada timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kejadian_kendaraan (
  id uuid primary key default gen_random_uuid(),
  laporan_kejadian_id uuid not null references public.laporan_kejadian(id) on delete cascade,
  kategori text,
  merk text,
  nopol text
);

create table public.kejadian_orang (
  id uuid primary key default gen_random_uuid(),
  laporan_kejadian_id uuid not null references public.laporan_kejadian(id) on delete cascade,
  nama text,
  jenis_kelamin text,
  pekerjaan text,
  tempat_lahir text,
  tanggal_lahir date,
  alamat text,
  peran text,
  kendaraan_id uuid references public.kejadian_kendaraan(id) on delete set null,
  kondisi kondisi_korban not null default 'SELAMAT',
  rs_rujukan text,
  -- {stnk: bool, sim: bool, sim_jenis: string, ktp: bool, helm_sabuk: bool}
  kelengkapan jsonb not null default '{"stnk":false,"sim":false,"sim_jenis":"","ktp":false,"helm_sabuk":false}'
);

create table public.lampiran_kejadian (
  id uuid primary key default gen_random_uuid(),
  laporan_kejadian_id uuid not null references public.laporan_kejadian(id) on delete cascade,
  storage_path text not null,
  urutan int not null default 0
);

-- ============================================================
-- 7. KOMENTAR, NOTIFIKASI, JEJAK AUDIT
-- ============================================================

create table public.komentar (
  id uuid primary key default gen_random_uuid(),
  tipe text not null check (tipe in ('KEGIATAN', 'KEJADIAN')),
  ref_id uuid not null,
  author_id uuid not null references public.pengguna(id),
  teks text not null,
  created_at timestamptz not null default now()
);

create table public.notifikasi (
  id uuid primary key default gen_random_uuid(),
  untuk_pengguna_id uuid not null references public.pengguna(id),
  teks text not null,
  tipe text,
  ref_id uuid,
  dibaca boolean not null default false,
  created_at timestamptz not null default now()
);

-- Satu tabel generik untuk seluruh jejak audit (penyuntingan stempel waktu,
-- buka/tutup sesi, perubahan status verifikasi) — ditulis lewat trigger,
-- bukan dari client, supaya tidak bisa dipalsukan (lihat migrasi triggers).
create table public.log_aktivitas (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  aktor_id uuid references public.pengguna(id),
  aksi text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index on public.laporan_kegiatan (zona_id);
create index on public.laporan_kegiatan (pelapor_id);
create index on public.laporan_kejadian (zona_id);
create index on public.laporan_kejadian (pelapor_id);
create index on public.sesi_piket (pengguna_id);
create index on public.sesi_piket (zona_id);
create index on public.roster_personel (pengguna_id);
create index on public.notifikasi (untuk_pengguna_id, dibaca);
create index on public.log_aktivitas (entity_type, entity_id);
create index on public.komentar (tipe, ref_id);

-- ============================================================
-- 8. FUNGSI BANTU UNTUK RLS
-- ============================================================

create or replace function public.peran_saya()
returns peran_sistem
language sql stable security definer set search_path = public as $$
  select peran_sistem from public.pengguna where id = auth.uid()
$$;

create or replace function public.zona_saya()
returns uuid
language sql stable security definer set search_path = public as $$
  select zona_id from public.pengguna where id = auth.uid()
$$;

create or replace function public.pengguna_aktif()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status_aktif from public.pengguna where id = auth.uid()), false)
$$;
