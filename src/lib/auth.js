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
//
// Dipanggil lewat supabase.functions.invoke(), bukan fetch() manual --
// invoke() otomatis menyertakan header apikey/Authorization yang sah (anon
// key, karena memang belum ada sesi login). Tanpa ini, permintaan ditolak
// duluan oleh pemeriksaan "Verify JWT" bawaan Supabase sebelum kode Edge
// Function-nya sempat jalan sama sekali.
export async function daftarAdminPertama({ nama, nrp, pangkat, gelar, password }) {
  const { error } = await supabase.functions.invoke('admin-kelola-akun', {
    body: { action: 'bootstrap', nama, nrp, pangkat, gelar, password },
  })
  if (error) throw new Error(await pesanErrorFungsi(error))
  await masuk(nrp, password)
}

// FunctionsHttpError dari supabase-js tidak otomatis membawa body JSON
// respons kita ({error: "..."}) di properti error.message -- badan aslinya
// ada di error.context (Response mentah), jadi harus dibaca manual.
export async function pesanErrorFungsi(error, fallback = 'Terjadi kesalahan.') {
  try {
    const body = await error.context.json()
    return body?.error || error.message || fallback
  } catch {
    return error.message || fallback
  }
}

export async function ambilProfilSaya(authUserId) {
  return supabase.from('pengguna').select('*, zona:zona_id(nama), regu:regu_id(nomor)').eq('id', authUserId).single()
}

// "Masuk sebagai" — Admin membuka sesi sebagai akun lain tanpa tahu kata
// sandinya, buat keperluan demo/dukungan. Sesi Admin yang asli disimpan di
// sessionStorage (khusus tab ini, tidak ikut tersalin ke tab lain) supaya
// bisa dikembalikan lewat kembaliDariImpersonasi() tanpa perlu login ulang.
const KUNCI_SESI_ASLI = 'epikpor_sesi_admin_asli'

export async function mulaiImpersonasi(pengguna_id) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sesi tidak ditemukan.')

  const { data, error } = await supabase.functions.invoke('admin-kelola-akun', {
    body: { action: 'impersonate', pengguna_id },
  })
  if (error) throw new Error(await pesanErrorFungsi(error, 'Gagal masuk sebagai akun ini.'))

  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash, type: 'magiclink',
  })
  if (otpError) throw otpError

  sessionStorage.setItem(KUNCI_SESI_ASLI, JSON.stringify({
    access_token: session.access_token, refresh_token: session.refresh_token,
  }))
}

export function sedangImpersonasi() {
  return sessionStorage.getItem(KUNCI_SESI_ASLI) !== null
}

export async function kembaliDariImpersonasi() {
  const disimpan = sessionStorage.getItem(KUNCI_SESI_ASLI)
  if (!disimpan) return
  const { access_token, refresh_token } = JSON.parse(disimpan)
  sessionStorage.removeItem(KUNCI_SESI_ASLI)
  const { error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) throw error
}
