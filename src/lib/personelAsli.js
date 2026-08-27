// Data personel asli Unit Gakkum Satlantas Polrestabes Bandung, dari bagan
// struktur "DAFTAR PERSONEL UNIT GAKKUM" (E-PIKPOR.pdf, dokumen client).
// Dipakai sebagai isian awal fitur Impor Massal di Kelola Data — admin tetap
// bisa menyunting/menghapus baris sebelum akunnya benar-benar dibuat.
//
// Catatan: kolom "BAMIN" di bagan aslinya tidak berada di bawah satu Kasubnit
// (Zona Tengah memang belum punya Kasubnit yang ditetapkan, sesuai Dokumen
// Teknis Bagian 15) — dua personel itu diberi peran ADMIN di sini sebagai
// usulan awal saja (karena Bagian 15 juga menyebut "kedudukan Bamin Gakkum"
// sebagai salah satu hal yang masih perlu keputusan pimpinan), bukan
// keputusan final. Silakan disunting kalau ternyata bukan itu maksudnya.

export const PERSONEL_ASLI = [
  { nama: 'Fiekry Adi Perdana', pangkat: 'AKP', nrp: '85111996', peran_sistem: 'KANIT_GAKKUM', zona: null, regu: null },

  { nama: 'Sucipto Ari Wardani', pangkat: 'IPDA', nrp: '91050119', peran_sistem: 'KASUBNIT', zona: 'Timur', regu: null },
  { nama: 'Dani', pangkat: 'Aipda', nrp: '85061524', peran_sistem: 'BANIT', zona: 'Timur', regu: '1' },
  { nama: 'Ibnu Narowi', pangkat: 'Aiptu', nrp: '81060603', peran_sistem: 'BANIT', zona: 'Timur', regu: '1' },
  { nama: 'Nandi Suhendi', pangkat: 'Aiptu', nrp: '79050631', peran_sistem: 'BANIT', zona: 'Timur', regu: '2' },
  { nama: 'Wachid Komarudin', pangkat: 'Aipda', nrp: '84051343', peran_sistem: 'BANIT', zona: 'Timur', regu: '2' },
  { nama: 'Bambang Awaludin', pangkat: 'Aipda', nrp: '84031281', peran_sistem: 'BANIT', zona: 'Timur', regu: '3' },
  { nama: 'Ganepa Cahya Firdaus', pangkat: 'Bripka', nrp: '91060067', peran_sistem: 'BANIT', zona: 'Timur', regu: '3' },

  { nama: 'Sari Wulandari Anggraini', pangkat: 'IPDA', nrp: '87030009', peran_sistem: 'KASUBNIT', zona: 'Barat', regu: null },
  { nama: 'Toha Ekalana', pangkat: 'Aiptu', nrp: '75121024', peran_sistem: 'BANIT', zona: 'Barat', regu: '1' },
  { nama: 'Alvin Muhammad Septiono', pangkat: 'Briptu', nrp: '99090618', peran_sistem: 'BANIT', zona: 'Barat', regu: '1' },
  { nama: 'Dani Ridwan Aliyullah', pangkat: 'Aiptu', nrp: '82020580', peran_sistem: 'BANIT', zona: 'Barat', regu: '2' },
  { nama: 'Adam Micky Lesmana', pangkat: 'Briptu', nrp: '99050655', peran_sistem: 'BANIT', zona: 'Barat', regu: '2' },
  { nama: 'Indra Saputra', pangkat: 'Aipda', nrp: '86050705', peran_sistem: 'BANIT', zona: 'Barat', regu: '3' },
  { nama: 'Arrizal Azinudin', pangkat: 'Bripda', nrp: '00111116', peran_sistem: 'BANIT', zona: 'Barat', regu: '3' },

  // Zona Tengah: belum ada Kasubnit di bagan asli.
  { nama: 'Agret Devia Pratiwi Putri', pangkat: 'Briptu', nrp: '96010984', peran_sistem: 'ADMIN', zona: null, regu: null },
  { nama: 'Mutiara Maulina Dewi', pangkat: 'Bripda', nrp: '05040439', peran_sistem: 'ADMIN', zona: null, regu: null },
  { nama: 'Siegit Dwi Haryanto', pangkat: 'Aiptu', nrp: '86030034', peran_sistem: 'BANIT', zona: 'Tengah', regu: '1' },
  { nama: 'Fransiskus Goktua Simarmata', pangkat: 'Bripka', nrp: '90010240', peran_sistem: 'BANIT', zona: 'Tengah', regu: '1' },
  { nama: 'Adi Dwi Saputra', pangkat: 'Aiptu', nrp: '80040305', peran_sistem: 'BANIT', zona: 'Tengah', regu: '2' },
  { nama: 'M. Yanuar Ashari Noor', pangkat: 'Bripda', nrp: '03010618', peran_sistem: 'BANIT', zona: 'Tengah', regu: '2' },
  { nama: 'Ruhinda', pangkat: 'Aiptu', nrp: '74080293', peran_sistem: 'BANIT', zona: 'Tengah', regu: '3' },
  { nama: 'Raja Putra Perdana', pangkat: 'Bripda', nrp: '02050485', peran_sistem: 'BANIT', zona: 'Tengah', regu: '3' },
]
