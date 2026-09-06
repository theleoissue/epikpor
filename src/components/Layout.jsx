import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import NotifBell from './NotifBell'
import logoShield from '../assets/logo-shield.png'
import StatusAntrean from './StatusAntrean'
import { menuUntukPeran, LABEL_PERAN } from '../lib/menu'
import { keluar, sedangImpersonasi, kembaliDariImpersonasi } from '../lib/auth'
import { useToast } from './Toast'
import { ambilLaporanKegiatanMenunggu } from '../lib/laporanKegiatanApi'
import { ambilLaporanKejadianMenunggu } from '../lib/laporanKejadianApi'
import { ambilSesiButuhTindakan } from '../lib/sesiPiketApi'
import { ClipboardList, Database, LayoutDashboard, LogOut, Menu, ShieldCheck } from 'lucide-react'

const PERAN_VERIFIKATOR = ['KASUBNIT', 'KANIT_GAKKUM']

function useJumlahMenungguVerifikasi(peran) {
  const [jumlah, setJumlah] = useState(0)
  const lokasi = useLocation()
  useEffect(() => {
    if (!PERAN_VERIFIKATOR.includes(peran)) return
    let dibatalkan = false
    async function muat() {
      try {
        const [keg, kej, sesi] = await Promise.all([ambilLaporanKegiatanMenunggu(), ambilLaporanKejadianMenunggu(), ambilSesiButuhTindakan()])
        if (!dibatalkan) setJumlah(keg.length + kej.length + sesi.length)
      } catch {
        // Badge cuma hiasan — kalau gagal dimuat, biarkan angka lama, jangan ganggu navigasi.
      }
    }
    muat()
    const interval = setInterval(muat, 45000)
    return () => { dibatalkan = true; clearInterval(interval) }
  }, [peran, lokasi.pathname])
  return jumlah
}

export default function Layout({ profil }) {
  const toast = useToast()
  const [menuMobileTerbuka, setMenuMobileTerbuka] = useState(false)
  const item = menuUntukPeran(profil.peran_sistem)
  const namaTampil = profil.pangkat ? `${profil.pangkat} ${profil.nama}` : profil.nama
  const inisial = profil.nama.split(' ').slice(-1)[0].slice(0, 2).toUpperCase()
  const jumlahMenunggu = useJumlahMenungguVerifikasi(profil.peran_sistem)
  const impersonasi = sedangImpersonasi()
  const lokasiKini = useLocation()
  const ikonMenu = (tujuan) => tujuan === '/dashboard' || tujuan === '/' ? LayoutDashboard : tujuan.includes('roster') ? ClipboardList : Database

  async function kembaliKeAdmin() {
    try { await kembaliDariImpersonasi() }
    catch (e) { toast(e.message || 'Gagal kembali ke akun Admin', true) }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {impersonasi && (
        <div className="flex items-center justify-between gap-3 bg-warn px-4 py-2 text-[12.5px] font-semibold text-navy-950">
          <span>🎭 Sedang masuk sebagai {namaTampil} ({LABEL_PERAN[profil.peran_sistem]})</span>
          <button onClick={kembaliKeAdmin} className="rounded-lg bg-navy-950 px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-navy-800">← Kembali ke akun Admin</button>
        </div>
      )}
      <StatusAntrean pemicuMuatUlang={lokasiKini.pathname} />
      <div className="grid flex-1 grid-rows-[64px_1fr] md:grid-cols-[240px_1fr] md:grid-rows-[64px_1fr] lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-white/10 bg-navy-950 text-white md:row-span-2 md:flex md:flex-col">
        <div className="flex h-[95px] items-center gap-3 border-b border-brass/70 px-5">
          <img src={logoShield} alt="" className="h-11 w-11 flex-shrink-0" />
          <div><div className="font-display text-[19px] font-bold leading-tight">E-Pikpor</div><div className="mt-1 text-[12px] leading-[1.35] text-white/65">Unit Gakkum Satlantas<br />Polrestabes Bandung</div></div>
        </div>
        <nav className="flex-1 px-3 py-5">
          <div className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/35">Menu utama</div>
          {item.map((m) => {
            const Icon = ikonMenu(m.to)
            return <NavLink key={m.to} to={m.to} end={m.to === '/'} className={({ isActive }) => `relative mb-1 flex h-11 items-center gap-3 rounded-[7px] px-3.5 text-[13.5px] font-medium ${isActive ? 'bg-brass/15 text-white before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brass' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="h-[18px] w-[18px] text-brass" strokeWidth={1.8} />{m.label}
              {m.badge === 'verifikasi' && jumlahMenunggu > 0 && <span className="ml-auto rounded-full bg-bad px-1.5 py-0.5 text-[9px] font-bold text-white">{jumlahMenunggu}</span>}
            </NavLink>
          })}
        </nav>
        <div className="px-6 pb-5 text-[9.5px] text-white/35">E-Pikpor v1.0.0</div>
      </aside>

      <div className="flex items-center justify-between border-b-2 border-brass bg-navy-950 px-4 text-white md:px-6">
        <div className="flex items-center gap-2.5">
          <button aria-label="Buka menu" className="md:hidden" onClick={() => setMenuMobileTerbuka((v) => !v)}><Menu className="h-5 w-5" /></button>
          <ShieldCheck className="hidden h-5 w-5 text-brass md:block" />
          <div className="font-display text-[14px] font-bold">Papan Pemantauan</div>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-4">
          <NotifBell penggunaId={profil.id} />
          <div className="hidden h-8 w-px bg-white/15 sm:block" />
          <div className="hidden text-right text-[11px] sm:block">
            <div className="font-display text-[13px] font-bold">{namaTampil}</div>
            <div className="text-white/60">{LABEL_PERAN[profil.peran_sistem]}{profil.zona ? ` · Zona ${profil.zona.nama}` : ''}</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brass text-[12px] font-bold text-navy-950">{inisial}</div>
          <button onClick={keluar} className="flex h-9 items-center gap-1.5 rounded-md border border-white/25 px-3 text-[12px] font-semibold text-white/85 hover:border-brass hover:text-brass-soft">
            <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>

      <nav className={`${menuMobileTerbuka ? 'block' : 'hidden'} absolute left-0 right-0 top-16 z-30 bg-navy-900 p-3 shadow-lg md:hidden`}>
        <div className="px-2.5 pb-1.5 pt-3.5 text-[10px] font-bold uppercase tracking-wide text-[#6E7793]">Menu</div>
        {item.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.to === '/'}
            onClick={() => setMenuMobileTerbuka(false)}
            className={({ isActive }) =>
              `mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium ${
                isActive ? 'bg-brass font-bold text-navy-950' : 'text-[#B9C0D3] hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <span className="h-2 w-2 rounded-[3px] bg-[#3A4666]" />
            {m.label}
            {m.badge === 'verifikasi' && jumlahMenunggu > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">{jumlahMenunggu}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <main className="overflow-y-auto bg-[#F3F1EA] p-4 pb-12 md:px-5 md:py-[22px] xl:px-7 xl:pb-[26px]">
        <Outlet />
      </main>
      </div>
    </div>
  )
}
