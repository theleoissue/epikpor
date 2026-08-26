import { supabase } from './supabase'

export function compressImage(file, maxDim = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let w = img.width, h = img.height
        if (w > h && w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim }
        else if (h >= w && h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
      }
      img.onerror = () => reject(new Error('Gagal memuat gambar'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Gagal membaca berkas'))
    reader.readAsDataURL(file)
  })
}

// Path selalu diawali auth.uid() supaya cocok dengan RLS storage (folder per pengguna).
export async function unggahFoto(bucket, file) {
  const { data: { user } } = await supabase.auth.getUser()
  const blob = await compressImage(file)
  const nama = `${user.id}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(bucket).upload(nama, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return nama
}

export async function urlTertandaTangan(bucket, path, detikBerlaku = 3600) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, detikBerlaku)
  if (error) return null
  return data.signedUrl
}

export function getGeoPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 6000, maximumAge: 60000 },
    )
  })
}
