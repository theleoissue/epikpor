import { useEffect, useState } from 'react'
import { useToast } from '../components/Toast'
import {
  ambilPengguna, ambilZona, ambilRegu, buatAkunPengguna, perbaruiPengguna, resetPasswordPengguna,
  ambilJenisKegiatan, ambilJenisKecelakaan, ambilTipeTabrakan,
  tambahJenisKegiatan, tambahJenisKecelakaan, tambahTipeTabrakan,
  nonaktifkanJenisKegiatan, nonaktifkanJenisKecelakaan, nonaktifkanTipeTabrakan,
  tambahZona, perbaruiZona, hapusZona, tambahRegu, perbaruiRegu, hapusRegu,
  ambilTitikRawan, tambahTitikRawan, perbaruiTitikRawan, hapusTitikRawan,
} from '../lib/referensiApi'
import { LABEL_PERAN } from '../lib/menu'
import { mulaiImpersonasi } from '../lib/auth'
import ImporPersonelMassal from '../components/ImporPersonelMassal'

const TABS = [
  ['personel', 'Personel'], ['kegiatan', 'Jenis Kegiatan'], ['kecelakaan', 'Jenis & Tipe Kecelakaan'],
  ['wilayah', 'Zona & Regu'], ['rawan', 'Titik Rawan'],
]
const PERAN_OPT = Object.entries(LABEL_PERAN)

// Dikelompokkan per zona (bukan satu tabel alfabetis campur) supaya susunannya
// kebaca sama seperti bagan struktur organisasi: pimpinan tanpa zona dulu,
// lalu tiap zona dengan Kasubnit di atas dan Banit terurut per regu.
const URUTAN_ZONA = ['Tanpa Zona', 'Timur', 'Tengah', 'Barat']
const URUTAN_PERAN = { KASAT_LANTAS: 0, WAKASAT_LANTAS: 1, KANIT_GAKKUM: 2, KAUR_BIN_OPS: 3, ADMIN: 4, KASUBNIT: 5, BANIT: 6 }

function kelompokkanPersonel(daftar) {
  const kelompok = {}
  for (const p of daftar) {
    const key = p.zona?.nama || 'Tanpa Zona'
    ;(kelompok[key] ??= []).push(p)
  }
  for (const key in kelompok) {
    kelompok[key].sort((a, b) => {
      const pa = URUTAN_PERAN[a.peran_sistem] ?? 9
      const pb = URUTAN_PERAN[b.peran_sistem] ?? 9
      if (pa !== pb) return pa - pb
      const ra = a.regu?.nomor || ''
      const rb = b.regu?.nomor || ''
      if (ra !== rb) return ra.localeCompare(rb)
      return a.nama.localeCompare(b.nama)
    })
  }
  const kunciTerurut = [...URUTAN_ZONA.filter((k) => kelompok[k]), ...Object.keys(kelompok).filter((k) => !URUTAN_ZONA.includes(k)).sort()]
  return kunciTerurut.map((zona) => ({ zona, personel: kelompok[zona] }))
}

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
      {tab === 'wilayah' && <TabWilayah />}
      {tab === 'rawan' && <TabTitikRawan />}
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

  async function masukSebagai(p) {
    try {
      await mulaiImpersonasi(p.id)
      toast(`Masuk sebagai ${p.nama}`)
    } catch (e) {
      toast(e.message || 'Gagal masuk sebagai akun ini', true)
    }
  }

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

  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [memprosesEdit, setMemprosesEdit] = useState(false)

  function mulaiEdit(p) {
    setEditTarget(p)
    setEditForm({ nama: p.nama, pangkat: p.pangkat || '', gelar: p.gelar || '', peran_sistem: p.peran_sistem, zona_id: p.zona_id || '', regu_id: p.regu_id || '' })
  }

  async function simpanEdit() {
    const perluZonaEdit = editForm.peran_sistem === 'BANIT' || editForm.peran_sistem === 'KASUBNIT'
    const perluReguEdit = editForm.peran_sistem === 'BANIT'
    if (perluZonaEdit && !editForm.zona_id) return toast('Personel dengan peran Banit atau Kasubnit wajib diberi zona', true)
    if (perluReguEdit && !editForm.regu_id) return toast('Personel dengan peran Banit wajib diberi regu', true)
    setMemprosesEdit(true)
    try {
      await perbaruiPengguna(editTarget.id, {
        nama: editForm.nama, pangkat: editForm.pangkat, gelar: editForm.gelar, peran_sistem: editForm.peran_sistem,
        zona_id: perluZonaEdit ? editForm.zona_id : null,
        regu_id: perluReguEdit ? editForm.regu_id : null,
      })
      toast(`Data ${editForm.nama} diperbarui`)
      setEditTarget(null)
      muat()
    } catch (e) {
      toast(e.message || 'Gagal menyimpan perubahan', true)
    } finally {
      setMemprosesEdit(false)
    }
  }

  const perluZona = form.peran_sistem === 'BANIT' || form.peran_sistem === 'KASUBNIT'
  const perluRegu = form.peran_sistem === 'BANIT'
  const kelompokPersonel = kelompokkanPersonel(daftar)

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

      <div className="space-y-4">
        {kelompokPersonel.map(({ zona: namaZona, personel }) => (
          <div key={namaZona} className="overflow-x-auto rounded-2xl border border-line bg-white">
            <div className="border-b border-line bg-paper-dim px-3.5 py-2 font-display text-[12.5px] font-bold text-navy-900">
              {namaZona === 'Tanpa Zona' ? 'Pimpinan / Tanpa Zona' : `Zona ${namaZona}`}
            </div>
            <table className="w-full min-w-[640px] text-[12.5px]">
              <thead><tr className="bg-paper-dim text-left text-[11px] uppercase text-ink-soft"><th className="px-3.5 py-2.5">Nama</th><th className="px-3.5 py-2.5">NRP</th><th className="px-3.5 py-2.5">Peran</th><th className="px-3.5 py-2.5">Regu</th><th className="px-3.5 py-2.5">Status</th><th className="px-3.5 py-2.5"></th></tr></thead>
              <tbody>
                {personel.map((p) => (
                  <tr key={p.id} className={`border-t border-paper-dim ${!p.status_aktif ? 'opacity-50' : ''}`}>
                    <td className="px-3.5 py-2.5">{p.pangkat} {p.nama}</td>
                    <td className="px-3.5 py-2.5 font-mono">{p.nrp}</td>
                    <td className="px-3.5 py-2.5">{LABEL_PERAN[p.peran_sistem]}</td>
                    <td className="px-3.5 py-2.5">{p.regu ? `Regu ${p.regu.nomor}` : '-'}</td>
                    <td className="px-3.5 py-2.5"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${p.status_aktif ? 'bg-ok-bg text-ok' : 'bg-bad-bg text-bad'}`}>{p.status_aktif ? 'Aktif' : 'Nonaktif'}</span></td>
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      <button onClick={() => mulaiEdit(p)} className="mr-1.5 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold">Edit</button>
                      <button onClick={() => toggleAktif(p)} className="mr-1.5 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold">{p.status_aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
                      <button onClick={() => { setResetTarget(p); setSandiBaru('') }} className="mr-1.5 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold">Reset Sandi</button>
                      <button onClick={() => masukSebagai(p)} className="rounded-lg border border-brass px-2 py-1 text-[11px] font-semibold text-navy-950 hover:bg-brass/10">Masuk sebagai</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/55 p-4" onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-paper p-5 shadow-2xl">
            <h3 className="mb-1 font-display text-[15px] font-semibold">Edit Personel</h3>
            <p className="mb-3.5 text-[12.5px] text-ink-soft">NRP {editTarget.nrp} (NRP tidak bisa diubah di sini)</p>
            <div className="mb-3.5 grid gap-3 sm:grid-cols-2">
              <input value={editForm.nama} onChange={(e) => setEditForm((f) => ({ ...f, nama: e.target.value }))} placeholder="Nama lengkap" className="col-span-2 rounded-lg border border-line px-3 py-2 text-[12.5px]" />
              <input value={editForm.pangkat} onChange={(e) => setEditForm((f) => ({ ...f, pangkat: e.target.value }))} placeholder="Pangkat" className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
              <input value={editForm.gelar} onChange={(e) => setEditForm((f) => ({ ...f, gelar: e.target.value }))} placeholder="Gelar (opsional)" className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
              <select value={editForm.peran_sistem} onChange={(e) => setEditForm((f) => ({ ...f, peran_sistem: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
                {PERAN_OPT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {(editForm.peran_sistem === 'BANIT' || editForm.peran_sistem === 'KASUBNIT') && (
                <select value={editForm.zona_id} onChange={(e) => setEditForm((f) => ({ ...f, zona_id: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
                  <option value="">Zona (wajib) —</option>{zona.map((z) => <option key={z.id} value={z.id}>{z.nama}</option>)}
                </select>
              )}
              {editForm.peran_sistem === 'BANIT' && (
                <select value={editForm.regu_id} onChange={(e) => setEditForm((f) => ({ ...f, regu_id: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
                  <option value="">Regu (wajib) —</option>{regu.map((r) => <option key={r.id} value={r.id}>Regu {r.nomor}</option>)}
                </select>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditTarget(null)} className="rounded-lg border border-line px-3.5 py-2 text-[12px] font-semibold">Batal</button>
              <button onClick={simpanEdit} disabled={memprosesEdit} className="rounded-lg bg-navy-950 px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>
      )}

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

// Zona & Regu jarang berubah, dan dipakai banyak tabel lain (FK) -- makanya
// hapus dibiarkan gagal dengan pesan jelas kalau masih dipakai, bukan
// dipaksa (cascade) yang bisa diam-diam merusak data personel/laporan.
function TabWilayah() {
  const toast = useToast()
  const [zona, setZona] = useState([])
  const [regu, setRegu] = useState([])
  const [zonaBaru, setZonaBaru] = useState('')
  const [reguBaru, setReguBaru] = useState('')

  async function muat() {
    try { setZona(await ambilZona()); setRegu(await ambilRegu()) }
    catch (e) { toast(e.message || 'Gagal memuat data wilayah', true) }
  }
  useEffect(() => { muat() }, [])

  async function tambahZonaBaris() {
    if (!zonaBaru.trim()) return toast('Tulis nama zona terlebih dahulu', true)
    try { await tambahZona(zonaBaru.trim(), zona.length); setZonaBaru(''); toast('Zona ditambahkan'); muat() }
    catch (e) { toast(e.message || 'Gagal menambah zona', true) }
  }
  async function simpanZonaBaris(z) {
    try { await perbaruiZona(z.id, { nama: z.nama, urutan_tampil: z.urutan_tampil }); toast('Zona diperbarui'); muat() }
    catch (e) { toast(e.message || 'Gagal menyimpan zona', true) }
  }
  async function hapusZonaBaris(id) {
    try { await hapusZona(id); toast('Zona dihapus'); muat() }
    catch (e) { toast(e.message || 'Gagal menghapus zona', true) }
  }

  async function tambahReguBaris() {
    if (!reguBaru.trim()) return toast('Tulis nomor regu terlebih dahulu', true)
    try { await tambahRegu(reguBaru.trim()); setReguBaru(''); toast('Regu ditambahkan'); muat() }
    catch (e) { toast(e.message || 'Gagal menambah regu', true) }
  }
  async function simpanReguBaris(r) {
    try { await perbaruiRegu(r.id, { nomor: r.nomor }); toast('Regu diperbarui'); muat() }
    catch (e) { toast(e.message || 'Gagal menyimpan regu', true) }
  }
  async function hapusReguBaris(id) {
    try { await hapusRegu(id); toast('Regu dihapus'); muat() }
    catch (e) { toast(e.message || 'Gagal menghapus regu', true) }
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-1 font-display text-[14.5px] font-semibold">Zona</h3>
        <p className="mb-3 text-[11.5px] text-ink-soft">Urutan tampil menentukan urutan kartu zona di Papan Pemantauan.</p>
        <div className="mb-3.5 flex gap-2">
          <input value={zonaBaru} onChange={(e) => setZonaBaru(e.target.value)} placeholder="Tambah zona baru…" className="flex-1 rounded-lg border border-line px-3 py-2 text-[12.5px]" />
          <button onClick={tambahZonaBaris} className="rounded-lg border border-line px-3 py-2 text-[12px] font-semibold">+ Tambah</button>
        </div>
        {zona.map((z) => (
          <div key={z.id} className="mb-1.5 flex items-center gap-1.5">
            <input value={z.nama} onChange={(e) => setZona((arr) => arr.map((x) => x.id === z.id ? { ...x, nama: e.target.value } : x))} className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px]" />
            <input type="number" value={z.urutan_tampil} onChange={(e) => setZona((arr) => arr.map((x) => x.id === z.id ? { ...x, urutan_tampil: Number(e.target.value) } : x))} className="w-14 rounded-lg border border-line px-2 py-1.5 text-[12.5px]" />
            <button onClick={() => simpanZonaBaris(z)} className="rounded-lg border border-line px-2 py-1.5 text-[11px] font-semibold">Simpan</button>
            <button onClick={() => hapusZonaBaris(z.id)} className="rounded-lg bg-bad-bg px-2 py-1.5 text-[11px] text-bad">Hapus</button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-1 font-display text-[14.5px] font-semibold">Regu</h3>
        <p className="mb-3 text-[11.5px] text-ink-soft">Nomor/nama regu, dipakai sama di semua zona.</p>
        <div className="mb-3.5 flex gap-2">
          <input value={reguBaru} onChange={(e) => setReguBaru(e.target.value)} placeholder="Tambah regu baru…" className="flex-1 rounded-lg border border-line px-3 py-2 text-[12.5px]" />
          <button onClick={tambahReguBaris} className="rounded-lg border border-line px-3 py-2 text-[12px] font-semibold">+ Tambah</button>
        </div>
        {regu.map((r) => (
          <div key={r.id} className="mb-1.5 flex items-center gap-1.5">
            <input value={r.nomor} onChange={(e) => setRegu((arr) => arr.map((x) => x.id === r.id ? { ...x, nomor: e.target.value } : x))} className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px]" />
            <button onClick={() => simpanReguBaris(r)} className="rounded-lg border border-line px-2 py-1.5 text-[11px] font-semibold">Simpan</button>
            <button onClick={() => hapusReguBaris(r.id)} className="rounded-lg bg-bad-bg px-2 py-1.5 text-[11px] text-bad">Hapus</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabTitikRawan() {
  const toast = useToast()
  const [daftar, setDaftar] = useState([])
  const [editTarget, setEditTarget] = useState(null) // {} baru, {...data} edit
  const [memproses, setMemproses] = useState(false)

  async function muat() {
    try { setDaftar(await ambilTitikRawan()) }
    catch (e) { toast(e.message || 'Gagal memuat titik rawan', true) }
  }
  useEffect(() => { muat() }, [])

  function mulaiTambah() {
    setEditTarget({ nama_jalan: '', latitude: '', longitude: '', jumlah_laka: 0, jumlah_point: 0, md: 0, lb: 0, lr: 0 })
  }

  async function simpan() {
    if (!editTarget.nama_jalan.trim() || !editTarget.latitude || !editTarget.longitude) {
      return toast('Lengkapi nama jalan, latitude, dan longitude', true)
    }
    setMemproses(true)
    const payload = {
      nama_jalan: editTarget.nama_jalan.trim(),
      latitude: Number(editTarget.latitude), longitude: Number(editTarget.longitude),
      jumlah_laka: Number(editTarget.jumlah_laka) || 0, jumlah_point: Number(editTarget.jumlah_point) || 0,
      md: Number(editTarget.md) || 0, lb: Number(editTarget.lb) || 0, lr: Number(editTarget.lr) || 0,
    }
    try {
      if (editTarget.id) await perbaruiTitikRawan(editTarget.id, payload)
      else await tambahTitikRawan(payload)
      toast('Titik rawan tersimpan')
      setEditTarget(null)
      muat()
    } catch (e) {
      toast(e.message || 'Gagal menyimpan titik rawan', true)
    } finally {
      setMemproses(false)
    }
  }

  async function hapus(id) {
    try { await hapusTitikRawan(id); toast('Titik rawan dihapus'); muat() }
    catch (e) { toast(e.message || 'Gagal menghapus titik rawan', true) }
  }

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <h3 className="font-display text-[14.5px] font-semibold">Titik Rawan (Blackspot)</h3>
          <p className="text-[11.5px] text-ink-soft">Tampil di panel "Titik rawan teratas" Papan Pemantauan.</p>
        </div>
        <button onClick={mulaiTambah} className="rounded-lg border border-brass px-3 py-1.5 text-[11.5px] font-semibold text-navy-950 hover:bg-brass/10">+ Tambah Titik Rawan</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[560px] text-[12.5px]">
          <thead><tr className="bg-paper-dim text-left text-[11px] uppercase text-ink-soft"><th className="px-3.5 py-2.5">Nama Jalan</th><th className="px-3.5 py-2.5">Kejadian</th><th className="px-3.5 py-2.5">MD/LB/LR</th><th className="px-3.5 py-2.5"></th></tr></thead>
          <tbody>
            {daftar.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-ink-soft">Belum ada titik rawan.</td></tr>}
            {daftar.map((t) => (
              <tr key={t.id} className="border-t border-paper-dim">
                <td className="px-3.5 py-2.5">{t.nama_jalan}</td>
                <td className="px-3.5 py-2.5">{t.jumlah_laka}</td>
                <td className="px-3.5 py-2.5">{t.md}/{t.lb}/{t.lr}</td>
                <td className="whitespace-nowrap px-3.5 py-2.5">
                  <button onClick={() => setEditTarget(t)} className="mr-1.5 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold">Edit</button>
                  <button onClick={() => hapus(t.id)} className="rounded-lg bg-bad-bg px-2 py-1 text-[11px] text-bad">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/55 p-4" onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-paper p-5 shadow-2xl">
            <h3 className="mb-3.5 font-display text-[15px] font-semibold">{editTarget.id ? 'Edit' : 'Tambah'} Titik Rawan</h3>
            <div className="mb-3.5 grid gap-3">
              <input value={editTarget.nama_jalan} onChange={(e) => setEditTarget((f) => ({ ...f, nama_jalan: e.target.value }))} placeholder="Nama jalan / lokasi" className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
              <div className="grid grid-cols-2 gap-3">
                <input value={editTarget.latitude} onChange={(e) => setEditTarget((f) => ({ ...f, latitude: e.target.value }))} placeholder="Latitude" className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
                <input value={editTarget.longitude} onChange={(e) => setEditTarget((f) => ({ ...f, longitude: e.target.value }))} placeholder="Longitude" className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={editTarget.jumlah_laka} onChange={(e) => setEditTarget((f) => ({ ...f, jumlah_laka: e.target.value }))} placeholder="Jumlah kejadian" className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
                <input type="number" value={editTarget.jumlah_point} onChange={(e) => setEditTarget((f) => ({ ...f, jumlah_point: e.target.value }))} placeholder="Jumlah point" className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" value={editTarget.md} onChange={(e) => setEditTarget((f) => ({ ...f, md: e.target.value }))} placeholder="MD" className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
                <input type="number" value={editTarget.lb} onChange={(e) => setEditTarget((f) => ({ ...f, lb: e.target.value }))} placeholder="LB" className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
                <input type="number" value={editTarget.lr} onChange={(e) => setEditTarget((f) => ({ ...f, lr: e.target.value }))} placeholder="LR" className="rounded-lg border border-line px-3 py-2 text-[12.5px]" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditTarget(null)} className="rounded-lg border border-line px-3.5 py-2 text-[12px] font-semibold">Batal</button>
              <button onClick={simpan} disabled={memproses} className="rounded-lg bg-navy-950 px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
