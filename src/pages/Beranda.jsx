import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useToast } from '../components/Toast'
import KameraCapture from '../components/KameraCapture'
import { ambilSesiAktifSaya, bukaSesi, tutupSesi } from '../lib/sesiPiketApi'
import { unggahFoto, getGeoPosition } from '../lib/storage'
import { ambilLaporanKegiatanSaya } from '../lib/laporanKegiatanApi'
import { ambilLaporanKejadianSaya } from '../lib/laporanKejadianApi'
import { fmtTime } from '../lib/format'

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
  const [kameraAktif, setKameraAktif] = useState(null) // null | 'swafoto' | 'lokasi' | 'serahTerima'

  function ambilFotoKamera(blob) {
    if (kameraAktif === 'swafoto') setSwafoto(blob)
    else if (kameraAktif === 'lokasi') setLokasi(blob)
    else if (kameraAktif === 'serahTerima') setSerahTerima(blob)
    setKameraAktif(null)
  }

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
    <div>
      <div className="mb-6">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-warn">Beranda</div>
        <h1 className="mt-1 font-display text-[22px] font-semibold">
          Selamat bertugas, {profil.nama.split(' ').slice(-2).join(' ')}
        </h1>
      </div>

      {sesi ? (
        <div className="rounded-2xl bg-navy-900 p-6 text-white">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-ok" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ok">Sesi piket</span>
          </div>
          <div className="mt-2 font-display text-[20px] font-bold">Sedang bertugas</div>
          <div className="mt-1 text-[12px] text-white/65">Dibuka {fmtTime(sesi.waktu_buka)} WIB</div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-[#232f47] py-4 text-[12px] text-[#B9C0D3]">✓ Swafoto tersimpan</div>
            <div className="flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-[#232f47] py-4 text-[12px] text-[#B9C0D3]">✓ Lokasi tersimpan</div>
          </div>

          <button
            onClick={() => setKameraAktif('serahTerima')}
            className={`mt-3 block w-full cursor-pointer rounded-lg border-[1.5px] border-dashed py-4 text-center text-[11.5px] ${serahTerima ? 'border-white/15 bg-[#232f47] text-[#B9C0D3]' : 'border-white/30 text-[#9AA4BE]'}`}
          >
            {serahTerima ? '✓ Foto serah terima tersimpan' : '📷 Foto serah terima (wajib sebelum tutup)'}
          </button>

          <button
            disabled={!serahTerima || memproses}
            onClick={handleTutup}
            className="mt-3.5 w-full rounded-[10px] bg-white py-3.5 font-display text-[13.5px] font-bold text-bad disabled:opacity-40"
          >
            {serahTerima ? 'Tutup sesi piket' : 'Lengkapi foto serah terima untuk tutup sesi'}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-navy-900 p-6 text-white">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-brass-soft">Sesi piket</div>
          <div className="mt-2 font-display text-[20px] font-bold">Belum dibuka</div>
          <div className="mt-1 text-[12px] text-white/65">Ambil swafoto dan foto lokasi untuk membuka sesi.</div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setKameraAktif('swafoto')}
              className={`cursor-pointer rounded-lg border-[1.5px] border-dashed py-6 text-center text-[11.5px] ${swafoto ? 'border-white/15 bg-[#232f47] text-[#B9C0D3]' : 'border-white/30 text-[#9AA4BE]'}`}
            >
              {swafoto ? '✓ Swafoto tersimpan' : (<><div className="mb-1.5 text-xl">📷</div>Swafoto petugas</>)}
            </button>
            <button
              onClick={() => setKameraAktif('lokasi')}
              className={`cursor-pointer rounded-lg border-[1.5px] border-dashed py-6 text-center text-[11.5px] ${lokasi ? 'border-white/15 bg-[#232f47] text-[#B9C0D3]' : 'border-white/30 text-[#9AA4BE]'}`}
            >
              {lokasi ? '✓ Lokasi tersimpan' : (<><div className="mb-1.5 text-xl">📷</div>Foto lokasi/pos</>)}
            </button>
          </div>

          <button
            disabled={!swafoto || !lokasi || memproses}
            onClick={handleBuka}
            className="mt-3.5 w-full rounded-[10px] bg-brass py-3.5 font-display text-[13.5px] font-bold text-navy-950 disabled:opacity-40"
          >
            {swafoto && lokasi ? 'Buka sesi piket' : 'Lengkapi kedua foto untuk buka sesi'}
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[14px] border border-line bg-white p-5">
          <h3 className="mb-3.5 font-display text-[14.5px] font-semibold">Aksi cepat</h3>
          <div className="flex gap-2.5">
            <button onClick={() => navigate('/lapor-kegiatan')} className="rounded-[10px] border border-line px-4.5 py-3 text-[13px] font-semibold text-ink-soft hover:border-ink-soft">+ Lapor Kegiatan</button>
            <button onClick={() => navigate('/kejadian')} className="rounded-[10px] border border-line px-4.5 py-3 text-[13px] font-semibold text-ink-soft hover:border-ink-soft">+ Catat Kecelakaan</button>
          </div>
        </div>
        <div className="rounded-[14px] border border-line bg-white p-5">
          <h3 className="mb-3.5 font-display text-[14.5px] font-semibold">Laporan terbaru saya</h3>
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

      {kameraAktif && (
        <KameraCapture
          facingMode={kameraAktif === 'swafoto' ? 'user' : 'environment'}
          onAmbil={ambilFotoKamera}
          onBatal={() => setKameraAktif(null)}
        />
      )}
    </div>
  )
}
