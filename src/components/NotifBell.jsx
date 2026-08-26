import { useEffect, useState } from 'react'
import { ambilNotifikasiSaya, langgananNotifikasi, tandaiTerbaca } from '../lib/notifikasiApi'
import { fmtTime, fmtDate } from '../lib/format'

export default function NotifBell({ penggunaId, onBuka }) {
  const [daftar, setDaftar] = useState([])
  const [buka, setBuka] = useState(false)

  useEffect(() => {
    if (!penggunaId) return
    ambilNotifikasiSaya(penggunaId).then(setDaftar)
    return langgananNotifikasi(penggunaId, (n) => setDaftar((d) => [n, ...d]))
  }, [penggunaId])

  const belumDibaca = daftar.filter((n) => !n.dibaca).length

  return (
    <div className="relative">
      <button
        onClick={() => setBuka((b) => !b)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white/85 hover:border-brass"
      >
        🔔
        {belumDibaca > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[9.5px] font-bold text-white">
            {belumDibaca}
          </span>
        )}
      </button>
      {buka && (
        <div className="absolute right-0 top-11 z-40 max-h-96 w-72 overflow-y-auto rounded-xl border border-line bg-white shadow-xl">
          {daftar.length === 0 && <div className="p-6 text-center text-sm text-ink-soft">Tidak ada notifikasi.</div>}
          {daftar.map((n) => (
            <div
              key={n.id}
              onClick={async () => {
                await tandaiTerbaca(n.id)
                setDaftar((d) => d.map((x) => (x.id === n.id ? { ...x, dibaca: true } : x)))
                setBuka(false)
                onBuka?.(n)
              }}
              className={`cursor-pointer border-b border-paper-dim p-3 text-[12.5px] last:border-none hover:bg-paper ${!n.dibaca ? 'bg-ok-bg' : ''}`}
            >
              <div>{n.teks}</div>
              <div className="mt-1 text-[10.5px] text-ink-soft">{fmtTime(n.created_at)} WIB, {fmtDate(n.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
