import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import Lightbox from './Lightbox'
import { urlTertandaTangan } from '../lib/storage'
import { fmtTime, fmtDate, fmtRupiah, keInputTanggal, keInputJam, gabungTanggalJam } from '../lib/format'
import { ambilSatuKegiatan, verifikasiLaporanKegiatan, perbaruiLaporanKegiatan } from '../lib/laporanKegiatanApi'
import { ambilSatuKejadian, verifikasiLaporanKejadian, perbaruiLaporanKejadian, gantiOrangDanKendaraan, ambilLogKejadian } from '../lib/laporanKejadianApi'
import { ambilSatuSesi, verifikasiSesi, kecualikanSesi, ambilLogSesi } from '../lib/sesiPiketApi'
import { ambilKomentar, kirimKomentar } from '../lib/komentarApi'
import { buildLaporanKejadianWA } from '../lib/waReport'
import { buatKolaseTkp, unduhBlob } from '../lib/kolase'

const PERAN_VERIFIKATOR = ['KASUBNIT', 'KANIT_GAKKUM']

// Tiga tahap stempel waktu kejadian (sebelumnya lima: W1-W5).
const STEMPEL = [
  ['waktu_diterima', 'Laporan Diterima'],
  ['waktu_penanganan', 'Dalam Penanganan'],
  ['waktu_selesai', 'Laporan Selesai'],
]

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
  const [editW, setEditW] = useState({})
  const [editOrang, setEditOrang] = useState([])
  const [editKendaraan, setEditKendaraan] = useState([])
  const idBaruRef = useRef(1)
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
    setEditW(Object.fromEntries(STEMPEL.map(([k]) => [k, {
      tanggal: keInputTanggal(data[k]), jam: keInputJam(data[k]),
    }])))
    if (tipe === 'kejadian') {
      const bentuk = keBentukFormulir(data)
      setEditKendaraan(bentuk.kendaraan)
      setEditOrang(bentuk.orang)
    }
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
          ...Object.fromEntries(STEMPEL.map(([k]) => [
            k, gabungTanggalJam(editW[k]?.tanggal, editW[k]?.jam),
          ])),
        })
        // Baris anak diganti setelah induknya berhasil diperbarui — kalau
        // perbaruiLaporanKejadian menolak (mis. sudah diverifikasi), data
        // orang/kendaraan lama tetap utuh dan tidak terlanjur terhapus.
        await gantiOrangDanKendaraan(id, { orang: editOrang, kendaraan: editKendaraan })
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

  async function unduhKolase() {
    setMemproses(true)
    try {
      const blob = await buatKolaseTkp(fotoUrls, {
        lokasi: data.lokasi,
        jenis: data.jenis_kecelakaan?.nama,
        waktu: data.waktu_diterima || data.created_at,
        zona: data.zona?.nama,
        regu: data.regu?.nomor,
        pelapor: `${data.pelapor_pangkat || ''} ${data.pelapor_nama || ''}`.trim(),
      })
      const tanggal = new Date(data.waktu_diterima || data.created_at).toISOString().slice(0, 10)
      unduhBlob(blob, `Kolase-TKP-${tanggal}-${(data.lokasi || 'kejadian').replace(/[^\w]+/g, '-').slice(0, 40)}.jpg`)
      toast('Kolase foto TKP diunduh')
    } catch (e) {
      toast(e.message || 'Gagal menyusun kolase', true)
    } finally {
      setMemproses(false)
    }
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
            <div className="mb-4 grid grid-cols-3 gap-2">
              {STEMPEL.map(([kunci, judul]) => (
                <div key={kunci} className="rounded-lg border border-line bg-white p-2 text-center">
                  <div className="text-[10.5px] font-bold leading-tight text-navy-900">{judul}</div>
                  <div className="mt-1 font-mono text-[11px] text-ink-soft">{data[kunci] ? new Date(data[kunci]).toTimeString().slice(0, 8) : '—'}</div>
                </div>
              ))}
            </div>
          )}

          {tipe === 'kejadian' && <RincianKejadian data={data} />}

          {editMode ? (
            <div className="mb-4 space-y-2 rounded-lg border border-brass bg-white p-3">
              <input value={editLokasi} onChange={(e) => setEditLokasi(e.target.value)} placeholder="Lokasi" className="w-full rounded-lg border border-line px-3 py-2 text-[12.5px]" />
              {tipe === 'kegiatan' && (
                <textarea value={editKeterangan} onChange={(e) => setEditKeterangan(e.target.value)} placeholder="Keterangan" rows={3} className="w-full rounded-lg border border-line px-3 py-2 text-[12.5px]" />
              )}
              {tipe === 'kejadian' && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Stempel waktu</div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {STEMPEL.map(([kunci, judul]) => (
                      <div key={kunci} className="text-[11px] text-ink-soft">
                        {judul}
                        <div className="mt-0.5 flex gap-1">
                          <input
                            type="date"
                            aria-label={`Tanggal ${judul}`}
                            value={editW[kunci]?.tanggal || ''}
                            onChange={(e) => setEditW((prev) => ({ ...prev, [kunci]: { ...prev[kunci], tanggal: e.target.value } }))}
                            className="min-w-0 flex-1 rounded-lg border border-line px-1.5 py-1.5 text-[11.5px]"
                          />
                          <input
                            type="time"
                            aria-label={`Jam ${judul}`}
                            value={editW[kunci]?.jam || ''}
                            onChange={(e) => setEditW((prev) => ({ ...prev, [kunci]: { ...prev[kunci], jam: e.target.value } }))}
                            className="w-[76px] flex-shrink-0 rounded-lg border border-line px-1.5 py-1.5 text-[11.5px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tipe === 'kejadian' && (
                <EditorKendaraanOrang
                  kendaraan={editKendaraan} setKendaraan={setEditKendaraan}
                  orang={editOrang} setOrang={setEditOrang}
                  idBaru={() => `baru-${idBaruRef.current++}`}
                />
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
              {tipe === 'kejadian' && fotoUrls.length > 0 && (
                <button onClick={unduhKolase} disabled={memproses} className="rounded-lg border border-line px-3.5 py-2 text-[12px] font-semibold disabled:opacity-50">🖼️ Kolase TKP</button>
              )}
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

// Verifikator harus bisa membaca SELURUH isi laporan sebelum mengesahkannya.
// Sebelumnya modal ini cuma menampilkan nama + kondisi korban, sementara
// formulir Kejadian menangkap faktor penyebab, tindakan, RTL, kelengkapan
// surat, dan identitas lengkap — artinya laporan disahkan tanpa pernah
// benar-benar terbaca.
const LABEL_KELENGKAPAN = [['stnk', 'STNK'], ['sim', 'SIM'], ['ktp', 'KTP'], ['helm_sabuk', 'Helm/Sabuk']]
const KONDISI_OPT = [['SELAMAT', 'Selamat'], ['LUKA_RINGAN', 'Luka Ringan'], ['LUKA_BERAT', 'Luka Berat'], ['MENINGGAL_DUNIA', 'Meninggal Dunia'], ['DALAM_PERAWATAN', 'Dalam Perawatan']]
const KATEGORI_KENDARAAN = ['Sepeda Motor', 'Mobil Penumpang', 'Mobil Barang / Truk', 'Bus', 'Angkutan Umum', 'Sepeda / Tidak Bermotor', 'Lainnya']

// Baris dari database memakai snake_case dan id asli; gantiOrangDanKendaraan()
// mengharapkan bentuk formulir (camelCase + idSementara untuk menautkan orang
// ke kendaraannya). Id asli dipakai ulang sebagai idSementara — nilainya cuma
// kunci sementara untuk penautan, jadi aman.
function keBentukFormulir(data) {
  return {
    kendaraan: (data.kendaraan || []).map((k) => ({
      idSementara: k.id, kategori: k.kategori || KATEGORI_KENDARAAN[0], merk: k.merk || '', nopol: k.nopol || '',
    })),
    orang: (data.orang || []).map((o) => ({
      idSementara: o.id, nama: o.nama || '', jenisKelamin: o.jenis_kelamin || 'L', pekerjaan: o.pekerjaan || '',
      tempatLahir: o.tempat_lahir || '', tanggalLahir: o.tanggal_lahir || '', alamat: o.alamat || '',
      peran: o.peran || '', kendaraanIdSementara: o.kendaraan_id || '', kondisi: o.kondisi || 'SELAMAT',
      rsRujukan: o.rs_rujukan || '',
      kelengkapan: o.kelengkapan || { stnk: false, sim: false, sim_jenis: '', ktp: false, helm_sabuk: false },
    })),
  }
}

function rapi(v) {
  return typeof v === 'string' ? v.replaceAll('_', ' ') : v
}

function EditorKendaraanOrang({ kendaraan, setKendaraan, orang, setOrang, idBaru }) {
  const ubahK = (id, tambalan) => setKendaraan((arr) => arr.map((x) => (x.idSementara === id ? { ...x, ...tambalan } : x)))
  const ubahO = (id, tambalan) => setOrang((arr) => arr.map((x) => (x.idSementara === id ? { ...x, ...tambalan } : x)))
  const kelas = 'w-full rounded-lg border border-line px-2 py-1.5 text-[12px]'

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Kendaraan terlibat</span>
          <button
            type="button"
            onClick={() => setKendaraan((a) => [...a, { idSementara: idBaru(), kategori: KATEGORI_KENDARAAN[0], merk: '', nopol: '' }])}
            className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold"
          >+ Tambah</button>
        </div>
        {kendaraan.length === 0 && <div className="text-[12px] italic text-ink-soft">Belum ada kendaraan.</div>}
        <div className="space-y-1.5">
          {kendaraan.map((k) => (
            <div key={k.idSementara} className="flex gap-1.5">
              <select value={k.kategori} onChange={(e) => ubahK(k.idSementara, { kategori: e.target.value })} className={kelas}>
                {KATEGORI_KENDARAAN.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <input value={k.merk} onChange={(e) => ubahK(k.idSementara, { merk: e.target.value })} placeholder="Merk / tipe" className={kelas} />
              <input value={k.nopol} onChange={(e) => ubahK(k.idSementara, { nopol: e.target.value })} placeholder="Nopol" className={kelas} />
              <button
                type="button"
                onClick={() => {
                  setKendaraan((a) => a.filter((x) => x.idSementara !== k.idSementara))
                  // Orang yang tertaut ke kendaraan ini ikut dilepas tautannya,
                  // supaya tidak menunjuk kendaraan yang sudah tidak ada.
                  setOrang((a) => a.map((o) => (o.kendaraanIdSementara === k.idSementara ? { ...o, kendaraanIdSementara: '' } : o)))
                }}
                className="flex-shrink-0 rounded-lg bg-bad-bg px-2 text-[12px] font-semibold text-bad"
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Orang terlibat</span>
          <button
            type="button"
            onClick={() => setOrang((a) => [...a, {
              idSementara: idBaru(), nama: '', jenisKelamin: 'L', pekerjaan: '', tempatLahir: '', tanggalLahir: '',
              alamat: '', peran: '', kendaraanIdSementara: '', kondisi: 'SELAMAT', rsRujukan: '',
              kelengkapan: { stnk: false, sim: false, sim_jenis: '', ktp: false, helm_sabuk: false },
            }])}
            className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold"
          >+ Tambah</button>
        </div>
        {orang.length === 0 && <div className="text-[12px] italic text-ink-soft">Belum ada orang terlibat.</div>}
        <div className="space-y-2">
          {orang.map((o) => (
            <div key={o.idSementara} className="rounded-lg border border-line p-2">
              <div className="mb-1.5 flex gap-1.5">
                <input value={o.nama} onChange={(e) => ubahO(o.idSementara, { nama: e.target.value })} placeholder="Nama lengkap" className={kelas} />
                <button
                  type="button"
                  onClick={() => setOrang((a) => a.filter((x) => x.idSementara !== o.idSementara))}
                  className="flex-shrink-0 rounded-lg bg-bad-bg px-2 text-[12px] font-semibold text-bad"
                >✕</button>
              </div>
              <div className="mb-1.5 grid grid-cols-2 gap-1.5">
                <select value={o.jenisKelamin} onChange={(e) => ubahO(o.idSementara, { jenisKelamin: e.target.value })} className={kelas}>
                  <option value="L">Laki-laki</option><option value="P">Perempuan</option>
                </select>
                <select value={o.kondisi} onChange={(e) => ubahO(o.idSementara, { kondisi: e.target.value })} className={kelas}>
                  {KONDISI_OPT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input value={o.pekerjaan} onChange={(e) => ubahO(o.idSementara, { pekerjaan: e.target.value })} placeholder="Pekerjaan" className={kelas} />
                <input value={o.peran} onChange={(e) => ubahO(o.idSementara, { peran: e.target.value })} placeholder="Peran (mis. Pengendara)" className={kelas} />
                <input value={o.tempatLahir} onChange={(e) => ubahO(o.idSementara, { tempatLahir: e.target.value })} placeholder="Tempat lahir" className={kelas} />
                <input type="date" aria-label="Tanggal lahir" value={o.tanggalLahir || ''} onChange={(e) => ubahO(o.idSementara, { tanggalLahir: e.target.value })} className={kelas} />
              </div>
              <input value={o.alamat} onChange={(e) => ubahO(o.idSementara, { alamat: e.target.value })} placeholder="Alamat" className={`${kelas} mb-1.5`} />
              <div className="mb-1.5 grid grid-cols-2 gap-1.5">
                <select value={o.kendaraanIdSementara} onChange={(e) => ubahO(o.idSementara, { kendaraanIdSementara: e.target.value })} className={kelas}>
                  <option value="">Tanpa kendaraan</option>
                  {kendaraan.map((k) => <option key={k.idSementara} value={k.idSementara}>{k.kategori} {k.merk} {k.nopol}</option>)}
                </select>
                {o.kondisi !== 'SELAMAT' && (
                  <input value={o.rsRujukan} onChange={(e) => ubahO(o.idSementara, { rsRujukan: e.target.value })} placeholder="RS rujukan" className={kelas} />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {LABEL_KELENGKAPAN.map(([kunci, label]) => (
                  <label key={kunci} className="flex items-center gap-1 text-[11.5px]">
                    <input
                      type="checkbox"
                      checked={!!o.kelengkapan?.[kunci]}
                      onChange={(e) => ubahO(o.idSementara, { kelengkapan: { ...o.kelengkapan, [kunci]: e.target.checked } })}
                    />
                    {label}
                  </label>
                ))}
                {o.kelengkapan?.sim && (
                  <input
                    value={o.kelengkapan.sim_jenis || ''}
                    onChange={(e) => ubahO(o.idSementara, { kelengkapan: { ...o.kelengkapan, sim_jenis: e.target.value } })}
                    placeholder="Jenis SIM"
                    className="w-24 rounded-lg border border-line px-2 py-1 text-[11.5px]"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Bagian({ judul, children }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{judul}</div>
      {children}
    </div>
  )
}

function Tag({ children, nada = 'netral' }) {
  const gaya = {
    netral: 'border-line bg-paper-dim text-ink',
    baik: 'border-transparent bg-ok-bg text-ok',
    buruk: 'border-transparent bg-bad-bg text-bad',
    ingat: 'border-transparent bg-warn-bg text-warn',
  }[nada]
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${gaya}`}>{children}</span>
}

function DaftarChip({ isi, lainnya }) {
  const semua = [...(isi || [])]
  if (lainnya) semua.push(lainnya)
  if (semua.length === 0) return <span className="text-[12px] italic text-ink-soft">Tidak diisi.</span>
  return <div className="flex flex-wrap gap-1.5">{semua.map((x, i) => <Tag key={i}>{x}</Tag>)}</div>
}

function RincianKejadian({ data }) {
  const nadaKondisi = (k) => (k === 'MENINGGAL_DUNIA' || k === 'LUKA_BERAT' ? 'buruk' : k === 'SELAMAT' ? 'baik' : 'ingat')
  const kendaraanNama = (id) => {
    const k = (data.kendaraan || []).find((x) => x.id === id)
    return k ? `${k.kategori}${k.merk ? ` ${k.merk}` : ''}${k.nopol ? ` (${k.nopol})` : ''}` : null
  }
  const rtl = (data.rtl || []).filter(Boolean)
  const personel = (data.personel_tambahan || []).filter(Boolean)
  const jalan = data.faktor_jalan?.kondisiPermukaan
  const cuaca = data.faktor_cuaca?.cuaca

  return (
    <div className="mb-4 rounded-lg border border-line bg-white p-3.5">
      <Bagian judul="Status penanganan">
        <div className="flex flex-wrap gap-1.5">
          <Tag nada={data.tabrak_lari ? 'buruk' : 'netral'}>{data.tabrak_lari ? 'Tabrak lari' : 'Bukan tabrak lari'}</Tag>
          <Tag nada={data.tkp_ditangani ? 'baik' : 'ingat'}>{data.tkp_ditangani ? 'TKP ditangani' : 'TKP belum ditangani'}</Tag>
          <Tag nada={data.kendaraan_diamankan ? 'baik' : 'netral'}>{data.kendaraan_diamankan ? 'Kendaraan diamankan' : 'Kendaraan tidak diamankan'}</Tag>
          {data.status_tersangka && (
            <Tag nada={data.status_tersangka === 'SUDAH_DIKETAHUI' ? 'baik' : 'ingat'}>
              Tersangka: {rapi(data.status_tersangka).toLowerCase()}{data.nama_tersangka ? ` — ${data.nama_tersangka}` : ''}
            </Tag>
          )}
        </div>
      </Bagian>

      {data.kendaraan?.length > 0 && (
        <Bagian judul={`Kendaraan terlibat (${data.kendaraan.length})`}>
          <div className="space-y-1">
            {data.kendaraan.map((k) => (
              <div key={k.id} className="flex flex-wrap items-baseline gap-x-2 border-b border-dashed border-paper-dim pb-1 text-[12.5px] last:border-none last:pb-0">
                <span className="font-semibold">{k.kategori}</span>
                <span>{k.merk || '—'}</span>
                <span className="font-mono text-[11.5px] text-ink-soft">{k.nopol || 'tanpa nopol'}</span>
              </div>
            ))}
          </div>
        </Bagian>
      )}

      {data.orang?.length > 0 && (
        <Bagian judul={`Orang terlibat (${data.orang.length})`}>
          <div className="space-y-2">
            {data.orang.map((o) => (
              <div key={o.id} className="rounded-lg border border-line p-2.5 text-[12px]">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold">{o.nama || '(tanpa nama)'}</span>
                  <Tag nada={nadaKondisi(o.kondisi)}>{rapi(o.kondisi)}</Tag>
                  {o.peran && <span className="text-[11px] text-ink-soft">{o.peran}</span>}
                </div>
                <div className="text-[11.5px] text-ink-soft">
                  {[
                    o.jenis_kelamin === 'L' ? 'Laki-laki' : o.jenis_kelamin === 'P' ? 'Perempuan' : null,
                    o.pekerjaan,
                    [o.tempat_lahir, o.tanggal_lahir].filter(Boolean).join(', '),
                  ].filter(Boolean).join(' · ') || 'Identitas tidak dilengkapi'}
                </div>
                {o.alamat && <div className="mt-0.5 text-[11.5px] text-ink-soft">{o.alamat}</div>}
                {kendaraanNama(o.kendaraan_id) && <div className="mt-0.5 text-[11.5px]">Mengendarai: {kendaraanNama(o.kendaraan_id)}</div>}
                {o.rs_rujukan && <div className="mt-0.5 text-[11.5px]">RS rujukan: <b>{o.rs_rujukan}</b></div>}
                {o.kelengkapan && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {LABEL_KELENGKAPAN.map(([kunci, label]) => (
                      <Tag key={kunci} nada={o.kelengkapan[kunci] ? 'baik' : 'buruk'}>
                        {o.kelengkapan[kunci] ? '✓' : '✕'} {label}
                        {kunci === 'sim' && o.kelengkapan.sim && o.kelengkapan.sim_jenis ? ` ${o.kelengkapan.sim_jenis}` : ''}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Bagian>
      )}

      <Bagian judul="Faktor penyebab">
        <div className="space-y-1.5">
          <div>
            <div className="mb-1 text-[11px] font-semibold text-ink-soft">A. Manusia</div>
            <DaftarChip isi={data.faktor_manusia?.checked} lainnya={data.faktor_manusia?.lainnya} />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-ink-soft">B. Kendaraan</div>
            <DaftarChip isi={data.faktor_kendaraan?.checked} lainnya={data.faktor_kendaraan?.lainnya} />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-ink-soft">C. Jalan &amp; Cuaca</div>
            {jalan || cuaca
              ? <div className="flex flex-wrap gap-1.5">{jalan && <Tag>{jalan}</Tag>}{cuaca && <Tag>{cuaca}</Tag>}</div>
              : <span className="text-[12px] italic text-ink-soft">Tidak diisi.</span>}
          </div>
        </div>
      </Bagian>

      <Bagian judul="Tindakan yang dilakukan">
        <DaftarChip isi={data.tindakan?.checked} lainnya={data.tindakan?.lainnya} />
      </Bagian>

      {rtl.length > 0 && (
        <Bagian judul="Rencana tindak lanjut">
          <ol className="list-decimal space-y-0.5 pl-4 text-[12.5px]">
            {rtl.map((x, i) => <li key={i}>{x}</li>)}
          </ol>
        </Bagian>
      )}

      {personel.length > 0 && (
        <Bagian judul="Personel tambahan di TKP">
          <div className="flex flex-wrap gap-1.5">{personel.map((x, i) => <Tag key={i}>{x}</Tag>)}</div>
        </Bagian>
      )}
    </div>
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
