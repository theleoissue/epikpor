import { supabase } from './supabase'
import { pesanErrorFungsi } from './auth'

export async function ambilZona() {
  const { data, error } = await supabase.from('zona').select('*').order('urutan_tampil')
  if (error) throw error
  return data
}

export async function ambilRegu() {
  const { data, error } = await supabase.from('regu').select('*').order('nomor')
  if (error) throw error
  return data
}

export async function ambilPengguna() {
  const { data, error } = await supabase
    .from('pengguna')
    .select('*, zona:zona_id(nama), regu:regu_id(nomor)')
    .order('nama')
  if (error) throw error
  return data
}

async function ambilDaftarTerkendali(tabel) {
  const { data, error } = await supabase.from(tabel).select('*').eq('aktif', true).order('nama')
  if (error) throw error
  return data
}
export const ambilJenisKegiatan = () => ambilDaftarTerkendali('jenis_kegiatan')
export const ambilJenisKecelakaan = () => ambilDaftarTerkendali('jenis_kecelakaan')
export const ambilTipeTabrakan = () => ambilDaftarTerkendali('tipe_tabrakan')

async function tambahDaftarTerkendali(tabel, nama) {
  const { data, error } = await supabase.from(tabel).insert({ nama }).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Anda tidak berhak menambah data ini.')
  return data
}
export const tambahJenisKegiatan = (nama) => tambahDaftarTerkendali('jenis_kegiatan', nama)
export const tambahJenisKecelakaan = (nama) => tambahDaftarTerkendali('jenis_kecelakaan', nama)
export const tambahTipeTabrakan = (nama) => tambahDaftarTerkendali('tipe_tabrakan', nama)

async function nonaktifkanDaftarTerkendali(tabel, id) {
  const { data, error } = await supabase.from(tabel).update({ aktif: false }).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Anda tidak berhak menonaktifkan data ini.')
}
export const nonaktifkanJenisKegiatan = (id) => nonaktifkanDaftarTerkendali('jenis_kegiatan', id)
export const nonaktifkanJenisKecelakaan = (id) => nonaktifkanDaftarTerkendali('jenis_kecelakaan', id)
export const nonaktifkanTipeTabrakan = (id) => nonaktifkanDaftarTerkendali('tipe_tabrakan', id)

// Lihat catatan di laporanKegiatanApi.js soal kenapa hasil update dicek
// eksplisit — RLS yang menolak update tidak melempar error, cuma diam-diam
// tidak mengubah apa pun.
export async function perbaruiPengguna(id, patch) {
  const { data, error } = await supabase.from('pengguna').update(patch).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Anda tidak berhak mengubah data personel ini.')
}

export async function buatAkunPengguna(payload) {
  const { data, error } = await supabase.functions.invoke('admin-kelola-akun', {
    body: { action: 'buat', ...payload },
  })
  if (error) throw new Error(await pesanErrorFungsi(error, 'Gagal membuat akun.'))
  return data
}

export async function resetPasswordPengguna(pengguna_id, password_baru) {
  const { data, error } = await supabase.functions.invoke('admin-kelola-akun', {
    body: { action: 'reset_password', pengguna_id, password_baru },
  })
  if (error) throw new Error(await pesanErrorFungsi(error, 'Gagal reset kata sandi.'))
  return data
}

// Sumber: Blackspot 2025-2026.pdf (client) — dikelola lewat Kelola Data oleh Admin.
export async function ambilTitikRawan() {
  const { data, error } = await supabase.from('titik_rawan').select('*').order('jumlah_laka', { ascending: false })
  if (error) throw error
  return data
}

// Sumber: Laporan Bulanan fisik Jan-Jul 2026 (E-PIKPOR.pdf, client) — angka
// dari SEBELUM E-Pikpor berjalan, jadi disimpan terpisah dari rekap yang
// dihitung Dashboard dari laporan_kejadian (yang cuma punya data sejak
// aplikasi ini dipakai).
export async function ambilRekapHistoris(tahun) {
  const { data, error } = await supabase.from('rekap_historis').select('*').eq('tahun', tahun).order('bulan')
  if (error) throw error
  return data
}
