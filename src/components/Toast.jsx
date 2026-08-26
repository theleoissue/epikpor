import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return ctx
}

export function ToastProvider({ children }) {
  const [daftar, setDaftar] = useState([])
  const idRef = useRef(0)

  const toast = useCallback((pesan, error = false) => {
    const id = idRef.current++
    setDaftar((d) => [...d, { id, pesan, error }])
    setTimeout(() => setDaftar((d) => d.filter((t) => t.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {daftar.map((t) => (
          <div
            key={t.id}
            className={`max-w-xs rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg border-l-4 ${t.error ? 'border-bad' : 'border-brass'}`}
            style={{ backgroundColor: '#0B1424' }}
          >
            {t.pesan}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
