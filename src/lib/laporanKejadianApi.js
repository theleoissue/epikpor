import { supabase } from './supabase'

const SELECT_DASAR = `*, jenis_kecelakaan:jenis_kecelakaan_id(nama), tipe_tabrakan:tipe_tabrakan_id(nama),
  zona:zona_id(nama), regu:regu_id(nomor),
  orang:kejadian_orang(*), kendaraan:kejadian_kendaraan(*),
  lampiran:lampiran_kejadian(id, storage_path, urutan)`

export async function kirimLaporanKejadian(payload, { orang = [], kendaraan = [] } = {}) {
  const { data: laporan, error } = await supabase.from('laporan_kejadian').insert(payload).select().single()
  if (error) throw error

  const petaKendaraanId = {}
  for (const k of kendaraan) {
    const { data: baris, error: errK } = await supabase
      .from('kejadian_kendaraan')
      .insert({ laporan_kejadian_id: laporan.id, kategori: k.kategori, merk: k.merk, nopol: k.nopol })
      .select()
      .single()
    if (errK) throw errK
    petaKendaraanId[k.idSementara] = baris.id
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
  return laporan
}

export async function perbaruiLaporanKejadian(id, patch) {
  const { error } = await supabase.from('laporan_kejadian').update(patch).eq('id', id)
  if (error) throw error
}

export async function gantiOrangDanKendaraan(laporan_kejadian_id, { orang = [], kendaraan = [] }) {
  await supabase.from('kejadian_orang').delete().eq('laporan_kejadian_id', laporan_kejadian_id)
  await supabase.from('kejadian_kendaraan').delete().eq('laporan_kejadian_id', laporan_kejadian_id)
  const petaKendaraanId = {}
  for (const k of kendaraan) {
    const { data: baris, error: errK } = await supabase
      .from('kejadian_kendaraan')
      .insert({ laporan_kejadian_id, kategori: k.kategori, merk: k.merk, nopol: k.nopol })
      .select()
      .single()
    if (errK) throw errK
    petaKendaraanId[k.idSementara] = baris.id
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
  const { error } = await supabase.from('laporan_kejadian').update({ status: 'TERVERIFIKASI' }).eq('id', id)
  if (error) throw error
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

export async function cariArsipKejadian(filter) {
  let q = supabase.from('laporan_kejadian').select(SELECT_DASAR)
  if (filter.zona_id) q = q.eq('zona_id', filter.zona_id)
  if (filter.regu_id) q = q.eq('regu_id', filter.regu_id)
  if (filter.jenis_kecelakaan_id) q = q.eq('jenis_kecelakaan_id', filter.jenis_kecelakaan_id)
  if (filter.dari) q = q.gte('created_at', filter.dari)
  if (filter.sampai) q = q.lte('created_at', filter.sampai)
  if (filter.nomor) q = q.eq('id', filter.nomor)
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
    .select('created_at, zona_id, w1, w2, w3, w4, w5')
    .gte('created_at', `${tahun}-01-01`)
    .lt('created_at', `${tahun + 1}-01-01`)
  if (error) throw error
  return data
}
