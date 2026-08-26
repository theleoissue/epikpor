import { supabase } from './supabase'

const SELECT_DASAR = '*, jenis_kegiatan:jenis_kegiatan_id(nama), zona:zona_id(nama), regu:regu_id(nomor), lampiran:lampiran_kegiatan(id, storage_path, urutan)'

export async function kirimLaporanKegiatan(payload) {
  const { data, error } = await supabase.from('laporan_kegiatan').insert(payload).select().single()
  if (error) throw error
  return data
}

// PostgREST tidak melempar error kalau RLS memblokir update (baris yang
// dituju cuma tidak ikut ter-update, 0 baris terdampak, tanpa pesan apa pun)
// — jadi status keberhasilan dicek manual dari data yang kembali, bukan cuma
// dari ada/tidaknya error. Tanpa ini, klik "Verifikasi" oleh pengguna yang
// sebetulnya tidak berhak (mis. salah zona) akan tampak berhasil padahal
// tidak terjadi apa-apa di database.
export async function perbaruiLaporanKegiatan(id, patch) {
  const { data, error } = await supabase.from('laporan_kegiatan').update(patch).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Laporan tidak ditemukan atau Anda tidak berhak mengubahnya.')
  return data
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
  const { data, error } = await supabase.from('laporan_kegiatan').update({ status: 'TERVERIFIKASI' }).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Laporan tidak ditemukan atau Anda tidak berhak memverifikasinya.')
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// "Sampai tanggal X" harus mencakup seluruh hari X, bukan cuma sampai jam 00:00
// di awal hari X — makanya dibandingkan dengan awal hari SESUDAHNYA (exclusive).
function besok(tanggalIso) {
  const d = new Date(tanggalIso + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// Pencarian arsip 7 kriteria: kata kunci, zona, regu, jenis kegiatan, rentang tanggal, nomor laporan.
export async function cariArsipKegiatan(filter) {
  let q = supabase.from('laporan_kegiatan').select(SELECT_DASAR)
  if (filter.zona_id) q = q.eq('zona_id', filter.zona_id)
  if (filter.regu_id) q = q.eq('regu_id', filter.regu_id)
  if (filter.jenis_kegiatan_id) q = q.eq('jenis_kegiatan_id', filter.jenis_kegiatan_id)
  if (filter.dari) q = q.gte('waktu_kirim', filter.dari)
  if (filter.sampai) q = q.lt('waktu_kirim', besok(filter.sampai))
  if (filter.nomor) {
    if (!RE_UUID.test(filter.nomor.trim())) return []
    q = q.eq('id', filter.nomor.trim())
  }
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
