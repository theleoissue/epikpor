import { createContext, useContext } from 'react'
import { supabase } from './supabase'

export const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}

// Supabase Auth cuma mengenal email+password secara native. Personel masuk pakai
// NRP (sesuai Dokumen Teknis Bagian 5.1), jadi NRP disintesis jadi email di
// belakang layar -- tidak pernah terlihat/diketik personel. Pola identik dengan
// project SIANDI, domain diganti supaya tidak bentrok.
const DOMAIN_SINTESIS = 'epikpor.app'

export function emailDariNrp(nrp) {
  return `nrp${nrp}@${DOMAIN_SINTESIS}`
}

export async function masuk(nrp, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: emailDariNrp(nrp), password })
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('NRP atau kata sandi salah.')
    }
    throw error
  }
}

export async function keluar() {
  await supabase.auth.signOut()
}

export async function ambilProfilSaya(authUserId) {
  return supabase.from('pengguna').select('*, zona:zona_id(nama), regu:regu_id(nomor)').eq('id', authUserId).single()
}
