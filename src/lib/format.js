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

export function fmtRupiah(n) {
  if (!n) return '-'
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

export function lamaPengisian(mulaiMs) {
  const ms = Date.now() - mulaiMs
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}d`
}

export function rentangWaktu(dariIso, keIso) {
  if (!dariIso || !keIso) return null
  const diffSec = Math.round((new Date(keIso).getTime() - new Date(dariIso).getTime()) / 1000)
  return { diffSec, mm: Math.floor(diffSec / 60), ss: diffSec % 60 }
}

// Ambang batas Bagian 7 Dokumen Teknis — dipakai untuk menandai rentang yang melampaui sasaran.
export const SASARAN_WAKTU_TANGGAP = {
  terima: 10 * 60,
  tiba: 35 * 60,
  kronologis: 4 * 3600,
  selesai: 24 * 3600,
}
