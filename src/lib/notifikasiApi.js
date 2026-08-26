import { supabase } from './supabase'

export async function ambilNotifikasiSaya(pengguna_id) {
  const { data, error } = await supabase
    .from('notifikasi')
    .select('*')
    .eq('untuk_pengguna_id', pengguna_id)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

export async function tandaiTerbaca(id) {
  const { error } = await supabase.from('notifikasi').update({ dibaca: true }).eq('id', id)
  if (error) throw error
}

export function langgananNotifikasi(pengguna_id, onInsert) {
  const channel = supabase
    .channel(`notifikasi-${pengguna_id}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifikasi', filter: `untuk_pengguna_id=eq.${pengguna_id}` },
      (payload) => onInsert(payload.new),
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
