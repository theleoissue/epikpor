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
//
// Lewat Edge Function (service role), BUKAN supabase.auth.signUp() sisi
// klien — signUp() tetap lewat jalur pengiriman email meski emailnya
// sintesis, dan langsung kena "email rate limit exceeded" di layanan email
// bawaan Supabase yang sangat dibatasi. admin.createUser() di server tidak
// pernah mengirim email sama sekali.
export async function daftarAdminPertama({ nama, nrp, pangkat, gelar, password }) {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-kelola-akun`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'bootstrap', nama, nrp, pangkat, gelar, password }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Gagal mendaftarkan Administrator.')
  await masuk(nrp, password)
}

export async function ambilProfilSaya(authUserId) {
  return supabase.from('pengguna').select('*, zona:zona_id(nama), regu:regu_id(nomor)').eq('id', authUserId).single()
}
