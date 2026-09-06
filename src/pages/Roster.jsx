import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { ambilZona, ambilRegu, ambilPengguna } from '../lib/referensiApi'
import { ambilRosterPeriode, simpanBarisRoster, salinRosterMingguSebelumnya, simpanRosterMassal } from '../lib/rosterApi'
import {
  DAFTAR_MODE_HARI as MODE_HARI, ATURAN_MODE_HARI, POLA_BAWAAN, polaSah, bacaHari,
  susunJadwalBulan, modeHariOtomatis, periksaKecukupanRegu, namaHari,
} from '../lib/siagaWiken'
import { ambilPengaturan, simpanPengaturan, KUNCI_POLA_ROTASI } from '../lib/pengaturanApi'

const HARI_PEKAN = [[1, 'Senin'], [2, 'Selasa'], [3, 'Rabu'], [4, 'Kamis'], [5, 'Jumat'], [6, 'Sabtu'], [7, 'Minggu']]

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
  const [pola, setPola] = useState(POLA_BAWAAN)
  const [menyimpanPola, setMenyimpanPola] = useState(false)
  const bolehUbahPola = profil.peran_sistem === 'ADMIN'

  useEffect(() => {
    ambilZona().then(setZona); ambilRegu().then(setRegu); ambilPengguna().then(setPengguna)
    // Pola bawaan tetap dipakai bila pengaturan belum pernah disimpan atau
    // isinya rusak — penyusunan roster tidak boleh macet karenanya.
    ambilPengaturan(KUNCI_POLA_ROTASI)
      .then((p) => { if (polaSah(p)) setPola(p) })
      .catch(() => {})
  }, [])

  function ubahJumlahMinggu(n) {
    setPratinjau(null)
    setPola((lama) => {
      const minggu = {}
      for (let m = 1; m <= n; m++) {
        // Minggu baru menyalin minggu terakhir yang ada, supaya penyusun tidak
        // mulai dari kotak kosong sama sekali.
        minggu[m] = bacaHariSemua(lama, m) || bacaHariSemua(lama, ((m - 2) % (lama.jumlahMinggu || 1)) + 1) || {}
      }
      return { jumlahMinggu: n, minggu }
    })
  }

  function bacaHariSemua(p, m) {
    const mg = p.minggu?.[m] ?? p.minggu?.[String(m)]
    return mg ? { ...mg } : null
  }

  function toggleRegu(minggu, hari, nomor) {
    setPratinjau(null)
    setPola((lama) => {
      const kini = bacaHari(lama, minggu, hari)
      const baru = kini.includes(nomor) ? kini.filter((x) => x !== nomor) : [...kini, nomor].sort((a, b) => a - b)
      return {
        ...lama,
        minggu: { ...lama.minggu, [minggu]: { ...bacaHariSemua(lama, minggu), [hari]: baru } },
      }
    })
  }

  async function simpanPola() {
    if (!polaSah(pola)) return toast('Pola belum lengkap — tiap hari pada tiap minggu harus terisi', true)
    setMenyimpanPola(true)
    try {
      await simpanPengaturan(KUNCI_POLA_ROTASI, pola, profil.id)
      toast('Pola rotasi tersimpan dan berlaku untuk semua penyusun')
    } catch (e) {
      toast(e.message || 'Gagal menyimpan pola rotasi', true)
    } finally {
      setMenyimpanPola(false)
    }
  }

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

  // Penunjuk cakupan: berapa hari pada bulan yang sedang disusun sudah punya
  // roster. Tanpa ini, penyusun harus menyusuri minggu satu per satu hanya
  // untuk tahu apakah bulan itu sudah tergarap atau belum.
  const [cakupan, setCakupan] = useState(null)
  useEffect(() => {
    const akhir = new Date(gen.tahun, gen.bulan, 0).getDate()
    const p2 = (n) => String(n).padStart(2, '0')
    ambilRosterPeriode(`${gen.tahun}-${p2(gen.bulan)}-01`, `${gen.tahun}-${p2(gen.bulan)}-${p2(akhir)}`)
      .then((r) => setCakupan({ terjadwal: new Set(r.map((x) => x.tanggal)).size, total: akhir }))
      .catch(() => setCakupan(null))
  }, [gen.tahun, gen.bulan, baris])

  const cakupanBulan = cakupan
    ? `${NAMA_BULAN[gen.bulan - 1]} ${gen.tahun}: ${cakupan.terjadwal} dari ${cakupan.total} hari terjadwal`
    : ''

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
    const jadwal = susunJadwalBulan(gen.tahun, gen.bulan, gen.mingguAwal, pola)
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
    <div className="mx-auto w-full max-w-[1540px]">
      <div className="mb-5">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-warn">Roster</div>
        <h1 className="mt-1 font-display text-[26px] font-bold leading-tight text-navy-950 sm:text-[30px]">Roster Piket</h1>
        <p className="mt-1 max-w-xl text-[13.5px] text-ink-soft">
          Susun sebulan sekaligus, lalu sunting harinya kalau ada penyesuaian. Jadwal tetap disahkan manusia —
          sistem hanya menyalinkan polanya (Dokumen Teknis Bagian 8).
        </p>
      </div>

      {/* Satu tindakan utama di atas, hasilnya di tengah, dua pengaturan
          lanjutan terlipat di bawah. Sebelumnya penyusun otomatis dan
          formulir manual tampil sederajat tanpa penjelasan kapan memakai
          yang mana, dan penyunting pola terselip di dalam penyusun. */}
      <div className="mb-5 rounded-xl border-2 border-brass bg-white p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-[15px] font-semibold">
            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brass text-[11px] font-bold text-navy-950">1</span>
            Susun jadwal satu bulan
          </h3>
          <span className="font-mono text-[10.5px] uppercase tracking-wide text-warn">Skema Siaga Wiken</span>
        </div>
        <p className="mb-3.5 text-[12px] text-ink-soft">
          Hari kerja satu regu bergilir, <b>akhir pekan dua regu</b> sebagai penguatan personel.
          Hasilnya ditampilkan dulu untuk diperiksa — belum tersimpan sebelum kamu menekan Simpan.
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
            <label className="mb-1 block text-[11px] font-semibold text-ink-soft">Minggu pertama memakai pola ke-</label>
            <select value={gen.mingguAwal} onChange={(e) => { setGen((g) => ({ ...g, mingguAwal: Number(e.target.value) })); setPratinjau(null) }} className="w-full rounded-lg border border-line px-3 py-2 text-[12.5px]">
              {Array.from({ length: pola.jumlahMinggu }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Minggu ke-{i + 1} — Senin: Regu {bacaHari(pola, i + 1, 1).join(' + ') || '—'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={susunPratinjau} className="rounded-lg bg-navy-950 px-5 py-2.5 text-[13px] font-semibold text-white">
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
            <div className="max-h-64 overflow-auto rounded-lg border border-line">
              <table className="w-full min-w-[520px] text-[11.5px]">
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

      <div className="mb-5 rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-[15px] font-semibold">
            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-white">2</span>
            Jadwal tersusun
          </h3>
          <span className="text-[11.5px] text-ink-soft">{cakupanBulan}</span>
        </div>
        <p className="mb-3.5 text-[12px] text-ink-soft">Ditampilkan per minggu. Gunakan panah untuk berpindah minggu.</p>
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

      <details className="mb-3 rounded-xl border border-line bg-white">
        <summary className="cursor-pointer list-none px-5 py-3.5 text-[13.5px] font-semibold">
          <span className="mr-1.5 text-ink-soft">▸</span> Sunting satu hari
          <span className="ml-2 text-[11.5px] font-normal text-ink-soft">— penyesuaian di luar pola, mis. cuti atau operasi mendadak</span>
        </summary>
        <div className="border-t border-line px-5 pb-5 pt-4">
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
      </details>

      <details className="rounded-xl border border-line bg-white">
        <summary className="cursor-pointer list-none px-5 py-3.5 text-[13.5px] font-semibold">
          <span className="mr-1.5 text-ink-soft">▸</span> Atur pola rotasi
          <span className="ml-2 text-[11.5px] font-normal text-ink-soft">— siklus {pola.jumlahMinggu} minggu{bolehUbahPola ? '' : ' (hanya dapat dilihat)'}</span>
        </summary>
        <div className="border-t border-line px-5 pb-5 pt-4">
            <div className="mb-1 font-display text-[13px] font-semibold">Pola rotasi</div>
            <p className="mb-3 text-[11.5px] text-ink-soft">
              Nilai awalnya mengikuti RAP Tabel 1.1 &amp; 1.2. RAP hanya memuat dua minggu, jadi panjang siklus bisa disetel sendiri:
              <b> siklus 3 minggu</b> membuat giliran hari kerja bersambung tanpa putus, sedangkan <b>siklus 2 minggu</b> mengulang
              persis tabel RAP — dengan akibat ada regu yang mendapat giliran dua hari berturut-turut di batas siklus.
            </p>

            <div className="mb-3 flex items-center gap-2">
              <label className="text-[11.5px] font-semibold text-ink-soft">Panjang siklus</label>
              <select
                value={pola.jumlahMinggu} disabled={!bolehUbahPola}
                onChange={(e) => ubahJumlahMinggu(Number(e.target.value))}
                className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] disabled:opacity-60"
              >
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} minggu</option>)}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-[11.5px]">
                <thead>
                  <tr className="text-left text-[10.5px] uppercase text-ink-soft">
                    <th className="py-1.5 pr-2">Hari</th>
                    {Array.from({ length: pola.jumlahMinggu }, (_, i) => <th key={i} className="px-2 py-1.5">Minggu ke-{i + 1}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {HARI_PEKAN.map(([nomorHari, namaH]) => (
                    <tr key={nomorHari} className={`border-t border-paper-dim ${nomorHari >= 6 ? 'bg-warn-bg/40' : ''}`}>
                      <td className="py-1.5 pr-2 font-semibold">
                        {namaH}
                        {nomorHari >= 6 && <div className="text-[9.5px] font-normal text-warn">penguatan</div>}
                      </td>
                      {Array.from({ length: pola.jumlahMinggu }, (_, i) => {
                        const m = i + 1
                        const terpilih = bacaHari(pola, m, nomorHari)
                        return (
                          <td key={m} className="px-2 py-1.5">
                            <div className="flex flex-wrap gap-1">
                              {regu.map((r) => {
                                const n = Number(r.nomor)
                                const aktif = terpilih.includes(n)
                                return (
                                  <button
                                    key={r.id} type="button" disabled={!bolehUbahPola}
                                    onClick={() => toggleRegu(m, nomorHari, n)}
                                    className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold disabled:opacity-60 ${aktif ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-white text-ink-soft'}`}
                                  >
                                    {r.nomor}
                                  </button>
                                )
                              })}
                              {terpilih.length === 0 && <span className="text-[10.5px] italic text-bad">kosong</span>}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {bolehUbahPola ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={simpanPola} disabled={menyimpanPola} className="rounded-lg bg-navy-950 px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50">
                  {menyimpanPola ? 'Menyimpan…' : 'Simpan pola'}
                </button>
                <button onClick={() => { setPola(POLA_BAWAAN); setPratinjau(null) }} className="rounded-lg border border-line px-3.5 py-2 text-[12px] font-semibold">
                  Kembalikan ke pola RAP
                </button>
              </div>
            ) : (
              <p className="mt-3 text-[11.5px] italic text-ink-soft">Hanya Administrator yang dapat mengubah pola ini.</p>
            )}
        </div>
      </details>
    </div>
  )
}
