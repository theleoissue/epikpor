import { supabase } from './supabase'

const SELECT_DASAR = '*, jenis_kegiatan:jenis_kegiatan_id(nama), zona:zona_id(nama), regu:regu_id(nomor), lampiran:lampiran_kegiatan(id, storage_path, urutan)'

export async function kirimLaporanKegiatan(payload) {
  const { data, error } = await supabase.from('laporan_kegiatan').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function perbaruiLaporanKegiatan(id, patch) {
  const { error } = await supabase.from('laporan_kegiatan').update(patch).eq('id', id)
  if (error) throw error
}

export async function tambahLampiranKegiatan(laporan_kegiatan_id, paths) {
  if (!paths.length) return
  const { error } = await supabase
    .from('lampiran_kegiatan')
    .insert(paths.map((storage_path, urutan) => ({ laporan_kegiatan_id, storage_path, urutan })))
  if (error) throw error
}

export async function hapusLampiranKegiatanLama(laporan_kegiatan_id) {
  const { error } = await supabase.from('lampiran_kegiatan').delete().eq('laporan_kegiatan_id', laporan_kegiatan_id)
  if (error) throw error
}

export async function ambilLaporanKegiatanMenunggu() {
  const { data, error } = await supabase
    .from('laporan_kegiatan')
    .select(SELECT_DASAR)
    .eq('status', 'MENUNGGU_VERIFIKASI')
    .order('waktu_kirim', { ascending: false })
  if (error) throw error
  return data
}

export async function verifikasiLaporanKegiatan(id) {
  const { error } = await supabase.from('laporan_kegiatan').update({ status: 'TERVERIFIKASI' }).eq('id', id)
  if (error) throw error
}

// Pencarian arsip 7 kriteria: kata kunci, zona, regu, jenis kegiatan, rentang tanggal, nomor laporan.
export async function cariArsipKegiatan(filter) {
  let q = supabase.from('laporan_kegiatan').select(SELECT_DASAR)
  if (filter.zona_id) q = q.eq('zona_id', filter.zona_id)
  if (filter.regu_id) q = q.eq('regu_id', filter.regu_id)
  if (filter.jenis_kegiatan_id) q = q.eq('jenis_kegiatan_id', filter.jenis_kegiatan_id)
  if (filter.dari) q = q.gte('waktu_kirim', filter.dari)
  if (filter.sampai) q = q.lte('waktu_kirim', filter.sampai)
  if (filter.nomor) q = q.eq('id', filter.nomor)
  if (filter.kataKunci) q = q.or(`lokasi.ilike.%${filter.kataKunci}%,keterangan.ilike.%${filter.kataKunci}%,pelapor_nama.ilike.%${filter.kataKunci}%`)
  const { data, error } = await q.order('waktu_kirim', { ascending: false })
  if (error) throw error
  return data
}

export async function ambilLaporanKegiatanSaya(pelapor_id) {
  const { data, error } = await supabase
    .from('laporan_kegiatan')
    .select(SELECT_DASAR)
    .eq('pelapor_id', pelapor_id)
    .order('waktu_kirim', { ascending: false })
    .limit(10)
  if (error) throw error
  return data
}
