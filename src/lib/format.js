export function fmtTime(d) {
  return new Date(d).toTimeString().slice(0, 5)
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function fmtTanggalPendek(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
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
