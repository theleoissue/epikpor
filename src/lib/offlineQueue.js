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

export async function tambahAntrean(item) {
  const db = await bukaDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).add({ ...item, dibuatPada: Date.now() })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
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
// menolak) supaya antrean berhenti di baris itu dan dicoba lagi nanti — bukan
// melompati baris yang gagal, supaya urutan pengiriman tetap terjaga.
export async function prosesUlangAntrean(prosesFn) {
  if (sedangMemproses || !navigator.onLine) return
  sedangMemproses = true
  try {
    const semua = (await ambilSemuaAntrean()).sort((a, b) => a.dibuatPada - b.dibuatPada)
    for (const item of semua) {
      try {
        await prosesFn(item)
        await hapusAntrean(item.id)
      } catch (e) {
        console.error('Gagal mengirim ulang antrean luring, dicoba lagi nanti', e)
        break
      }
    }
  } finally {
    sedangMemproses = false
  }
}

export function pasangPendengarOnline(prosesFn) {
  const handler = () => prosesUlangAntrean(prosesFn)
  window.addEventListener('online', handler)
  if (navigator.onLine) handler()
  return () => window.removeEventListener('online', handler)
}
