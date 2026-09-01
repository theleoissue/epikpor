// E-Pikpor — penyusun kolase foto TKP.
//
// Menggabungkan lampiran foto satu kejadian jadi satu gambar berkop, supaya
// bisa langsung dilampirkan ke laporan atau dikirim lewat WhatsApp tanpa
// mengirim foto satu per satu. Semua penggambaran dilakukan di sisi peramban
// (Canvas) — tidak ada layanan luar yang menerima foto TKP.

import { fmtDate, fmtTime } from './format'

const LEBAR = 1200
const PAD = 28
const TINGGI_KOP = 132
const TINGGI_KAKI = 52
const JARAK = 14

const WARNA = {
  navy: '#0B1424',
  navyMuda: '#16294A',
  brass: '#C9A24B',
  kertas: '#F3F1EA',
  putih: '#FFFFFF',
  redup: '#9AA4BE',
}

// Foto TKP boleh potret maupun lanskap; digambar dengan perilaku "cover"
// (dipotong di sisi terpanjang) supaya tiap sel terisi penuh tanpa gepeng.
function gambarCover(ctx, img, x, y, w, h) {
  const skala = Math.max(w / img.width, h / img.height)
  const lebarBaru = img.width * skala
  const tinggiBaru = img.height * skala
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, x + (w - lebarBaru) / 2, y + (h - tinggiBaru) / 2, lebarBaru, tinggiBaru)
  ctx.restore()
}

function muatGambar(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Wajib supaya kanvas tidak "ternoda" (tainted) — tanpa ini toBlob()
    // dilarang peramban dan kolase tidak bisa diunduh sama sekali.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Ada foto yang gagal dimuat.'))
    img.src = url
  })
}

// 1 foto  -> 1 kolom; 2 foto -> 2 kolom; 3-4 -> 2 kolom; 5+ -> 3 kolom.
function hitungKolom(jumlah) {
  if (jumlah <= 1) return 1
  if (jumlah <= 4) return 2
  return 3
}

function potong(ctx, teks, maksLebar) {
  if (ctx.measureText(teks).width <= maksLebar) return teks
  let hasil = teks
  while (hasil.length > 1 && ctx.measureText(hasil + '…').width > maksLebar) {
    hasil = hasil.slice(0, -1)
  }
  return hasil + '…'
}

export async function buatKolaseTkp(urls, info) {
  if (!urls || urls.length === 0) throw new Error('Belum ada foto TKP untuk dijadikan kolase.')

  const gambar = await Promise.all(urls.map(muatGambar))
  const kolom = hitungKolom(gambar.length)
  const baris = Math.ceil(gambar.length / kolom)
  const lebarSel = Math.floor((LEBAR - PAD * 2 - JARAK * (kolom - 1)) / kolom)
  const tinggiSel = Math.round(lebarSel * 0.72)
  const tinggi = TINGGI_KOP + PAD + baris * tinggiSel + (baris - 1) * JARAK + PAD + TINGGI_KAKI

  const kanvas = document.createElement('canvas')
  kanvas.width = LEBAR
  kanvas.height = tinggi
  const ctx = kanvas.getContext('2d')

  // Latar
  ctx.fillStyle = WARNA.kertas
  ctx.fillRect(0, 0, LEBAR, tinggi)

  // Kop
  ctx.fillStyle = WARNA.navy
  ctx.fillRect(0, 0, LEBAR, TINGGI_KOP)
  ctx.fillStyle = WARNA.brass
  ctx.fillRect(0, TINGGI_KOP - 4, LEBAR, 4)

  ctx.fillStyle = WARNA.brass
  ctx.font = 'bold 15px Consolas, monospace'
  ctx.fillText('DOKUMENTASI TEMPAT KEJADIAN PERKARA', PAD, 40)

  ctx.fillStyle = WARNA.putih
  ctx.font = 'bold 30px Georgia, serif'
  ctx.fillText(potong(ctx, info.lokasi || 'Lokasi tidak dicatat', LEBAR - PAD * 2), PAD, 76)

  ctx.fillStyle = WARNA.redup
  ctx.font = '15px Calibri, Arial, sans-serif'
  const barisInfo = [
    info.jenis,
    info.waktu ? `${fmtDate(info.waktu)} · ${fmtTime(info.waktu)} WIB` : null,
    info.zona ? `Zona ${info.zona}${info.regu ? ` · Regu ${info.regu}` : ''}` : null,
  ].filter(Boolean).join('   |   ')
  ctx.fillText(potong(ctx, barisInfo, LEBAR - PAD * 2), PAD, 104)

  // Foto
  gambar.forEach((img, i) => {
    const kol = i % kolom
    const bar = Math.floor(i / kolom)
    const x = PAD + kol * (lebarSel + JARAK)
    const y = TINGGI_KOP + PAD + bar * (tinggiSel + JARAK)
    ctx.fillStyle = WARNA.navyMuda
    ctx.fillRect(x, y, lebarSel, tinggiSel)
    gambarCover(ctx, img, x, y, lebarSel, tinggiSel)
    // Nomor urut foto, supaya bisa dirujuk di berita acara.
    ctx.fillStyle = 'rgba(11,20,36,0.82)'
    ctx.fillRect(x, y + tinggiSel - 30, 46, 30)
    ctx.fillStyle = WARNA.brass
    ctx.font = 'bold 15px Consolas, monospace'
    ctx.fillText(String(i + 1).padStart(2, '0'), x + 13, y + tinggiSel - 10)
  })

  // Kaki
  const yKaki = tinggi - TINGGI_KAKI
  ctx.fillStyle = WARNA.navy
  ctx.fillRect(0, yKaki, LEBAR, TINGGI_KAKI)
  ctx.fillStyle = WARNA.redup
  ctx.font = '14px Calibri, Arial, sans-serif'
  ctx.fillText(potong(ctx, `Pelapor: ${info.pelapor || '-'}`, LEBAR / 2), PAD, yKaki + 32)
  ctx.textAlign = 'right'
  ctx.fillText(`${gambar.length} foto · E-Pikpor`, LEBAR - PAD, yKaki + 32)
  ctx.textAlign = 'left'

  return new Promise((resolve, reject) => {
    kanvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Gagal menyusun kolase.'))
    }, 'image/jpeg', 0.9)
  })
}

export function unduhBlob(blob, namaBerkas) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaBerkas
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Ditunda sedikit: mencabut URL terlalu cepat membuat sebagian peramban
  // membatalkan unduhan yang baru saja dimulai.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
