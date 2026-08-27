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

export async function adaAdmin() {
  const { data, error } = await supabase.rpc('ada_admin')
  if (error) throw error
  return data
}

// Cuma untuk Administrator PALING PERTAMA (Login.jsx menyembunyikan ini
// sendiri begitu satu Admin sudah ada). Semua akun sesudahnya wajib lewat
// Kelola Data oleh Admin yang sudah login (Dokumen Teknis Bagian 5.1).
export async function daftarAdminPertama({ nama, nrp, pangkat, gelar, password }) {
  const { data, error: signUpError } = await supabase.auth.signUp({ email: emailDariNrp(nrp), password })
  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      throw new Error('NRP ini sudah terdaftar. Coba masuk seperti biasa, atau hubungi yang membuat project ini.')
    }
    throw signUpError
  }
  if (!data.session) {
    throw new Error('Pendaftaran perlu konfirmasi email yang tidak bisa diterima (email ini cuma format internal). Matikan "Confirm email" di Supabase: Authentication → Providers → Email, lalu coba lagi.')
  }
  const { error: rpcError } = await supabase.rpc('daftar_admin_pertama', { p_nama: nama, p_nrp: nrp, p_pangkat: pangkat, p_gelar: gelar })
  if (rpcError) throw rpcError
}

export async function ambilProfilSaya(authUserId) {
  return supabase.from('pengguna').select('*, zona:zona_id(nama), regu:regu_id(nomor)').eq('id', authUserId).single()
}
