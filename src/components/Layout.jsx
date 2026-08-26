import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import NotifBell from './NotifBell'
import { menuUntukPeran, LABEL_PERAN } from '../lib/menu'
import { keluar } from '../lib/auth'
import { ambilLaporanKegiatanMenunggu } from '../lib/laporanKegiatanApi'
import { ambilLaporanKejadianMenunggu } from '../lib/laporanKejadianApi'
import { ambilSesiButuhTindakan } from '../lib/sesiPiketApi'

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
  const [menuMobileTerbuka, setMenuMobileTerbuka] = useState(false)
  const item = menuUntukPeran(profil.peran_sistem)
  const namaTampil = profil.pangkat ? `${profil.pangkat} ${profil.nama}` : profil.nama
  const inisial = profil.nama.split(' ').slice(-1)[0].slice(0, 2).toUpperCase()
  const jumlahMenunggu = useJumlahMenungguVerifikasi(profil.peran_sistem)

  return (
    <div className="grid min-h-screen grid-rows-[60px_1fr] md:grid-cols-[220px_1fr] md:grid-rows-[60px_1fr]">
      <div className="flex items-center justify-between border-b-[3px] border-brass bg-navy-950 px-4 text-white md:col-span-2">
        <div className="flex items-center gap-2.5">
          <button className="md:hidden text-xl" onClick={() => setMenuMobileTerbuka((v) => !v)}>☰</button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brass to-[#9c7c2f] font-display text-[12.5px] font-extrabold text-navy-950">EP</div>
          <div>
            <div className="font-display text-[14.5px] font-bold leading-tight">E-Pikpor</div>
            <div className="hidden text-[10.5px] text-white/60 sm:block">Unit Gakkum Satlantas Polrestabes Bandung</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotifBell penggunaId={profil.id} />
          <div className="hidden text-right text-[11.5px] sm:block">
            <div className="font-display text-[13px] font-bold">{namaTampil}</div>
            <div className="text-white/60">{LABEL_PERAN[profil.peran_sistem]}{profil.zona ? ` · Zona ${profil.zona.nama}` : ''}</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brass text-[12px] font-bold text-navy-950">{inisial}</div>
          <button onClick={keluar} className="rounded-lg border border-white/20 px-3 py-1.5 text-[11.5px] font-semibold text-white/85 hover:border-brass hover:text-brass-soft">
            Keluar
          </button>
        </div>
      </div>

      <nav className={`${menuMobileTerbuka ? 'block' : 'hidden'} bg-navy-900 p-3 md:block`}>
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

      <main className="overflow-y-auto p-4 pb-16 md:p-7">
        <Outlet />
      </main>
    </div>
  )
}
