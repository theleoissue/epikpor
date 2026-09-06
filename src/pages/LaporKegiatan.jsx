import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { ambilJenisKegiatan } from '../lib/referensiApi'
import { ambilSesiAktifSaya } from '../lib/sesiPiketApi'
import { kirimLaporanKegiatan, tambahLampiranKegiatan } from '../lib/laporanKegiatanApi'
import { unggahFoto, getGeoPosition } from '../lib/storage'
import { tambahAntrean } from '../lib/offlineQueue'

export default function LaporKegiatan() {
  const { profil } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [jenisList, setJenisList] = useState([])
  const [jenisTerpilih, setJenisTerpilih] = useState(null)
  const [lokasi, setLokasi] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [foto, setFoto] = useState([])
  const [sesi, setSesi] = useState(null)
  const [mengirim, setMengirim] = useState(false)
  const dibukaPada = useRef(Date.now())

  useEffect(() => {
    ambilJenisKegiatan().then(setJenisList)
    ambilSesiAktifSaya(profil.id).then(setSesi)
    dibukaPada.current = Date.now()
  }, [profil.id])

  function tambahFoto(e) {
    setFoto((f) => [...f, ...Array.from(e.target.files)])
    e.target.value = ''
  }

  async function submit() {
    if (!jenisTerpilih) return toast('Pilih jenis kegiatan terlebih dahulu', true)
    if (!lokasi.trim()) return toast('Isi lokasi terlebih dahulu', true)
    setMengirim(true)
    const lamaDetik = Math.round((Date.now() - dibukaPada.current) / 1000)
    const dataInti = {
      jenis_kegiatan_id: jenisTerpilih,
      lokasi: lokasi.trim(),
      keterangan: keterangan.trim(),
      lama_pengisian_detik: lamaDetik,
      zona_id: profil.zona_id,
      regu_id: profil.regu_id,
      sesi_piket_id: sesi?.id || null,
      pelapor_id: profil.id,
      pelapor_nama: profil.nama,
      pelapor_pangkat: profil.pangkat,
      pelapor_nrp: profil.nrp,
    }

    if (!navigator.onLine) {
      await tambahAntrean({ tipe: 'kegiatan', payload: dataInti, fotoFiles: foto })
      toast('Sedang tanpa sinyal — laporan tersimpan di perangkat, akan terkirim otomatis')
      resetForm()
      navigate('/')
      setMengirim(false)
      return
    }

    try {
      const koordinat = await getGeoPosition()
      const laporan = await kirimLaporanKegiatan({ ...dataInti, koordinat })
      if (foto.length) {
        const paths = await Promise.all(foto.map((f) => unggahFoto('foto-kegiatan', f)))
        await tambahLampiranKegiatan(laporan.id, paths)
      }
      toast(`Laporan kegiatan terkirim · lama pengisian ${Math.floor(lamaDetik / 60)}m ${lamaDetik % 60}d`)
      resetForm()
      navigate('/')
    } catch (e) {
      // Cuma diantrekan kalau memang sinyal hilang di tengah proses kirim.
      // Kalau sinyal masih ada tapi tetap gagal (mis. ditolak server), itu
      // kemungkinan besar galat yang akan gagal lagi berulang-ulang kalau
      // diam-diam diantrekan — jadi tampilkan errornya langsung ke pengguna.
      if (!navigator.onLine) {
        await tambahAntrean({ tipe: 'kegiatan', payload: dataInti, fotoFiles: foto })
        toast('Sinyal terputus saat mengirim — laporan tersimpan di perangkat, akan dicoba lagi otomatis')
        resetForm()
        navigate('/')
      } else {
        toast(e.message || 'Gagal mengirim laporan', true)
      }
    } finally {
      setMengirim(false)
    }
  }

  function resetForm() {
    setJenisTerpilih(null); setLokasi(''); setKeterangan(''); setFoto([]); dibukaPada.current = Date.now()
  }

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-warn">Formulir</div>
        <h1 className="mt-1 font-display text-[26px] font-bold leading-tight text-navy-950 sm:text-[30px]">Lapor Kegiatan</h1>
        <p className="mt-1 max-w-xl text-[13.5px] text-ink-soft">Waktu, zona, regu, dan nama pelapor terisi otomatis dari sesi piket yang sedang berjalan.</p>
      </div>

      <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:p-5">
        {sesi ? (
          <div className="mb-3.5 rounded-lg bg-ok-bg px-3.5 py-2.5 text-[12px] text-[#245C43]">
            ✓ Sesi piket sedang berjalan — Zona {profil.zona?.nama} · Regu {profil.regu?.nomor} · {profil.nama}
          </div>
        ) : (
          <div className="mb-3.5 rounded-lg bg-warn-bg px-3.5 py-2.5 text-[12px] text-[#7A4E14]">
            ⚠ Sesi piket belum dibuka. Laporan tetap dapat dikirim, tapi sebaiknya buka sesi terlebih dahulu di Beranda.
          </div>
        )}

        <div className="mb-4 grid gap-3.5 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">Jenis kegiatan</label>
            <div className="flex flex-wrap gap-2">
              {jenisList.map((j) => (
                <button
                  key={j.id}
                  onClick={() => setJenisTerpilih(j.id)}
                  className={`rounded-full border px-3.5 py-2 text-[12.5px] font-medium ${jenisTerpilih === j.id ? 'border-navy-900 bg-navy-900 text-white' : 'border-line text-ink-soft'}`}
                >
                  {j.nama}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">Lokasi</label>
            <input value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="mis. Simpang Dago" className="w-full rounded-lg border border-line px-3 py-2.5 text-[13px]" />
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">Keterangan singkat</label>
          <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={3} className="w-full rounded-lg border border-line px-3 py-2.5 text-[13px]" />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">Lampiran foto (opsional)</label>
          {/* Kamera HP cuma bisa mengambil satu foto tiap kali dibuka —
              batasan sistem kamera perangkat. Menekan tombol berkali-kali
              TETAP menambah foto baru, tidak menghapus yang sebelumnya. */}
          <p className="mb-2 text-[11px] text-ink-soft">Tekan "Ambil foto langsung" berkali-kali untuk menambah beberapa foto.</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block cursor-pointer rounded-lg border-[1.5px] border-dashed border-line py-4 text-center text-[12.5px] text-ink-soft hover:border-brass">
              📷 Ambil foto langsung
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={tambahFoto} />
            </label>
            <label className="block cursor-pointer rounded-lg border-[1.5px] border-dashed border-line py-4 text-center text-[12.5px] text-ink-soft hover:border-brass">
              🖼️ Pilih dari galeri
              <input type="file" accept="image/*" multiple className="hidden" onChange={tambahFoto} />
            </label>
          </div>
          {foto.length > 0 && <div className="mt-2 text-[11px] font-semibold text-ok">✓ {foto.length} foto terkumpul</div>}
          {foto.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {foto.map((f, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-line">
                  <img src={URL.createObjectURL(f)} className="h-full w-full object-cover" alt="" />
                  <button onClick={() => setFoto((arr) => arr.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-navy-950/75 text-[11px] text-white">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2.5">
          <button onClick={submit} disabled={mengirim} className="rounded-[10px] bg-navy-950 px-6.5 py-3 font-display text-[13px] font-semibold text-white disabled:opacity-50">
            {mengirim ? 'Mengirim…' : 'Kirim Laporan'}
          </button>
          <button onClick={resetForm} className="rounded-[10px] border border-line px-4.5 py-3 text-[13px] font-semibold text-ink-soft">Bersihkan</button>
        </div>
      </div>
    </div>
  )
}
