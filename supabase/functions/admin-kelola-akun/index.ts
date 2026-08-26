// E-Pikpor — Edge Function: pengelolaan akun oleh administrator
// (Dokumen Teknis Bagian 5.1: "Pengelolaan akun oleh administrator: menambah,
// mengubah, dan menonaktifkan."). Membuat auth.users + password perlu service
// role key, jadi tidak bisa dilakukan langsung dari browser dengan anon key —
// makanya lewat Edge Function ini.
//
// Deploy & set secrets lewat dashboard Supabase (Edge Functions -> Deploy),
// SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sudah otomatis tersedia sebagai
// env var bawaan platform, tidak perlu diisi manual.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const DOMAIN_SINTESIS = 'epikpor.app'
const emailDariNrp = (nrp: string) => `nrp${nrp}@${DOMAIN_SINTESIS}`

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authErr } = await anonClient.auth.getUser()
    if (authErr || !user) {
      return Response.json({ error: 'Tidak terautentikasi.' }, { status: 401 })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: pemanggil } = await admin.from('pengguna').select('peran_sistem').eq('id', user.id).single()
    if (pemanggil?.peran_sistem !== 'ADMIN') {
      return Response.json({ error: 'Hanya administrator yang boleh mengelola akun.' }, { status: 403 })
    }

    const body = await req.json()

    if (body.action === 'buat') {
      const { nama, nrp, pangkat, gelar, peran_sistem, zona_id, regu_id, password } = body
      if (!nama || !nrp || !peran_sistem || !password) {
        return Response.json({ error: 'Lengkapi nama, NRP, peran, dan kata sandi awal.' }, { status: 400 })
      }
      const { data: dibuat, error: buatErr } = await admin.auth.admin.createUser({
        email: emailDariNrp(nrp),
        password,
        email_confirm: true,
      })
      if (buatErr) return Response.json({ error: buatErr.message }, { status: 400 })

      const { error: insertErr } = await admin.from('pengguna').insert({
        id: dibuat.user.id, nama, nrp, pangkat, gelar, peran_sistem,
        zona_id: zona_id || null, regu_id: regu_id || null,
      })
      if (insertErr) {
        await admin.auth.admin.deleteUser(dibuat.user.id)
        return Response.json({ error: insertErr.message }, { status: 400 })
      }
      return Response.json({ ok: true, id: dibuat.user.id })
    }

    if (body.action === 'reset_password') {
      const { pengguna_id, password_baru } = body
      if (!pengguna_id || !password_baru) {
        return Response.json({ error: 'Lengkapi pengguna_id dan password_baru.' }, { status: 400 })
      }
      const { error } = await admin.auth.admin.updateUserById(pengguna_id, { password: password_baru })
      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ ok: true })
    }

    return Response.json({ error: 'Aksi tidak dikenal.' }, { status: 400 })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
})
