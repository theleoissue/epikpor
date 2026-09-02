// Semua tampilan waktu memakai Asia/Jakarta secara eksplisit (Dokumen Teknis
// Bagian 7: "Setiap perhitungan hari kalender memakai zona waktu Asia/Jakarta
// secara tegas") — bukan zona waktu lokal peramban, yang bisa beda-beda
// tergantung pengaturan perangkat pengguna.
const ZONA_WAKTU = 'Asia/Jakarta'

export function fmtTime(d) {
  return new Date(d).toLocaleTimeString('id-ID', { timeZone: ZONA_WAKTU, hour: '2-digit', minute: '2-digit', hour12: false })
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { timeZone: ZONA_WAKTU, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function fmtTanggalPendek(d) {
  return new Date(d).toLocaleDateString('id-ID', { timeZone: ZONA_WAKTU, day: 'numeric', month: 'short', year: 'numeric' })
}

// Bulan (0-11) suatu timestamp menurut kalender Asia/Jakarta — dipakai untuk
// mengelompokkan rekapitulasi per bulan supaya tidak bergeser kalau dibuka
// dari peramban dengan zona waktu lain.
export function bulanJakarta(iso) {
  const bagian = new Intl.DateTimeFormat('en-US', { timeZone: ZONA_WAKTU, month: 'numeric' }).format(new Date(iso))
  return Number(bagian) - 1
}

// Stempel waktu disunting lewat DUA kolom terpisah (<input type="date"> dan
// <input type="time">), bukan satu <input type="datetime-local">. Alasannya:
// datetime-local punya lebar minimum yang cukup besar, dan di tata letak tiga
// kolom yang sempit bagian jamnya terpotong sehingga hanya tanggal yang bisa
// diisi. Dua kolom terpisah juga lebih enak disentuh di layar HP.
//
// Memakai jam perangkat apa adanya (bukan dipaksa Asia/Jakarta) — konsisten
// dengan cara stempel direkam pertama kali di Kejadian.jsx
// (new Date().toISOString() dari jam perangkat), yang dalam praktiknya sudah
// WIB karena dipakai di lapangan.
const pad2 = (n) => String(n).padStart(2, '0')

export function keInputTanggal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function keInputJam(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

// Salah satu kolom boleh kosong saat pengguna baru mengisi separuh: tanggal
// kosong dianggap hari ini, jam kosong dianggap 00:00. Kalau KEDUANYA kosong,
// stempelnya memang dihapus (null).
export function gabungTanggalJam(tanggal, jam) {
  if (!tanggal && !jam) return null
  const hariIni = new Date()
  const t = tanggal || `${hariIni.getFullYear()}-${pad2(hariIni.getMonth() + 1)}-${pad2(hariIni.getDate())}`
  const j = jam || '00:00'
  const hasil = new Date(`${t}T${j}`)
  return isNaN(hasil.getTime()) ? null : hasil.toISOString()
}

// Akhir pekan menurut kalender Asia/Jakarta — bukan zona waktu peramban.
// Kejadian pukul 23.30 Minggu WIB akan terbaca sebagai Senin bila memakai
// waktu UTC, dan angka capaian Siaga Wiken ikut meleset.
export function akhirPekanJakarta(iso) {
  const hari = new Intl.DateTimeFormat('en-US', { timeZone: ZONA_WAKTU, weekday: 'short' }).format(new Date(iso))
  return hari === 'Sat' || hari === 'Sun'
}

export function fmtRupiah(n) {
  if (!n) return '-'
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

export function lamaPengisian(mulaiMs) {
  const ms = Date.now() - mulaiMs
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}d`
}

// Rentang bisa berjam-jam (mis. dari laporan diterima sampai selesai), jadi
// tidak cukup ditulis dalam menit saja — "135m" jauh lebih sulit dicerna
// daripada "2j 15m".
export function lamaTerbaca(detik) {
  const d = Math.max(0, Math.round(detik))
  const j = Math.floor(d / 3600)
  const m = Math.floor((d % 3600) / 60)
  const s = d % 60
  if (j > 0) return `${j}j ${m}m`
  if (m > 0) return `${m}m ${s}d`
  return `${s} detik`
}

export function rentangWaktu(dariIso, keIso) {
  if (!dariIso || !keIso) return null
  const diffSec = Math.round((new Date(keIso).getTime() - new Date(dariIso).getTime()) / 1000)
  return { diffSec, mm: Math.floor(diffSec / 60), ss: diffSec % 60 }
}

// Ambang batas Bagian 7 Dokumen Teknis, disesuaikan setelah stempel waktu
// disederhanakan dari lima tahap menjadi tiga. Sasaran penanganan (45 menit)
// adalah gabungan dua ambang lama yang kini dilebur: menerima laporan
// (10 menit) + tiba di tempat kejadian (35 menit).
export const SASARAN_WAKTU_TANGGAP = {
  penanganan: 45 * 60,
  selesai: 24 * 3600,
}
