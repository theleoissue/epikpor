// Aturan SIAGA WIKEN — bersumber dari RAP "Siaga Wiken Sebagai Upaya
// Peningkatan Sistem Pelaporan Piket Operasional Unit Gakkum Pada Akhir Pekan
// Dan Libur Nasional Di Satlantas Polrestabes Bandung" (Fiekry Adi Perdana,
// PKA XVI T.A. 2026), Tabel 1.1, 1.2, dan 1.3.
//
// Dasarnya: 62,5% kecelakaan terjadi pada akhir pekan (RAP Tabel 1.6), dengan
// volume kendaraan 21,7% lebih tinggi (Tabel 1.4). Karena itu akhir pekan
// dijaga dua regu, bukan satu seperti hari kerja.

export const SEMUA_REGU = 'SEMUA'

// Berapa regu yang seharusnya bertugas pada tiap mode hari. Sebelumnya
// mode_hari cuma label tanpa akibat apa pun — memilih "Akhir Pekan" tidak
// menuntut apa-apa, sehingga penguatan personel bergantung ingatan penyusun.
export const ATURAN_MODE_HARI = {
  HARI_KERJA: {
    label: 'Hari Kerja',
    reguDiharapkan: 1,
    catatan: 'Piket normal — satu regu bergilir.',
  },
  AKHIR_PEKAN: {
    label: 'Akhir Pekan',
    reguDiharapkan: 2,
    catatan: 'Penguatan personel — dua regu bertugas (RAP Tabel 1.1 & 1.2).',
  },
  LIBUR_NASIONAL_BIASA: {
    label: 'Libur Nasional Biasa',
    reguDiharapkan: 2,
    catatan: 'Dua regu siaga, menyesuaikan tingkat kerawanan (RAP Tabel 1.3).',
  },
  LIBUR_PANJANG: {
    label: 'Libur Panjang',
    reguDiharapkan: SEMUA_REGU,
    catatan: 'Seluruh regu siaga penuh (RAP Tabel 1.3).',
  },
  OPERASI_KEPOLISIAN: {
    label: 'Operasi Kepolisian',
    reguDiharapkan: SEMUA_REGU,
    catatan: 'Seluruh personel dikerahkan berdasarkan Sprin Operasi (RAP Tabel 1.3).',
  },
  KEADAAN_DARURAT: {
    label: 'Keadaan Darurat',
    reguDiharapkan: null,
    catatan: 'Pengerahan menyesuaikan perintah Kasat/Kanit (RAP Tabel 1.3).',
  },
}

export const DAFTAR_MODE_HARI = Object.entries(ATURAN_MODE_HARI).map(([nilai, a]) => [nilai, a.label])

// Pola dua minggu persis seperti RAP Tabel 1.1 (minggu ke-1) dan Tabel 1.2
// (minggu ke-2). Kunci = hari ISO (1 Senin ... 7 Minggu), isi = nomor regu.
// Perhatikan hari kerjanya membentuk putaran 1-2-3 yang bersambung melewati
// batas minggu: ...Kam R1, Jum R2 | Sen R3, Sel R1... — itulah yang dimaksud
// keterangan "Melanjutkan Rotasi" pada tabelnya.
export const POLA_MINGGU = {
  1: { 1: [1], 2: [2], 3: [3], 4: [1], 5: [2], 6: [1, 2], 7: [2, 3] },
  2: { 1: [3], 2: [1], 3: [2], 4: [3], 5: [1], 6: [2, 3], 7: [1, 3] },
}

// Pola bawaan bila pengaturan belum pernah disimpan. Unit Gakkum menyatakan
// belum punya aturan baku untuk minggu ke-3 dan seterusnya, jadi panjang
// siklus pun bisa disetel — bukan dipaksa dua minggu seperti tabel RAP.
// Siklus 3 minggu membuat putaran hari kerja 1-2-3 bersambung tanpa terputus
// (15 hari kerja = 5 putaran penuh); siklus 2 minggu mengulang persis tabel RAP.
export const POLA_BAWAAN = { jumlahMinggu: 2, minggu: POLA_MINGGU }

export function polaSah(pola) {
  if (!pola || typeof pola !== 'object') return false
  const n = pola.jumlahMinggu
  if (!Number.isInteger(n) || n < 1 || n > 4) return false
  for (let m = 1; m <= n; m++) {
    const mg = pola.minggu?.[m] ?? pola.minggu?.[String(m)]
    if (!mg) return false
    for (let h = 1; h <= 7; h++) {
      if (!Array.isArray(mg[h] ?? mg[String(h)])) return false
    }
  }
  return true
}

// Kunci jsonb dari Postgres selalu berupa teks; disamakan supaya pemanggil
// tidak perlu peduli apakah polanya dari basis data atau dari kode.
export function bacaHari(pola, minggu, hari) {
  const mg = pola.minggu?.[minggu] ?? pola.minggu?.[String(minggu)] ?? {}
  return mg[hari] ?? mg[String(hari)] ?? []
}

const HARI_ISO = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
export const namaHari = (tanggalIso) => HARI_ISO[hariIso(tanggalIso) - 1]

// Tanggal roster disimpan sebagai `date` polos (tanpa jam), jadi diurai
// manual — new Date('2026-09-01') ditafsirkan UTC oleh peramban dan bisa
// mundur sehari untuk pengguna di WIB.
function urai(tanggalIso) {
  const [t, b, h] = tanggalIso.split('-').map(Number)
  return new Date(t, b - 1, h)
}

const keIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// 1 = Senin ... 7 = Minggu
export function hariIso(tanggalIso) {
  const w = urai(tanggalIso).getDay()
  return w === 0 ? 7 : w
}

export function modeHariOtomatis(tanggalIso) {
  return hariIso(tanggalIso) >= 6 ? 'AKHIR_PEKAN' : 'HARI_KERJA'
}

/**
 * Susun jadwal satu bulan mengikuti pola yang berlaku.
 * @param tahun, bulan (1-12)
 * @param mingguAwal pola minggu ke berapa yang dipakai untuk minggu pertama
 *        bulan itu, supaya rotasi bisa disambung dari bulan sebelumnya.
 * @param pola pola rotasi ({ jumlahMinggu, minggu }); bawaan = pola RAP.
 * @returns [{ tanggal, hari, mode_hari, reguNomor: [1,2] }]
 */
export function susunJadwalBulan(tahun, bulan, mingguAwal = 1, pola = POLA_BAWAAN) {
  const jumlahHari = new Date(tahun, bulan, 0).getDate()
  const tanggal1 = new Date(tahun, bulan - 1, 1)
  // Senin pada minggu yang memuat tanggal 1 — jadi acuan penomoran minggu.
  const seninPertama = new Date(tanggal1)
  seninPertama.setDate(tanggal1.getDate() - ((tanggal1.getDay() + 6) % 7))

  const n = pola.jumlahMinggu || 1
  const hasil = []
  for (let h = 1; h <= jumlahHari; h++) {
    const d = new Date(tahun, bulan - 1, h)
    const iso = keIso(d)
    const indeksMinggu = Math.floor((d - seninPertama) / 604800000)
    const nomorMinggu = ((mingguAwal - 1 + indeksMinggu) % n) + 1
    hasil.push({
      tanggal: iso,
      hari: namaHari(iso),
      mode_hari: modeHariOtomatis(iso),
      reguNomor: bacaHari(pola, nomorMinggu, hariIso(iso)),
      nomorMinggu,
    })
  }
  return hasil
}

/**
 * Periksa apakah jumlah regu pada satu tanggal sudah sesuai mode harinya.
 * @param baris seluruh baris roster satu tanggal (boleh lintas zona)
 * @param jumlahReguTersedia total regu yang ada di data induk
 */
export function periksaKecukupanRegu(mode_hari, jumlahReguTerjadwal, jumlahReguTersedia) {
  const aturan = ATURAN_MODE_HARI[mode_hari]
  if (!aturan || aturan.reguDiharapkan === null) return null
  const wajib = aturan.reguDiharapkan === SEMUA_REGU ? jumlahReguTersedia : aturan.reguDiharapkan
  if (jumlahReguTerjadwal >= wajib) return null
  return `${aturan.label}: baru ${jumlahReguTerjadwal} regu terjadwal, seharusnya ${wajib}.`
}
