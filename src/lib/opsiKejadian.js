// Satu sumber acuan untuk seluruh pilihan pada formulir Kejadian Kecelakaan.
// Sebelumnya daftar pilihan ditulis ulang di Kejadian.jsx, DetailModal.jsx,
// dan waReport.js secara terpisah — tiga salinan yang bisa berbeda diam-diam.

export const TIDAK_DIKETAHUI = 'TIDAK_DIKETAHUI'

// ---------- Orang ----------
export const JENIS_KELAMIN_OPT = [
  ['L', 'Laki-laki'],
  ['P', 'Perempuan'],
  [TIDAK_DIKETAHUI, 'Belum teridentifikasi'],
]

export const PERAN_ORANG_OPT = [
  'Pengendara Motor', 'Pengemudi Mobil', 'Penumpang', 'Pejalan Kaki', 'Lainnya',
]

// Sengaja TIDAK ada nilai awal "Selamat". Kondisi korban menentukan angka
// MD/LB/LR di Papan Pemantauan, jadi kalau nilai awalnya "Selamat" dan
// petugas lupa mengubahnya, korban meninggal tercatat selamat tanpa ada yang
// menyadari. Kolom ini wajib dipilih sadar.
export const KONDISI_OPT = [
  ['SELAMAT', 'Selamat'],
  ['LUKA_RINGAN', 'Luka Ringan'],
  ['LUKA_BERAT', 'Luka Berat'],
  ['MENINGGAL_DUNIA', 'Meninggal Dunia'],
  ['DALAM_PERAWATAN', 'Dalam Perawatan'],
]

export const SIM_JENIS_OPT = ['A', 'A Umum', 'B I', 'B I Umum', 'B II', 'B II Umum', 'C', 'C I', 'C II', 'D']

// ---------- Kelengkapan surat ----------
// Tiga keadaan, bukan dua. Kotak centang lama cuma bisa "ya"/"tidak", sehingga
// kolom yang belum sempat diperiksa ikut tercetak sebagai "Tidak membawa STNK"
// di laporan resmi — menuduh sesuatu yang belum tentu benar.
export const ADA = 'ADA'
export const TIDAK_ADA = 'TIDAK_ADA'
export const BELUM_DIPERIKSA = 'BELUM_DIPERIKSA'

export const STATUS_KELENGKAPAN_OPT = [
  [ADA, 'Ada'],
  [TIDAK_ADA, 'Tidak ada'],
  [BELUM_DIPERIKSA, 'Belum diperiksa'],
]

export const KELENGKAPAN_DEF = [
  ['stnk', 'STNK', 'Membawa STNK', 'Tidak membawa STNK'],
  ['sim', 'SIM', 'Membawa SIM', 'Tidak membawa SIM'],
  ['ktp', 'KTP', 'Membawa KTP', 'Tidak membawa KTP'],
  ['helm_sabuk', 'Helm/Sabuk', 'Menggunakan helm/sabuk pengaman', 'Tidak menggunakan helm/sabuk pengaman'],
]

// Data lama menyimpan boolean. `false` di data lama memang berarti "tidak
// membawa" (itulah yang dicetak laporan waktu itu), jadi dipetakan apa adanya
// — bukan diterjemahkan ulang jadi "belum diperiksa", yang akan mengubah arti
// laporan yang sudah pernah dikirim.
export function bacaStatusKelengkapan(nilai) {
  if (nilai === true) return ADA
  if (nilai === false) return TIDAK_ADA
  return nilai || BELUM_DIPERIKSA
}

export function kalimatKelengkapan(kunci, nilai, simJenis) {
  const def = KELENGKAPAN_DEF.find(([k]) => k === kunci)
  if (!def) return ''
  const status = bacaStatusKelengkapan(nilai)
  if (status === BELUM_DIPERIKSA) return `${def[1]} belum diperiksa`
  if (status === ADA) return kunci === 'sim' && simJenis ? `${def[2]} ${simJenis}` : def[2]
  return def[3]
}

// ---------- Kendaraan ----------
export const KATEGORI_KENDARAAN = [
  'Sepeda Motor', 'Mobil Penumpang', 'Mobil Barang / Truk', 'Bus',
  'Angkutan Umum', 'Sepeda / Tidak Bermotor', 'Lainnya',
]

// ---------- Faktor penyebab ----------
export const FAKTOR_MANUSIA_OPT = [
  'Lengah/Tidak Konsentrasi', 'Mengantuk', 'Melanggar Rambu/Marka', 'Melebihi Batas Kecepatan',
  'Tidak Menjaga Jarak Aman', 'Di Bawah Pengaruh Alkohol/Obat', 'Kurang Terampil/Belum Mahir',
  'Dalam Proses Penyelidikan',
]

export const FAKTOR_KENDARAAN_OPT = [
  'Kendaraan Laik Jalan', 'Rem Blong/Tidak Berfungsi', 'Ban Pecah/Gundul',
  'Lampu Tidak Berfungsi', 'Muatan Berlebih', 'Modifikasi Tidak Sesuai Standar',
]

export const TINDAKAN_OPT = [
  'Menerima Laporan', 'Mendatangi TKP dan Olah TKP', 'Mendata Identitas yang Terlibat',
  'Mendata Saksi-saksi', 'Mengecek Korban ke Rumah Sakit', 'Melaporkan kepada Pimpinan',
]

// ---------- Jalan & cuaca ----------
// Keempat kolom di bawah ini sebelumnya dicetak di laporan WhatsApp padahal
// tidak pernah ada isiannya di formulir, sehingga selalu tampil "(tidak
// diketahui)". Sekarang benar-benar bisa diisi petugas.
export const KONDISI_JALAN_OPT = ['Aspal Baik', 'Aspal Rusak/Berlubang', 'Jalan Licin', 'Jalan Berpasir/Berkerikil', 'Bukan Aspal']
export const KONTUR_JALAN_OPT = ['Lurus & Datar', 'Tanjakan', 'Turunan', 'Tikungan', 'Persimpangan']
export const CUACA_OPT = ['Cerah', 'Mendung', 'Hujan', 'Berkabut']
export const LINGKUNGAN_OPT = ['Permukiman', 'Perkantoran/Niaga', 'Sekolah', 'Pasar', 'Jalan Terbuka', 'Kawasan Industri']
export const KEPADATAN_OPT = ['Lengang', 'Ramai Lancar', 'Padat', 'Macet']

// ---------- Pabrik baris baru ----------
export function kendaraanBaru(id) {
  return { idSementara: id, kategori: '', merk: '', nopol: '' }
}

export function orangBaru(id) {
  return {
    idSementara: id, nama: '', belumTeridentifikasi: false, jenisKelamin: '', pekerjaan: '',
    tempatLahir: '', tanggalLahir: '', alamat: '', peran: '', kendaraanIdSementara: '',
    kondisi: '', rsRujukan: '',
    kelengkapan: { stnk: BELUM_DIPERIKSA, sim: BELUM_DIPERIKSA, sim_jenis: '', ktp: BELUM_DIPERIKSA, helm_sabuk: BELUM_DIPERIKSA },
  }
}

// ---------- Pemeriksaan sebelum kirim ----------
// Dikumpulkan jadi daftar supaya petugas melihat SEMUA yang kurang sekaligus,
// bukan diberi tahu satu per satu tiap kali menekan kirim.
export function periksaFormulirKejadian({ w, lokasi, jenisKecelakaanId, tipeTabrakanId, kendaraan, orang, kerugian }) {
  const salah = []
  const nama = { waktu_diterima: 'Laporan Diterima', waktu_penanganan: 'Dalam Penanganan', waktu_selesai: 'Laporan Selesai' }

  if (!w.waktu_diterima) salah.push('Stempel "Laporan Diterima" belum diisi.')
  if (!lokasi?.trim()) salah.push('Lokasi kejadian belum diisi.')
  if (!jenisKecelakaanId) salah.push('Jenis kecelakaan belum dipilih.')
  if (!tipeTabrakanId) salah.push('Tipe tabrakan belum dipilih.')

  // Urutan stempel: tiap tahap tidak boleh mendahului tahap sebelumnya,
  // kalau tidak rentang waktu tanggap jadi negatif dan rekap ikut rusak.
  const urut = ['waktu_diterima', 'waktu_penanganan', 'waktu_selesai']
  for (let i = 1; i < urut.length; i++) {
    for (let j = 0; j < i; j++) {
      if (w[urut[i]] && w[urut[j]] && new Date(w[urut[i]]) < new Date(w[urut[j]])) {
        salah.push(`Waktu "${nama[urut[i]]}" lebih awal daripada "${nama[urut[j]]}".`)
      }
    }
  }

  if (kerugian !== '' && kerugian !== null && Number(kerugian) < 0) {
    salah.push('Kerugian materiil tidak boleh bernilai negatif.')
  }

  kendaraan.forEach((k, i) => {
    if (!k.kategori) salah.push(`Kendaraan #${i + 1}: kategori belum dipilih.`)
  })

  const hariIni = new Date().toISOString().slice(0, 10)
  orang.forEach((o, i) => {
    const sebut = o.nama?.trim() ? `"${o.nama.trim()}"` : `#${i + 1}`
    if (!o.nama?.trim() && !o.belumTeridentifikasi) {
      salah.push(`Orang ${sebut}: isi nama, atau centang "Belum teridentifikasi".`)
    }
    if (!o.kondisi) salah.push(`Orang ${sebut}: kondisi belum dipilih.`)
    if (o.tanggalLahir && o.tanggalLahir > hariIni) {
      salah.push(`Orang ${sebut}: tanggal lahir berada di masa depan.`)
    }
    if (o.kelengkapan?.sim === ADA && !o.kelengkapan.sim_jenis) {
      salah.push(`Orang ${sebut}: jenis SIM belum dipilih.`)
    }
  })

  return salah
}
