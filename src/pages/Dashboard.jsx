import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ambilZona, ambilTitikRawan, ambilRekapHistoris } from '../lib/referensiApi'
import { ambilJadwalHariIni } from '../lib/rosterApi'
import { rekapBulanan } from '../lib/laporanKejadianApi'
import { SASARAN_WAKTU_TANGGAP, bulanJakarta } from '../lib/format'

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function Dashboard() {
  const [zonaCards, setZonaCards] = useState([])
  const [stats, setStats] = useState(null)
  const [rekap, setRekap] = useState([])
  const [titikRawan, setTitikRawan] = useState([])

  useEffect(() => {
    async function muat() {
      const zonaList = await ambilZona()
      const kartu = await Promise.all(zonaList.map(async (z) => {
        const [{ count: aktif }, { count: menungguKeg }, { count: menungguKej }, { count: adaKasubnit }, jadwal] = await Promise.all([
          supabase.from('sesi_piket').select('id', { count: 'exact', head: true }).eq('zona_id', z.id).eq('status', 'AKTIF'),
          supabase.from('laporan_kegiatan').select('id', { count: 'exact', head: true }).eq('zona_id', z.id),
          supabase.from('laporan_kejadian').select('id', { count: 'exact', head: true }).eq('zona_id', z.id),
          // Kasubnit suatu zona = pengguna aktif berperan KASUBNIT dengan zona_id ini —
          // bukan kolom terpisah, supaya tidak ada dua sumber kebenaran yang bisa tidak sinkron.
          supabase.from('pengguna').select('id', { count: 'exact', head: true }).eq('zona_id', z.id).eq('peran_sistem', 'KASUBNIT').eq('status_aktif', true),
          ambilJadwalHariIni(z.id),
        ])
        const dijadwalkan = new Set(jadwal.flatMap((j) => (j.personel || []).map((p) => p.pengguna?.id)))
        return { ...z, aktif, menungguKeg, menungguKej, adaKasubnit, dijadwalkanCount: dijadwalkan.size }
      }))
      setZonaCards(kartu)

      const [{ count: totalKeg }, { count: totalKej }, { count: verifKeg }, { count: verifKej }] = await Promise.all([
        supabase.from('laporan_kegiatan').select('id', { count: 'exact', head: true }),
        supabase.from('laporan_kejadian').select('id', { count: 'exact', head: true }),
        supabase.from('laporan_kegiatan').select('id', { count: 'exact', head: true }).eq('status', 'TERVERIFIKASI'),
        supabase.from('laporan_kejadian').select('id', { count: 'exact', head: true }).eq('status', 'TERVERIFIKASI'),
      ])
      const { data: korban } = await supabase.from('kejadian_orang').select('kondisi')
      const total = (totalKeg || 0) + (totalKej || 0)
      const verified = (verifKeg || 0) + (verifKej || 0)
      setStats({
        totalKeg, totalKej,
        md: (korban || []).filter((k) => k.kondisi === 'MENINGGAL_DUNIA').length,
        lb: (korban || []).filter((k) => k.kondisi === 'LUKA_BERAT').length,
        lr: (korban || []).filter((k) => k.kondisi === 'LUKA_RINGAN').length,
        pct: total ? Math.round((verified / total) * 100) : 0,
        menunggu: total - verified,
      })

      const tahunIni = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date()))
      const [dataKejadian, historis, rawan] = await Promise.all([
        rekapBulanan(tahunIni),
        ambilRekapHistoris(tahunIni),
        ambilTitikRawan(),
      ])
      const historisPerBulan = Object.fromEntries(historis.map((h) => [h.bulan - 1, h]))
      const perBulan = Array.from({ length: 12 }, (_, i) => {
        // Bulan yang sudah punya angka historis (Laporan Bulanan fisik dari
        // sebelum E-Pikpor berjalan) dipakai apa adanya; bulan lain dihitung
        // langsung dari laporan_kejadian yang benar-benar masuk lewat aplikasi.
        if (historisPerBulan[i]) {
          const h = historisPerBulan[i]
          return { bulan: NAMA_BULAN[i], jumlah: h.jumlah_kejadian, lewatTerima: 0, lewatTiba: 0, historis: true }
        }
        const rows = dataKejadian.filter((r) => bulanJakarta(r.created_at) === i)
        const rentangLewat = (a, b, batas) => rows.filter((r) => r[a] && r[b] && (new Date(r[b]) - new Date(r[a])) / 1000 > batas).length
        return {
          bulan: NAMA_BULAN[i], jumlah: rows.length,
          lewatTerima: rentangLewat('w1', 'w2', SASARAN_WAKTU_TANGGAP.terima),
          lewatTiba: rentangLewat('w2', 'w3', SASARAN_WAKTU_TANGGAP.tiba),
          historis: false,
        }
      })
      setRekap(perBulan)
      setTitikRawan(rawan)
    }
    muat()
  }, [])

  const maxJumlah = Math.max(1, ...rekap.map((r) => r.jumlah))

  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-warn">Papan Pemantauan</div>
        <h1 className="mt-1 font-display text-[22px] font-semibold">Keadaan Operasional Saat Ini</h1>
        <p className="mt-1 max-w-xl text-[13.5px] text-ink-soft">Statistik dihitung langsung dari data yang tersimpan — bukan angka tetap.</p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {zonaCards.map((z) => {
          const kurang = z.dijadwalkanCount > 0 && z.aktif < z.dijadwalkanCount
          return (
            <div key={z.id} className="rounded-2xl border border-line bg-white p-4.5">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="font-display text-[15px] font-bold">Zona {z.nama}</div>
                  <div className="text-[11px] text-ink-soft">{z.adaKasubnit ? 'Kasubnit ditetapkan' : 'Kasubnit belum ditetapkan'}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${kurang ? 'bg-warn-bg text-warn' : z.aktif > 0 ? 'bg-ok-bg text-ok' : 'bg-bad-bg text-bad'}`}>
                  {kurang ? `Kurang ${z.dijadwalkanCount - z.aktif} personel` : z.aktif > 0 ? 'Piket aktif' : 'Tidak ada sesi aktif'}
                </span>
              </div>
              <Row label="Dijadwalkan hari ini" v={z.dijadwalkanCount} />
              <Row label="Sesi piket aktif" v={z.aktif} />
              <Row label="Laporan kegiatan" v={z.menungguKeg} />
              <Row label="Kejadian tercatat" v={z.menungguKej} />
            </div>
          )
        })}
      </div>

      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
          <StatBox label="Laporan kegiatan" val={stats.totalKeg} sub="total tersimpan" />
          <StatBox label="Kejadian kecelakaan" val={stats.totalKej} sub={`MD ${stats.md} · LB ${stats.lb} · LR ${stats.lr}`} />
          <StatBox label="Sudah terverifikasi" val={`${stats.pct}%`} sub="dari seluruh laporan" />
          <StatBox label="Menunggu verifikasi" val={stats.menunggu} sub="perlu tindak lanjut" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-1 font-display text-[14.5px] font-semibold">Rekapitulasi bulanan {new Date().getFullYear()}</h3>
          <p className="mb-4 text-[11px] text-ink-soft">Bulan bertanda <span className="text-brass">●</span> pakai angka Laporan Bulanan fisik dari sebelum E-Pikpor berjalan; bulan lain dihitung langsung dari laporan yang masuk lewat aplikasi.</p>
          {rekap.map((r) => (
            <div key={r.bulan} className="mb-2.5 flex items-center gap-2.5 text-[12px]">
              <div className="flex w-11 items-center gap-1 text-ink-soft">
                {r.bulan}{r.historis && <span className="text-brass">●</span>}
              </div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-dim">
                <div className={`h-full rounded-full ${r.historis ? 'bg-brass' : 'bg-navy-800'}`} style={{ width: `${(r.jumlah / maxJumlah) * 100}%` }} />
              </div>
              <div className="w-6 text-right font-mono font-semibold">{r.jumlah}</div>
              {(r.lewatTerima > 0 || r.lewatTiba > 0) && <div className="w-28 text-[10.5px] text-warn">{r.lewatTerima + r.lewatTiba} lampaui sasaran</div>}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-1 font-display text-[14.5px] font-semibold">Titik rawan teratas</h3>
          <p className="mb-3 text-[11px] text-ink-soft">Berkas blackspot Satlantas Polrestabes Bandung</p>
          {titikRawan.length === 0 && <div className="text-[12px] italic text-ink-soft">Belum ada data titik rawan.</div>}
          {titikRawan.map((t) => (
            <a
              key={t.id}
              href={`https://www.google.com/maps?q=${t.latitude},${t.longitude}`}
              target="_blank" rel="noreferrer"
              className="mb-2.5 flex gap-2.5 border-b border-dashed border-paper-dim pb-2.5 text-[12px] last:mb-0 last:border-none last:pb-0 hover:text-navy-900"
            >
              <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-bad" />
              <div>
                <div className="font-semibold">{t.nama_jalan}</div>
                <div className="text-[10.5px] text-ink-soft">{t.jumlah_laka} kejadian · MD {t.md} · LB {t.lb} · LR {t.lr}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function Row({ label, v }) {
  return <div className="flex justify-between border-b border-dashed border-paper-dim py-1.5 text-[12.5px] last:border-none"><span>{label}</span><span className="font-mono font-semibold">{v}</span></div>
}
function StatBox({ label, val, sub }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-1.5 font-display text-[24px] font-bold">{val}</div>
      <div className="mt-0.5 text-[11px] text-ink-soft">{sub}</div>
    </div>
  )
}
