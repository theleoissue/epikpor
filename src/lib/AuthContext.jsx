import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { AuthContext, ambilProfilSaya } from './auth'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = belum dicek, null = tidak ada sesi
  const [profil, setProfil] = useState(null)
  const [sedangMemuat, setSedangMemuat] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let dibatalkan = false
    async function muatProfil() {
      if (!session) {
        setProfil(null)
        setSedangMemuat(false)
        return
      }
      setSedangMemuat(true)
      const { data, error } = await ambilProfilSaya(session.user.id)
      if (!dibatalkan) {
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
