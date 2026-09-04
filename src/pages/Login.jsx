import { useEffect, useState } from 'react'
import { masuk, adaAdmin, daftarAdminPertama } from '../lib/auth'
import logoLengkap from '../assets/logo-lengkap.png'
import logoShield from '../assets/logo-shield.png'

export default function Login() {
  const [nrp, setNrp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [memuat, setMemuat] = useState(false)
  const [modeSetup, setModeSetup] = useState(null) // null = belum tahu, true/false setelah dicek

  useEffect(() => {
    adaAdmin().then((ada) => setModeSetup(!ada)).catch(() => setModeSetup(false))
  }, [])

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

  if (modeSetup === null) return null
  if (modeSetup) return <SetupAdminPertama />

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6" style={{ background: 'radial-gradient(circle at 20% 20%, #16294A, #0B1424 65%)' }}>
      <img src={logoLengkap} alt="E-Pikpor" className="h-14 w-auto sm:h-16" />
      <form onSubmit={handleSubmit} className="w-full max-w-[420px] rounded-[20px] bg-paper p-9 shadow-2xl">
        <img src={logoShield} alt="" className="mb-4 h-11 w-11" />
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

function SetupAdminPertama() {
  const [form, setForm] = useState({ nama: '', nrp: '', pangkat: '', gelar: '', password: '' })
  const [error, setError] = useState('')
  const [memuat, setMemuat] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.nama || !form.nrp || !form.password) return setError('Lengkapi nama, NRP, dan kata sandi.')
    setMemuat(true)
    try {
      await daftarAdminPertama(form)
      // daftarAdminPertama sudah login otomatis di baliknya (masuk()), jadi
      // AuthProvider akan menangkap sesi barunya sendiri lewat
      // onAuthStateChange. Reload penuh dipakai supaya transisinya bersih.
      window.location.reload()
    } catch (err) {
      setError(err.message || 'Gagal mendaftarkan Administrator.')
    } finally {
      setMemuat(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6" style={{ background: 'radial-gradient(circle at 20% 20%, #16294A, #0B1424 65%)' }}>
      <img src={logoLengkap} alt="E-Pikpor" className="h-14 w-auto sm:h-16" />
      <form onSubmit={handleSubmit} className="w-full max-w-[440px] rounded-[20px] bg-paper p-9 shadow-2xl">
        <img src={logoShield} alt="" className="mb-4 h-11 w-11" />
        <h1 className="font-display text-[22px] font-semibold">Pengaturan Awal</h1>
        <p className="mb-6 mt-1 text-[13px] leading-relaxed text-ink-soft">
          Belum ada akun Administrator sama sekali di E-Pikpor ini. Daftarkan diri Anda sebagai Administrator pertama — langkah ini cuma tersedia sekali, sebelum ada Admin.
        </p>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">Nama Lengkap</label>
            <input value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} className="w-full rounded-lg border border-line px-3.5 py-2.5 text-[13.5px]" placeholder="mis. Fiekry Adi Perdana" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">NRP</label>
            <input value={form.nrp} onChange={(e) => setForm((f) => ({ ...f, nrp: e.target.value }))} className="w-full rounded-lg border border-line px-3.5 py-2.5 text-[13.5px]" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">Pangkat</label>
            <input value={form.pangkat} onChange={(e) => setForm((f) => ({ ...f, pangkat: e.target.value }))} className="w-full rounded-lg border border-line px-3.5 py-2.5 text-[13.5px]" placeholder="mis. AKP" />
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">Gelar (opsional)</label>
            <input value={form.gelar} onChange={(e) => setForm((f) => ({ ...f, gelar: e.target.value }))} className="w-full rounded-lg border border-line px-3.5 py-2.5 text-[13.5px]" />
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">Kata Sandi</label>
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full rounded-lg border border-line px-3.5 py-2.5 text-[13.5px]" />
          </div>
        </div>
        {error && <div className="mb-4 rounded-lg bg-bad-bg px-3.5 py-2.5 text-[12.5px] text-bad">{error}</div>}
        <button type="submit" disabled={memuat} className="w-full rounded-[10px] bg-brass py-3.5 font-display text-[13.5px] font-semibold text-navy-950 hover:brightness-95 disabled:opacity-40">
          {memuat ? 'Mendaftarkan…' : 'Daftar sebagai Administrator'}
        </button>
        <div className="mt-3.5 text-center text-[11px] text-ink-soft">
          Kalau ini bukan Anda yang seharusnya jadi Administrator pertama, hubungi yang menyiapkan project ini sebelum lanjut.
        </div>
      </form>
    </div>
  )
}
