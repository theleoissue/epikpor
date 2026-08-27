import { useEffect, useRef, useState } from 'react'

// Dipakai khusus di Beranda (swafoto/lokasi/serah terima) sebagai pengganti
// <input type="file" capture>. Alasannya: capture memaksa Android membuka
// aplikasi kamera terpisah, dan di banyak HP (RAM terbatas) itu membuat tab
// browser dimatikan di latar belakang untuk hemat memori -- begitu kembali,
// halaman diam-diam kehilangan foto yang baru diambil tanpa pesan error
// apa pun. Kamera dalam halaman ini tidak pernah keluar dari tab, jadi tidak
// bisa kena masalah itu.
export default function KameraCapture({ facingMode = 'user', onAmbil, onBatal }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [siap, setSiap] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let dibatalkan = false
    // Tanpa width/height, browser sering pilih resolusi rendah (mis. 640x480)
    // secara default -- diminta eksplisit resolusi tinggi ("ideal", bukan
    // wajib) supaya hasil fotonya setajam mungkin, sebanding dengan kamera
    // bawaan HP. Browser otomatis menurunkan ke resolusi maksimal yang
    // didukung kamera kalau device-nya tidak sanggup 4K.
    navigator.mediaDevices?.getUserMedia({
      video: { facingMode, width: { ideal: 3840 }, height: { ideal: 2160 } },
      audio: false,
    })
      .then((stream) => {
        if (dibatalkan) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setSiap(true)
      })
      .catch(() => setError('Tidak bisa mengakses kamera. Pastikan izin kamera diaktifkan untuk situs ini.'))
    return () => { dibatalkan = true; streamRef.current?.getTracks().forEach((t) => t.stop()) }
  }, [facingMode])

  function hentikanStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  function ambilFoto() {
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      hentikanStream()
      onAmbil(blob)
    }, 'image/jpeg', 0.9)
  }

  function batal() {
    hentikanStream()
    onBatal()
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 p-4">
      {error ? (
        <div className="max-w-xs text-center text-white">
          <p className="mb-4 text-[13px]">{error}</p>
          <button onClick={batal} className="rounded-lg border border-white/30 px-4 py-2 text-[12.5px] font-semibold">Tutup</button>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="max-h-[70vh] w-full max-w-md rounded-xl object-cover" />
          <div className="mt-5 flex gap-3">
            <button onClick={batal} className="rounded-full border border-white/30 px-5 py-3 text-[12.5px] font-semibold text-white">Batal</button>
            <button onClick={ambilFoto} disabled={!siap} className="rounded-full bg-white px-7 py-3 text-[12.5px] font-bold text-navy-950 disabled:opacity-40">📷 Ambil Foto</button>
          </div>
        </>
      )}
    </div>
  )
}
