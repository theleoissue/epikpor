import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { ambilJenisKecelakaan, ambilTipeTabrakan } from '../lib/referensiApi'
import { ambilSesiAktifSaya } from '../lib/sesiPiketApi'
import { kirimLaporanKejadian, tambahLampiranKejadian } from '../lib/laporanKejadianApi'
import { unggahFoto, getGeoPosition } from '../lib/storage'
import { tambahAntrean } from '../lib/offlineQueue'
import { SASARAN_WAKTU_TANGGAP, keInputTanggal, keInputJam, gabungTanggalJam, lamaTerbaca } from '../lib/format'
import {
  JENIS_KELAMIN_OPT, PERAN_ORANG_OPT, KONDISI_OPT, SIM_JENIS_OPT,
  KELENGKAPAN_DEF, STATUS_KELENGKAPAN_OPT, BELUM_DIPERIKSA, ADA,
  KATEGORI_KENDARAAN, FAKTOR_MANUSIA_OPT, FAKTOR_KENDARAAN_OPT, TINDAKAN_OPT,
  KONDISI_JALAN_OPT, KONTUR_JALAN_OPT, CUACA_OPT, LINGKUNGAN_OPT, KEPADATAN_OPT,
  kendaraanBaru, orangBaru, periksaFormulirKejadian,
} from '../lib/opsiKejadian'

const STAMP_DEFS = [
  ['waktu_diterima', 'Laporan Diterima', 'Panggilan / laporan masuk'],
  ['waktu_penanganan', 'Dalam Penanganan', 'Petugas tiba dan menangani TKP'],
  ['waktu_selesai', 'Laporan Selesai', 'Penanganan dinyatakan selesai'],
]

// Penanda kolom wajib — sebelumnya tidak ada, petugas baru tahu ada yang
// kurang setelah menekan kirim dan ditolak.
function Wajib() {
  return <span className="text-bad" title="Wajib diisi"> *</span>
}

function Chip({ aktif, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3.5 py-2 text-[12.5px] font-medium ${aktif ? 'border-navy-900 bg-navy-900 text-white' : 'border-line text-ink-soft'}`}>
      {children}
    </button>
  )
}
function Field(props) { return <input {...props} className={`rounded-lg border border-line px-2.5 py-2 text-[12.5px] ${props.className || ''}`} /> }
function Select({ children, ...props }) { return <select {...props} className="rounded-lg border border-line px-2.5 py-2 text-[12.5px]">{children}</select> }

export default function Kejadian() {
  const { profil } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [jenisKecelakaanList, setJenisKecelakaanList] = useState([])
  const [tipeTabrakanList, setTipeTabrakanList] = useState([])
  const [sesi, setSesi] = useState(null)
  const [mengirim, setMengirim] = useState(false)

  const [w, setW] = useState({})
  const [lokasi, setLokasi] = useState('')
  const [jenisKecelakaanId, setJenisKecelakaanId] = useState('')
  const [tipeTabrakanId, setTipeTabrakanId] = useState('')
  const [statusPenanganan, setStatusPenanganan] = useState('MASIH_DALAM_PENANGANAN')
  const [statusTersangka, setStatusTersangka] = useState('BELUM_DIKETAHUI')
  const [namaTersangka, setNamaTersangka] = useState('')
  const [tabrakLari, setTabrakLari] = useState(false)
  const [tkpDitangani, setTkpDitangani] = useState(true)
  const [kendaraanDiamankan, setKendaraanDiamankan] = useState(false)
  const [kerugian, setKerugian] = useState('')
  const [kronologisPra, setKronologisPra] = useState('')
  const [kronologisSaat, setKronologisSaat] = useState('')
  const [kronologisPasca, setKronologisPasca] = useState('')
  const [faktorManusia, setFaktorManusia] = useState([])
  const [faktorManusiaLainnya, setFaktorManusiaLainnya] = useState('')
  const [faktorKendaraan, setFaktorKendaraan] = useState([])
  const [faktorKendaraanLainnya, setFaktorKendaraanLainnya] = useState('')
  const [faktorJalan, setFaktorJalan] = useState({})
  const [faktorCuaca, setFaktorCuaca] = useState({})
  const [tindakan, setTindakan] = useState([])
  const [tindakanLainnya, setTindakanLainnya] = useState('')
  const [rtl, setRtl] = useState([])
  const [personelTambahan, setPersonelTambahan] = useState([])
  const [kendaraan, setKendaraan] = useState([])
  const [orang, setOrang] = useState([])
  const [foto, setFoto] = useState([])
  const [daftarSalah, setDaftarSalah] = useState([])
  const idSementaraRef = useRef(1)

  useEffect(() => {
    ambilJenisKecelakaan().then(setJenisKecelakaanList)
    ambilTipeTabrakan().then(setTipeTabrakanList)
    ambilSesiAktifSaya(profil.id).then(setSesi)
  }, [profil.id])

  // Satu-satunya jalur pengisian stempel. Tanggal dan jam dipegang terpisah di
  // antarmuka lalu digabung jadi satu waktu, sehingga salah satunya boleh
  // diisi lebih dulu tanpa membuat stempelnya hilang.
  function setStempelManual(key, { tanggal, jam }) {
    setW((prev) => {
      const t = tanggal !== undefined ? tanggal : keInputTanggal(prev[key])
      const j = jam !== undefined ? jam : keInputJam(prev[key])
      const iso = gabungTanggalJam(t, j)
      if (!iso) { const { [key]: _hapus, ...rest } = prev; return rest }
      return { ...prev, [key]: iso }
    })
  }

  function toggleDalam(list, setList, val) {
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val])
  }

  function tambahKendaraan() {
    setKendaraan((k) => [...k, kendaraanBaru(idSementaraRef.current++)])
  }
  function tambahOrang() {
    setOrang((o) => [...o, orangBaru(idSementaraRef.current++)])
  }
  function ubahOrang(id, tambalan) {
    setOrang((arr) => arr.map((x) => (x.idSementara === id ? { ...x, ...tambalan } : x)))
  }

  const akibat = {
    md: orang.filter((o) => o.kondisi === 'MENINGGAL_DUNIA').length,
    lb: orang.filter((o) => o.kondisi === 'LUKA_BERAT').length,
    lr: orang.filter((o) => o.kondisi === 'LUKA_RINGAN').length,
  }

  function rentang(a, b, batasDetik) {
    if (!w[a] || !w[b]) return null
    const detik = Math.round((new Date(w[b]) - new Date(w[a])) / 1000)
    return { detik, teks: lamaTerbaca(detik), lewat: detik > batasDetik }
  }

  // Selisih tiap tahap terhadap tahap sebelumnya, ditampilkan di kartunya
  // sendiri supaya petugas langsung sadar kalau ada yang janggal — tidak perlu
  // menunggu sampai menekan kirim.
  function selisihTahapSebelumnya(i) {
    if (i === 0) return null
    const [kunci] = STAMP_DEFS[i]
    const [kunciSebelum, judulSebelum] = STAMP_DEFS[i - 1]
    if (!w[kunci] || !w[kunciSebelum]) return null
    const detik = Math.round((new Date(w[kunci]) - new Date(w[kunciSebelum])) / 1000)
    return { detik, teks: lamaTerbaca(Math.abs(detik)), mundur: detik < 0, judulSebelum }
  }

  function resetForm() {
    setW({}); setLokasi(''); setJenisKecelakaanId(''); setTipeTabrakanId(''); setStatusPenanganan('MASIH_DALAM_PENANGANAN')
    setStatusTersangka('BELUM_DIKETAHUI'); setNamaTersangka(''); setTabrakLari(false); setTkpDitangani(true); setKendaraanDiamankan(false)
    setKerugian(''); setKronologisPra(''); setKronologisSaat(''); setKronologisPasca('')
    setFaktorManusia([]); setFaktorManusiaLainnya(''); setFaktorKendaraan([]); setFaktorKendaraanLainnya('')
    setFaktorJalan({}); setFaktorCuaca({}); setTindakan([]); setTindakanLainnya('')
    setRtl([]); setPersonelTambahan([]); setKendaraan([]); setOrang([]); setFoto([])
  }

  function bangunPayload(koordinat) {
    return {
      ...Object.fromEntries(STAMP_DEFS.map(([k]) => [k, w[k] || null])),
      lokasi: lokasi.trim(), koordinat,
      jenis_kecelakaan_id: jenisKecelakaanId || null, tipe_tabrakan_id: tipeTabrakanId || null,
      status_penanganan: statusPenanganan, tabrak_lari: tabrakLari, tkp_ditangani: tkpDitangani, kendaraan_diamankan: kendaraanDiamankan,
      status_tersangka: statusTersangka, nama_tersangka: namaTersangka.trim(),
      kerugian_materiil: kerugian ? Number(kerugian) : null,
      kronologis_pra: kronologisPra.trim(), kronologis_saat: kronologisSaat.trim(), kronologis_pasca: kronologisPasca.trim(),
      faktor_manusia: { checked: faktorManusia, lainnya: faktorManusiaLainnya.trim() },
      faktor_kendaraan: { checked: faktorKendaraan, lainnya: faktorKendaraanLainnya.trim() },
      faktor_jalan: faktorJalan, faktor_cuaca: faktorCuaca,
      tindakan: { checked: tindakan, lainnya: tindakanLainnya.trim() },
      // Baris yang ditambah lalu dibiarkan kosong dibuang di sini — kalau
      // ikut tersimpan, laporan mencetak butir bernomor yang isinya kosong.
      rtl: rtl.map((r) => r.trim()).filter(Boolean),
      personel_tambahan: personelTambahan.map((p) => p.trim()).filter(Boolean),
      zona_id: profil.zona_id, regu_id: profil.regu_id, sesi_piket_id: sesi?.id || null,
      pelapor_id: profil.id, pelapor_nama: profil.nama, pelapor_pangkat: profil.pangkat, pelapor_nrp: profil.nrp,
    }
  }

  async function submit() {
    // Seluruh kekurangan ditampilkan sekaligus, bukan satu per satu tiap kali
    // tombol kirim ditekan.
    const salah = periksaFormulirKejadian({ w, lokasi, jenisKecelakaanId, tipeTabrakanId, kendaraan, orang, kerugian })
    if (salah.length) {
      setDaftarSalah(salah)
      return toast(`${salah.length} isian perlu diperbaiki sebelum dikirim`, true)
    }
    setDaftarSalah([])
    setMengirim(true)

    if (!navigator.onLine) {
      await tambahAntrean({ tipe: 'kejadian', payload: bangunPayload(null), orang, kendaraan, fotoFiles: foto })
      toast('Sedang tanpa sinyal — laporan tersimpan di perangkat, akan terkirim otomatis')
      resetForm(); navigate('/'); setMengirim(false)
      return
    }
    try {
      const koordinat = await getGeoPosition()
      const laporan = await kirimLaporanKejadian(bangunPayload(koordinat), { orang, kendaraan })
      if (foto.length) {
        const paths = await Promise.all(foto.map((f) => unggahFoto('foto-kejadian', f)))
        await tambahLampiranKejadian(laporan.id, paths)
      }
      toast('Laporan kejadian kecelakaan terkirim')
      resetForm(); navigate('/')
    } catch (e) {
      // Sama seperti LaporKegiatan: cuma diantrekan kalau sinyal memang hilang,
      // supaya galat yang bukan soal sinyal tidak terjebak diam-diam di antrean.
      if (!navigator.onLine) {
        await tambahAntrean({ tipe: 'kejadian', payload: bangunPayload(null), orang, kendaraan, fotoFiles: foto })
        toast('Sinyal terputus saat mengirim — laporan tersimpan di perangkat, akan dicoba lagi otomatis')
        resetForm(); navigate('/')
      } else {
        toast(e.message || 'Gagal mengirim laporan kejadian', true)
      }
    } finally {
      setMengirim(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-warn">Formulir · Waktu Tanggap</div>
        <h1 className="mt-1 font-display text-[22px] font-semibold">Kejadian Kecelakaan</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">Isi tanggal dan jam tiap tahap sesuai waktu peristiwanya — bukan waktu formulir ini diisi. Tombol <b>Sekarang</b> tersedia bila tahapnya memang baru saja terjadi. Sistem menghitung sendiri rentang waktunya.</p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {STAMP_DEFS.map(([key, kode, label], i) => {
          const terisi = !!w[key]
          const wajib = i === 0
          const beda = selisihTahapSebelumnya(i)
          return (
            <div key={key} className={`flex flex-col rounded-xl border p-3 ${beda?.mundur ? 'border-bad bg-bad-bg' : terisi ? 'border-[#BFE0CD] bg-ok-bg' : 'border-line bg-white'}`}>
              <div className="mb-1 flex items-center gap-1.5">
                {/* Nomor tahap: menegaskan ini urutan berjalan, bukan tiga kolom setara. */}
                <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold ${terisi ? 'bg-ok text-white' : 'bg-paper-dim text-ink-soft'}`}>
                  {terisi ? '✓' : i + 1}
                </span>
                <span className="font-display text-[12.5px] font-bold leading-tight text-navy-900">{kode}</span>
                {wajib && <Wajib />}
              </div>
              <div className="mb-2 min-h-[28px] text-[10.5px] leading-tight text-ink-soft">{label}</div>

              {/* Kolom tanggal & jam adalah SATU-SATUNYA cara mengisi stempel.
                  Dulu ada dua jalur bersaing — tombol "Ketuk saat terjadi" dan
                  isian manual — padahal formulir ini pada praktiknya diisi di
                  pos setelah penanganan selesai, bukan saat peristiwanya
                  berlangsung. Tombol ketuk jadi menjebak: yang terekam jam
                  pengisian, bukan jam kejadian. "Sekarang" di bawah hanyalah
                  pintasan yang mengisikan jam saat ini ke kolom yang sama. */}
              <div className="flex gap-1">
                <input
                  type="date"
                  aria-label={`Tanggal ${kode}`}
                  max={keInputTanggal(new Date().toISOString())}
                  value={keInputTanggal(w[key])}
                  onChange={(e) => setStempelManual(key, { tanggal: e.target.value })}
                  className={`min-w-0 flex-1 rounded-lg border bg-white px-2 py-1.5 text-[11.5px] ${terisi ? 'border-[#BFE0CD]' : 'border-line'}`}
                />
                <input
                  type="time"
                  aria-label={`Jam ${kode}`}
                  value={keInputJam(w[key])}
                  onChange={(e) => setStempelManual(key, { jam: e.target.value })}
                  className={`w-[92px] flex-shrink-0 rounded-lg border bg-white px-1.5 py-1.5 font-mono text-[12px] font-semibold ${terisi ? 'border-[#BFE0CD] text-ok' : 'border-line'}`}
                />
              </div>

              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => setStempelManual(key, { tanggal: keInputTanggal(new Date().toISOString()), jam: keInputJam(new Date().toISOString()) })}
                  className="flex-1 rounded-lg border border-line py-1 text-[10.5px] font-semibold text-ink-soft hover:border-brass hover:text-navy-900"
                >
                  Sekarang
                </button>
                {terisi && (
                  <button
                    type="button"
                    onClick={() => setStempelManual(key, { tanggal: '', jam: '' })}
                    className="flex-1 rounded-lg py-1 text-[10.5px] font-semibold text-bad hover:bg-bad-bg"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {beda && (
                <div className={`mt-1.5 rounded-md px-2 py-1 text-[10.5px] ${beda.mundur ? 'bg-bad text-white' : 'bg-white/70 text-ink-soft'}`}>
                  {beda.mundur
                    ? `⚠ Mendahului "${beda.judulSebelum}" sejauh ${beda.teks}`
                    : `+${beda.teks} dari "${beda.judulSebelum}"`}
                </div>
              )}
              <div className="mt-auto" />
            </div>
          )
        })}
      </div>

      <div className="rounded-xl bg-navy-900 p-4 text-white">
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-white/60">Capaian terhadap sasaran</div>
        {[
          ['Waktu tanggap penanganan', 'waktu_diterima', 'waktu_penanganan', SASARAN_WAKTU_TANGGAP.penanganan, '45 menit'],
          ['Penyelesaian laporan', 'waktu_diterima', 'waktu_selesai', SASARAN_WAKTU_TANGGAP.selesai, '24 jam'],
        ].map(([label, a, b, batas, sasaran]) => {
          const r = rentang(a, b, batas)
          return (
            <div key={label} className="flex items-center justify-between gap-3 border-b border-dashed border-white/10 py-2 text-[12.5px] last:border-none">
              <div>
                <div>{label}</div>
                <div className="text-[10.5px] text-white/45">Sasaran {sasaran}</div>
              </div>
              <span className={`flex-shrink-0 text-right font-mono text-[13px] font-bold ${!r ? 'text-white/35' : r.lewat ? 'text-[#F0A582]' : 'text-[#7FD8A8]'}`}>
                {r ? r.teks : 'belum lengkap'}
                {r?.lewat && <div className="text-[10px] font-semibold">lampaui sasaran</div>}
              </span>
            </div>
          )
        })}
      </div>

      <div className="rounded-[14px] border border-line bg-white p-5">
        <h3 className="mb-3.5 font-display text-[14.5px] font-semibold">Lokasi &amp; Klasifikasi</h3>
        <label className="mb-1 block text-[11px] font-semibold text-ink-soft">Lokasi kejadian<Wajib /></label>
        <Field value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="mis. Jl. Pajajaran No. 92, Pamoyanan" className="mb-3 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ink-soft">Jenis kecelakaan<Wajib /></label>
            <Select value={jenisKecelakaanId} onChange={(e) => setJenisKecelakaanId(e.target.value)}>
              <option value="">— Pilih —</option>
              {jenisKecelakaanList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ink-soft">Tipe tabrakan<Wajib /></label>
            <Select value={tipeTabrakanId} onChange={(e) => setTipeTabrakanId(e.target.value)}>
              <option value="">— Pilih —</option>
              {tipeTabrakanList.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-line bg-white p-5">
        <h3 className="mb-3.5 font-display text-[14.5px] font-semibold">Status Kejadian &amp; Penanganan</h3>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Select value={statusPenanganan} onChange={(e) => setStatusPenanganan(e.target.value)}>
            <option value="MASIH_DALAM_PENANGANAN">Masih Dalam Penanganan</option>
            <option value="SELESAI_DITANGANI_DI_TKP">Selesai Ditangani di TKP</option>
          </Select>
          <Select value={statusTersangka} onChange={(e) => setStatusTersangka(e.target.value)}>
            <option value="BELUM_DIKETAHUI">Belum Diketahui</option>
            <option value="SUDAH_DIKETAHUI">Sudah Diketahui</option>
          </Select>
        </div>
        {statusTersangka === 'SUDAH_DIKETAHUI' && <Field value={namaTersangka} onChange={(e) => setNamaTersangka(e.target.value)} placeholder="Nama tersangka/terlapor" className="mb-3 w-full" />}
        <div className="flex flex-col gap-2 text-[12.5px]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={tabrakLari} onChange={(e) => setTabrakLari(e.target.checked)} /> Termasuk kasus tabrak lari</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={tkpDitangani} onChange={(e) => setTkpDitangani(e.target.checked)} /> TKP sudah ditangani</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={kendaraanDiamankan} onChange={(e) => setKendaraanDiamankan(e.target.checked)} /> Kendaraan sudah diamankan</label>
        </div>
      </div>

      <div className="rounded-[14px] border border-line bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[14.5px] font-semibold">Kendaraan yang Terlibat</h3>
          <button onClick={tambahKendaraan} className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-semibold">+ Tambah Kendaraan</button>
        </div>
        {kendaraan.length === 0 && <div className="text-[12px] italic text-ink-soft">Belum ada data.</div>}
        {kendaraan.map((k) => (
          <div key={k.idSementara} className="mb-2 grid grid-cols-[1fr_1.3fr_1fr_auto] gap-2 rounded-lg border border-line p-2">
            <Select value={k.kategori} onChange={(e) => setKendaraan((arr) => arr.map((x) => x.idSementara === k.idSementara ? { ...x, kategori: e.target.value } : x))}>
              <option value="">— Kategori * —</option>
              {KATEGORI_KENDARAAN.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <Field value={k.merk} onChange={(e) => setKendaraan((arr) => arr.map((x) => x.idSementara === k.idSementara ? { ...x, merk: e.target.value } : x))} placeholder="Merk / tipe" />
            {/* Nopol selalu disimpan huruf besar supaya pencarian arsip tidak
                meleset gara-gara beda huruf kecil/besar. */}
            <Field value={k.nopol} onChange={(e) => setKendaraan((arr) => arr.map((x) => x.idSementara === k.idSementara ? { ...x, nopol: e.target.value.toUpperCase() } : x))} placeholder="Nomor polisi" />
            <button onClick={() => setKendaraan((arr) => arr.filter((x) => x.idSementara !== k.idSementara))} className="rounded-lg bg-bad-bg px-2 text-bad">✕</button>
          </div>
        ))}
      </div>

      <div className="rounded-[14px] border border-line bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[14.5px] font-semibold">Identitas Pengendara / Korban</h3>
          <button onClick={tambahOrang} className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-semibold">+ Tambah Orang</button>
        </div>
        {orang.length === 0 && <div className="text-[12px] italic text-ink-soft">Belum ada data.</div>}
        {orang.map((o, i) => (
          <div key={o.idSementara} className="mb-2 rounded-lg border border-line p-3">
            <div className="mb-2 flex items-center justify-between font-display text-[12.5px] font-bold">
              <span>Orang #{i + 1}</span>
              <button onClick={() => setOrang((arr) => arr.filter((x) => x.idSementara !== o.idSementara))} className="rounded-lg bg-bad-bg px-2 py-0.5 text-bad">✕</button>
            </div>
            <label className="mb-2 flex items-center gap-2 text-[11.5px]">
              <input
                type="checkbox"
                checked={o.belumTeridentifikasi}
                onChange={(e) => ubahOrang(o.idSementara, { belumTeridentifikasi: e.target.checked, ...(e.target.checked ? { nama: '' } : {}) })}
              />
              Belum teridentifikasi <span className="text-ink-soft">(mis. korban tabrak lari)</span>
            </label>
            <div className="mb-2 grid grid-cols-3 gap-2">
              <Field
                value={o.belumTeridentifikasi ? '' : o.nama}
                disabled={o.belumTeridentifikasi}
                onChange={(e) => ubahOrang(o.idSementara, { nama: e.target.value })}
                placeholder={o.belumTeridentifikasi ? 'Belum teridentifikasi' : 'Nama lengkap *'}
              />
              <Select value={o.jenisKelamin} onChange={(e) => ubahOrang(o.idSementara, { jenisKelamin: e.target.value })}>
                <option value="">— Jenis kelamin —</option>
                {JENIS_KELAMIN_OPT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
              <Field value={o.pekerjaan} onChange={(e) => ubahOrang(o.idSementara, { pekerjaan: e.target.value })} placeholder="Pekerjaan" />
            </div>
            <div className="mb-2 grid grid-cols-3 gap-2">
              <Field value={o.tempatLahir} onChange={(e) => ubahOrang(o.idSementara, { tempatLahir: e.target.value })} placeholder="Tempat lahir" />
              <Field
                type="date" aria-label="Tanggal lahir"
                max={new Date().toISOString().slice(0, 10)}
                value={o.tanggalLahir}
                onChange={(e) => ubahOrang(o.idSementara, { tanggalLahir: e.target.value })}
              />
              <Field value={o.alamat} onChange={(e) => ubahOrang(o.idSementara, { alamat: e.target.value })} placeholder="Alamat" />
            </div>
            <div className="mb-2 grid grid-cols-3 gap-2">
              <Select value={o.peran} onChange={(e) => ubahOrang(o.idSementara, { peran: e.target.value })}>
                <option value="">— Peran —</option>
                {PERAN_ORANG_OPT.map((p) => <option key={p}>{p}</option>)}
              </Select>
              <Select value={o.kendaraanIdSementara} onChange={(e) => ubahOrang(o.idSementara, { kendaraanIdSementara: e.target.value })}>
                <option value="">— Tanpa kendaraan —</option>
                {kendaraan.map((k) => <option key={k.idSementara} value={k.idSementara}>{[k.kategori, k.merk, k.nopol].filter(Boolean).join(' ') || 'Kendaraan tanpa data'}</option>)}
              </Select>
              <Select value={o.kondisi} onChange={(e) => ubahOrang(o.idSementara, { kondisi: e.target.value })}>
                <option value="">— Kondisi * —</option>
                {KONDISI_OPT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            {o.kondisi && o.kondisi !== 'SELAMAT' && (
              <Field value={o.rsRujukan} onChange={(e) => ubahOrang(o.idSementara, { rsRujukan: e.target.value })} placeholder="RS rujukan" className="mb-2 w-full" />
            )}
            <div className="border-t border-dashed border-paper-dim pt-2">
              <div className="mb-1.5 text-[11px] font-semibold text-ink-soft">Kelengkapan berkendara</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {KELENGKAPAN_DEF.map(([kunci, label]) => (
                  <div key={kunci}>
                    <label className="mb-0.5 block text-[10.5px] text-ink-soft">{label}</label>
                    <Select
                      value={o.kelengkapan[kunci] || BELUM_DIPERIKSA}
                      onChange={(e) => ubahOrang(o.idSementara, { kelengkapan: { ...o.kelengkapan, [kunci]: e.target.value } })}
                    >
                      {STATUS_KELENGKAPAN_OPT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </div>
                ))}
              </div>
              {o.kelengkapan.sim === ADA && (
                <div className="mt-2 w-40">
                  <label className="mb-0.5 block text-[10.5px] text-ink-soft">Jenis SIM<Wajib /></label>
                  <Select value={o.kelengkapan.sim_jenis} onChange={(e) => ubahOrang(o.idSementara, { kelengkapan: { ...o.kelengkapan, sim_jenis: e.target.value } })}>
                    <option value="">— Pilih —</option>
                    {SIM_JENIS_OPT.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[14px] border border-line bg-white p-5">
        <h3 className="mb-3 font-display text-[14.5px] font-semibold">Akibat Kecelakaan &amp; Kerugian</h3>
        <div className="mb-3 flex gap-2.5">
          {[['MD', akibat.md], ['LB', akibat.lb], ['LR', akibat.lr]].map(([label, v]) => (
            <div key={label} className="flex-1 rounded-lg border border-line py-2.5 text-center">
              <div className="font-display text-[18px] font-bold">{v}</div>
              <div className="text-[10px] uppercase text-ink-soft">{label}</div>
            </div>
          ))}
        </div>
        <label className="mb-1 block text-[11px] font-semibold text-ink-soft">Kerugian materiil (Rp)</label>
        <Field type="number" min="0" step="1000" value={kerugian} onChange={(e) => setKerugian(e.target.value)} placeholder="Kosongkan bila belum dihitung" className="w-full" />
      </div>

      <div className="rounded-[14px] border border-line bg-white p-5 space-y-3">
        <h3 className="font-display text-[14.5px] font-semibold">Kronologi Kejadian</h3>
        <div><label className="mb-1 block text-[11px] font-semibold text-ink-soft">Pra Laka</label><textarea value={kronologisPra} onChange={(e) => setKronologisPra(e.target.value)} rows={2} className="w-full rounded-lg border border-line p-2 text-[12.5px]" /></div>
        <div><label className="mb-1 block text-[11px] font-semibold text-ink-soft">Saat Laka</label><textarea value={kronologisSaat} onChange={(e) => setKronologisSaat(e.target.value)} rows={2} className="w-full rounded-lg border border-line p-2 text-[12.5px]" /></div>
        <div><label className="mb-1 block text-[11px] font-semibold text-ink-soft">Pasca Laka</label><textarea value={kronologisPasca} onChange={(e) => setKronologisPasca(e.target.value)} rows={2} className="w-full rounded-lg border border-line p-2 text-[12.5px]" /></div>
      </div>

      <div className="rounded-[14px] border border-line bg-white p-5 space-y-3">
        <h3 className="font-display text-[14.5px] font-semibold">Faktor Penyebab</h3>
        <div>
          <div className="mb-1.5 text-[11px] font-semibold text-ink-soft">A. Faktor Manusia</div>
          <div className="flex flex-wrap gap-2">{FAKTOR_MANUSIA_OPT.map((o) => <Chip key={o} aktif={faktorManusia.includes(o)} onClick={() => toggleDalam(faktorManusia, setFaktorManusia, o)}>{o}</Chip>)}</div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-semibold text-ink-soft">B. Faktor Kendaraan</div>
          <div className="flex flex-wrap gap-2">{FAKTOR_KENDARAAN_OPT.map((o) => <Chip key={o} aktif={faktorKendaraan.includes(o)} onClick={() => toggleDalam(faktorKendaraan, setFaktorKendaraan, o)}>{o}</Chip>)}</div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-semibold text-ink-soft">C. Faktor Jalan &amp; Cuaca</div>
          <p className="mb-2 text-[11px] text-ink-soft">Boleh dikosongkan bila belum diketahui — yang kosong tidak akan dicetak di laporan.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-0.5 block text-[10.5px] text-ink-soft">Kondisi permukaan</label>
              <Select value={faktorJalan.kondisiPermukaan || ''} onChange={(e) => setFaktorJalan((f) => ({ ...f, kondisiPermukaan: e.target.value }))}>
                <option value="">— Belum diketahui —</option>
                {KONDISI_JALAN_OPT.map((o) => <option key={o}>{o}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-0.5 block text-[10.5px] text-ink-soft">Kontur jalan</label>
              <Select value={faktorJalan.kontur || ''} onChange={(e) => setFaktorJalan((f) => ({ ...f, kontur: e.target.value }))}>
                <option value="">— Belum diketahui —</option>
                {KONTUR_JALAN_OPT.map((o) => <option key={o}>{o}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-0.5 block text-[10.5px] text-ink-soft">Lebar jalan (meter)</label>
              <Field
                type="number" min="0" step="0.5" placeholder="mis. 7"
                value={faktorJalan.lebarJalan || ''}
                onChange={(e) => setFaktorJalan((f) => ({ ...f, lebarJalan: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[10.5px] text-ink-soft">Cuaca</label>
              <Select value={faktorCuaca.cuaca || ''} onChange={(e) => setFaktorCuaca((f) => ({ ...f, cuaca: e.target.value }))}>
                <option value="">— Belum diketahui —</option>
                {CUACA_OPT.map((o) => <option key={o}>{o}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-0.5 block text-[10.5px] text-ink-soft">Lingkungan</label>
              <Select value={faktorCuaca.lingkungan || ''} onChange={(e) => setFaktorCuaca((f) => ({ ...f, lingkungan: e.target.value }))}>
                <option value="">— Belum diketahui —</option>
                {LINGKUNGAN_OPT.map((o) => <option key={o}>{o}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-0.5 block text-[10.5px] text-ink-soft">Kepadatan arus</label>
              <Select value={faktorCuaca.kepadatan || ''} onChange={(e) => setFaktorCuaca((f) => ({ ...f, kepadatan: e.target.value }))}>
                <option value="">— Belum diketahui —</option>
                {KEPADATAN_OPT.map((o) => <option key={o}>{o}</option>)}
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-line bg-white p-5">
        <h3 className="mb-3 font-display text-[14.5px] font-semibold">Tindakan yang Dilakukan</h3>
        <div className="flex flex-wrap gap-2">{TINDAKAN_OPT.map((o) => <Chip key={o} aktif={tindakan.includes(o)} onClick={() => toggleDalam(tindakan, setTindakan, o)}>{o}</Chip>)}</div>
      </div>

      <div className="rounded-[14px] border border-line bg-white p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-[14.5px] font-semibold">Rencana Tindak Lanjut</h3>
          <button onClick={() => setRtl((r) => [...r, ''])} className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-semibold">+ Tambah</button>
        </div>
        {rtl.map((r, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <Field value={r} onChange={(e) => setRtl((arr) => arr.map((x, idx) => idx === i ? e.target.value : x))} placeholder="Rencana tindak lanjut…" className="flex-1" />
            <button onClick={() => setRtl((arr) => arr.filter((_, idx) => idx !== i))} className="rounded-lg bg-bad-bg px-2 text-bad">✕</button>
          </div>
        ))}
      </div>

      <div className="rounded-[14px] border border-line bg-white p-5">
        <h3 className="mb-3 font-display text-[14.5px] font-semibold">Lampiran Foto TKP</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="block cursor-pointer rounded-lg border-[1.5px] border-dashed border-line py-4 text-center text-[12.5px] text-ink-soft hover:border-brass">
            📷 Ambil foto langsung
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { setFoto((f) => [...f, ...Array.from(e.target.files)]); e.target.value = '' }} />
          </label>
          <label className="block cursor-pointer rounded-lg border-[1.5px] border-dashed border-line py-4 text-center text-[12.5px] text-ink-soft hover:border-brass">
            🖼️ Pilih dari galeri
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { setFoto((f) => [...f, ...Array.from(e.target.files)]); e.target.value = '' }} />
          </label>
        </div>
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
        {daftarSalah.length > 0 && (
          <div className="mt-4 rounded-lg border border-bad bg-bad-bg p-3">
            <div className="mb-1.5 text-[12px] font-bold text-bad">Perlu diperbaiki sebelum dikirim:</div>
            <ul className="list-disc space-y-0.5 pl-4 text-[12px] text-bad">
              {daftarSalah.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}
        <div className="mt-4 flex gap-2.5">
          <button onClick={submit} disabled={mengirim} className="rounded-[10px] bg-navy-950 px-6.5 py-3 font-display text-[13px] font-semibold text-white disabled:opacity-50">
            {mengirim ? 'Mengirim…' : 'Kirim Laporan Kejadian'}
          </button>
          <button onClick={resetForm} className="rounded-[10px] border border-line px-4.5 py-3 text-[13px] font-semibold text-ink-soft">Bersihkan Semua</button>
        </div>
      </div>
    </div>
  )
}
