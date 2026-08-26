import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { useAuth, keluar } from './lib/auth'
import { ToastProvider, useToast } from './components/Toast'
import Layout from './components/Layout'
import Login from './pages/Login'
import Beranda from './pages/Beranda'
import LaporKegiatan from './pages/LaporKegiatan'
import Kejadian from './pages/Kejadian'
import Verifikasi from './pages/Verifikasi'
import Arsip from './pages/Arsip'
import Dashboard from './pages/Dashboard'
import Roster from './pages/Roster'
import Kelola from './pages/Kelola'
import { pasangPendengarOnline } from './lib/offlineQueue'
import { unggahFoto } from './lib/storage'
import { kirimLaporanKegiatan, tambahLampiranKegiatan } from './lib/laporanKegiatanApi'
import { kirimLaporanKejadian, tambahLampiranKejadian } from './lib/laporanKejadianApi'

const BISA_BUKA_SESI = ['BANIT', 'KASUBNIT']

function AntreanLuring() {
  const toast = useToast()
  useEffect(() => {
    return pasangPendengarOnline(async (item) => {
      if (item.tipe === 'kegiatan') {
        const laporan = await kirimLaporanKegiatan(item.payload)
        if (item.fotoFiles?.length) {
          const paths = await Promise.all(item.fotoFiles.map((f) => unggahFoto('foto-kegiatan', f)))
          await tambahLampiranKegiatan(laporan.id, paths)
        }
        toast('Laporan kegiatan yang tertunda berhasil terkirim')
      } else if (item.tipe === 'kejadian') {
        const laporan = await kirimLaporanKejadian(item.payload, { orang: item.orang, kendaraan: item.kendaraan })
        if (item.fotoFiles?.length) {
          const paths = await Promise.all(item.fotoFiles.map((f) => unggahFoto('foto-kejadian', f)))
          await tambahLampiranKejadian(laporan.id, paths)
        }
        toast('Laporan kejadian yang tertunda berhasil terkirim')
      }
    })
  }, [])
  return null
}

function AppRoutes() {
  const { session, profil, sedangMemuat } = useAuth()

  if (sedangMemuat) {
    return <div className="flex min-h-screen items-center justify-center bg-navy-950 text-ink-soft">Memuat…</div>
  }
  if (!session) return <Login />
  if (!profil || !profil.status_aktif) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950 p-6 text-center text-white">
        <div>
          <p className="mb-4">Akun ini belum tertaut ke data personel manapun, atau sudah dinonaktifkan. Hubungi Administrator.</p>
          <button onClick={keluar} className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-navy-950">Keluar</button>
        </div>
      </div>
    )
  }

  const beranda = BISA_BUKA_SESI.includes(profil.peran_sistem) ? <Beranda /> : <Dashboard />

  return (
    <>
      <AntreanLuring />
      <Routes>
        <Route element={<Layout profil={profil} />}>
          <Route path="/" element={beranda} />
          <Route path="/lapor-kegiatan" element={<LaporKegiatan />} />
          <Route path="/kejadian" element={<Kejadian />} />
          <Route path="/verifikasi" element={<Verifikasi />} />
          <Route path="/arsip" element={<Arsip />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/kelola" element={<Kelola />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  )
}
