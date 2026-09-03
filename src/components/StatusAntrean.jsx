import { useEffect, useState } from 'react'
import { ringkasanAntrean, ulangiAntreanTertahan, hapusAntrean, BATAS_PERCOBAAN } from '../lib/offlineQueue'
import { useToast } from './Toast'

// Antrean luring sebelumnya sama sekali tidak terlihat di antarmuka mana pun:
// laporan bisa tertahan di perangkat berhari-hari tanpa ada yang menyadari,
// dan bila satu di antaranya gagal permanen, seluruh antrean berhenti dengan
// jejak berupa console.error yang tidak pernah dibaca siapa pun.
//
// Pita ini muncul hanya bila memang ada yang tertahan, jadi tidak mengganggu
// pemakaian sehari-hari.
export default function StatusAntrean({ pemicuMuatUlang }) {
  const toast = useToast()
  const [ringkas, setRingkas] = useState(null)
  const [terbuka, setTerbuka] = useState(false)
  const [luring, setLuring] = useState(!navigator.onLine)

  async function muat() {
    try { setRingkas(await ringkasanAntrean()) } catch { /* IndexedDB bisa ditolak di mode privat */ }
  }

  useEffect(() => { muat() }, [pemicuMuatUlang])

  useEffect(() => {
    const naik = () => { setLuring(false); muat() }
    const turun = () => setLuring(true)
    window.addEventListener('online', naik)
    window.addEventListener('offline', turun)
    // Dikirim App.jsx begitu satu giliran pengiriman antrean selesai, supaya
    // angkanya langsung menyesuaikan tanpa menunggu pemeriksaan berkala.
    window.addEventListener('antrean-berubah', muat)
    // Antrean juga bisa bertambah dari halaman lain (laporan baru diantrekan
    // saat tanpa sinyal), jadi tetap diperiksa berkala — bebannya kecil karena
    // hanya membaca penyimpanan lokal.
    const interval = setInterval(muat, 20000)
    return () => {
      window.removeEventListener('online', naik)
      window.removeEventListener('offline', turun)
      window.removeEventListener('antrean-berubah', muat)
      clearInterval(interval)
    }
  }, [])

  if (!ringkas || ringkas.total === 0) return null

  const { total, tertahan, item } = ringkas
  const nada = tertahan > 0 ? 'bg-bad text-white' : 'bg-warn text-navy-950'

  async function coba() {
    await ulangiAntreanTertahan()
    await muat()
    toast('Antrean akan dicoba kirim lagi')
    window.dispatchEvent(new Event('online'))
  }

  async function buang(id) {
    await hapusAntrean(id)
    await muat()
    toast('Laporan dibuang dari antrean perangkat')
  }

  return (
    <div className={`px-4 py-2 text-[12.5px] font-semibold ${nada}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {luring && '📴 Tanpa sinyal — '}
          {tertahan > 0
            ? `⚠ ${tertahan} dari ${total} laporan gagal terkirim berulang kali`
            : `${total} laporan menunggu terkirim dari perangkat ini`}
        </span>
        <button onClick={() => setTerbuka((v) => !v)} className="rounded-lg bg-black/15 px-2.5 py-1 text-[11.5px] hover:bg-black/25">
          {terbuka ? 'Tutup' : 'Rincian'}
        </button>
      </div>

      {terbuka && (
        <div className="mt-2 space-y-1.5 rounded-lg bg-white/90 p-2.5 text-navy-950">
          {item.map((x) => {
            const macet = x.percobaan >= BATAS_PERCOBAAN
            return (
              <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-paper-dim pb-1.5 text-[11.5px] font-normal last:border-none last:pb-0">
                <div>
                  <b>{x.tipe === 'kejadian' ? 'Kejadian Kecelakaan' : 'Laporan Kegiatan'}</b>
                  {' — '}{x.payload?.lokasi || 'tanpa lokasi'}
                  <div className="text-[10.5px] text-ink-soft">
                    Diantrekan {new Date(x.dibuatPada).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                    {macet && <span className="text-bad"> · gagal {x.percobaan}x: {x.galat}</span>}
                  </div>
                </div>
                {macet && (
                  <button onClick={() => buang(x.id)} className="rounded-lg border border-bad px-2 py-0.5 text-[10.5px] font-semibold text-bad">
                    Buang
                  </button>
                )}
              </div>
            )
          })}
          {tertahan > 0 && (
            <button onClick={coba} className="mt-1 rounded-lg bg-navy-950 px-3 py-1.5 text-[11.5px] font-semibold text-white">
              Coba kirim ulang
            </button>
          )}
        </div>
      )}
    </div>
  )
}
