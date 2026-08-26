// Generator teks laporan format WhatsApp ke Dirlantas — permintaan langsung
// client, diadaptasi dari mockup ke bentuk data Supabase (kolom snake_case,
// enum kondisi/status).

const KASAT_LANTAS = { pangkat: 'AKBP', nama: 'AH. Hudi Arif', gelar: 'S.T.P., S.I.K., M.A.' }
const KONDISI_SINGKAT = { LUKA_RINGAN: 'LR', LUKA_BERAT: 'LB', MENINGGAL_DUNIA: 'MD', DALAM_PERAWATAN: 'Dalam Perawatan' }
const blank = (v) => (v === undefined || v === null || v === '' ? '(tidak diketahui)' : v)
const huruf = (i) => String.fromCharCode(97 + i)

function sapaan(iso) {
  const h = iso ? new Date(iso).getHours() : 0
  if (h < 10) return 'Pagi'
  if (h < 15) return 'Siang'
  if (h < 18) return 'Sore'
  return 'Malam'
}
function tanggalPanjang(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function hariTanggal(d) {
  const s = new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const [hari, ...rest] = s.split(', ')
  return rest.length ? `Hari ${hari} tanggal ${rest.join(', ')}` : `tanggal ${s}`
}

export function buildLaporanKejadianWA(x) {
  const kv = x.kendaraan || []
  const ov = x.orang || []
  const labelKendaraan = (id) => {
    const k = kv.find((v) => v.id === id)
    return k ? `${blank(k.kategori)} ${blank(k.merk)} No. Pol. ${blank(k.nopol)}` : '(tidak diketahui)'
  }
  const kendaraanLines = kv.length ? kv.map((k, i) => `${huruf(i)}. Kendaraan ${blank(k.kategori)} ${blank(k.merk)} No. Pol. ${blank(k.nopol)}`).join('\n') : '(tidak diketahui)'
  const identitasLines = ov.length ? ov.map((p, i) => {
    const kend = p.kendaraan_id ? labelKendaraan(p.kendaraan_id) : '(tidak diketahui)'
    return `${huruf(i)}. Pengendara/Pengemudi ${kend} Sdr/Sdri. *${blank(p.nama)}* ${blank(p.tempat_lahir)} ${blank(p.tanggal_lahir)}, ${p.jenis_kelamin === 'P' ? 'Perempuan' : p.jenis_kelamin === 'L' ? 'Laki-laki' : '(tidak diketahui)'}, ${blank(p.pekerjaan)}, ${blank(p.alamat)}`
  }).join('\n') : '(tidak diketahui)'
  const korbanList = ov.filter((p) => p.kondisi && p.kondisi !== 'SELAMAT')
  const korbanLines = korbanList.length ? korbanList.map((p, i) => `${i + 1}. Sdr/Sdri. *${blank(p.nama)}* *(${KONDISI_SINGKAT[p.kondisi] || p.kondisi})* dibawa ke ${blank(p.rs_rujukan)}`).join('\n') : '-'
  const kelengkapanLines = ov.length ? ov.map((p) => {
    const kl = p.kelengkapan || {}
    return `#. Pengendara/Pengemudi Sdr/Sdri. ${blank(p.nama)}\n- ${kl.stnk ? 'Membawa STNK' : 'Tidak membawa STNK'}\n- ${kl.sim ? 'Membawa SIM ' + blank(kl.sim_jenis) : 'Tidak membawa SIM'}\n- ${kl.ktp ? 'Membawa KTP' : 'Tidak membawa KTP'}`
  }).join('\n') : '(tidak diketahui)'
  const fm = x.faktor_manusia || { checked: [], lainnya: '' }
  const fk = x.faktor_kendaraan || { checked: [], lainnya: '' }
  const fj = x.faktor_jalan || {}
  const fc = x.faktor_cuaca || {}
  const td = x.tindakan || { checked: [], lainnya: '' }
  const rtlLines = (x.rtl || []).length ? x.rtl.map((r, i) => `${i + 1}. ${r}`).join('\n') : '1. (tidak diketahui)'
  const tindakanLines = [...(td.checked || []), ...(td.lainnya ? [td.lainnya] : [])]
  const tindakanText = tindakanLines.length ? tindakanLines.map((t, i) => `${i + 1}. ${t}`).join('\n') : '1. (tidak diketahui)'
  const pelaksanaLines = [
    `1. Kasat Lantas Polrestabes Bandung : ${KASAT_LANTAS.pangkat} ${KASAT_LANTAS.nama}, ${KASAT_LANTAS.gelar}`,
    `2. Piket Gakkum Polrestabes Bandung : ${x.pelapor_pangkat || ''} ${x.pelapor_nama}`,
    ...(x.personel_tambahan || []).map((n, i) => `${i + 3}. Piket Gakkum Polrestabes Bandung : ${n}`),
  ]
  const now = new Date()
  const judul = `LAPORAN PENANGANAN KECELAKAAN LALU LINTAS ${(x.jenis_kecelakaan?.nama || '').toUpperCase()} DI ${(x.lokasi || '').toUpperCase()}.`

  return `${judul}
Kepada : Yth. DIRLANTAS POLDA JABAR
Dari : KASAT LANTAS POLRESTABES BANDUNG
Perihal : Penanganan kecelakaan lalu lintas ${x.jenis_kecelakaan?.nama || ''} di ${x.lokasi || ''}.
Assalamu'alaikum wr. wb.
Selamat ${sapaan(x.w1)} Komandan, mohon izin melaporkan telah terjadi kecelakaan lalu lintas ${x.jenis_kecelakaan?.nama || '(tidak diketahui)'}, sbb :
✳ W A K T U :
${hariTanggal(now)} sekira Pukul ${x.w1 ? new Date(x.w1).toTimeString().slice(0, 5) : '(tidak diketahui)'} WIB.
✳ T K P :
${x.lokasi}.
✳ KENDARAAN YANG TERLIBAT :
${kendaraanLines}
✳ IDENTITAS PENGENDARA/KORBAN
${identitasLines}
✳ AKIBAT :
- MD : ${ov.filter((o) => o.kondisi === 'MENINGGAL_DUNIA').length || '-'}
- LB : ${ov.filter((o) => o.kondisi === 'LUKA_BERAT').length || '-'}
- LR : ${ov.filter((o) => o.kondisi === 'LUKA_RINGAN').length || '-'}
- kerugian materi Rp. ${x.kerugian_materiil ? Number(x.kerugian_materiil).toLocaleString('id-ID') : '(tidak diketahui)'}
✳ KORBAN LAKA :
${korbanLines}
✳ KELENGKAPAN BERKENDARA :
${kelengkapanLines}
✳ KRONOLOGI KEJADIAN :
✳ Pra Laka : ${blank(x.kronologis_pra)}
✳ Saat Laka : ${blank(x.kronologis_saat)}
✳ Pasca Laka : ${blank(x.kronologis_pasca)}
✳ HASIL PENYELIDIKAN SEMENTARA :
Dalam proses penyelidikan
✳ FAKTOR PENYEBAB LAKA :
A. Faktor Manusia
${[...(fm.checked || []), ...(fm.lainnya ? [fm.lainnya] : [])].join(', ') || '(tidak diketahui)'}
B. Faktor Kendaraan
${[...(fk.checked || []), ...(fk.lainnya ? [fk.lainnya] : [])].join(', ') || '(tidak diketahui)'}
C. Faktor Jalan
Lebar jalan ${blank(fj.lebarJalan)}m, kondisi ${blank(fj.kondisiPermukaan)}, kontur ${blank(fj.kontur)}.
D. Faktor Cuaca & Lingkungan
Cuaca ${blank(fc.cuaca)}, lingkungan ${blank(fc.lingkungan)}, arus ${blank(fc.kepadatan)}.
✳ KESIMPULAN :
Dalam proses penyelidikan Unit Gakkum
✳ TINDAKAN YANG DILAKUKAN :
${tindakanText}
✳ RENCANA TINDAK LANJUT :
${rtlLines}
✳ PELAKSANA YANG TERLIBAT :
${pelaksanaLines.join('\n')}
✳ PENUTUP
Kegiatan berjalan dengan aman, lancar dan tertib. (Dokumentasi terlampir)
Demikian yang dapat kami laporkan Komandan Terima kasih.
*${KASAT_LANTAS.pangkat} ${KASAT_LANTAS.nama}, ${KASAT_LANTAS.gelar}*

Diperbarui pada ${tanggalPanjang(now)} pukul ${now.toTimeString().slice(0, 5)} WIB.`
}
