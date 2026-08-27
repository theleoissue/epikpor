import { useEffect, useState } from 'react'
import { useToast } from '../components/Toast'
import {
  ambilPengguna, ambilZona, ambilRegu, buatAkunPengguna, perbaruiPengguna, resetPasswordPengguna,
  ambilJenisKegiatan, ambilJenisKecelakaan, ambilTipeTabrakan,
  tambahJenisKegiatan, tambahJenisKecelakaan, tambahTipeTabrakan,
  nonaktifkanJenisKegiatan, nonaktifkanJenisKecelakaan, nonaktifkanTipeTabrakan,
} from '../lib/referensiApi'
import { LABEL_PERAN } from '../lib/menu'
import ImporPersonelMassal from '../components/ImporPersonelMassal'

const TABS = [['personel', 'Personel'], ['kegiatan', 'Jenis Kegiatan'], ['kecelakaan', 'Jenis & Tipe Kecelakaan']]
const PERAN_OPT = Object.entries(LABEL_PERAN)

export default function Kelola() {
  const [tab, setTab] = useState('personel')
  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-warn">Kelola Data</div>
        <h1 className="mt-1 font-display text-[22px] font-semibold">Data Induk Sistem</h1>
      </div>
      <div className="mb-4 flex gap-1.5 border-b border-line">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`border-b-2 px-3.5 py-2.5 text-[12.5px] font-semibold ${tab === k ? 'border-brass text-navy-950' : 'border-transparent text-ink-soft'}`}>{l}</button>)}
      </div>
      {tab === 'personel' && <TabPersonel />}
      {tab === 'kegiatan' && <TabDaftar label="jenis kegiatan" ambil={ambilJenisKegiatan} tambah={tambahJenisKegiatan} nonaktifkan={nonaktifkanJenisKegiatan} />}
      {tab === 'kecelakaan' && (
        <div className="space-y-5">
          <TabDaftar label="jenis kecelakaan" ambil={ambilJenisKecelakaan} tambah={tambahJenisKecelakaan} nonaktifkan={nonaktifkanJenisKecelakaan} />
          <TabDaftar label="tipe tabrakan" ambil={ambilTipeTabrakan} tambah={tambahTipeTabrakan} nonaktifkan={nonaktifkanTipeTabrakan} />
        </div>
      )}
    </div>
  )
}

function TabPersonel() {
  const toast = useToast()
  const [daftar, setDaftar] = useState([])
  const [zona, setZona] = useState([])
  const [regu, setRegu] = useState([])
  const [form, setForm] = useState({ nama: '', nrp: '', pangkat: '', gelar: '', peran_sistem: 'BANIT', zona_id: '', regu_id: '', password: '' })
  const [memproses, setMemproses] = useState(false)
  const [imporTerbuka, setImporTerbuka] = useState(false)

  async function muat() {
    try { setDaftar(await ambilPengguna()) }
    catch (e) { toast(e.message || 'Gagal memuat daftar personel', true) }
  }
  useEffect(() => { muat(); ambilZona().then(setZona); ambilRegu().then(setRegu) }, [])

  async function tambahAkun() {
    if (!form.nama || !form.nrp || !form.password) return toast('Lengkapi nama, NRP, dan kata sandi awal', true)
    // Banit & Kasubnit wajib punya zona (RLS dan pembatasan baris data bergantung
    // padanya); Banit tambahan wajib punya regu (kolom regu_id NOT NULL di
    // sesi_piket/laporan_kegiatan/laporan_kejadian).
    if ((form.peran_sistem === 'BANIT' || form.peran_sistem === 'KASUBNIT') && !form.zona_id) {
      return toast('Personel dengan peran Banit atau Kasubnit wajib diberi zona', true)
    }
    if (form.peran_sistem === 'BANIT' && !form.regu_id) {
      return toast('Personel dengan peran Banit wajib diberi regu', true)
    }
    setMemproses(true)
    try {
      await buatAkunPengguna(form)
      toast('Akun personel dibuat')
      setForm({ nama: '', nrp: '', pangkat: '', gelar: '', peran_sistem: 'BANIT', zona_id: '', regu_id: '', password: '' })
      muat()
    } catch (e) { toast(e.message, true) } finally { setMemproses(false) }
  }

  async function toggleAktif(p) {
    try {
      await perbaruiPengguna(p.id, { status_aktif: !p.status_aktif })
      toast(p.status_aktif ? `${p.nama} dinonaktifkan` : `${p.nama} diaktifkan kembali`)
      muat()
    } catch (e) {
      toast(e.message || 'Gagal mengubah status akun', true)
    }
  }

  const [resetTarget, setResetTarget] = useState(null)
  const [sandiBaru, setSandiBaru] = useState('')
  const [memprosesReset, setMemprosesReset] = useState(false)

  async function simpanResetSandi() {
    if (!sandiBaru.trim()) return toast('Isi kata sandi baru terlebih dahulu', true)
    setMemprosesReset(true)
    try {
      await resetPasswordPengguna(resetTarget.id, sandiBaru.trim())
      toast(`Kata sandi ${resetTarget.nama} diperbarui`)
      setResetTarget(null); setSandiBaru('')
    } catch (e) {
      toast(e.message, true)
    } finally {
      setMemprosesReset(false)
    }
  }

  const perluZona = form.peran_sistem === 'BANIT' || form.peran_sistem === 'KASUBNIT'
  const perluRegu = form.peran_sistem === 'BANIT'

  return (
    <div>
      <div className="mb-5 rounded-2xl border border-line bg-white p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h3 className="font-display text-[14.5px] font-semibold">Tambah Personel Baru</h3>
          <button onClick={() => setImporTerbuka(true)} className="rounded-lg border border-brass px-3 py-1.5 text-[11.5px] font-semibold text-navy-950 hover:bg-brass/10">📋 Impor dari Bagan Struktur</button>
        </div>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <input placeholder="Nama lengkap (dengan pangkat)" value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
          <input placeholder="NRP" value={form.nrp} onChange={(e) => setForm((f) => ({ ...f, nrp: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
          <input placeholder="Pangkat" value={form.pangkat} onChange={(e) => setForm((f) => ({ ...f, pangkat: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
          <input placeholder="Gelar (opsional)" value={form.gelar} onChange={(e) => setForm((f) => ({ ...f, gelar: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
          <select value={form.peran_sistem} onChange={(e) => setForm((f) => ({ ...f, peran_sistem: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
            {PERAN_OPT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {perluZona && (
            <select value={form.zona_id} onChange={(e) => setForm((f) => ({ ...f, zona_id: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
              <option value="">Zona (wajib) —</option>{zona.map((z) => <option key={z.id} value={z.id}>{z.nama}</option>)}
            </select>
          )}
          {perluRegu && (
            <select value={form.regu_id} onChange={(e) => setForm((f) => ({ ...f, regu_id: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
              <option value="">Regu (wajib) —</option>{regu.map((r) => <option key={r.id} value={r.id}>Regu {r.nomor}</option>)}
            </select>
          )}
          <input type="password" placeholder="Kata sandi awal" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
        </div>
        <button onClick={tambahAkun} disabled={memproses} className="rounded-lg bg-navy-950 px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50">+ Tambah Personel</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead><tr className="bg-paper-dim text-left text-[11px] uppercase text-ink-soft"><th className="px-3.5 py-2.5">Nama</th><th className="px-3.5 py-2.5">NRP</th><th className="px-3.5 py-2.5">Peran</th><th className="px-3.5 py-2.5">Zona/Regu</th><th className="px-3.5 py-2.5">Status</th><th className="px-3.5 py-2.5"></th></tr></thead>
          <tbody>
            {daftar.map((p) => (
              <tr key={p.id} className={`border-t border-paper-dim ${!p.status_aktif ? 'opacity-50' : ''}`}>
                <td className="px-3.5 py-2.5">{p.nama}</td>
                <td className="px-3.5 py-2.5 font-mono">{p.nrp}</td>
                <td className="px-3.5 py-2.5">{LABEL_PERAN[p.peran_sistem]}</td>
                <td className="px-3.5 py-2.5">{p.zona ? `Zona ${p.zona.nama}` : '-'}{p.regu ? ` · Regu ${p.regu.nomor}` : ''}</td>
                <td className="px-3.5 py-2.5"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${p.status_aktif ? 'bg-ok-bg text-ok' : 'bg-bad-bg text-bad'}`}>{p.status_aktif ? 'Aktif' : 'Nonaktif'}</span></td>
                <td className="whitespace-nowrap px-3.5 py-2.5">
                  <button onClick={() => toggleAktif(p)} className="mr-1.5 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold">{p.status_aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
                  <button onClick={() => { setResetTarget(p); setSandiBaru('') }} className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold">Reset Sandi</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/55 p-4" onClick={(e) => e.target === e.currentTarget && setResetTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-paper p-5 shadow-2xl">
            <h3 className="mb-1 font-display text-[15px] font-semibold">Reset Kata Sandi</h3>
            <p className="mb-3 text-[12.5px] text-ink-soft">Untuk {resetTarget.nama} (NRP {resetTarget.nrp})</p>
            <input
              type="password"
              autoFocus
              value={sandiBaru}
              onChange={(e) => setSandiBaru(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && simpanResetSandi()}
              placeholder="Kata sandi baru"
              className="mb-3 w-full rounded-lg border border-line px-3 py-2 text-[12.5px]"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setResetTarget(null)} className="rounded-lg border border-line px-3.5 py-2 text-[12px] font-semibold">Batal</button>
              <button onClick={simpanResetSandi} disabled={memprosesReset} className="rounded-lg bg-navy-950 px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {imporTerbuka && (
        <ImporPersonelMassal
          zona={zona}
          regu={regu}
          onSelesai={muat}
          onClose={() => setImporTerbuka(false)}
        />
      )}
    </div>
  )
}

function TabDaftar({ label, ambil, tambah, nonaktifkan }) {
  const toast = useToast()
  const [daftar, setDaftar] = useState([])
  const [baru, setBaru] = useState('')
  async function muat() {
    try { setDaftar(await ambil()) }
    catch (e) { toast(e.message || `Gagal memuat daftar ${label}`, true) }
  }
  useEffect(() => { muat() }, [])
  async function tambahBaris() {
    if (!baru.trim()) return toast(`Tulis nama ${label} terlebih dahulu`, true)
    try {
      await tambah(baru.trim()); setBaru(''); toast(`${label} ditambahkan`); muat()
    } catch (e) {
      toast(e.message || `Gagal menambah ${label}`, true)
    }
  }
  async function nonaktifkanBaris(id) {
    try { await nonaktifkan(id); muat() }
    catch (e) { toast(e.message || `Gagal menonaktifkan ${label}`, true) }
  }
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h3 className="mb-1 font-display text-[14.5px] font-semibold capitalize">Daftar {label}</h3>
      <div className="mb-3.5 mt-3 flex gap-2">
        <input value={baru} onChange={(e) => setBaru(e.target.value)} placeholder={`Tambah ${label} baru…`} className="flex-1 rounded-lg border border-line px-3 py-2 text-[12.5px]" />
        <button onClick={tambahBaris} className="rounded-lg border border-line px-3 py-2 text-[12px] font-semibold">+ Tambah</button>
      </div>
      {daftar.map((d) => (
        <div key={d.id} className="mb-1.5 flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[12.5px]">
          <span>{d.nama}</span>
          <button onClick={() => nonaktifkanBaris(d.id)} className="rounded-lg bg-bad-bg px-2 py-1 text-[11px] text-bad">Nonaktifkan</button>
        </div>
      ))}
    </div>
  )
}
