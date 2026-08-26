import { supabase } from './supabase'

export async function ambilKomentar(tipe, ref_id) {
  const { data, error } = await supabase
    .from('komentar')
    .select('*, author:author_id(nama, peran_sistem)')
    .eq('tipe', tipe)
    .eq('ref_id', ref_id)
    .order('created_at')
  if (error) throw error
  return data
}

export async function kirimKomentar(tipe, ref_id, author_id, teks) {
  const { error } = await supabase.from('komentar').insert({ tipe, ref_id, author_id, teks })
  if (error) throw error
}
