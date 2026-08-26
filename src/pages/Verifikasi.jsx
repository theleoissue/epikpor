import { useEffect, useState } from 'react'
import { useToast } from '../components/Toast'
import { ambilLaporanKegiatanMenunggu, verifikasiLaporanKegiatan } from '../lib/laporanKegiatanApi'
import { ambilLaporanKejadianMenunggu, verifikasiLaporanKejadian, ambilSatuKejadian } from '../lib/laporanKejadianApi'
import { ambilSesiButuhTindakan, verifikasiSesi, kecualikanSesi } from '../lib/sesiPiketApi'
import { buildLaporanKejadianWA } from '../lib/waReport'
import { fmtTime, fmtDate } from '../lib/format'

const TABS = [['kegiatan', 'Laporan Kegiatan'], ['kejadian', 'Kejadian Kecelakaan'], ['sesi', 'Sesi Piket']]

export default function Verifikasi() {
  const toast = useToast()
  const [tab, setTab] = useState('kegiatan')
  const [kegiatan, setKegiatan] = useState([])
  const [kejadian, setKejadian] = useState([])
  const [sesi, setSesi] = useState([])
  const [catatan, setCatatan] = useState({})

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

  async function verifKegiatan(id) {
    try { await verifikasiLaporanKegiatan(id); toast('Laporan diverifikasi'); muat() }
    catch (e) { toast(e.message || 'Gagal memverifikasi laporan', true) }
  }
  async function verifKejadian(id) {
    try { await verifikasiLaporanKejadian(id); toast('Laporan diverifikasi'); muat() }
    catch (e) { toast(e.message || 'Gagal memverifikasi laporan', true) }
  }

  async function salinLaporanWA(id) {
    try {
      const lengkap = await ambilSatuKejadian(id)
      await navigator.clipboard.writeText(buildLaporanKejadianWA(lengkap))
      toast('Teks laporan WhatsApp disalin, siap ditempel')
    } catch (e) {
      toast(e.message || 'Gagal menyalin teks laporan', true)
    }
  }

  async function tindakSesi(fn, pesan) {
    try { await fn(); toast(pesan); muat() }
    catch (e) { toast(e.message || 'Gagal memproses sesi', true) }
  }

  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-warn">Verifikasi</div>
        <h1 className="mt-1 font-display text-[22px] font-semibold">Menunggu Tindakan</h1>
      </div>
      <div className="mb-4 flex gap-1.5 border-b border-line">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`border-b-2 px-3.5 py-2.5 text-[12.5px] font-semibold ${tab === k ? 'border-brass text-navy-950' : 'border-transparent text-ink-soft'}`}>{l}</button>
        ))}
      </div>

      {tab === 'kegiatan' && (
        <TabelSederhana
          rows={kegiatan.map((x) => ({ id: x.id, waktu: fmtTime(x.waktu_kirim), ringkasan: `${x.jenis_kegiatan?.nama} — ${x.lokasi}`, zona: `Zona ${x.zona?.nama} · Regu ${x.regu?.nomor}`, pelapor: x.pelapor_nama, aksi: () => verifKegiatan(x.id) }))}
        />
      )}
      {tab === 'kejadian' && (
        <TabelSederhana
          rows={kejadian.map((x) => ({ id: x.id, waktu: x.w1 ? fmtTime(x.w1) : '-', ringkasan: `${x.jenis_kecelakaan?.nama || 'Kejadian'} — ${x.lokasi}`, zona: `Zona ${x.zona?.nama} · Regu ${x.regu?.nomor}`, pelapor: x.pelapor_nama, aksi: () => verifKejadian(x.id), aksiSekunder: () => salinLaporanWA(x.id) }))}
        />
      )}
      {tab === 'sesi' && (
        <div className="space-y-3">
          {sesi.length === 0 && <div className="rounded-xl border border-line bg-white p-10 text-center text-[13px] text-ink-soft">Tidak ada sesi yang butuh tindakan.</div>}
          {sesi.map((s) => (
            <div key={s.id} className="rounded-xl border border-line bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="font-display text-[13.5px] font-bold">{s.pengguna?.pangkat} {s.pengguna?.nama}</div>
                  <div className="text-[11.5px] text-ink-soft">Zona {s.zona?.nama} · Regu {s.regu?.nomor} · Dibuka {fmtTime(s.waktu_buka)} WIB, {fmtDate(s.waktu_buka)}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${s.status === 'MENUNGGU_VERIFIKASI' ? 'bg-warn-bg text-warn' : 'bg-bad-bg text-bad'}`}>{s.status.replaceAll('_', ' ')}</span>
              </div>
              {s.status.startsWith('PELANGGARAN') && (
                <textarea
                  value={catatan[s.id] || ''}
                  onChange={(e) => setCatatan((c) => ({ ...c, [s.id]: e.target.value }))}
                  placeholder="Tulis catatan atau alasan pengecualian…"
                  rows={2}
                  className="mb-2 w-full rounded-lg border border-line p-2 text-[12px]"
                />
              )}
              <div className="flex gap-2">
                {s.status === 'MENUNGGU_VERIFIKASI' && (
                  <button onClick={() => tindakSesi(() => verifikasiSesi(s.id), 'Sesi diverifikasi')} className="rounded-lg bg-navy-950 px-3.5 py-2 text-[12px] font-semibold text-white">✓ Verifikasi</button>
                )}
                {s.status.startsWith('PELANGGARAN') && (
                  <button onClick={() => tindakSesi(() => kecualikanSesi(s.id, catatan[s.id] || ''), 'Sesi dikecualikan')} className="rounded-lg border border-line px-3.5 py-2 text-[12px] font-semibold">Simpan catatan &amp; kecualikan</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TabelSederhana({ rows }) {
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
              <td className="px-3.5 py-2.5">{r.ringkasan}</td>
              <td className="px-3.5 py-2.5">{r.zona}</td>
              <td className="px-3.5 py-2.5">{r.pelapor}</td>
              <td className="whitespace-nowrap px-3.5 py-2.5">
                <button onClick={r.aksi} className="mr-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold">✓ Verifikasi</button>
                {r.aksiSekunder && <button onClick={r.aksiSekunder} className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold">💬 Laporan WA</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
