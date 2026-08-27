import { supabase } from './supabase'

const SELECT_DASAR = `*, jenis_kecelakaan:jenis_kecelakaan_id(nama), tipe_tabrakan:tipe_tabrakan_id(nama),
  zona:zona_id(nama), regu:regu_id(nomor),
  orang:kejadian_orang(*), kendaraan:kejadian_kendaraan(*),
  lampiran:lampiran_kejadian(id, storage_path, urutan)`

// Bukan satu transaksi database sungguhan (supabase-js tidak mendukung multi-
// statement transaction dari klien) — kalau ada langkah setelah insert laporan
// utama gagal, baris laporan_kejadian yang baru dibuat dihapus lagi supaya
// tidak ada laporan "setengah jadi" yang tersimpan (kendaraan/orang ikut
// terhapus lewat on delete cascade).
export async function kirimLaporanKejadian(payload, { orang = [], kendaraan = [] } = {}) {
  const { data: laporan, error } = await supabase.from('laporan_kejadian').insert(payload).select().single()
  if (error) throw error

  try {
    const petaKendaraanId = {}
    if (kendaraan.length) {
      const { data: barisKendaraan, error: errK } = await supabase
        .from('kejadian_kendaraan')
        .insert(kendaraan.map((k) => ({ laporan_kejadian_id: laporan.id, kategori: k.kategori, merk: k.merk, nopol: k.nopol })))
        .select()
      if (errK) throw errK
      kendaraan.forEach((k, i) => { petaKendaraanId[k.idSementara] = barisKendaraan[i].id })
    }
    if (orang.length) {
      const { error: errO } = await supabase.from('kejadian_orang').insert(
        orang.map((o) => ({
          laporan_kejadian_id: laporan.id,
          nama: o.nama, jenis_kelamin: o.jenisKelamin, pekerjaan: o.pekerjaan,
          tempat_lahir: o.tempatLahir, tanggal_lahir: o.tanggalLahir || null, alamat: o.alamat,
          peran: o.peran, kendaraan_id: petaKendaraanId[o.kendaraanIdSementara] || null,
          kondisi: o.kondisi, rs_rujukan: o.rsRujukan, kelengkapan: o.kelengkapan,
        })),
      )
      if (errO) throw errO
    }
  } catch (e) {
    await supabase.from('laporan_kejadian').delete().eq('id', laporan.id)
    throw e
  }
  return laporan
}

// Lihat catatan di perbaruiLaporanKegiatan (laporanKegiatanApi.js) soal
// kenapa hasil update dicek eksplisit, bukan cuma error-nya.
export async function perbaruiLaporanKejadian(id, patch) {
  const { data, error } = await supabase.from('laporan_kejadian').update(patch).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Laporan tidak ditemukan atau Anda tidak berhak mengubahnya.')
  return data
}

export async function gantiOrangDanKendaraan(laporan_kejadian_id, { orang = [], kendaraan = [] }) {
  const { error: errHapusOrang } = await supabase.from('kejadian_orang').delete().eq('laporan_kejadian_id', laporan_kejadian_id)
  if (errHapusOrang) throw errHapusOrang
  const { error: errHapusKendaraan } = await supabase.from('kejadian_kendaraan').delete().eq('laporan_kejadian_id', laporan_kejadian_id)
  if (errHapusKendaraan) throw errHapusKendaraan
  const petaKendaraanId = {}
  if (kendaraan.length) {
    const { data: barisKendaraan, error: errK } = await supabase
      .from('kejadian_kendaraan')
      .insert(kendaraan.map((k) => ({ laporan_kejadian_id, kategori: k.kategori, merk: k.merk, nopol: k.nopol })))
      .select()
    if (errK) throw errK
    kendaraan.forEach((k, i) => { petaKendaraanId[k.idSementara] = barisKendaraan[i].id })
  }
  if (orang.length) {
    const { error: errO } = await supabase.from('kejadian_orang').insert(
      orang.map((o) => ({
        laporan_kejadian_id,
        nama: o.nama, jenis_kelamin: o.jenisKelamin, pekerjaan: o.pekerjaan,
        tempat_lahir: o.tempatLahir, tanggal_lahir: o.tanggalLahir || null, alamat: o.alamat,
        peran: o.peran, kendaraan_id: petaKendaraanId[o.kendaraanIdSementara] || null,
        kondisi: o.kondisi, rs_rujukan: o.rsRujukan, kelengkapan: o.kelengkapan,
      })),
    )
    if (errO) throw errO
  }
}

export async function tambahLampiranKejadian(laporan_kejadian_id, paths) {
  if (!paths.length) return
  const { error } = await supabase
    .from('lampiran_kejadian')
    .insert(paths.map((storage_path, urutan) => ({ laporan_kejadian_id, storage_path, urutan })))
  if (error) throw error
}

export async function ambilLaporanKejadianMenunggu() {
  const { data, error } = await supabase
    .from('laporan_kejadian')
    .select(SELECT_DASAR)
    .eq('status', 'MENUNGGU_VERIFIKASI')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function verifikasiLaporanKejadian(id) {
  const { data, error } = await supabase.from('laporan_kejadian').update({ status: 'TERVERIFIKASI' }).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Laporan tidak ditemukan atau Anda tidak berhak memverifikasinya.')
}

export async function ambilLogKejadian(laporan_kejadian_id) {
  const { data, error } = await supabase
    .from('log_aktivitas')
    .select('*, aktor:aktor_id(nama)')
    .eq('entity_type', 'LAPORAN_KEJADIAN')
    .eq('entity_id', laporan_kejadian_id)
    .order('created_at')
  if (error) throw error
  return data
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function besok(tanggalIso) {
  const d = new Date(tanggalIso + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export async function cariArsipKejadian(filter) {
  let q = supabase.from('laporan_kejadian').select(SELECT_DASAR)
  if (filter.zona_id) q = q.eq('zona_id', filter.zona_id)
  if (filter.regu_id) q = q.eq('regu_id', filter.regu_id)
  if (filter.jenis_kecelakaan_id) q = q.eq('jenis_kecelakaan_id', filter.jenis_kecelakaan_id)
  if (filter.dari) q = q.gte('created_at', filter.dari)
  if (filter.sampai) q = q.lt('created_at', besok(filter.sampai))
  if (filter.nomor) {
    if (!RE_UUID.test(filter.nomor.trim())) return []
    q = q.eq('id', filter.nomor.trim())
  }
  if (filter.kataKunci) q = q.or(`lokasi.ilike.%${filter.kataKunci}%,pelapor_nama.ilike.%${filter.kataKunci}%`)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function ambilLaporanKejadianSaya(pelapor_id) {
  const { data, error } = await supabase
    .from('laporan_kejadian')
    .select(SELECT_DASAR)
    .eq('pelapor_id', pelapor_id)
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return data
}

export async function ambilSatuKejadian(id) {
  const { data, error } = await supabase.from('laporan_kejadian').select(SELECT_DASAR).eq('id', id).single()
  if (error) throw error
  return data
}

// Rekap bulanan nyata dari data laporan_kejadian — mengganti bar chart statis di mockup.
export async function rekapBulanan(tahun) {
  const { data, error } = await supabase
    .from('laporan_kejadian')
    .select('created_at, zona_id, waktu_diterima, waktu_penanganan, waktu_selesai')
    .gte('created_at', `${tahun}-01-01`)
    .lt('created_at', `${tahun + 1}-01-01`)
  if (error) throw error
  return data
}
