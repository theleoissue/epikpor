import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { AuthContext, ambilProfilSaya } from './auth'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = belum dicek, null = tidak ada sesi
  const [profil, setProfil] = useState(null)
  const [sedangMemuat, setSedangMemuat] = useState(true)
  const idProfilTermuat = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let dibatalkan = false
    async function muatProfil() {
      if (!session) {
        idProfilTermuat.current = null
        setProfil(null)
        setSedangMemuat(false)
        return
      }
      // Supabase memperbarui token secara otomatis — antara lain tepat saat
      // tab kembali aktif setelah personel membuka aplikasi kamera bawaan HP.
      // Peristiwa itu mengirim objek sesi BARU meskipun penggunanya sama
      // persis. Tanpa penjagaan ini, profil dimuat ulang dan `sedangMemuat`
      // sempat bernilai true, sehingga AppRoutes melepas SELURUH pohon
      // komponen ("Memuat…") lalu memasangnya kembali dalam keadaan kosong —
      // foto yang baru saja diambil di Beranda/Kejadian ikut hilang diam-diam
      // tanpa pesan galat apa pun.
      if (idProfilTermuat.current === session.user.id) return
      setSedangMemuat(true)
      const { data, error } = await ambilProfilSaya(session.user.id)
      if (!dibatalkan) {
        idProfilTermuat.current = error ? null : session.user.id
        setProfil(error ? null : data)
        setSedangMemuat(false)
      }
    }
    if (session !== undefined) muatProfil()
    return () => { dibatalkan = true }
  }, [session])

  return (
    <AuthContext.Provider value={{ session, profil, sedangMemuat }}>
      {children}
    </AuthContext.Provider>
  )
}
