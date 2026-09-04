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

// Tata letak per jumlah foto — dirancang supaya tiap sel punya rasio yang
// wajar untuk jumlah itu, BUKAN grid seragam yang dipaksakan. Tetap dipadukan
// dengan gambarCover() (potong, bukan regangkan), jadi foto tidak pernah
// gepeng/lonjong — bedanya di sini cuma bentuk selnya per jumlah foto.
//
// Mengembalikan { sel: [{x,y,w,h}], tinggi } dalam satuan piksel relatif
// terhadap area konten (lebar = cw, mulai dari x=0/y=0).
function hitungTataLetak(jumlah, cw) {
  const kolomRata = (n, rasio) => {
    const w = Math.floor((cw - JARAK * (n - 1)) / n)
    const h = Math.round(w * rasio)
    return { w, h, sel: Array.from({ length: n }, (_, i) => ({ x: i * (w + JARAK), y: 0, w, h })) }
  }

  if (jumlah === 1) {
    // Satu foto: hero lanskap lebar, tidak perlu dibagi.
    const w = cw, h = Math.round(w * 0.62)
    return { sel: [{ x: 0, y: 0, w, h }], tinggi: h }
  }

  if (jumlah === 2) {
    // Berdampingan, agak lebih tinggi karena tiap sel lebih sempit.
    const { sel, h } = kolomRata(2, 0.82)
    return { sel, tinggi: h }
  }

  if (jumlah === 3) {
    // Satu besar di kiri + dua kecil bertumpuk di kanan — susunan kolase
    // klasik untuk tiga foto, bukan tiga kolom sama rata yang bikin tiap
    // foto jadi kurus.
    const wBesar = Math.round(cw * 0.62)
    const wKecil = cw - wBesar - JARAK
    const hBesar = Math.round(wBesar * 0.82)
    const hKecil = Math.round((hBesar - JARAK) / 2)
    return {
      tinggi: hBesar,
      sel: [
        { x: 0, y: 0, w: wBesar, h: hBesar },
        { x: wBesar + JARAK, y: 0, w: wKecil, h: hKecil },
        { x: wBesar + JARAK, y: hKecil + JARAK, w: wKecil, h: hBesar - hKecil - JARAK },
      ],
    }
  }

  if (jumlah === 4) {
    // 2x2 rata — jumlah yang pas untuk grid seragam.
    const { sel: baris1, h } = kolomRata(2, 0.78)
    const baris2 = baris1.map((s) => ({ ...s, y: h + JARAK }))
    return { sel: [...baris1, ...baris2], tinggi: h * 2 + JARAK }
  }

  if (jumlah === 5) {
    // 3 di atas (lebih pendek) + 2 di bawah (lebih lebar) — dua baris tidak
    // sama tingginya, karena baris 2-kolom wajar lebih tinggi per selnya.
    const atas = kolomRata(3, 0.78)
    const bawahW = Math.floor((cw - JARAK) / 2)
    const bawahH = Math.round(bawahW * 0.62)
    const bawah = [0, 1].map((i) => ({ x: i * (bawahW + JARAK), y: atas.h + JARAK, w: bawahW, h: bawahH }))
    return { sel: [...atas.sel, ...bawah], tinggi: atas.h + JARAK + bawahH }
  }

  if (jumlah === 6) {
    // 3x2 rata.
    const { sel: baris1, h } = kolomRata(3, 0.78)
    const baris2 = baris1.map((s) => ({ ...s, y: h + JARAK }))
    return { sel: [...baris1, ...baris2], tinggi: h * 2 + JARAK }
  }

  // 7+: grid 3 kolom, baris terakhir boleh tidak penuh (dibiarkan rata kiri,
  // bukan dilebarkan — melebarkan berarti sel jadi tidak seragam dengan
  // baris di atasnya).
  const kolom = 3
  const w = Math.floor((cw - JARAK * (kolom - 1)) / kolom)
  const h = Math.round(w * 0.72)
  const barisJumlah = Math.ceil(jumlah / kolom)
  const sel = Array.from({ length: jumlah }, (_, i) => ({
    x: (i % kolom) * (w + JARAK), y: Math.floor(i / kolom) * (h + JARAK), w, h,
  }))
  return { sel, tinggi: barisJumlah * h + (barisJumlah - 1) * JARAK }
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
  const cw = LEBAR - PAD * 2
  const { sel, tinggi: tinggiFoto } = hitungTataLetak(gambar.length, cw)
  const tinggi = TINGGI_KOP + PAD + tinggiFoto + PAD + TINGGI_KAKI

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

  // Foto — tiap sel punya ukurannya sendiri menurut hitungTataLetak(), diisi
  // dengan gambarCover() supaya foto memenuhi selnya tanpa pernah diregangkan
  // (dipotong di sisi terpanjang, bukan digepengkan).
  gambar.forEach((img, i) => {
    const { x: sx, y: sy, w, h } = sel[i]
    const x = PAD + sx
    const y = TINGGI_KOP + PAD + sy
    ctx.fillStyle = WARNA.navyMuda
    ctx.fillRect(x, y, w, h)
    gambarCover(ctx, img, x, y, w, h)
    // Nomor urut foto, supaya bisa dirujuk di berita acara.
    ctx.fillStyle = 'rgba(11,20,36,0.82)'
    ctx.fillRect(x, y + h - 30, 46, 30)
    ctx.fillStyle = WARNA.brass
    ctx.font = 'bold 15px Consolas, monospace'
    ctx.fillText(String(i + 1).padStart(2, '0'), x + 13, y + h - 10)
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
