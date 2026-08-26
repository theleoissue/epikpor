// Menu per peran — Bagian 4 Dokumen Teknis. Perbaikan dibanding mockup:
// KASUBNIT dapat menu Verifikasi (zonanya), ADMIN tidak (cuma Kelola Data),
// dan Kasat/Wakasat/Kaur Bin Ops (sebelumnya tidak ada sama sekali) dapat
// menu pemantauan read-only.
export function menuUntukPeran(peran) {
  switch (peran) {
    case 'BANIT':
      return [
        { to: '/', label: 'Beranda' },
        { to: '/lapor-kegiatan', label: 'Lapor Kegiatan' },
        { to: '/kejadian', label: 'Kejadian Kecelakaan' },
        { to: '/arsip', label: 'Arsip Zona' },
      ]
    case 'KASUBNIT':
      return [
        { to: '/', label: 'Beranda' },
        { to: '/dashboard', label: 'Papan Pemantauan' },
        { to: '/verifikasi', label: 'Verifikasi', badge: 'verifikasi' },
        { to: '/arsip', label: 'Arsip Zona' },
      ]
    case 'KANIT_GAKKUM':
      return [
        { to: '/dashboard', label: 'Papan Pemantauan' },
        { to: '/verifikasi', label: 'Verifikasi', badge: 'verifikasi' },
        { to: '/arsip', label: 'Arsip' },
        { to: '/roster', label: 'Roster Piket' },
      ]
    case 'KASAT_LANTAS':
    case 'WAKASAT_LANTAS':
    case 'KAUR_BIN_OPS':
      return [
        { to: '/dashboard', label: 'Papan Pemantauan' },
        { to: '/arsip', label: 'Arsip' },
      ]
    case 'ADMIN':
      return [
        { to: '/dashboard', label: 'Papan Pemantauan' },
        { to: '/roster', label: 'Roster Piket' },
        { to: '/kelola', label: 'Kelola Data' },
      ]
    default:
      return []
  }
}

export const LABEL_PERAN = {
  KASAT_LANTAS: 'Kasat Lantas',
  WAKASAT_LANTAS: 'Wakasat Lantas',
  KANIT_GAKKUM: 'Kanit Gakkum',
  KAUR_BIN_OPS: 'Kaur Bin Ops',
  KASUBNIT: 'Kasubnit',
  BANIT: 'Banit / Anggota',
  ADMIN: 'Administrator',
}
