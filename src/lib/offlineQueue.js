// E-Pikpor — antrean luring (Dokumen Teknis Bagian 5.4 & 13): laporan yang
// dikirim tanpa sinyal tersimpan di perangkat (IndexedDB, karena foto berupa
// Blob) dan terkirim sendiri setelah sinyal kembali, tanpa duplikat dan tanpa
// mengulang pengisian formulir.

const DB_NAME = 'epikpor-offline'
const STORE = 'antrean'

function bukaDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Setelah sekian kali gagal berturut-turut, satu antrean dianggap tertahan
// dan dilewati supaya tidak menyandera seluruh sisanya. Lihat catatan di
// prosesUlangAntrean().
export const BATAS_PERCOBAAN = 5

export async function tambahAntrean(item) {
  const db = await bukaDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).add({ ...item, dibuatPada: Date.now(), percobaan: 0, galat: null })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function perbaruiAntrean(item) {
  const db = await bukaDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).put(item)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// Dipakai layar untuk memberi tahu petugas bahwa masih ada laporan yang belum
// terkirim — sebelumnya antrean sama sekali tidak terlihat di antarmuka mana
// pun, sehingga laporan bisa tertahan di perangkat tanpa ada yang menyadari.
export async function ringkasanAntrean() {
  const semua = await ambilSemuaAntrean()
  return {
    total: semua.length,
    tertahan: semua.filter((x) => x.percobaan >= BATAS_PERCOBAAN).length,
    item: semua.sort((a, b) => a.dibuatPada - b.dibuatPada),
  }
}

// Menyetel ulang hitungan gagal supaya antrean yang tertahan dicoba lagi,
// mis. setelah penyebabnya diperbaiki.
export async function ulangiAntreanTertahan() {
  const semua = await ambilSemuaAntrean()
  for (const item of semua.filter((x) => x.percobaan >= BATAS_PERCOBAAN)) {
    await perbaruiAntrean({ ...item, percobaan: 0, galat: null })
  }
}

export async function ambilSemuaAntrean() {
  const db = await bukaDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function hapusAntrean(id) {
  const db = await bukaDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function jumlahAntrean() {
  return (await ambilSemuaAntrean()).length
}

let sedangMemproses = false

// prosesFn(item) harus melempar error kalau gagal (mis. masih offline / server
// menolak) supaya urutan pengiriman tetap terjaga: antrean berhenti di baris
// yang gagal, tidak melompatinya.
//
// Tetapi berhenti tanpa batas berarti SATU laporan yang gagal permanen —
// misalnya karena datanya sudah tidak diterima server — menyandera seluruh
// antrean selamanya, dan satu-satunya jejaknya cuma console.error yang tidak
// pernah dilihat siapa pun. Karena itu tiap kegagalan dihitung; setelah
// BATAS_PERCOBAAN kali, baris itu ditandai tertahan dan dilewati supaya sisanya
// tetap terkirim. Yang tertahan tidak dibuang — ditampilkan ke petugas untuk
// ditindaklanjuti.
export async function prosesUlangAntrean(prosesFn, onSelesai) {
  if (sedangMemproses || !navigator.onLine) return
  sedangMemproses = true
  try {
    const semua = (await ambilSemuaAntrean()).sort((a, b) => a.dibuatPada - b.dibuatPada)
    for (const item of semua) {
      if (item.percobaan >= BATAS_PERCOBAAN) continue
      try {
        await prosesFn(item)
        await hapusAntrean(item.id)
      } catch (e) {
        const percobaan = (item.percobaan || 0) + 1
        await perbaruiAntrean({ ...item, percobaan, galat: e?.message || String(e) })
        console.error(`Gagal mengirim antrean luring (percobaan ${percobaan}/${BATAS_PERCOBAAN})`, e)
        // Belum mentok: hentikan giliran ini supaya urutan terjaga, coba lagi
        // saat pemicu berikutnya. Sudah mentok: lanjut ke baris berikutnya.
        if (percobaan < BATAS_PERCOBAAN) break
      }
    }
  } finally {
    sedangMemproses = false
    onSelesai?.()
  }
}

export function pasangPendengarOnline(prosesFn, onSelesai) {
  const handler = () => prosesUlangAntrean(prosesFn, onSelesai)
  window.addEventListener('online', handler)
  if (navigator.onLine) handler()
  return () => window.removeEventListener('online', handler)
}
