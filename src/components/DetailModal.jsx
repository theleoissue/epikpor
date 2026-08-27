import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import Lightbox from './Lightbox'
import { urlTertandaTangan } from '../lib/storage'
import { fmtTime, fmtDate, fmtRupiah, keInputDatetimeLocal, dariInputDatetimeLocal } from '../lib/format'
import { ambilSatuKegiatan, verifikasiLaporanKegiatan, perbaruiLaporanKegiatan } from '../lib/laporanKegiatanApi'
import { ambilSatuKejadian, verifikasiLaporanKejadian, perbaruiLaporanKejadian, ambilLogKejadian } from '../lib/laporanKejadianApi'
import { ambilSatuSesi, verifikasiSesi, kecualikanSesi, ambilLogSesi } from '../lib/sesiPiketApi'
import { ambilKomentar, kirimKomentar } from '../lib/komentarApi'
import { buildLaporanKejadianWA } from '../lib/waReport'

const PERAN_VERIFIKATOR = ['KASUBNIT', 'KANIT_GAKKUM']

export default function DetailModal({ tipe, id, onClose, onUbah }) {
  const { profil } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [fotoUrls, setFotoUrls] = useState([])
  const [grupFoto, setGrupFoto] = useState(null) // khusus sesi: foto dipisah per tahap (masuk/keluar)
  const [komentar, setKomentar] = useState([])
  const [log, setLog] = useState([])
  const [teksKomentar, setTeksKomentar] = useState('')
  const [lightboxAwal, setLightboxAwal] = useState(null)
  const [memproses, setMemproses] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editLokasi, setEditLokasi] = useState('')
  const [editKeterangan, setEditKeterangan] = useState('')
  const [editW, setEditW] = useState({ w1: '', w2: '', w3: '', w4: '', w5: '' })
  const [catatanKecuali, setCatatanKecuali] = useState('')

  async function muat() {
    try {
      if (tipe === 'kegiatan') {
        const x = await ambilSatuKegiatan(id)
        setData(x)
        const paths = (x.lampiran || []).sort((a, b) => a.urutan - b.urutan).map((l) => l.storage_path)
        setFotoUrls((await Promise.all(paths.map((p) => urlTertandaTangan('foto-kegiatan', p)))).filter(Boolean))
        setKomentar(await ambilKomentar('KEGIATAN', id))
      } else if (tipe === 'kejadian') {
        const x = await ambilSatuKejadian(id)
        setData(x)
        const paths = (x.lampiran || []).sort((a, b) => a.urutan - b.urutan).map((l) => l.storage_path)
        setFotoUrls((await Promise.all(paths.map((p) => urlTertandaTangan('foto-kejadian', p)))).filter(Boolean))
        setKomentar(await ambilKomentar('KEJADIAN', id))
        setLog(await ambilLogKejadian(id))
      } else {
        const x = await ambilSatuSesi(id)
        setData(x)
        // Foto sesi dikelompokkan per tahap supaya jelas mana bukti saat masuk
        // piket dan mana bukti saat serah terima — Lightbox tetap memakai satu
        // larik datar, jadi tiap foto menyimpan indeksnya sendiri.
        const tahap = [
          ['Sesi Masuk', [['Swafoto petugas', x.foto_swafoto_path], ['Foto lokasi / pos', x.foto_lokasi_path]]],
          ['Sesi Keluar', [['Foto serah terima', x.foto_serah_terima_path]]],
        ]
        const datar = []
        const grup = []
        for (const [judul, item] of tahap) {
          const isi = []
          for (const [label, path] of item) {
            if (!path) continue
            const url = await urlTertandaTangan('foto-sesi', path)
            if (!url) continue
            isi.push({ label, url, indeks: datar.length })
            datar.push(url)
          }
          if (isi.length) grup.push({ judul, isi })
        }
        setFotoUrls(datar)
        setGrupFoto(grup)
        setLog(await ambilLogSesi(id))
      }
    } catch (e) {
      toast(e.message || 'Gagal memuat detail', true)
      onClose()
    }
  }
  useEffect(() => { muat() }, [tipe, id])

  function mulaiEdit() {
    setEditLokasi(data.lokasi || '')
    setEditKeterangan(data.keterangan || '')
    setEditW({
      w1: keInputDatetimeLocal(data.w1), w2: keInputDatetimeLocal(data.w2), w3: keInputDatetimeLocal(data.w3),
      w4: keInputDatetimeLocal(data.w4), w5: keInputDatetimeLocal(data.w5),
    })
    setEditMode(true)
  }

  async function simpanEdit() {
    setMemproses(true)
    try {
      if (tipe === 'kegiatan') {
        await perbaruiLaporanKegiatan(id, { lokasi: editLokasi.trim(), keterangan: editKeterangan.trim() })
      } else if (tipe === 'kejadian') {
        await perbaruiLaporanKejadian(id, {
          lokasi: editLokasi.trim(),
          w1: dariInputDatetimeLocal(editW.w1), w2: dariInputDatetimeLocal(editW.w2), w3: dariInputDatetimeLocal(editW.w3),
          w4: dariInputDatetimeLocal(editW.w4), w5: dariInputDatetimeLocal(editW.w5),
        })
      }
      toast('Perubahan tersimpan')
      setEditMode(false)
      muat(); onUbah?.()
    } catch (e) {
      toast(e.message || 'Gagal menyimpan perubahan', true)
    } finally {
      setMemproses(false)
    }
  }

  async function verifikasi() {
    setMemproses(true)
    try {
      if (tipe === 'kegiatan') await verifikasiLaporanKegiatan(id)
      else if (tipe === 'kejadian') await verifikasiLaporanKejadian(id)
      else await verifikasiSesi(id)
      toast('Berhasil diverifikasi')
      muat(); onUbah?.()
    } catch (e) {
      toast(e.message || 'Gagal memverifikasi', true)
    } finally {
      setMemproses(false)
    }
  }

  async function kecualikan() {
    setMemproses(true)
    try {
      await kecualikanSesi(id, catatanKecuali)
      toast('Sesi dikecualikan')
      muat(); onUbah?.()
    } catch (e) {
      toast(e.message || 'Gagal menyimpan pengecualian', true)
    } finally {
      setMemproses(false)
    }
  }

  async function kirimKomentarBaru() {
    if (!teksKomentar.trim()) return
    try {
      await kirimKomentar(tipe === 'kegiatan' ? 'KEGIATAN' : 'KEJADIAN', id, profil.id, teksKomentar.trim())
      setTeksKomentar('')
      setKomentar(await ambilKomentar(tipe === 'kegiatan' ? 'KEGIATAN' : 'KEJADIAN', id))
    } catch (e) {
      toast(e.message || 'Gagal mengirim komentar', true)
    }
  }

  function salinWA() {
    navigator.clipboard.writeText(buildLaporanKejadianWA(data))
    toast('Teks laporan WhatsApp disalin')
  }

  if (!data) return null

  const bisaVerifikasi = tipe !== 'sesi' && data.status === 'MENUNGGU_VERIFIKASI' && PERAN_VERIFIKATOR.includes(profil.peran_sistem)
  const bisaVerifikasiSesi = tipe === 'sesi' && data.status === 'MENUNGGU_VERIFIKASI' && PERAN_VERIFIKATOR.includes(profil.peran_sistem)
  const bisaKecualikan = tipe === 'sesi' && String(data.status).startsWith('PELANGGARAN') && PERAN_VERIFIKATOR.includes(profil.peran_sistem)
  const bisaEdit = (tipe === 'kegiatan' || tipe === 'kejadian') && data.pelapor_id === profil.id
  // Koordinat direkam otomatis saat sesi dibuka / laporan dikirim (lihat
  // getGeoPosition di storage.js) — bisa null kalau personel menolak izin
  // lokasi atau GPS-nya tidak terkunci saat itu.
  const koordinat = tipe === 'sesi' ? data.koordinat_buka : data.koordinat
  const adaKoordinat = koordinat && koordinat.lat != null && koordinat.lng != null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/55 p-4 py-8" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="w-full max-w-2xl rounded-[18px] bg-paper p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[10.5px] font-bold uppercase tracking-wide text-warn">
                {tipe === 'kegiatan' ? 'Laporan Kegiatan' : tipe === 'kejadian' ? 'Kejadian Kecelakaan' : 'Sesi Piket'}
              </div>
              <h2 className="mt-1 font-display text-[19px] font-semibold">
                {tipe === 'sesi' ? `${data.pengguna?.pangkat || ''} ${data.pengguna?.nama || ''}` : data.lokasi}
              </h2>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-line text-ink-soft hover:border-bad hover:text-bad">✕</button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2.5">
            {tipe === 'kegiatan' && <>
              <Field label="Jenis kegiatan" v={data.jenis_kegiatan?.nama} />
              <Field label="Waktu kirim" v={`${fmtTime(data.waktu_kirim)} WIB, ${fmtDate(data.waktu_kirim)}`} />
              <Field label="Zona / Regu" v={`Zona ${data.zona?.nama} · Regu ${data.regu?.nomor}`} />
              <Field label="Pelapor" v={`${data.pelapor_pangkat || ''} ${data.pelapor_nama}`} />
              <Field label="Lama pengisian" v={data.lama_pengisian_detik != null ? `${Math.floor(data.lama_pengisian_detik / 60)}m ${data.lama_pengisian_detik % 60}d` : '-'} />
            </>}
            {tipe === 'kejadian' && <>
              <Field label="Jenis kecelakaan" v={data.jenis_kecelakaan?.nama} />
              <Field label="Tipe tabrakan" v={data.tipe_tabrakan?.nama} />
              <Field label="Zona / Regu" v={`Zona ${data.zona?.nama} · Regu ${data.regu?.nomor}`} />
              <Field label="Pelapor" v={`${data.pelapor_pangkat || ''} ${data.pelapor_nama}`} />
              <Field label="Kerugian materiil" v={fmtRupiah(data.kerugian_materiil)} />
              <Field label="Status penanganan" v={data.status_penanganan?.replaceAll('_', ' ')} />
            </>}
            {tipe === 'sesi' && <>
              <Field label="Zona / Regu" v={`Zona ${data.zona?.nama} · Regu ${data.regu?.nomor}`} />
              <Field label="Waktu buka" v={`${fmtTime(data.waktu_buka)} WIB, ${fmtDate(data.waktu_buka)}`} />
              <Field label="Waktu tutup" v={data.waktu_tutup ? `${fmtTime(data.waktu_tutup)} WIB` : '—'} />
              <Field label="Sebab tutup" v={data.sebab_tutup?.replaceAll('_', ' ') || '—'} />
            </>}
          </div>

          {tipe === 'kejadian' && (
            <div className="mb-4 grid grid-cols-5 gap-2">
              {[['W1', data.w1], ['W2', data.w2], ['W3', data.w3], ['W4', data.w4], ['W5', data.w5]].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-line bg-white p-2 text-center">
                  <div className="font-mono text-[11px] font-bold text-navy-900">{k}</div>
                  <div className="mt-1 font-mono text-[11px] text-ink-soft">{v ? new Date(v).toTimeString().slice(0, 8) : '—'}</div>
                </div>
              ))}
            </div>
          )}

          {tipe === 'kejadian' && (data.orang?.length > 0 || data.kendaraan?.length > 0) && (
            <div className="mb-4 rounded-lg border border-line bg-white p-3 text-[12px]">
              {data.kendaraan?.length > 0 && <div className="mb-2"><b>Kendaraan:</b> {data.kendaraan.map((k) => `${k.kategori} ${k.merk} (${k.nopol || '-'})`).join('; ')}</div>}
              {data.orang?.length > 0 && <div><b>Orang terlibat:</b> {data.orang.map((o) => `${o.nama || '(tanpa nama)'} — ${o.kondisi?.replaceAll('_', ' ')}`).join('; ')}</div>}
            </div>
          )}

          {editMode ? (
            <div className="mb-4 space-y-2 rounded-lg border border-brass bg-white p-3">
              <input value={editLokasi} onChange={(e) => setEditLokasi(e.target.value)} placeholder="Lokasi" className="w-full rounded-lg border border-line px-3 py-2 text-[12.5px]" />
              {tipe === 'kegiatan' && (
                <textarea value={editKeterangan} onChange={(e) => setEditKeterangan(e.target.value)} placeholder="Keterangan" rows={3} className="w-full rounded-lg border border-line px-3 py-2 text-[12.5px]" />
              )}
              {tipe === 'kejadian' && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Stempel waktu W1–W5</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {['w1', 'w2', 'w3', 'w4', 'w5'].map((k) => (
                      <label key={k} className="text-[11px] text-ink-soft">
                        {k.toUpperCase()}
                        <input
                          type="datetime-local"
                          value={editW[k]}
                          onChange={(e) => setEditW((prev) => ({ ...prev, [k]: e.target.value }))}
                          className="mt-0.5 w-full rounded-lg border border-line px-2 py-1.5 text-[12px]"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={simpanEdit} disabled={memproses} className="rounded-lg bg-navy-950 px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50">Simpan</button>
                <button onClick={() => setEditMode(false)} className="rounded-lg border border-line px-3.5 py-2 text-[12px] font-semibold">Batal</button>
              </div>
            </div>
          ) : (
            (data.keterangan || data.kronologis_pra || data.kronologis_saat || data.kronologis_pasca) && (
              <div className="mb-4 rounded-lg border border-line bg-white p-3 text-[12.5px]">
                {data.keterangan && <div>{data.keterangan}</div>}
                {data.kronologis_pra && <div className="mb-1"><b>Pra:</b> {data.kronologis_pra}</div>}
                {data.kronologis_saat && <div className="mb-1"><b>Saat:</b> {data.kronologis_saat}</div>}
                {data.kronologis_pasca && <div><b>Pasca:</b> {data.kronologis_pasca}</div>}
              </div>
            )
          )}

          {tipe === 'sesi' ? (
            <div className="mb-4 space-y-4">
              {(!grupFoto || grupFoto.length === 0) && (
                <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center text-[12px] text-ink-soft">📷 Tidak ada foto tersimpan</div>
              )}
              {(grupFoto || []).map((g) => (
                <div key={g.judul}>
                  <div className="mb-2 border-b border-line pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{g.judul}</div>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                    {g.isi.map((f) => (
                      <button key={f.indeks} onClick={() => setLightboxAwal(f.indeks)} className="text-left">
                        <div className="aspect-square overflow-hidden rounded-lg border border-line">
                          <img src={f.url} alt={f.label} className="h-full w-full object-cover" />
                        </div>
                        <div className="mt-1 text-[10.5px] leading-tight text-ink-soft">{f.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Lampiran foto</div>
              {fotoUrls.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center text-[12px] text-ink-soft">📷 Tidak ada foto tersimpan</div>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {fotoUrls.map((u, i) => (
                    <button key={i} onClick={() => setLightboxAwal(i)} className="aspect-square overflow-hidden rounded-lg border border-line">
                      <img src={u} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(tipe === 'kejadian' || tipe === 'sesi') && log.length > 0 && (
            <div className="mb-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Jejak aktivitas</div>
              <div className="rounded-lg border border-line bg-white p-3 text-[11px] text-ink-soft">
                {log.map((l) => (
                  <div key={l.id} className="border-b border-dashed border-paper-dim py-1 last:border-none">
                    {fmtTime(l.created_at)} WIB · <b>{l.aktor?.nama || 'Sistem'}</b> — {l.aksi}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tipe !== 'sesi' && (
            <div className="mb-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Komentar</div>
              <div className="mb-2 space-y-1.5">
                {komentar.length === 0 && <div className="text-[12px] italic text-ink-soft">Belum ada komentar.</div>}
                {komentar.map((c) => (
                  <div key={c.id} className="rounded-lg border border-line bg-white p-2.5 text-[12px]">
                    <div className="flex justify-between"><b>{c.author?.nama}</b><span className="text-[10.5px] text-ink-soft">{fmtTime(c.created_at)} WIB</span></div>
                    <div>{c.teks}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={teksKomentar} onChange={(e) => setTeksKomentar(e.target.value)} placeholder="Tulis komentar…" className="flex-1 rounded-lg border border-line px-3 py-2 text-[12.5px]" />
                <button onClick={kirimKomentarBaru} className="rounded-lg border border-line px-3 py-2 text-[12px] font-semibold">Kirim</button>
              </div>
            </div>
          )}

          {bisaKecualikan && (
            <textarea value={catatanKecuali} onChange={(e) => setCatatanKecuali(e.target.value)} placeholder="Catatan pengecualian…" rows={2} className="mb-3 w-full rounded-lg border border-line p-2 text-[12px]" />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3.5">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${['TERVERIFIKASI', 'TERTUTUP'].includes(data.status) ? 'bg-ok-bg text-ok' : 'bg-warn-bg text-warn'}`}>
              {String(data.status).replaceAll('_', ' ')}
            </span>
            <div className="flex flex-wrap gap-2">
              {adaKoordinat && (
                <a
                  href={`https://www.google.com/maps?q=${koordinat.lat},${koordinat.lng}`}
                  target="_blank" rel="noreferrer"
                  className="rounded-lg border border-line px-3.5 py-2 text-[12px] font-semibold hover:border-brass"
                >
                  📍 Lihat Lokasi
                </a>
              )}
              {tipe === 'kejadian' && <button onClick={salinWA} className="rounded-lg border border-line px-3.5 py-2 text-[12px] font-semibold">💬 Laporan WA</button>}
              {bisaEdit && !editMode && data.status === 'MENUNGGU_VERIFIKASI' && <button onClick={mulaiEdit} className="rounded-lg border border-line px-3.5 py-2 text-[12px] font-semibold">✎ Edit</button>}
              {bisaKecualikan && <button onClick={kecualikan} disabled={memproses} className="rounded-lg border border-line px-3.5 py-2 text-[12px] font-semibold">Simpan &amp; Kecualikan</button>}
              {(bisaVerifikasi || bisaVerifikasiSesi) && (
                <button onClick={verifikasi} disabled={memproses} className="rounded-lg bg-navy-950 px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50">✓ Verifikasi</button>
              )}
            </div>
          </div>
        </div>
      </div>
      {lightboxAwal !== null && <Lightbox urls={fotoUrls} indexAwal={lightboxAwal} onClose={() => setLightboxAwal(null)} />}
    </>
  )
}

function Field({ label, v }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="text-[13px] font-semibold">{v || '-'}</div>
    </div>
  )
}
