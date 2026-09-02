import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { ambilZona, ambilRegu, ambilPengguna } from '../lib/referensiApi'
import { ambilRosterPeriode, simpanBarisRoster, salinRosterMingguSebelumnya, simpanRosterMassal } from '../lib/rosterApi'
import {
  DAFTAR_MODE_HARI as MODE_HARI, ATURAN_MODE_HARI,
  susunJadwalBulan, modeHariOtomatis, periksaKecukupanRegu, namaHari,
} from '../lib/siagaWiken'

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function awalMinggu(d) {
  const x = new Date(d); const hari = x.getDay(); x.setDate(x.getDate() - hari)
  return x
}

export default function Roster() {
  const { profil } = useAuth()
  const toast = useToast()
  const [zona, setZona] = useState([])
  const [regu, setRegu] = useState([])
  const [pengguna, setPengguna] = useState([])
  const [mulaiMinggu, setMulaiMinggu] = useState(awalMinggu(new Date()))
  const [baris, setBaris] = useState([])
  const [form, setForm] = useState({ tanggal: '', mode_hari: 'HARI_KERJA', zona_id: '', regu_id: '', pengguna_ids: [] })
  const kini = new Date()
  const [gen, setGen] = useState({ tahun: kini.getFullYear(), bulan: kini.getMonth() + 1, mingguAwal: 1 })
  const [pratinjau, setPratinjau] = useState(null)
  const [menyusun, setMenyusun] = useState(false)

  useEffect(() => { ambilZona().then(setZona); ambilRegu().then(setRegu); ambilPengguna().then(setPengguna) }, [])

  async function muatMinggu() {
    try {
      const akhir = new Date(mulaiMinggu); akhir.setDate(akhir.getDate() + 6)
      const data = await ambilRosterPeriode(mulaiMinggu.toISOString().slice(0, 10), akhir.toISOString().slice(0, 10))
      setBaris(data)
    } catch (e) {
      toast(e.message || 'Gagal memuat roster', true)
    }
  }
  useEffect(() => { muatMinggu() }, [mulaiMinggu])

  async function simpan() {
    if (!form.tanggal || !form.zona_id || !form.regu_id) return toast('Lengkapi tanggal, zona, dan regu', true)
    try {
      await simpanBarisRoster({ ...form, disusun_oleh: profil.id })
      toast('Baris roster tersimpan')
      setForm({ tanggal: '', mode_hari: 'HARI_KERJA', zona_id: '', regu_id: '', pengguna_ids: [] })
      muatMinggu()
    } catch (e) {
      toast(e.message || 'Gagal menyimpan baris roster', true)
    }
  }

  // Peringatan langsung saat menyusun manual: berapa regu yang sudah
  // terjadwal pada tanggal itu, dibandingkan dengan tuntutan mode harinya.
  const peringatanHari = (() => {
    if (!form.tanggal) return null
    const reguTanggalIni = new Set(baris.filter((b) => b.tanggal === form.tanggal).map((b) => b.regu_id))
    if (form.regu_id) reguTanggalIni.add(form.regu_id)
    return periksaKecukupanRegu(form.mode_hari, reguTanggalIni.size, regu.length)
  })()

  // Personel satu regu tersebar di ketiga zona (lihat data induk), jadi tiap
  // baris roster = satu zona x satu regu, diisi Banit aktif yang cocok
  // keduanya. Regu tanpa personel di suatu zona sengaja tetap dibuatkan
  // barisnya supaya kekosongannya terlihat, bukan hilang diam-diam.
  function personelUntuk(zona_id, regu_id) {
    return pengguna
      .filter((p) => p.peran_sistem === 'BANIT' && p.status_aktif && p.zona_id === zona_id && p.regu_id === regu_id)
      .map((p) => p.id)
  }

  function susunPratinjau() {
    if (!zona.length || !regu.length) return toast('Data zona atau regu belum tersedia', true)
    const jadwal = susunJadwalBulan(gen.tahun, gen.bulan, gen.mingguAwal)
    const barisBaru = []
    for (const hari of jadwal) {
      for (const nomor of hari.reguNomor) {
        const r = regu.find((x) => Number(x.nomor) === nomor)
        if (!r) continue
        for (const z of zona) {
          barisBaru.push({
            tanggal: hari.tanggal, mode_hari: hari.mode_hari,
            zona_id: z.id, regu_id: r.id,
            pengguna_ids: personelUntuk(z.id, r.id),
            _hari: hari.hari, _zona: z.nama, _regu: nomor,
          })
        }
      }
    }
    const reguHilang = [...new Set(jadwal.flatMap((h) => h.reguNomor))].filter((n) => !regu.some((x) => Number(x.nomor) === n))
    setPratinjau({ jadwal, baris: barisBaru, reguHilang })
  }

  async function simpanPratinjau() {
    if (!pratinjau) return
    setMenyusun(true)
    try {
      const jumlah = await simpanRosterMassal(pratinjau.baris, profil.id)
      toast(`${jumlah} baris roster tersimpan untuk ${NAMA_BULAN[gen.bulan - 1]} ${gen.tahun}`)
      setPratinjau(null)
      muatMinggu()
    } catch (e) {
      toast(e.message || 'Gagal menyimpan roster', true)
    } finally {
      setMenyusun(false)
    }
  }

  async function salinMinggu() {
    try {
      await salinRosterMingguSebelumnya(mulaiMinggu.toISOString().slice(0, 10), profil.id)
      toast('Roster minggu lalu disalin, silakan sunting seperlunya')
      muatMinggu()
    } catch (e) {
      toast(e.message || 'Gagal menyalin roster', true)
    }
  }

  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-warn">Roster</div>
        <h1 className="mt-1 font-display text-[22px] font-semibold">Roster Piket</h1>
        <p className="mt-1 max-w-xl text-[13.5px] text-ink-soft">Disusun dan disahkan manusia — sistem tidak menghitung rotasi regu sendiri (Dokumen Teknis Bagian 8).</p>
      </div>

      <div className="mb-5 rounded-2xl border border-brass bg-white p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-[14.5px] font-semibold">Susun rotasi otomatis</h3>
          <span className="font-mono text-[10.5px] uppercase tracking-wide text-warn">Skema Siaga Wiken</span>
        </div>
        <p className="mb-3.5 text-[11.5px] text-ink-soft">
          Mengikuti RAP Tabel 1.1 &amp; 1.2: hari kerja satu regu bergilir, <b>akhir pekan dua regu</b> sebagai penguatan personel.
          Hasilnya bisa diperiksa dulu sebelum disimpan, dan tetap bisa disunting satu per satu setelahnya.
        </p>
        <div className="mb-3 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ink-soft">Bulan</label>
            <select value={gen.bulan} onChange={(e) => { setGen((g) => ({ ...g, bulan: Number(e.target.value) })); setPratinjau(null) }} className="w-full rounded-lg border border-line px-3 py-2 text-[12.5px]">
              {NAMA_BULAN.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ink-soft">Tahun</label>
            <input type="number" value={gen.tahun} onChange={(e) => { setGen((g) => ({ ...g, tahun: Number(e.target.value) })); setPratinjau(null) }} className="w-full rounded-lg border border-line px-3 py-2 text-[12.5px]" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold text-ink-soft">Minggu pertama memakai pola</label>
            <select value={gen.mingguAwal} onChange={(e) => { setGen((g) => ({ ...g, mingguAwal: Number(e.target.value) })); setPratinjau(null) }} className="w-full rounded-lg border border-line px-3 py-2 text-[12.5px]">
              <option value={1}>Pola Minggu ke-1 (Senin mulai Regu 1)</option>
              <option value={2}>Pola Minggu ke-2 (Senin mulai Regu 3)</option>
            </select>
          </div>
        </div>
        <button onClick={susunPratinjau} className="rounded-lg bg-navy-950 px-4 py-2 text-[12.5px] font-semibold text-white">
          Susun &amp; Periksa Dulu
        </button>

        {pratinjau && (
          <div className="mt-4 border-t border-dashed border-paper-dim pt-3.5">
            {pratinjau.reguHilang.length > 0 && (
              <div className="mb-2.5 rounded-lg bg-bad-bg px-3 py-2 text-[12px] text-bad">
                Regu {pratinjau.reguHilang.join(', ')} disebut dalam pola tetapi tidak ada di data induk — harinya dilewati.
                Tambahkan dulu lewat Kelola Data → Zona &amp; Regu.
              </div>
            )}
            <div className="mb-2 text-[12px] text-ink-soft">
              <b className="text-ink">{pratinjau.baris.length} baris</b> akan dibuat untuk {NAMA_BULAN[gen.bulan - 1]} {gen.tahun}
              {' · '}{pratinjau.baris.filter((b) => b.pengguna_ids.length === 0).length} baris belum ada personelnya
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-line">
              <table className="w-full text-[11.5px]">
                <thead className="sticky top-0 bg-paper-dim text-left text-[10.5px] uppercase text-ink-soft">
                  <tr><th className="px-2.5 py-1.5">Tanggal</th><th className="px-2.5 py-1.5">Hari</th><th className="px-2.5 py-1.5">Mode</th><th className="px-2.5 py-1.5">Regu bertugas</th></tr>
                </thead>
                <tbody>
                  {pratinjau.jadwal.map((h) => (
                    <tr key={h.tanggal} className={`border-t border-paper-dim ${h.mode_hari === 'AKHIR_PEKAN' ? 'bg-warn-bg/50' : ''}`}>
                      <td className="px-2.5 py-1.5 font-mono">{h.tanggal}</td>
                      <td className="px-2.5 py-1.5">{h.hari}</td>
                      <td className="px-2.5 py-1.5">{ATURAN_MODE_HARI[h.mode_hari].label}</td>
                      <td className="px-2.5 py-1.5 font-semibold">
                        Regu {h.reguNomor.join(' + ')}
                        {h.reguNomor.length > 1 && <span className="ml-1.5 rounded-full bg-warn-bg px-1.5 py-0.5 text-[10px] font-bold text-warn">penguatan</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={simpanPratinjau} disabled={menyusun} className="rounded-lg bg-brass px-4 py-2 text-[12.5px] font-bold text-navy-950 disabled:opacity-50">
                {menyusun ? 'Menyimpan…' : `Simpan ${pratinjau.baris.length} baris`}
              </button>
              <button onClick={() => setPratinjau(null)} className="rounded-lg border border-line px-4 py-2 text-[12.5px] font-semibold">Batal</button>
            </div>
            <p className="mt-2 text-[11px] text-ink-soft">
              Tanggal yang sudah punya roster akan ditimpa dengan susunan baru ini.
            </p>
          </div>
        )}
      </div>

      <div className="mb-5 rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-3.5 font-display text-[14.5px] font-semibold">Tambah / ubah baris roster</h3>
        <div className="mb-1.5 grid gap-3 sm:grid-cols-4">
          {/* Memilih tanggal langsung menyetel mode harinya — Sabtu/Minggu
              otomatis jadi Akhir Pekan, supaya penguatan personel tidak
              terlewat hanya karena penyusun lupa mengubah mode. */}
          <input
            type="date" value={form.tanggal}
            onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value, mode_hari: e.target.value ? modeHariOtomatis(e.target.value) : f.mode_hari }))}
            className="rounded-lg border border-line px-3 py-2 text-[12.5px]"
          />
          <select value={form.mode_hari} onChange={(e) => setForm((f) => ({ ...f, mode_hari: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
            {MODE_HARI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={form.zona_id} onChange={(e) => setForm((f) => ({ ...f, zona_id: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
            <option value="">Zona —</option>{zona.map((z) => <option key={z.id} value={z.id}>{z.nama}</option>)}
          </select>
          <select value={form.regu_id} onChange={(e) => setForm((f) => ({ ...f, regu_id: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
            <option value="">Regu —</option>{regu.map((r) => <option key={r.id} value={r.id}>Regu {r.nomor}</option>)}
          </select>
        </div>
        {/* Tiap mode hari punya tuntutan pengerahannya sendiri menurut RAP
            Tabel 1.3. Dulu mode hari cuma label tanpa akibat apa pun. */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-soft">
          <span>{ATURAN_MODE_HARI[form.mode_hari]?.catatan}</span>
          {form.tanggal && <span className="rounded-full bg-paper-dim px-2 py-0.5 font-semibold text-ink">{namaHari(form.tanggal)}</span>}
        </div>
        {form.tanggal && peringatanHari && (
          <div className="mb-3 rounded-lg bg-warn-bg px-3 py-2 text-[12px] text-warn">⚠ {peringatanHari}</div>
        )}

        <div className="mb-3">
          <label className="mb-1.5 block text-[11px] font-semibold text-ink-soft">Personel bertugas</label>
          <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-line p-2">
            {pengguna.filter((p) => p.peran_sistem === 'BANIT').map((p) => (
              <button
                key={p.id}
                onClick={() => setForm((f) => ({ ...f, pengguna_ids: f.pengguna_ids.includes(p.id) ? f.pengguna_ids.filter((x) => x !== p.id) : [...f.pengguna_ids, p.id] }))}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${form.pengguna_ids.includes(p.id) ? 'border-navy-900 bg-navy-900 text-white' : 'border-line text-ink-soft'}`}
              >
                {p.nama}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={simpan} className="rounded-lg bg-navy-950 px-4 py-2 text-[12.5px] font-semibold text-white">Simpan Baris</button>
          <button onClick={salinMinggu} className="rounded-lg border border-line px-4 py-2 text-[12.5px] font-semibold">Salin dari Minggu Lalu</button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h3 className="font-display text-[14.5px] font-semibold">Minggu {mulaiMinggu.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</h3>
          <div className="flex gap-2">
            <button onClick={() => setMulaiMinggu((d) => { const x = new Date(d); x.setDate(x.getDate() - 7); return x })} className="rounded-lg border border-line px-2.5 py-1 text-[12px]">‹</button>
            <button onClick={() => setMulaiMinggu((d) => { const x = new Date(d); x.setDate(x.getDate() + 7); return x })} className="rounded-lg border border-line px-2.5 py-1 text-[12px]">›</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12px]">
            <thead><tr className="bg-paper-dim text-left text-[10.5px] uppercase text-ink-soft"><th className="px-2.5 py-2">Tanggal</th><th className="px-2.5 py-2">Mode</th><th className="px-2.5 py-2">Zona</th><th className="px-2.5 py-2">Regu</th><th className="px-2.5 py-2">Personel</th></tr></thead>
            <tbody>
              {baris.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-ink-soft">Belum ada roster minggu ini.</td></tr>}
              {baris.map((b) => (
                <tr key={b.id} className="border-t border-paper-dim">
                  <td className="px-2.5 py-2">{b.tanggal}</td>
                  <td className="px-2.5 py-2">{MODE_HARI.find(([v]) => v === b.mode_hari)?.[1]}</td>
                  <td className="px-2.5 py-2">{b.zona?.nama}</td>
                  <td className="px-2.5 py-2">{b.regu?.nomor}</td>
                  <td className="px-2.5 py-2">{(b.personel || []).map((p) => p.pengguna?.nama).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
