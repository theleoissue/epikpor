// Generator teks laporan format WhatsApp ke Dirlantas — permintaan langsung
// client, diadaptasi dari mockup ke bentuk data Supabase (kolom snake_case,
// enum kondisi/status).
//
// Catatan tata letak: WhatsApp mempertahankan baris kosong dan spasi di awal
// baris, serta mengenal *tebal* dan _miring_. Tiap seksi dipisah satu baris
// kosong supaya tidak menyatu jadi satu blok teks yang sulit dibaca di HP.

// U+2733 + U+FE0F — varian emoji dari tanda bintang, tampil hijau di WhatsApp.
// Tanpa U+FE0F, karakter ini tampil sebagai teks hitam biasa.
const BINTANG = '✳️'

const SINGKAT = { LUKA_RINGAN: 'LR', LUKA_BERAT: 'LB', MENINGGAL_DUNIA: 'MD', DALAM_PERAWATAN: 'Dalam Perawatan' }
const isi = (v) => (v === undefined || v === null || v === '' ? '-' : v)
const huruf = (i) => String.fromCharCode(97 + i)

function sapaan(iso) {
  const h = iso ? new Date(iso).getHours() : 0
  if (h < 10) return 'Pagi'
  if (h < 15) return 'Siang'
  if (h < 18) return 'Sore'
  return 'Malam'
}

// Konvensi Indonesia memakai titik sebagai pemisah jam-menit, bukan titik dua.
function jam(iso) {
  return iso ? new Date(iso).toTimeString().slice(0, 5).replace(':', '.') : '-'
}

function hariTanggal(iso) {
  if (!iso) return '-'
  const s = new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const [hari, ...sisa] = s.split(', ')
  return sisa.length ? `Hari ${hari} tanggal ${sisa.join(', ')}` : `Tanggal ${s}`
}

function tanggalPanjang(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function tanggalSingkat(t) {
  if (!t) return '-'
  const d = new Date(t)
  return isNaN(d.getTime()) ? t : d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const seksi = (judul, isiTeks) => `${BINTANG} *${judul}*\n${isiTeks}`

/**
 * @param x laporan kejadian lengkap (beserta relasi orang/kendaraan)
 * @param kasat data pejabat penanda tangan {pangkat, nama, gelar}; kalau tidak
 *        diberikan, blok tanda tangan memakai tanda hubung agar tidak pernah
 *        mencetak nama pejabat yang sudah tidak menjabat.
 */
export function buildLaporanKejadianWA(x, kasat = null) {
  const kv = x.kendaraan || []
  const ov = x.orang || []
  // Waktu laporan diambil dari stempel kejadian, BUKAN jam saat tombol
  // ditekan — kalau laporan disalin ulang keesokan harinya, tanggalnya harus
  // tetap tanggal kejadian.
  const waktu = x.waktu_diterima || x.created_at

  const labelKendaraan = (id) => {
    const k = kv.find((v) => v.id === id)
    return k ? `${isi(k.kategori)} ${isi(k.merk)} No. Pol. ${isi(k.nopol)}` : '-'
  }

  const kendaraanTeks = kv.length
    ? kv.map((k, i) => `${huruf(i)}. ${isi(k.kategori)} ${isi(k.merk)} — No. Pol. ${isi(k.nopol)}`).join('\n')
    : '-'

  const identitasTeks = ov.length
    ? ov.map((p, i) => {
        const jk = p.jenis_kelamin === 'P' ? 'Perempuan' : p.jenis_kelamin === 'L' ? 'Laki-laki' : '-'
        return [
          `${huruf(i)}. *${isi(p.nama)}*`,
          `    ${jk}, ${isi(p.pekerjaan)}`,
          `    Lahir: ${isi(p.tempat_lahir)}, ${tanggalSingkat(p.tanggal_lahir)}`,
          `    Alamat: ${isi(p.alamat)}`,
          `    Kendaraan: ${p.kendaraan_id ? labelKendaraan(p.kendaraan_id) : '-'}`,
        ].join('\n')
      }).join('\n\n')
    : '-'

  const korbanList = ov.filter((p) => p.kondisi && p.kondisi !== 'SELAMAT')
  const korbanTeks = korbanList.length
    ? korbanList.map((p, i) =>
        `${i + 1}. Sdr/Sdri. *${isi(p.nama)}* (${SINGKAT[p.kondisi] || p.kondisi})` +
        (p.rs_rujukan ? ` — dibawa ke ${p.rs_rujukan}` : '')).join('\n')
    : 'Nihil'

  const kelengkapanTeks = ov.length
    ? ov.map((p, i) => {
        const k = p.kelengkapan || {}
        return [
          `${huruf(i)}. Sdr/Sdri. ${isi(p.nama)}`,
          `    - ${k.stnk ? 'Membawa STNK' : 'Tidak membawa STNK'}`,
          `    - ${k.sim ? `Membawa SIM${k.sim_jenis ? ' ' + k.sim_jenis : ''}` : 'Tidak membawa SIM'}`,
          `    - ${k.ktp ? 'Membawa KTP' : 'Tidak membawa KTP'}`,
          `    - ${k.helm_sabuk ? 'Menggunakan helm/sabuk pengaman' : 'Tidak menggunakan helm/sabuk pengaman'}`,
        ].join('\n')
      }).join('\n\n')
    : '-'

  const gabung = (o) => [...(o?.checked || []), ...(o?.lainnya ? [o.lainnya] : [])]
  const berbutir = (arr) => (arr.length ? arr.map((t) => `- ${t}`).join('\n') : '- (tidak diketahui)')
  const bernomor = (arr) => (arr.length ? arr.map((t, i) => `${i + 1}. ${t}`).join('\n') : '1. (tidak diketahui)')

  // Hanya mencetak yang benar-benar terisi. Versi lama selalu mencetak lebar
  // jalan, kontur, lingkungan, dan kepadatan arus sebagai "(tidak diketahui)"
  // padahal keempatnya tidak pernah ada di formulir.
  const lingkungan = [
    x.faktor_jalan?.kondisiPermukaan ? `- Kondisi jalan: ${x.faktor_jalan.kondisiPermukaan}` : null,
    x.faktor_cuaca?.cuaca ? `- Cuaca: ${x.faktor_cuaca.cuaca}` : null,
  ].filter(Boolean)

  const akibatTeks = [
    `- MD : ${ov.filter((o) => o.kondisi === 'MENINGGAL_DUNIA').length}`,
    `- LB : ${ov.filter((o) => o.kondisi === 'LUKA_BERAT').length}`,
    `- LR : ${ov.filter((o) => o.kondisi === 'LUKA_RINGAN').length}`,
    `- Kerugian materiil : Rp ${x.kerugian_materiil ? Number(x.kerugian_materiil).toLocaleString('id-ID') : '-'}`,
  ].join('\n')

  const namaKasat = kasat ? `${kasat.pangkat || ''} ${kasat.nama}`.trim() : '-'
  const pelaksanaTeks = [
    `1. Kasat Lantas Polrestabes Bandung : ${namaKasat}${kasat?.gelar ? ', ' + kasat.gelar : ''}`,
    `2. Piket Gakkum Polrestabes Bandung : ${`${x.pelapor_pangkat || ''} ${x.pelapor_nama || ''}`.trim() || '-'}`,
    ...(x.personel_tambahan || []).filter(Boolean).map((n, i) => `${i + 3}. Piket Gakkum Polrestabes Bandung : ${n}`),
  ].join('\n')

  const jenis = x.jenis_kecelakaan?.nama || '-'
  const sekarang = new Date()

  const bagian = [
    `*LAPORAN PENANGANAN KECELAKAAN LALU LINTAS*\n*${jenis.toUpperCase()} DI ${(x.lokasi || '-').toUpperCase()}*`,

    [
      'Kepada : Yth. DIRLANTAS POLDA JABAR',
      'Dari : KASAT LANTAS POLRESTABES BANDUNG',
      `Perihal : Penanganan kecelakaan lalu lintas ${jenis} di ${isi(x.lokasi)}`,
    ].join('\n'),

    `Assalamu'alaikum wr. wb.\nSelamat ${sapaan(waktu)} Komandan, mohon izin melaporkan telah terjadi kecelakaan lalu lintas ${jenis}, sebagai berikut:`,

    seksi('W A K T U', `${hariTanggal(waktu)}\nSekira pukul ${jam(waktu)} WIB`),
    seksi('T K P', isi(x.lokasi)),
    seksi('KENDARAAN YANG TERLIBAT', kendaraanTeks),
    seksi('IDENTITAS PENGENDARA/KORBAN', identitasTeks),
    seksi('AKIBAT', akibatTeks),
    seksi('KORBAN LAKA', korbanTeks),
    seksi('KELENGKAPAN BERKENDARA', kelengkapanTeks),
    seksi('KRONOLOGI KEJADIAN', [
      `_Pra Laka_\n${isi(x.kronologis_pra)}`,
      `_Saat Laka_\n${isi(x.kronologis_saat)}`,
      `_Pasca Laka_\n${isi(x.kronologis_pasca)}`,
    ].join('\n\n')),
    seksi('FAKTOR PENYEBAB LAKA', [
      `_A. Faktor Manusia_\n${berbutir(gabung(x.faktor_manusia))}`,
      `_B. Faktor Kendaraan_\n${berbutir(gabung(x.faktor_kendaraan))}`,
      lingkungan.length ? `_C. Faktor Jalan & Cuaca_\n${lingkungan.join('\n')}` : null,
    ].filter(Boolean).join('\n\n')),
    seksi('HASIL PENYELIDIKAN SEMENTARA', 'Masih dalam proses penyelidikan Unit Gakkum.'),
    seksi('TINDAKAN YANG DILAKUKAN', bernomor(gabung(x.tindakan))),
    seksi('RENCANA TINDAK LANJUT', bernomor((x.rtl || []).filter(Boolean))),
    seksi('PELAKSANA YANG TERLIBAT', pelaksanaTeks),

    `${BINTANG} *PENUTUP*\nKegiatan berjalan dengan aman, lancar, dan tertib. (Dokumentasi terlampir)\nDemikian yang dapat kami laporkan, Komandan. Terima kasih.`,

    kasat ? `*${namaKasat}*${kasat.gelar ? `\n_${kasat.gelar}_` : ''}` : '_(Pejabat penanda tangan belum ditetapkan di Kelola Data)_',

    `_Dibuat pada ${tanggalPanjang(sekarang)} pukul ${jam(sekarang.toISOString())} WIB._`,
  ]

  return bagian.join('\n\n')
}
