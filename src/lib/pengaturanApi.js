import { supabase } from './supabase'

// Nilai yang boleh diubah pengelola dari dalam aplikasi. Dibaca semua pengguna
// aktif, hanya bisa diubah Administrator (lihat RLS-10).
export async function ambilPengaturan(kunci) {
  const { data, error } = await supabase.from('pengaturan').select('nilai').eq('kunci', kunci).maybeSingle()
  if (error) throw error
  return data?.nilai ?? null
}

export async function simpanPengaturan(kunci, nilai, diperbarui_oleh) {
  const { data, error } = await supabase
    .from('pengaturan')
    .upsert({ kunci, nilai, diperbarui_oleh, diperbarui_pada: new Date().toISOString() }, { onConflict: 'kunci' })
    .select()
    .maybeSingle()
  if (error) throw error
  // RLS yang menolak update tidak melempar galat, cuma tidak mengubah apa pun.
  if (!data) throw new Error('Hanya Administrator yang boleh mengubah pengaturan ini.')
  return data.nilai
}

export const KUNCI_POLA_ROTASI = 'pola_rotasi_piket'
