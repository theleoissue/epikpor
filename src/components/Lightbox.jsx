import { useEffect, useState } from 'react'

export default function Lightbox({ urls, indexAwal = 0, onClose }) {
  const [index, setIndex] = useState(indexAwal)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % urls.length)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + urls.length) % urls.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [urls.length, onClose])

  if (!urls.length) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-6" onClick={onClose}>
      <button onClick={onClose} className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20">✕</button>
      {urls.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + urls.length) % urls.length) }} className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20">‹</button>
      )}
      <img src={urls[index]} alt="" className="max-h-[82vh] max-w-[90vw] rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
      {urls.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % urls.length) }} className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20">›</button>
      )}
      {urls.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white/85">{index + 1} / {urls.length}</div>
      )}
    </div>
  )
}
