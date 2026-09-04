// E-Pikpor — penyusun kolase foto TKP.
//
// Menggabungkan lampiran foto satu kejadian jadi satu gambar berkop, supaya
// bisa langsung dilampirkan ke laporan atau dikirim lewat WhatsApp tanpa
// mengirim foto satu per satu. Kopnya memakai desain resmi Satlantas
// Polrestabes Bandung (dari Canva, dikirim client) apa adanya sebagai latar;
// cuma strip info dan grid foto yang digambar lewat Canvas. Semua
// penggambaran dilakukan di sisi peramban — tidak ada layanan luar yang
// menerima foto TKP.

import { fmtDate, fmtTime } from './format'
import kopSatlantasUrl from '../assets/kop-satlantas.jpg'

// Kop resmi Satlantas Polrestabes Bandung (dari Canva, dikirim client) —
// dipakai apa adanya sebagai latar, bukan digambar ulang lewat kode seperti
// kop generik di bawah. Batas antara kop dan area foto (y=234, di bawah bar
// hitam ikon medsos) diukur langsung dari pikselnya, bukan ditebak.
const KOP_SATLANTAS_TINGGI_KOP = 234

const JARAK = 14

const WARNA = {
  navyMuda: '#16294A',
  brass: '#C9A24B',
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

// Tata letak untuk KOTAK BERUKURAN TETAP (dipakai kop Satlantas — kanvasnya
// sudah punya ukuran baku 1080x1080 seperti unggahan Instagram, jadi TIDAK
// boleh dibuat lebih tinggi/pendek mengikuti jumlah foto seperti
// hitungTataLetak() di atas). Sebagai gantinya, tinggi tiap baris dibagi rata
// dari tinggi kotak yang sudah pasti, dan lebar tiap sel dalam satu baris
// dibagi rata dari lebar kotak — supaya baris terakhir yang tidak penuh tetap
// mengisi penuh lebarnya, bukan menyisakan celah kosong yang mencolok pada
// kanvas berukuran tetap.
function hitungTataLetakTetap(jumlah, cw, ch) {
  const susunBaris = (barisIsi) => {
    const n = barisIsi.length
    const tinggiBaris = Math.floor((ch - JARAK * (n - 1)) / n)
    let y = 0
    const sel = []
    barisIsi.forEach((jmlKolom, i) => {
      const tinggi = i === n - 1 ? ch - y : tinggiBaris
      const lebar = Math.floor((cw - JARAK * (jmlKolom - 1)) / jmlKolom)
      for (let k = 0; k < jmlKolom; k++) {
        const w = k === jmlKolom - 1 ? cw - k * (lebar + JARAK) : lebar
        sel.push({ x: k * (lebar + JARAK), y, w, h: tinggi })
      }
      y += tinggi + JARAK
    })
    return sel
  }

  if (jumlah === 1) return susunBaris([1])
  if (jumlah === 2) return susunBaris([1, 1]) // dua baris ditumpuk — kotaknya lanskap, jadi menumpuk lebih wajar daripada dua kolom kurus
  if (jumlah === 3) return susunBaris([1, 2]) // satu foto besar di atas, dua kecil berdampingan di bawah
  if (jumlah === 4) return susunBaris([2, 2])
  if (jumlah === 5) return susunBaris([3, 2])
  if (jumlah === 6) return susunBaris([3, 3])
  // 7+: maksimal 3 kolom per baris, baris terakhir tetap mengisi penuh lebar.
  const barisIsi = []
  let sisa = jumlah
  while (sisa > 0) { const n = Math.min(3, sisa); barisIsi.push(n); sisa -= n }
  return susunBaris(barisIsi)
}

function potong(ctx, teks, maksLebar) {
  if (ctx.measureText(teks).width <= maksLebar) return teks
  let hasil = teks
  while (hasil.length > 1 && ctx.measureText(hasil + '…').width > maksLebar) {
    hasil = hasil.slice(0, -1)
  }
  return hasil + '…'
}

// Kanvasnya mengikuti ukuran asli gambar kop (1080x1080, dari Canva) —
// dirancang sebagai satu unggahan Instagram baku, bukan lampiran laporan
// yang tingginya menyesuaikan jumlah foto.
export async function buatKolaseSatlantas(urls, info) {
  if (!urls || urls.length === 0) throw new Error('Belum ada foto TKP untuk dijadikan kolase.')

  const [kop, ...gambar] = await Promise.all([muatGambar(kopSatlantasUrl), ...urls.map(muatGambar)])
  const LEBAR_KOP = kop.width
  const TINGGI_TOTAL = kop.height

  const kanvas = document.createElement('canvas')
  kanvas.width = LEBAR_KOP
  kanvas.height = TINGGI_TOTAL
  const ctx = kanvas.getContext('2d')

  // Kop dipakai apa adanya — tidak digambar ulang, cuma ditempel penuh.
  ctx.drawImage(kop, 0, 0, LEBAR_KOP, TINGGI_TOTAL)

  // Strip info (lokasi/jenis/waktu) di atas area foto. Kop aslinya tidak
  // menyediakan ruang untuk ini di dalam desainnya sendiri, jadi ditambahkan
  // sebagai bar gelap tipis persis di bawah bar ikon medsos, sebelum foto.
  const PAD_K = 24
  const TINGGI_STRIP = 76
  const yStrip = KOP_SATLANTAS_TINGGI_KOP
  ctx.fillStyle = 'rgba(3,8,20,0.82)'
  ctx.fillRect(0, yStrip, LEBAR_KOP, TINGGI_STRIP)

  ctx.fillStyle = WARNA.brass
  ctx.font = 'bold 15px Consolas, monospace'
  ctx.fillText('DOKUMENTASI TEMPAT KEJADIAN PERKARA', PAD_K, yStrip + 22)
  ctx.fillStyle = WARNA.putih
  ctx.font = 'bold 22px Georgia, serif'
  ctx.fillText(potong(ctx, info.lokasi || 'Lokasi tidak dicatat', LEBAR_KOP - PAD_K * 2), PAD_K, yStrip + 48)
  ctx.fillStyle = WARNA.redup
  ctx.font = '13px Calibri, Arial, sans-serif'
  const barisInfo = [
    info.jenis,
    info.waktu ? `${fmtDate(info.waktu)} · ${fmtTime(info.waktu)} WIB` : null,
    info.zona ? `Zona ${info.zona}${info.regu ? ` · Regu ${info.regu}` : ''}` : null,
  ].filter(Boolean).join('   |   ')
  ctx.fillText(potong(ctx, barisInfo, LEBAR_KOP - PAD_K * 2), PAD_K, yStrip + 68)

  // Foto — mengisi PENUH sisa kanvas (kotak berukuran tetap), tidak pernah
  // membuat kanvas ini lebih tinggi. Tetap memakai gambarCover() supaya
  // tidak ada foto yang diregangkan.
  const yFoto = yStrip + TINGGI_STRIP + JARAK
  const cw = LEBAR_KOP - PAD_K * 2
  const ch = TINGGI_TOTAL - yFoto - PAD_K
  const sel = hitungTataLetakTetap(gambar.length, cw, ch)

  gambar.forEach((img, i) => {
    const { x: sx, y: sy, w, h } = sel[i]
    const x = PAD_K + sx
    const y = yFoto + sy
    ctx.fillStyle = WARNA.navyMuda
    ctx.fillRect(x, y, w, h)
    gambarCover(ctx, img, x, y, w, h)
    ctx.fillStyle = 'rgba(11,20,36,0.82)'
    ctx.fillRect(x, y + h - 28, 42, 28)
    ctx.fillStyle = WARNA.brass
    ctx.font = 'bold 14px Consolas, monospace'
    ctx.fillText(String(i + 1).padStart(2, '0'), x + 12, y + h - 9)
  })

  // Pelapor dicantumkan di pojok kanan bawah, di atas area foto terakhir —
  // kop aslinya tidak punya bagian kaki seperti kolase generik.
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '11px Calibri, Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(potong(ctx, `Pelapor: ${info.pelapor || '-'} · ${gambar.length} foto`, cw), LEBAR_KOP - PAD_K, TINGGI_TOTAL - 8)
  ctx.textAlign = 'left'

  return new Promise((resolve, reject) => {
    kanvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Gagal menyusun kolase.'))
    }, 'image/jpeg', 0.92)
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
