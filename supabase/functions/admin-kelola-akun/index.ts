// E-Pikpor — Edge Function: pengelolaan akun oleh administrator
// (Dokumen Teknis Bagian 5.1: "Pengelolaan akun oleh administrator: menambah,
// mengubah, dan menonaktifkan."). Membuat auth.users + password perlu service
// role key, jadi tidak bisa dilakukan langsung dari browser dengan anon key —
// makanya lewat Edge Function ini.
//
// Deploy lewat dashboard Supabase (Edge Functions -> Deploy). SUPABASE_URL,
// SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY sudah otomatis tersedia
// sebagai env var bawaan platform, tidak perlu diisi manual.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const DOMAIN_SINTESIS = 'epikpor.app'
const emailDariNrp = (nrp: string) => `nrp${nrp}@${DOMAIN_SINTESIS}`

// Wajib ditambahkan manual di Edge Function Supabase — tidak otomatis dapat
// header CORS seperti API bawaan PostgREST. Tanpa ini, panggilan fetch() dari
// browser (lihat src/lib/referensiApi.js) akan ditolak browser dengan error
// CORS sebelum sempat memeriksa isi responsnya.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}

async function buatAuthUser(admin: ReturnType<typeof createClient>, nrp: string, password: string) {
  // email_confirm: true membuat user langsung berstatus terkonfirmasi TANPA
  // mengirim email apa pun — beda dengan supabase.auth.signUp() di sisi klien,
  // yang tetap mencoba lewat jalur pengiriman email (dan kena "email rate
  // limit exceeded" pada layanan email bawaan Supabase yang sangat dibatasi).
  return admin.auth.admin.createUser({ email: emailDariNrp(nrp), password, email_confirm: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const body = await req.json()

    // Bootstrap Administrator pertama: TIDAK butuh sesi login sama sekali
    // (memang belum ada siapa pun yang bisa login) — cuma boleh jalan selama
    // belum ada satu pun baris peran_sistem='ADMIN'.
    if (body.action === 'bootstrap') {
      const { count } = await admin.from('pengguna').select('id', { count: 'exact', head: true }).eq('peran_sistem', 'ADMIN')
      if ((count ?? 0) > 0) {
        return json({ error: 'Administrator pertama sudah pernah didaftarkan.' }, 403)
      }
      const { nama, nrp, pangkat, gelar, password } = body
      if (!nama || !nrp || !password) {
        return json({ error: 'Lengkapi nama, NRP, dan kata sandi.' }, 400)
      }
      const { data: dibuat, error: buatErr } = await buatAuthUser(admin, nrp, password)
      if (buatErr) return json({ error: buatErr.message }, 400)

      const { error: insertErr } = await admin.from('pengguna').insert({
        id: dibuat.user.id, nama, nrp, pangkat, gelar, peran_sistem: 'ADMIN', status_aktif: true,
      })
      if (insertErr) {
        await admin.auth.admin.deleteUser(dibuat.user.id)
        return json({ error: insertErr.message }, 400)
      }
      return json({ ok: true })
    }

    // Aksi lainnya (buat akun biasa, reset password) wajib dipanggil Admin
    // yang sudah login.
    const authHeader = req.headers.get('Authorization') ?? ''
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authErr } = await anonClient.auth.getUser()
    if (authErr || !user) {
      return json({ error: 'Tidak terautentikasi.' }, 401)
    }

    const { data: pemanggil } = await admin.from('pengguna').select('peran_sistem').eq('id', user.id).single()
    if (pemanggil?.peran_sistem !== 'ADMIN') {
      return json({ error: 'Hanya administrator yang boleh mengelola akun.' }, 403)
    }

    if (body.action === 'buat') {
      const { nama, nrp, pangkat, gelar, peran_sistem, zona_id, regu_id, password } = body
      if (!nama || !nrp || !peran_sistem || !password) {
        return json({ error: 'Lengkapi nama, NRP, peran, dan kata sandi awal.' }, 400)
      }
      if ((peran_sistem === 'BANIT' || peran_sistem === 'KASUBNIT') && !zona_id) {
        return json({ error: 'Personel dengan peran Banit atau Kasubnit wajib diberi zona.' }, 400)
      }
      if (peran_sistem === 'BANIT' && !regu_id) {
        return json({ error: 'Personel dengan peran Banit wajib diberi regu.' }, 400)
      }
      const { data: dibuat, error: buatErr } = await buatAuthUser(admin, nrp, password)
      if (buatErr) return json({ error: buatErr.message }, 400)

      const { error: insertErr } = await admin.from('pengguna').insert({
        id: dibuat.user.id, nama, nrp, pangkat, gelar, peran_sistem,
        zona_id: zona_id || null, regu_id: regu_id || null,
      })
      if (insertErr) {
        await admin.auth.admin.deleteUser(dibuat.user.id)
        return json({ error: insertErr.message }, 400)
      }
      return json({ ok: true, id: dibuat.user.id })
    }

    if (body.action === 'reset_password') {
      const { pengguna_id, password_baru } = body
      if (!pengguna_id || !password_baru) {
        return json({ error: 'Lengkapi pengguna_id dan password_baru.' }, 400)
      }
      const { error } = await admin.auth.admin.updateUserById(pengguna_id, { password: password_baru })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    // "Masuk sebagai": Admin bisa membuka sesi sebagai akun lain tanpa tahu
    // kata sandinya, lewat magic link yang dibuat server (service role) --
    // dicatat ke log_aktivitas supaya tetap terlacak siapa masuk sebagai
    // siapa dan kapan. Frontend menukar token ini jadi sesi aktif lewat
    // supabase.auth.verifyOtp({token_hash, type:'magiclink'}).
    if (body.action === 'impersonate') {
      const { pengguna_id } = body
      if (!pengguna_id) return json({ error: 'Lengkapi pengguna_id.' }, 400)
      const { data: target } = await admin.from('pengguna').select('nrp, nama').eq('id', pengguna_id).single()
      if (!target) return json({ error: 'Personel tidak ditemukan.' }, 404)

      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink', email: emailDariNrp(target.nrp),
      })
      if (linkErr) return json({ error: linkErr.message }, 400)

      await admin.from('log_aktivitas').insert({
        entity_type: 'PENGGUNA', entity_id: pengguna_id, aktor_id: user.id,
        aksi: `Admin masuk sebagai ${target.nama}`, detail: null,
      })

      return json({ ok: true, email: emailDariNrp(target.nrp), token_hash: link.properties.hashed_token })
    }

    return json({ error: 'Aksi tidak dikenal.' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
