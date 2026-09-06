import { useEffect, useState } from 'react'
import { cariArsipKegiatan, hapusLaporanKegiatan } from '../lib/laporanKegiatanApi'
import { cariArsipKejadian, hapusLaporanKejadian } from '../lib/laporanKejadianApi'
import { ambilArsipSesi, hapusSesiPiket } from '../lib/sesiPiketApi'
import { ambilZona, ambilRegu, ambilJenisKegiatan, ambilJenisKecelakaan } from '../lib/referensiApi'
import { fmtTime, fmtDate } from '../lib/format'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/auth'
import DetailModal from '../components/DetailModal'

const HAPUS_FN = { kegiatan: hapusLaporanKegiatan, kejadian: hapusLaporanKejadian, sesi: hapusSesiPiket }

const TABS = [['kegiatan', 'Laporan Kegiatan'], ['kejadian', 'Kejadian Kecelakaan'], ['sesi', 'Sesi Piket']]

export default function Arsip() {
  const toast = useToast()
  const { profil } = useAuth()
  const bolehHapus = profil.peran_sistem === 'ADMIN' || profil.peran_sistem === 'KANIT_GAKKUM'
  const [tab, setTab] = useState('kegiatan')
  const [zona, setZona] = useState([])
  const [regu, setRegu] = useState([])
  const [jenisKegiatan, setJenisKegiatan] = useState([])
  const [jenisKecelakaan, setJenisKecelakaan] = useState([])
  const [filter, setFilter] = useState({ kataKunci: '', zona_id: '', regu_id: '', jenis_kegiatan_id: '', jenis_kecelakaan_id: '', dari: '', sampai: '', nomor: '' })
  const [hasil, setHasil] = useState([])
  const [detailAktif, setDetailAktif] = useState(null)
  const [hapusTarget, setHapusTarget] = useState(null)

  useEffect(() => {
    ambilZona().then(setZona); ambilRegu().then(setRegu)
    ambilJenisKegiatan().then(setJenisKegiatan); ambilJenisKecelakaan().then(setJenisKecelakaan)
  }, [])

  async function cari() {
    try {
      if (tab === 'kegiatan') {
        const data = await cariArsipKegiatan(filter)
        setHasil(data.map((x) => ({ id: x.id, waktu: x.waktu_kirim, ringkasan: `${x.jenis_kegiatan?.nama} — ${x.lokasi}`, zona: x.zona?.nama, regu: x.regu?.nomor, pelapor: x.pelapor_nama, status: x.status })))
      } else if (tab === 'kejadian') {
        const data = await cariArsipKejadian(filter)
        setHasil(data.map((x) => ({ id: x.id, waktu: x.created_at, ringkasan: `${x.jenis_kecelakaan?.nama || 'Kejadian'} — ${x.lokasi}`, zona: x.zona?.nama, regu: x.regu?.nomor, pelapor: x.pelapor_nama, status: x.status })))
      } else {
        const data = await ambilArsipSesi({ zona_id: filter.zona_id || undefined })
        setHasil(data.map((s) => ({ id: s.id, waktu: s.waktu_buka, ringkasan: `${s.pengguna?.nama}`, zona: s.zona?.nama, regu: s.regu?.nomor, pelapor: '-', status: s.status })))
      }
    } catch (e) {
      toast(e.message || 'Gagal mengambil data arsip', true)
    }
  }
  useEffect(() => { cari() }, [tab])

  async function hapus() {
    try {
      await HAPUS_FN[hapusTarget.tipe](hapusTarget.id)
      toast('Laporan dihapus permanen.')
      setHapusTarget(null)
      cari()
    } catch (e) {
      toast(e.message || 'Gagal menghapus.', true)
    }
  }

  function unduhCsv() {
    const header = ['Waktu', 'Ringkasan', 'Zona', 'Regu', 'Pelapor', 'Status']
    const lines = [header.join(','), ...hasil.map((r) => [`"${fmtTime(r.waktu)} WIB, ${fmtDate(r.waktu)}"`, `"${r.ringkasan.replaceAll('"', '""')}"`, r.zona, r.regu, r.pelapor, r.status].join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `arsip_epikpor_${tab}.csv`; a.click()
  }

  return (
    <div className="mx-auto w-full max-w-[1540px]">
      <div className="mb-5">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-warn">Arsip</div>
        <h1 className="mt-1 font-display text-[26px] font-bold leading-tight text-navy-950 sm:text-[30px]">Arsip &amp; Pencarian</h1>
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto border-b border-line whitespace-nowrap">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`border-b-2 px-3.5 py-2.5 text-[12.5px] font-semibold ${tab === k ? 'border-brass text-navy-950' : 'border-transparent text-ink-soft'}`}>{l}</button>)}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <input placeholder="Kata kunci…" value={filter.kataKunci} onChange={(e) => setFilter((f) => ({ ...f, kataKunci: e.target.value }))} className="min-w-[180px] rounded-lg border border-line px-3 py-2 text-[12.5px]" />
        <select value={filter.zona_id} onChange={(e) => setFilter((f) => ({ ...f, zona_id: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
          <option value="">Semua zona</option>{zona.map((z) => <option key={z.id} value={z.id}>{z.nama}</option>)}
        </select>
        <select value={filter.regu_id} onChange={(e) => setFilter((f) => ({ ...f, regu_id: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
          <option value="">Semua regu</option>{regu.map((r) => <option key={r.id} value={r.id}>Regu {r.nomor}</option>)}
        </select>
        {tab === 'kegiatan' && (
          <select value={filter.jenis_kegiatan_id} onChange={(e) => setFilter((f) => ({ ...f, jenis_kegiatan_id: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
            <option value="">Semua jenis kegiatan</option>{jenisKegiatan.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
          </select>
        )}
        {tab === 'kejadian' && (
          <select value={filter.jenis_kecelakaan_id} onChange={(e) => setFilter((f) => ({ ...f, jenis_kecelakaan_id: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
            <option value="">Semua jenis kecelakaan</option>{jenisKecelakaan.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
          </select>
        )}
        {tab !== 'sesi' && <>
          <input type="date" value={filter.dari} onChange={(e) => setFilter((f) => ({ ...f, dari: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
          <input type="date" value={filter.sampai} onChange={(e) => setFilter((f) => ({ ...f, sampai: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
          <input placeholder="Nomor laporan (UUID)" value={filter.nomor} onChange={(e) => setFilter((f) => ({ ...f, nomor: e.target.value }))} className="min-w-[160px] rounded-lg border border-line px-3 py-2 text-[12.5px]" />
        </>}
        <button onClick={cari} className="rounded-lg bg-navy-950 px-4 py-2 text-[12.5px] font-semibold text-white">Cari</button>
        <button onClick={unduhCsv} className="rounded-lg border border-line px-3 py-2 text-[12px] font-semibold">⬇ Unduh CSV</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead><tr className="bg-paper-dim text-left text-[11px] uppercase text-ink-soft">
            <th className="px-3.5 py-2.5">Waktu</th><th className="px-3.5 py-2.5">Ringkasan</th><th className="px-3.5 py-2.5">Zona/Regu</th><th className="px-3.5 py-2.5">Pelapor</th><th className="px-3.5 py-2.5">Status</th><th className="px-3.5 py-2.5"></th>
          </tr></thead>
          <tbody>
            {hasil.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-ink-soft">Tidak ada hasil.</td></tr>}
            {hasil.map((r) => (
              <tr key={r.id} className="border-t border-paper-dim">
                <td className="px-3.5 py-2.5 font-mono">{fmtTime(r.waktu)} WIB, {fmtDate(r.waktu)}</td>
                <td className="px-3.5 py-2.5">{r.ringkasan}</td>
                <td className="px-3.5 py-2.5">Zona {r.zona} · Regu {r.regu}</td>
                <td className="px-3.5 py-2.5">{r.pelapor}</td>
                <td className="px-3.5 py-2.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${r.status === 'TERVERIFIKASI' || r.status === 'TERTUTUP' ? 'bg-ok-bg text-ok' : 'bg-warn-bg text-warn'}`}>{r.status.replaceAll('_', ' ')}</span>
                </td>
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  <button onClick={() => setDetailAktif({ tipe: tab, id: r.id })} className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold">Lihat</button>
                  {bolehHapus && (
                    <button onClick={() => setHapusTarget({ tipe: tab, id: r.id, ringkasan: r.ringkasan })} className="ml-1.5 rounded-lg border border-bad/30 px-2.5 py-1.5 text-[11px] font-semibold text-bad hover:bg-bad-bg">Hapus</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailAktif && (
        <DetailModal tipe={detailAktif.tipe} id={detailAktif.id} onClose={() => setDetailAktif(null)} onUbah={cari} />
      )}

      {hapusTarget && (
        <KonfirmasiHapus target={hapusTarget} onBatal={() => setHapusTarget(null)} onHapus={hapus} />
      )}
    </div>
  )
}

function KonfirmasiHapus({ target, onBatal, onHapus }) {
  const [teks, setTeks] = useState('')
  const [memuat, setMemuat] = useState(false)
  const cocok = teks.trim().toUpperCase() === 'HAPUS'

  async function konfirmasi() {
    setMemuat(true)
    try { await onHapus() } finally { setMemuat(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[420px] rounded-xl bg-white p-6 shadow-[0_12px_36px_rgba(11,20,36,.18)]">
        <h2 className="font-display text-[17px] font-semibold text-bad">Hapus laporan permanen?</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">{target.ringkasan}</span> akan dihapus <span className="font-semibold">selama-lamanya</span>, termasuk seluruh foto lampirannya. Tindakan ini tidak bisa dibatalkan.
        </p>
        <p className="mt-3 text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">Ketik HAPUS untuk konfirmasi</p>
        <input
          autoFocus
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-[13.5px] outline-none focus:border-bad focus:ring-2 focus:ring-bad/20"
          placeholder="HAPUS"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onBatal} className="rounded-lg border border-line px-4 py-2 text-[12.5px] font-semibold">Batal</button>
          <button
            onClick={konfirmasi}
            disabled={!cocok || memuat}
            className="rounded-lg bg-bad px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-40"
          >
            {memuat ? 'Menghapus…' : 'Hapus Permanen'}
          </button>
        </div>
      </div>
    </div>
  )
}
