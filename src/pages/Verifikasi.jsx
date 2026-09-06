import { useEffect, useState } from 'react'
import { useToast } from '../components/Toast'
import DetailModal from '../components/DetailModal'
import { ambilLaporanKegiatanMenunggu } from '../lib/laporanKegiatanApi'
import { ambilLaporanKejadianMenunggu } from '../lib/laporanKejadianApi'
import { ambilSesiButuhTindakan } from '../lib/sesiPiketApi'
import { fmtTime, fmtDate } from '../lib/format'

const TABS = [['kegiatan', 'Laporan Kegiatan'], ['kejadian', 'Kejadian Kecelakaan'], ['sesi', 'Sesi Piket']]

export default function Verifikasi() {
  const toast = useToast()
  const [tab, setTab] = useState('kegiatan')
  const [kegiatan, setKegiatan] = useState([])
  const [kejadian, setKejadian] = useState([])
  const [sesi, setSesi] = useState([])
  const [detailAktif, setDetailAktif] = useState(null)

  async function muat() {
    try {
      setKegiatan(await ambilLaporanKegiatanMenunggu())
      setKejadian(await ambilLaporanKejadianMenunggu())
      setSesi(await ambilSesiButuhTindakan())
    } catch (e) {
      toast(e.message || 'Gagal memuat data verifikasi', true)
    }
  }
  useEffect(() => { muat() }, [])

  return (
    <div className="mx-auto w-full max-w-[1540px]">
      <div className="mb-5">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-warn">Verifikasi</div>
        <h1 className="mt-1 font-display text-[26px] font-bold leading-tight text-navy-950 sm:text-[30px]">Menunggu Tindakan</h1>
        <p className="mt-1 text-[13px] text-ink-soft">Buka detail untuk melihat foto bukti sebelum memverifikasi.</p>
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto border-b border-line whitespace-nowrap">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`border-b-2 px-3.5 py-2.5 text-[12.5px] font-semibold ${tab === k ? 'border-brass text-navy-950' : 'border-transparent text-ink-soft'}`}>{l}</button>
        ))}
      </div>

      {tab === 'kegiatan' && (
        <TabelSederhana
          rows={kegiatan.map((x) => ({ id: x.id, waktu: fmtTime(x.waktu_kirim), ringkasan: `${x.jenis_kegiatan?.nama} — ${x.lokasi}`, zona: `Zona ${x.zona?.nama} · Regu ${x.regu?.nomor}`, pelapor: x.pelapor_nama, adaFoto: (x.lampiran || []).length > 0 }))}
          onLihat={(id) => setDetailAktif({ tipe: 'kegiatan', id })}
        />
      )}
      {tab === 'kejadian' && (
        <TabelSederhana
          rows={kejadian.map((x) => ({ id: x.id, waktu: x.waktu_diterima ? fmtTime(x.waktu_diterima) : '-', ringkasan: `${x.jenis_kecelakaan?.nama || 'Kejadian'} — ${x.lokasi}`, zona: `Zona ${x.zona?.nama} · Regu ${x.regu?.nomor}`, pelapor: x.pelapor_nama, adaFoto: (x.lampiran || []).length > 0 }))}
          onLihat={(id) => setDetailAktif({ tipe: 'kejadian', id })}
        />
      )}
      {tab === 'sesi' && (
        <div className="space-y-3">
          {sesi.length === 0 && <div className="rounded-xl border border-line bg-white p-10 text-center text-[13px] text-ink-soft">Tidak ada sesi yang butuh tindakan.</div>}
          {sesi.map((s) => (
            <button
              key={s.id}
              onClick={() => setDetailAktif({ tipe: 'sesi', id: s.id })}
              className="block w-full rounded-xl border border-line bg-white p-4 text-left hover:border-brass"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-[13.5px] font-bold">{s.pengguna?.pangkat} {s.pengguna?.nama}</div>
                  <div className="text-[11.5px] text-ink-soft">Zona {s.zona?.nama} · Regu {s.regu?.nomor} · Dibuka {fmtTime(s.waktu_buka)} WIB, {fmtDate(s.waktu_buka)}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${s.status === 'MENUNGGU_VERIFIKASI' ? 'bg-warn-bg text-warn' : 'bg-bad-bg text-bad'}`}>{s.status.replaceAll('_', ' ')}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {detailAktif && (
        <DetailModal
          tipe={detailAktif.tipe}
          id={detailAktif.id}
          onClose={() => setDetailAktif(null)}
          onUbah={muat}
        />
      )}
    </div>
  )
}

function TabelSederhana({ rows, onLihat }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-[12.5px]">
        <thead><tr className="bg-paper-dim text-left text-[11px] uppercase text-ink-soft">
          <th className="px-3.5 py-2.5">Waktu</th><th className="px-3.5 py-2.5">Ringkasan</th><th className="px-3.5 py-2.5">Zona/Regu</th><th className="px-3.5 py-2.5">Pelapor</th><th className="px-3.5 py-2.5"></th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-ink-soft">Tidak ada laporan menunggu verifikasi.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-paper-dim">
              <td className="px-3.5 py-2.5 font-mono">{r.waktu}</td>
              <td className="px-3.5 py-2.5">{r.ringkasan}{r.adaFoto && <span className="ml-1.5" title="Ada lampiran foto">📷</span>}</td>
              <td className="px-3.5 py-2.5">{r.zona}</td>
              <td className="px-3.5 py-2.5">{r.pelapor}</td>
              <td className="px-3.5 py-2.5"><button onClick={() => onLihat(r.id)} className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold">Lihat &amp; Verifikasi</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
