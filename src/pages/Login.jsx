import { useState } from 'react'
import { masuk } from '../lib/auth'

export default function Login() {
  const [nrp, setNrp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [memuat, setMemuat] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMemuat(true)
    try {
      await masuk(nrp.trim(), password)
    } catch (err) {
      setError(err.message || 'Gagal masuk.')
    } finally {
      setMemuat(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: 'radial-gradient(circle at 20% 20%, #16294A, #0B1424 65%)' }}>
      <form onSubmit={handleSubmit} className="w-full max-w-[420px] rounded-[20px] bg-paper p-9 shadow-2xl">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brass to-[#9c7c2f] font-display text-[17px] font-extrabold text-navy-950">EP</div>
        <h1 className="font-display text-[22px] font-semibold">Masuk ke E-Pikpor</h1>
        <p className="mb-6 mt-1 text-[13px] leading-relaxed text-ink-soft">
          Unit Gakkum Satlantas Polrestabes Bandung. Masuk dengan NRP dan kata sandi Anda.
        </p>
        <div className="mb-4">
          <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">NRP</label>
          <input
            value={nrp}
            onChange={(e) => setNrp(e.target.value)}
            required
            className="w-full rounded-lg border border-line px-3.5 py-2.5 text-[13.5px] outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
            placeholder="Nomor Registrasi Pokok"
          />
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">Kata Sandi</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-line px-3.5 py-2.5 text-[13.5px] outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
          />
        </div>
        {error && <div className="mb-4 rounded-lg bg-bad-bg px-3.5 py-2.5 text-[12.5px] text-bad">{error}</div>}
        <button
          type="submit"
          disabled={memuat}
          className="w-full rounded-[10px] bg-navy-950 py-3.5 font-display text-[13.5px] font-semibold text-white hover:bg-navy-800 disabled:opacity-40"
        >
          {memuat ? 'Memeriksa…' : 'Masuk'}
        </button>
        <div className="mt-3.5 text-center text-[11px] text-ink-soft">
          Akun dibuat oleh Administrator. Hubungi Administrator jika belum punya akun atau lupa kata sandi.
        </div>
      </form>
    </div>
  )
}
