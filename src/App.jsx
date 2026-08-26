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
import { menuUntukPeran } from './lib/menu'

// Cuma BANIT yang membuka sesi_piket pribadi (kolom regu_id di tabel itu NOT
// NULL, dan Kasubnit tidak dijadwalkan ke satu regu tunggal per Bagian 4).
const BISA_BUKA_SESI = ['BANIT']

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

// RLS di database sudah jadi pagar sebenarnya (Kelola Data cuma bisa diubah
// ADMIN, Verifikasi cuma jalan untuk Kasubnit/Kanit, dst — lihat migrasi
// RLS) — tapi tanpa pagar di level route ini, pengguna yang salah peran bisa
// mengetik URL-nya langsung dan melihat halaman yang tombolnya semua gagal
// tanpa penjelasan. Sumber "siapa boleh ke mana" sama persis dengan menu.js,
// supaya tidak ada dua daftar yang bisa tidak sinkron.
function RouteGuard({ profil, path, children }) {
  const diizinkan = menuUntukPeran(profil.peran_sistem).some((m) => m.to === path)
  if (!diizinkan) {
    return (
      <div className="rounded-2xl border border-line bg-white p-10 text-center text-ink-soft">
        Halaman ini tidak tersedia untuk peran {profil.peran_sistem}.
      </div>
    )
  }
  return children
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

  const beranda = BISA_BUKA_SESI.includes(profil.peran_sistem) ? <Beranda /> : <Navigate to="/dashboard" replace />

  return (
    <>
      <AntreanLuring />
      <Routes>
        <Route element={<Layout profil={profil} />}>
          <Route path="/" element={beranda} />
          <Route path="/lapor-kegiatan" element={<RouteGuard profil={profil} path="/lapor-kegiatan"><LaporKegiatan /></RouteGuard>} />
          <Route path="/kejadian" element={<RouteGuard profil={profil} path="/kejadian"><Kejadian /></RouteGuard>} />
          <Route path="/verifikasi" element={<RouteGuard profil={profil} path="/verifikasi"><Verifikasi /></RouteGuard>} />
          <Route path="/arsip" element={<RouteGuard profil={profil} path="/arsip"><Arsip /></RouteGuard>} />
          <Route path="/dashboard" element={<RouteGuard profil={profil} path="/dashboard"><Dashboard /></RouteGuard>} />
          <Route path="/roster" element={<RouteGuard profil={profil} path="/roster"><Roster /></RouteGuard>} />
          <Route path="/kelola" element={<RouteGuard profil={profil} path="/kelola"><Kelola /></RouteGuard>} />
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
