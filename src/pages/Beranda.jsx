import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import { ambilSesiAktifSaya, bukaSesi, tutupSesi } from '../lib/sesiPiketApi'
import { unggahFoto, getGeoPosition } from '../lib/storage'
import { ambilLaporanKegiatanSaya } from '../lib/laporanKegiatanApi'
import { ambilLaporanKejadianSaya } from '../lib/laporanKejadianApi'
import { fmtTime } from '../lib/format'
import { Archive, Camera, Check, ChevronRight, ClipboardPlus, Clock3, MapPin, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react'

export default function Beranda() {
  const { profil } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [sesi, setSesi] = useState(undefined)
  const [swafoto, setSwafoto] = useState(null)
  const [lokasi, setLokasi] = useState(null)
  const [serahTerima, setSerahTerima] = useState(null)
  const [memproses, setMemproses] = useState(false)
  const [laporanTerbaru, setLaporanTerbaru] = useState([])

  async function muat() {
    const s = await ambilSesiAktifSaya(profil.id)
    setSesi(s)
  }
  useEffect(() => { muat() }, [profil.id])

  useEffect(() => {
    Promise.all([ambilLaporanKegiatanSaya(profil.id), ambilLaporanKejadianSaya(profil.id)]).then(([keg, kej]) => {
      const gab = [
        ...keg.map((k) => ({ ...k, tipe: 'Kegiatan', ringkasan: `${k.jenis_kegiatan?.nama} — ${k.lokasi}`, waktu: k.waktu_kirim })),
        ...kej.map((k) => ({ ...k, tipe: 'Kejadian', ringkasan: `${k.jenis_kecelakaan?.nama || 'Kejadian'} — ${k.lokasi}`, waktu: k.created_at })),
      ].sort((a, b) => new Date(b.waktu) - new Date(a.waktu)).slice(0, 5)
      setLaporanTerbaru(gab)
    })
  }, [profil.id])

  async function handleBuka() {
    if (!swafoto || !lokasi) return toast('Lengkapi swafoto dan foto lokasi terlebih dahulu', true)
    setMemproses(true)
    try {
      const [swaPath, lokPath, koordinat] = await Promise.all([
        unggahFoto('foto-sesi', swafoto),
        unggahFoto('foto-sesi', lokasi),
        getGeoPosition(),
      ])
      await bukaSesi({
        pengguna_id: profil.id, zona_id: profil.zona_id, regu_id: profil.regu_id,
        foto_swafoto_path: swaPath, foto_lokasi_path: lokPath, koordinat_buka: koordinat,
      })
      toast('Sesi piket dibuka')
      setSwafoto(null); setLokasi(null)
      muat()
    } catch (e) {
      toast(e.message || 'Gagal membuka sesi', true)
    } finally {
      setMemproses(false)
    }
  }

  async function handleTutup() {
    if (!serahTerima) return toast('Lengkapi foto serah terima terlebih dahulu', true)
    setMemproses(true)
    try {
      const path = await unggahFoto('foto-sesi', serahTerima)
      await tutupSesi(sesi.id, { foto_serah_terima_path: path })
      toast('Sesi piket ditutup, menunggu verifikasi')
      setSerahTerima(null)
      muat()
    } catch (e) {
      toast(e.message || 'Gagal menutup sesi', true)
    } finally {
      setMemproses(false)
    }
  }

  if (sesi === undefined) return null

  return (
    <div className="mx-auto w-full max-w-[1540px]">
      <header className="mb-5 border-b border-line pb-4">
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-warn">Beranda Anggota</div>
        <h1 className="mt-1 font-display text-[26px] font-bold leading-tight text-navy-950 sm:text-[30px]">
          Selamat bertugas, {profil.nama.split(' ').slice(-2).join(' ')}
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-soft">Kelola sesi piket dan buat laporan operasional dari halaman ini.</p>
      </header>

      {sesi ? (
        <section className="mb-5 overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_3px_rgba(11,20,36,.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-navy-900 px-5 py-4 text-white sm:px-6">
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-ok/15"><ShieldCheck className="h-6 w-6 text-ok" /></span><div><div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ok">Sesi piket aktif</div><h2 className="font-display text-[20px] font-bold">Sedang bertugas</h2></div></div>
            <div className="flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-[12px] text-white/75"><Clock3 className="h-4 w-4 text-brass" /> Dibuka {fmtTime(sesi.waktu_buka)} WIB</div>
          </div>
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_1fr]">
            <div><h3 className="font-display text-[15px] font-bold text-navy-950">Bukti pembukaan sesi</h3><p className="mt-1 text-[12px] text-ink-soft">Dokumen awal sesi telah tersimpan.</p><div className="mt-3 grid gap-2.5 sm:grid-cols-2"><StatusFoto icon={UserRound} label="Swafoto tersimpan" /><StatusFoto icon={MapPin} label="Lokasi tersimpan" /></div></div>
            <div><h3 className="font-display text-[15px] font-bold text-navy-950">Tutup sesi piket</h3><p className="mt-1 text-[12px] text-ink-soft">Unggah foto serah terima sebelum menutup sesi.</p><label className={`mt-3 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 text-[12px] font-semibold ${serahTerima ? 'border-ok bg-ok-bg text-ok' : 'border-line bg-paper text-ink-soft hover:border-brass'}`}>{serahTerima ? <><Check className="h-4 w-4" /> Foto serah terima tersimpan</> : <><Camera className="h-4 w-4" /> Pilih foto serah terima</>}<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files[0] && setSerahTerima(e.target.files[0])} /></label><button disabled={!serahTerima || memproses} onClick={handleTutup} className="mt-2.5 w-full rounded-lg bg-bad px-4 py-3 font-display text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{serahTerima ? 'Tutup sesi piket' : 'Lengkapi foto serah terima untuk tutup sesi'}</button></div>
          </div>
        </section>
      ) : (
        <section className="mb-5 overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_3px_rgba(11,20,36,.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-navy-900 px-5 py-4 text-white sm:px-6"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-brass/15"><Clock3 className="h-6 w-6 text-brass" /></span><div><div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-brass-soft">Sesi piket</div><h2 className="font-display text-[20px] font-bold">Buka sesi sebelum bertugas</h2></div></div><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/75">Belum dibuka</span></div>
          <div className="p-5 sm:p-6"><div className="mb-4"><h3 className="font-display text-[15px] font-bold text-navy-950">Lengkapi bukti pembukaan sesi</h3><p className="mt-1 text-[12.5px] text-ink-soft">Ambil swafoto petugas dan foto lokasi atau pos. Kedua foto wajib dilengkapi.</p></div><div className="grid gap-3 sm:grid-cols-2"><UploadFoto icon={UserRound} terisi={swafoto} judul="Swafoto petugas" keterangan="Gunakan kamera depan" capture="user" onChange={(e) => e.target.files[0] && setSwafoto(e.target.files[0])} /><UploadFoto icon={MapPin} terisi={lokasi} judul="Foto lokasi/pos" keterangan="Gunakan kamera belakang" capture="environment" onChange={(e) => e.target.files[0] && setLokasi(e.target.files[0])} /></div><button disabled={!swafoto || !lokasi || memproses} onClick={handleBuka} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brass px-5 py-3.5 font-display text-[14px] font-bold text-navy-950 shadow-sm disabled:cursor-not-allowed disabled:opacity-40">{swafoto && lokasi ? <><ShieldCheck className="h-5 w-5" /> Buka sesi piket</> : 'Lengkapi kedua foto untuk buka sesi'}</button></div>
        </section>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-line bg-white p-5">
          <h3 className="font-display text-[15px] font-bold text-navy-950">Aksi cepat</h3><p className="mt-1 text-[11.5px] text-ink-soft">Buat laporan selama bertugas.</p>
          <div className="mt-4 grid gap-2.5"><QuickAction icon={ClipboardPlus} label="Lapor Kegiatan" onClick={() => navigate('/lapor-kegiatan')} /><QuickAction icon={TriangleAlert} label="Catat Kecelakaan" onClick={() => navigate('/kejadian')} /></div>
        </div>
        <div className="rounded-xl border border-line bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="font-display text-[15px] font-bold text-navy-950">Laporan terbaru saya</h3><p className="mt-1 text-[11.5px] text-ink-soft">Lima laporan terakhir yang dikirim.</p></div><Archive className="h-5 w-5 text-brass" /></div>
          {laporanTerbaru.length === 0 && <div className="p-4 text-center text-[13px] text-ink-soft">Belum ada laporan yang dikirim.</div>}
          {laporanTerbaru.map((x) => (
            <div key={x.tipe + x.id} className="flex items-center justify-between gap-2.5 border-b border-dashed border-paper-dim py-2 text-[12.5px] last:border-none">
              <span>{x.ringkasan}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${x.status === 'TERVERIFIKASI' ? 'bg-ok-bg text-ok' : 'bg-warn-bg text-warn'}`}>
                {x.status === 'TERVERIFIKASI' ? 'Terverifikasi' : 'Menunggu Verifikasi'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function UploadFoto({ icon: Icon, terisi, judul, keterangan, capture, onChange }) {
  return <label className={`flex min-h-[116px] cursor-pointer items-center gap-4 rounded-lg border border-dashed p-4 transition-colors ${terisi ? 'border-ok bg-ok-bg' : 'border-line bg-paper hover:border-brass hover:bg-white'}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${terisi ? 'bg-ok text-white' : 'bg-white text-navy-800 shadow-sm'}`}>{terisi ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</span><span><span className="block text-[13px] font-bold text-navy-950">{terisi ? `${judul} tersimpan` : judul}</span><span className="mt-1 block text-[11.5px] text-ink-soft">{terisi ? 'Ketuk untuk mengambil ulang' : keterangan}</span></span><input type="file" accept="image/*" capture={capture} className="hidden" onChange={onChange} /></label>
}

function StatusFoto({ icon: Icon, label }) {
  return <div className="flex min-h-14 items-center gap-3 rounded-lg border border-ok/20 bg-ok-bg px-4 text-[12px] font-semibold text-ok"><Icon className="h-4 w-4" /><span>{label}</span><Check className="ml-auto h-4 w-4" /></div>
}

function QuickAction({ icon: Icon, label, onClick }) {
  return <button onClick={onClick} className="flex items-center gap-3 rounded-lg border border-line px-4 py-3 text-left text-[12.5px] font-semibold text-navy-950 hover:border-brass hover:bg-paper"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#E7EEF7] text-navy-700"><Icon className="h-4 w-4" /></span>{label}<ChevronRight className="ml-auto h-4 w-4 text-ink-soft" /></button>
}
