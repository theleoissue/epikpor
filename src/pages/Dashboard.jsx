import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ambilZona, ambilTitikRawan, ambilRekapHistoris } from '../lib/referensiApi'
import { ambilJadwalHariIni } from '../lib/rosterApi'
import { rekapBulanan } from '../lib/laporanKejadianApi'
import { SASARAN_WAKTU_TANGGAP, bulanJakarta, akhirPekanJakarta } from '../lib/format'
import { BadgeCheck, CalendarDays, ClipboardList, Clock3, MapPin, TriangleAlert, Users } from 'lucide-react'

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function Dashboard() {
  const [zonaCards, setZonaCards] = useState([])
  const [stats, setStats] = useState(null)
  const [rekap, setRekap] = useState([])
  const [titikRawan, setTitikRawan] = useState([])
  const [pekan, setPekan] = useState(null)

  useEffect(() => {
    async function muat() {
      const zonaList = await ambilZona()
      const kartu = await Promise.all(zonaList.map(async (z) => {
        const [{ count: aktif }, { count: menungguKeg }, { count: menungguKej }, { data: kasubnit }, jadwal] = await Promise.all([
          supabase.from('sesi_piket').select('id', { count: 'exact', head: true }).eq('zona_id', z.id).eq('status', 'AKTIF'),
          supabase.from('laporan_kegiatan').select('id', { count: 'exact', head: true }).eq('zona_id', z.id),
          supabase.from('laporan_kejadian').select('id', { count: 'exact', head: true }).eq('zona_id', z.id),
          // Kasubnit suatu zona = pengguna aktif berperan KASUBNIT dengan zona_id ini —
          // bukan kolom terpisah, supaya tidak ada dua sumber kebenaran yang bisa tidak sinkron.
          supabase.from('pengguna').select('nama, pangkat').eq('zona_id', z.id).eq('peran_sistem', 'KASUBNIT').eq('status_aktif', true).limit(1),
          ambilJadwalHariIni(z.id),
        ])
        const dijadwalkan = new Set(jadwal.flatMap((j) => (j.personel || []).map((p) => p.pengguna?.id)))
        return { ...z, aktif, menungguKeg, menungguKej, kasubnit: kasubnit?.[0] || null, dijadwalkanCount: dijadwalkan.size }
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
          lewatTerima: rentangLewat('waktu_diterima', 'waktu_penanganan', SASARAN_WAKTU_TANGGAP.penanganan),
          lewatTiba: rentangLewat('waktu_diterima', 'waktu_selesai', SASARAN_WAKTU_TANGGAP.selesai),
          historis: false,
        }
      })
      setRekap(perBulan)
      setTitikRawan(rawan)

      // Pemisahan hari kerja vs akhir pekan — tolok ukur utama aksi perubahan
      // Siaga Wiken (RAP Tabel 1.6: 62,5% laka terjadi di akhir pekan). Dihitung
      // dari waktu kejadian, bukan waktu laporan dikirim, supaya kejadian Minggu
      // malam yang baru dilaporkan Senin tetap terhitung sebagai akhir pekan.
      const akhirPekan = dataKejadian.filter((r) => akhirPekanJakarta(r.waktu_diterima || r.created_at)).length
      setPekan({ akhirPekan, hariKerja: dataKejadian.length - akhirPekan, total: dataKejadian.length })
    }
    muat()
  }, [])

  const maxJumlah = Math.max(1, ...rekap.map((r) => r.jumlah))
  const totalDijadwalkan = zonaCards.reduce((total, z) => total + z.dijadwalkanCount, 0)
  const totalSesiAktif = zonaCards.reduce((total, z) => total + (z.aktif || 0), 0)
  const sekarang = new Date()
  const tanggalTampil = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(sekarang)
  const waktuTampil = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(sekarang).replace('.', ':')

  return (
    <div className="mx-auto w-full max-w-[1540px]">
      <header className="mb-3 flex min-h-[90px] items-center justify-between gap-4">
        <div>
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-warn">Papan Pemantauan</div>
        <h1 className="mt-1 font-display text-[27px] font-bold leading-[1.08] text-navy-950 sm:text-[32px]">Keadaan Operasional Saat Ini</h1>
        <p className="mt-1.5 text-[12.5px] text-ink-soft sm:text-[13px]">Statistik dihitung langsung dari data yang tersimpan — bukan angka tetap.</p>
        </div>
        <div className="hidden items-center gap-3 text-navy-950 lg:flex"><CalendarDays className="h-7 w-7" /><div><div className="text-[12px]">{tanggalTampil}</div><div className="font-display text-[22px] font-bold leading-none">{waktuTampil} WIB</div></div><div className="ml-5 border-l border-line pl-5 text-right"><div className="text-[10.5px] text-ink-soft">Unit Gakkum Satlantas</div><div className="font-display text-[12px] font-bold">Polrestabes Bandung</div></div></div>
      </header>

      <section className="mb-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indikator operasional">
        <Kpi icon={Users} label="Personel dijadwalkan" val={totalDijadwalkan} sub="hari ini" tone="blue" />
        <Kpi icon={BadgeCheck} label="Sesi piket aktif" val={totalSesiAktif} sub={`dari ${zonaCards.length} zona`} tone="green" />
        <Kpi icon={ClipboardList} label="Total laporan" val={(stats?.totalKeg || 0) + (stats?.totalKej || 0)} sub="kegiatan dan kejadian" tone="violet" />
        <Kpi icon={Clock3} label="Menunggu verifikasi" val={stats?.menunggu || 0} sub="perlu tindak lanjut" tone="amber" />
      </section>

      <section className="mb-3.5" aria-label="Pemantauan zona">
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {zonaCards.map((z) => {
            const kurang = z.dijadwalkanCount > 0 && z.aktif < z.dijadwalkanCount
            return (
              <article key={z.id} className="h-[245px] overflow-hidden rounded-[10px] border border-line bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_4px_12px_rgba(15,23,42,.025)]">
                <div className="flex h-[78px] items-center justify-between gap-3 bg-[#102744] px-4 text-white">
                  <div className="flex min-w-0 gap-2.5"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
                  <div className="min-w-0"><h3 className="font-display text-[15px] font-bold">Zona {z.nama}</h3>
                    <p className="mt-1 truncate text-[10.5px] text-white/70">{z.kasubnit ? `Kasubnit: ${z.kasubnit.pangkat ? `${z.kasubnit.pangkat} ` : ''}${z.kasubnit.nama}` : 'Kasubnit belum ditetapkan'}</p></div>
                  </div>
                  <span className={`flex h-[27px] shrink-0 items-center rounded-full px-2.5 text-[10px] font-bold leading-tight ${kurang ? 'bg-[#F5D681] text-[#684300]' : z.aktif > 0 ? 'bg-ok-bg text-ok' : 'bg-bad-bg text-bad'}`}>
                    {kurang ? `Kurang ${z.dijadwalkanCount - z.aktif} personel` : z.aktif > 0 ? 'Piket aktif' : 'Tidak ada sesi aktif'}
                  </span>
                </div>
                <dl className="px-4 py-1">
                  <Row icon={CalendarDays} label="Dijadwalkan hari ini" v={z.dijadwalkanCount} />
                  <Row icon={Users} label="Sesi piket aktif" v={z.aktif} />
                  <Row icon={ClipboardList} label="Laporan kegiatan" v={z.menungguKeg} />
                  <Row icon={TriangleAlert} label="Kejadian tercatat" v={z.menungguKej} />
                </dl>
              </article>
            )
          })}
        </div>
      </section>

      {stats && <section className="mb-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Status laporan">
        <StatBox icon={ClipboardList} tone="blue" label="Laporan kegiatan" val={stats.totalKeg} sub="total tersimpan" />
        <StatBox icon={TriangleAlert} tone="red" label="Kejadian kecelakaan" val={stats.totalKej} sub={`MD ${stats.md} · LB ${stats.lb} · LR ${stats.lr}`} />
        <StatBox icon={BadgeCheck} tone="green" label="Sudah terverifikasi" val={`${stats.pct}%`} sub="dari seluruh laporan" />
        <StatBox icon={Clock3} tone="amber" label="Menunggu verifikasi" val={stats.menunggu} sub="perlu tindak lanjut" />
      </section>}

      <section className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.95fr)]" aria-label="Analitik dashboard">
        <div className="min-h-[195px] rounded-[10px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.05),0_4px_12px_rgba(15,23,42,.025)]">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-[15px] font-bold text-navy-950">Rekap Laporan Bulanan</h2><span className="rounded-md border border-line px-2.5 py-1 text-[10.5px] font-semibold">Tahun {new Date().getFullYear()}</span></div>
          <div className="relative flex h-[142px] items-end gap-2 border-b border-line px-1 pt-2 sm:gap-3">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[28px] top-2 flex flex-col justify-between"><span className="border-t border-dashed border-line/70" /><span className="border-t border-dashed border-line/70" /><span className="border-t border-dashed border-line/70" /><span className="border-t border-dashed border-line/70" /></div>
            {rekap.map((r) => <div key={r.bulan} className="relative z-10 flex h-full min-w-0 flex-1 flex-col justify-end text-center"><div className="mb-1 text-[9px] font-bold text-ink-soft">{r.jumlah}</div><div className={`mx-auto w-[70%] max-w-8 rounded-t-sm ${r.historis ? 'bg-brass' : 'bg-navy-700'}`} style={{ height: `${Math.max(2, (r.jumlah / maxJumlah) * 105)}px` }} /><div className="mt-1.5 text-[9.5px] text-ink-soft">{r.bulan}</div></div>)}
          </div>
          <p className="mt-2 text-[9.5px] text-ink-soft"><span className="text-brass">●</span> Data laporan bulanan fisik; bulan lain berasal dari laporan aplikasi.</p>
        </div>
        <div className="grid gap-3">
          <div className="rounded-[10px] border border-line bg-white p-4 shadow-[0_1px_3px_rgba(11,20,36,0.05)]">
            <h2 className="mb-2.5 font-display text-[15px] font-bold text-navy-950">Status Zona</h2>
            {zonaCards.map((z) => { const kurang = z.dijadwalkanCount > 0 && z.aktif < z.dijadwalkanCount; return <div key={z.id} className="flex items-center justify-between gap-3 border-t border-paper-dim py-2 text-[11.5px]"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${kurang ? 'bg-bad' : 'bg-ok'}`} />Zona {z.nama}</span><span className={`rounded-full px-2 py-0.5 text-[9.5px] ${kurang ? 'bg-warn-bg text-warn' : 'bg-ok-bg text-ok'}`}>{kurang ? `Kurang ${z.dijadwalkanCount - z.aktif} personel` : z.aktif > 0 ? 'Piket aktif' : 'Tidak aktif'}</span></div> })}
          </div>
          <div className="hidden">{pekan && <PanelSiagaWiken pekan={pekan} />}</div>
          <div className="hidden rounded-[10px] border border-line bg-white p-4">
            <h2 className="mb-2 font-display text-[14px] font-bold">Titik rawan teratas</h2>
            {titikRawan.length === 0 && <p className="text-[11px] italic text-ink-soft">Belum ada data titik rawan.</p>}
            {titikRawan.map((t) => <a key={t.id} href={`https://www.google.com/maps?q=${t.latitude},${t.longitude}`} target="_blank" rel="noreferrer" className="flex gap-2 border-t border-paper-dim py-1.5 text-[10.5px]"><MapPin className="h-3.5 w-3.5 shrink-0 text-bad" /><span><b>{t.nama_jalan}</b> · {t.jumlah_laka} kejadian · MD {t.md} · LB {t.lb} · LR {t.lr}</span></a>)}
            </div>
        </div>
      </section>
    </div>
  )
}

// Angka pembanding dari RAP (Tabel 1.6, Januari–Maret 2026, sebelum Siaga
// Wiken berjalan). Ditampilkan berdampingan supaya capaian aksi perubahan
// terbaca langsung, bukan perlu dihitung ulang saat evaluasi.
const DASAR_RAP = { akhirPekan: 25, hariKerja: 15, total: 40, persen: 62.5 }

function PanelSiagaWiken({ pekan }) {
  const persen = (n) => (pekan.total ? Math.round((n / pekan.total) * 1000) / 10 : 0)
  const persenAkhirPekan = persen(pekan.akhirPekan)
  const selisih = pekan.total ? Math.round((persenAkhirPekan - DASAR_RAP.persen) * 10) / 10 : null

  const baris = [
    ['Hari kerja', 'Senin–Jumat', pekan.hariKerja, persen(pekan.hariKerja), 'bg-navy-800'],
    ['Akhir pekan', 'Sabtu–Minggu', pekan.akhirPekan, persenAkhirPekan, 'bg-brass'],
  ]

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(11,20,36,0.04)] sm:p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[14.5px] font-semibold text-navy-950">Hari kerja vs akhir pekan</h3>
        <span className="rounded bg-warn-bg px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-wide text-warn">Siaga Wiken</span>
      </div>
      <p className="mb-4 border-b border-paper-dim pb-3 text-[11px] leading-relaxed text-ink-soft">
        Dihitung dari waktu kejadian, bukan waktu laporan dikirim. Hanya mencakup kejadian yang masuk lewat aplikasi ini.
      </p>

      {pekan.total === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-5 text-center text-[12px] leading-relaxed text-ink-soft">
          Belum ada kejadian tercatat tahun ini. Angka akan muncul begitu laporan pertama masuk.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {baris.map(([judul, hari, jumlah, pct, warna]) => (
              <div key={judul}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12px]">
                  <span><b>{judul}</b> <span className="text-ink-soft">{hari}</span></span>
                  <span className="shrink-0 font-mono font-semibold tabular-nums">{jumlah} · {pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-sm bg-paper-dim">
                  <div className={`h-full rounded-sm ${warna}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-paper-dim pt-3 text-[10.5px] leading-relaxed">
            <span className="text-ink-soft">
              Sebelum Siaga Wiken (RAP, Jan–Mar 2026): akhir pekan <b className="text-ink">{DASAR_RAP.persen}%</b> dari {DASAR_RAP.total} kejadian
            </span>
            {selisih !== null && (
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${selisih > 0 ? 'bg-bad-bg text-bad' : selisih < 0 ? 'bg-ok-bg text-ok' : 'bg-paper-dim text-ink-soft'}`}>
                {selisih > 0 ? `▲ ${selisih}` : selisih < 0 ? `▼ ${Math.abs(selisih)}` : 'setara'} poin
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Row({ icon: Icon, label, v }) {
  return <div className="flex h-10 items-center justify-between gap-4 border-b border-dashed border-paper-dim text-[12.5px] last:border-none"><dt className="flex items-center gap-2.5 text-ink"><Icon className="h-4 w-4 text-navy-800" />{label}</dt><dd className="font-mono text-[13px] font-bold tabular-nums text-navy-950">{v}</dd></div>
}

const KPI_TONE = {
  blue: 'bg-[#E2EFFB] text-[#075DB9]', green: 'bg-[#DDF3E9] text-ok',
  violet: 'bg-[#ECE6FA] text-[#4934A8]', amber: 'bg-[#F9EBC7] text-warn',
}

function Kpi({ icon: Icon, label, val, sub, tone }) {
  return <article className="flex h-[104px] items-center gap-3.5 rounded-[10px] border border-line bg-white px-[17px] py-[15px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_4px_12px_rgba(15,23,42,.025)]">
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${KPI_TONE[tone]}`}><Icon className="h-6 w-6" /></span>
    <div className="min-w-0"><div className="truncate text-[11px] font-bold uppercase tracking-[0.04em] text-ink-soft">{label}</div><div className="mt-0.5 font-display text-[31px] font-bold leading-none text-navy-950 tabular-nums">{val}</div><div className="mt-1 text-[11.5px] text-ink-soft">{sub}</div></div>
  </article>
}

const STAT_TONE = {
  blue: { border: 'border-[#BDD9F3] bg-[#F5FAFF]', icon: 'bg-[#E7EEF7] text-navy-700' },
  red: { border: 'border-[#F1C8C8] bg-[#FFF8F8]', icon: 'bg-bad-bg text-bad' },
  green: { border: 'border-[#BFE2D5] bg-[#F5FCF9]', icon: 'bg-ok-bg text-ok' },
  amber: { border: 'border-[#EBD49C] bg-[#FFFCF5]', icon: 'bg-warn-bg text-warn' },
}

function StatBox({ icon: Icon, tone, label, val, sub }) {
  const warna = STAT_TONE[tone]
  return (
    <article className={`h-[116px] rounded-[10px] border p-4 shadow-[0_1px_2px_rgba(15,23,42,.05),0_4px_12px_rgba(15,23,42,.025)] ${warna.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-soft">{label}</div>
          <div className="mt-1.5 font-display text-[30px] font-bold leading-none text-navy-950 tabular-nums">{val}</div>
          <div className="mt-1.5 text-[11.5px] text-ink-soft">{sub}</div>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${warna.icon}`}>
          <Icon aria-hidden="true" className="h-[21px] w-[21px]" strokeWidth={1.8} />
        </span>
      </div>
    </article>
  )
}
