import { supabase } from './supabase'

export async function ambilSesiAktifSaya(pengguna_id) {
  const { data, error } = await supabase
    .from('sesi_piket')
    .select('*')
    .eq('pengguna_id', pengguna_id)
    .eq('status', 'AKTIF')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function bukaSesi({ pengguna_id, zona_id, regu_id, foto_swafoto_path, foto_lokasi_path, koordinat_buka }) {
  const { data, error } = await supabase
    .from('sesi_piket')
    .insert({ pengguna_id, zona_id, regu_id, foto_swafoto_path, foto_lokasi_path, koordinat_buka })
    .select()
    .single()
  if (error) throw error
  return data
}

// Hasil update dicek eksplisit (bukan cuma error-nya) karena RLS yang
// memblokir update tidak melempar error — cuma 0 baris terdampak diam-diam.
export async function tutupSesi(id, { foto_serah_terima_path }) {
  const { data, error } = await supabase
    .from('sesi_piket')
    .update({
      waktu_tutup: new Date().toISOString(),
      sebab_tutup: 'SERAH_TERIMA',
      foto_serah_terima_path,
      status: 'MENUNGGU_VERIFIKASI',
    })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Sesi tidak ditemukan atau bukan milik Anda.')
}

export async function ambilSesiButuhTindakan() {
  const { data, error } = await supabase
    .from('sesi_piket')
    .select('*, pengguna:pengguna_id(nama, pangkat), zona:zona_id(nama), regu:regu_id(nomor)')
    .in('status', ['MENUNGGU_VERIFIKASI', 'PELANGGARAN_TIDAK_DITUTUP', 'PELANGGARAN_TIDAK_BUKA'])
    .order('waktu_buka', { ascending: false })
  if (error) throw error
  return data
}

export async function verifikasiSesi(id) {
  const { data, error } = await supabase.from('sesi_piket').update({ status: 'TERTUTUP' }).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Sesi tidak ditemukan atau Anda tidak berhak memverifikasinya.')
}

export async function kecualikanSesi(id, catatan_kanit) {
  const { data, error } = await supabase.from('sesi_piket').update({ status: 'DIKECUALIKAN', catatan_kanit }).eq('id', id).select().maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Sesi tidak ditemukan atau Anda tidak berhak mengubahnya.')
}

export async function ambilArsipSesi({ zona_id } = {}) {
  let q = supabase
    .from('sesi_piket')
    .select('*, pengguna:pengguna_id(nama, pangkat), zona:zona_id(nama), regu:regu_id(nomor)')
    .order('waktu_buka', { ascending: false })
  if (zona_id) q = q.eq('zona_id', zona_id)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function ambilLogSesi(sesi_id) {
  const { data, error } = await supabase
    .from('log_aktivitas')
    .select('*, aktor:aktor_id(nama)')
    .eq('entity_type', 'SESI_PIKET')
    .eq('entity_id', sesi_id)
    .order('created_at')
  if (error) throw error
  return data
}
