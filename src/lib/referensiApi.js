import { supabase } from './supabase'

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
  const { error } = await supabase.from(tabel).insert({ nama })
  if (error) throw error
}
export const tambahJenisKegiatan = (nama) => tambahDaftarTerkendali('jenis_kegiatan', nama)
export const tambahJenisKecelakaan = (nama) => tambahDaftarTerkendali('jenis_kecelakaan', nama)
export const tambahTipeTabrakan = (nama) => tambahDaftarTerkendali('tipe_tabrakan', nama)

async function nonaktifkanDaftarTerkendali(tabel, id) {
  const { error } = await supabase.from(tabel).update({ aktif: false }).eq('id', id)
  if (error) throw error
}
export const nonaktifkanJenisKegiatan = (id) => nonaktifkanDaftarTerkendali('jenis_kegiatan', id)
export const nonaktifkanJenisKecelakaan = (id) => nonaktifkanDaftarTerkendali('jenis_kecelakaan', id)
export const nonaktifkanTipeTabrakan = (id) => nonaktifkanDaftarTerkendali('tipe_tabrakan', id)

export async function perbaruiPengguna(id, patch) {
  const { error } = await supabase.from('pengguna').update(patch).eq('id', id)
  if (error) throw error
}

export async function buatAkunPengguna(payload) {
  const { data: sesi } = await supabase.auth.getSession()
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-kelola-akun`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sesi.session.access_token}`,
    },
    body: JSON.stringify({ action: 'buat', ...payload }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Gagal membuat akun.')
  return json
}

export async function resetPasswordPengguna(pengguna_id, password_baru) {
  const { data: sesi } = await supabase.auth.getSession()
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-kelola-akun`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sesi.session.access_token}`,
    },
    body: JSON.stringify({ action: 'reset_password', pengguna_id, password_baru }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Gagal reset kata sandi.')
  return json
}
