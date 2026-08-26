import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { ambilZona, ambilRegu, ambilPengguna } from '../lib/referensiApi'
import { ambilRosterPeriode, simpanBarisRoster, salinRosterMingguSebelumnya } from '../lib/rosterApi'

const MODE_HARI = [
  ['HARI_KERJA', 'Hari Kerja'], ['AKHIR_PEKAN', 'Akhir Pekan'], ['LIBUR_NASIONAL_BIASA', 'Libur Nasional Biasa'],
  ['LIBUR_PANJANG', 'Libur Panjang'], ['OPERASI_KEPOLISIAN', 'Operasi Kepolisian'], ['KEADAAN_DARURAT', 'Keadaan Darurat'],
]

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

  useEffect(() => { ambilZona().then(setZona); ambilRegu().then(setRegu); ambilPengguna().then(setPengguna) }, [])

  async function muatMinggu() {
    const akhir = new Date(mulaiMinggu); akhir.setDate(akhir.getDate() + 6)
    const data = await ambilRosterPeriode(mulaiMinggu.toISOString().slice(0, 10), akhir.toISOString().slice(0, 10))
    setBaris(data)
  }
  useEffect(() => { muatMinggu() }, [mulaiMinggu])

  async function simpan() {
    if (!form.tanggal || !form.zona_id || !form.regu_id) return toast('Lengkapi tanggal, zona, dan regu', true)
    await simpanBarisRoster({ ...form, disusun_oleh: profil.id })
    toast('Baris roster tersimpan')
    setForm({ tanggal: '', mode_hari: 'HARI_KERJA', zona_id: '', regu_id: '', pengguna_ids: [] })
    muatMinggu()
  }

  async function salinMinggu() {
    await salinRosterMingguSebelumnya(mulaiMinggu.toISOString().slice(0, 10), profil.id)
    toast('Roster minggu lalu disalin, silakan sunting seperlunya')
    muatMinggu()
  }

  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-warn">Roster</div>
        <h1 className="mt-1 font-display text-[22px] font-semibold">Roster Piket</h1>
        <p className="mt-1 max-w-xl text-[13.5px] text-ink-soft">Disusun dan disahkan manusia — sistem tidak menghitung rotasi regu sendiri (Dokumen Teknis Bagian 8).</p>
      </div>

      <div className="mb-5 rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-3.5 font-display text-[14.5px] font-semibold">Tambah / ubah baris roster</h3>
        <div className="mb-3 grid gap-3 sm:grid-cols-4">
          <input type="date" value={form.tanggal} onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
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
