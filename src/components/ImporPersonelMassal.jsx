import { useState } from 'react'
import { PERSONEL_ASLI } from '../lib/personelAsli'
import { LABEL_PERAN } from '../lib/menu'
import { buatAkunPengguna } from '../lib/referensiApi'
import { useToast } from './Toast'

const PERAN_OPT = Object.entries(LABEL_PERAN)

export default function ImporPersonelMassal({ zona, regu, onSelesai, onClose }) {
  const toast = useToast()
  const [baris, setBaris] = useState(PERSONEL_ASLI.map((p, i) => ({ ...p, id: i, sertakan: true })))
  const [password, setPassword] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [hasil, setHasil] = useState(null) // {berhasil: [], gagal: [{nama, pesan}]}

  function ubahBaris(id, patch) {
    setBaris((b) => b.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function jalankanImpor() {
    if (!password.trim()) return toast('Isi kata sandi awal untuk semua akun terlebih dahulu', true)
    const dipilih = baris.filter((r) => r.sertakan)
    if (!dipilih.length) return toast('Tidak ada baris yang dipilih', true)
    setMemproses(true)
    const berhasil = []
    const gagal = []
    for (const r of dipilih) {
      const zonaId = r.zona ? zona.find((z) => z.nama === r.zona)?.id : null
      const reguId = r.regu ? regu.find((x) => x.nomor === r.regu)?.id : null
      try {
        await buatAkunPengguna({
          nama: r.nama, nrp: r.nrp, pangkat: r.pangkat, gelar: '',
          peran_sistem: r.peran_sistem, zona_id: zonaId, regu_id: reguId, password,
        })
        berhasil.push(r.nama)
      } catch (e) {
        gagal.push({ nama: r.nama, pesan: e.message })
      }
    }
    setHasil({ berhasil, gagal })
    setMemproses(false)
    if (berhasil.length) onSelesai()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/55 p-4 py-8" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-3xl rounded-[18px] bg-paper p-6 shadow-[0_12px_36px_rgba(11,20,36,.18)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[18px] font-semibold">Impor Personel dari Bagan Struktur</h2>
            <p className="mt-1 text-[12.5px] text-ink-soft">Dari bagan "Daftar Personel Unit Gakkum". Periksa/sunting dulu sebelum akunnya dibuat — dua baris berperan Administrator (eks-Bamin) cuma usulan, sesuaikan kalau perlu.</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-line text-ink-soft hover:border-bad hover:text-bad">✕</button>
        </div>

        {!hasil ? (
          <>
            <div className="mb-3 max-h-[50vh] overflow-y-auto rounded-lg border border-line">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-paper-dim text-left text-[10.5px] uppercase text-ink-soft">
                  <tr>
                    <th className="px-2 py-2"></th>
                    <th className="px-2 py-2">Nama</th>
                    <th className="px-2 py-2">NRP</th>
                    <th className="px-2 py-2">Pangkat</th>
                    <th className="px-2 py-2">Peran</th>
                    <th className="px-2 py-2">Zona</th>
                    <th className="px-2 py-2">Regu</th>
                  </tr>
                </thead>
                <tbody>
                  {baris.map((r) => (
                    <tr key={r.id} className={`border-t border-paper-dim ${!r.sertakan ? 'opacity-40' : ''}`}>
                      <td className="px-2 py-1.5"><input type="checkbox" checked={r.sertakan} onChange={(e) => ubahBaris(r.id, { sertakan: e.target.checked })} /></td>
                      <td className="px-2 py-1.5"><input value={r.nama} onChange={(e) => ubahBaris(r.id, { nama: e.target.value })} className="w-full rounded border border-line px-1.5 py-1" /></td>
                      <td className="px-2 py-1.5"><input value={r.nrp} onChange={(e) => ubahBaris(r.id, { nrp: e.target.value })} className="w-24 rounded border border-line px-1.5 py-1 font-mono" /></td>
                      <td className="px-2 py-1.5"><input value={r.pangkat} onChange={(e) => ubahBaris(r.id, { pangkat: e.target.value })} className="w-16 rounded border border-line px-1.5 py-1" /></td>
                      <td className="px-2 py-1.5">
                        <select value={r.peran_sistem} onChange={(e) => ubahBaris(r.id, { peran_sistem: e.target.value })} className="rounded border border-line px-1 py-1">
                          {PERAN_OPT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={r.zona || ''} onChange={(e) => ubahBaris(r.id, { zona: e.target.value || null })} className="rounded border border-line px-1 py-1">
                          <option value="">—</option>{zona.map((z) => <option key={z.id} value={z.nama}>{z.nama}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={r.regu || ''} onChange={(e) => ubahBaris(r.id, { regu: e.target.value || null })} className="rounded border border-line px-1 py-1">
                          <option value="">—</option>{regu.map((x) => <option key={x.id} value={x.nomor}>{x.nomor}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi awal untuk semua akun ini"
                className="flex-1 rounded-lg border border-line px-3 py-2 text-[12.5px]"
              />
              <button onClick={jalankanImpor} disabled={memproses} className="rounded-lg bg-navy-950 px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50">
                {memproses ? 'Membuat akun…' : `Buat ${baris.filter((r) => r.sertakan).length} Akun`}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ink-soft">Semua akun terpilih akan memakai kata sandi awal yang sama — sampaikan ke masing-masing personel untuk diganti lewat Administrator kalau perlu (belum ada ganti sandi mandiri).</p>
          </>
        ) : (
          <div>
            <div className="mb-3 rounded-lg bg-ok-bg p-3 text-[12.5px] text-[#245C43]">
              {hasil.berhasil.length} akun berhasil dibuat: {hasil.berhasil.join(', ') || '-'}
            </div>
            {hasil.gagal.length > 0 && (
              <div className="mb-3 rounded-lg bg-bad-bg p-3 text-[12.5px] text-bad">
                {hasil.gagal.length} gagal:
                <ul className="mt-1 list-disc pl-4">
                  {hasil.gagal.map((g) => <li key={g.nama}>{g.nama} — {g.pesan}</li>)}
                </ul>
              </div>
            )}
            <button onClick={onClose} className="rounded-lg bg-navy-950 px-4 py-2 text-[12.5px] font-semibold text-white">Tutup</button>
          </div>
        )}
      </div>
    </div>
  )
}
