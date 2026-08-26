import { supabase } from './supabase'

export async function ambilRosterPeriode(dariTanggal, keTanggal) {
  const { data, error } = await supabase
    .from('roster_piket')
    .select('*, zona:zona_id(nama), regu:regu_id(nomor), personel:roster_personel(pengguna_id, pengguna:pengguna_id(nama, pangkat))')
    .gte('tanggal', dariTanggal)
    .lte('tanggal', keTanggal)
    .order('tanggal')
  if (error) throw error
  return data
}

export async function ambilRosterSaya(pengguna_id, dariTanggal, keTanggal) {
  const { data, error } = await supabase
    .from('roster_personel')
    .select('pengguna_id, roster:roster_piket_id(tanggal, mode_hari, zona:zona_id(nama), regu:regu_id(nomor))')
    .eq('pengguna_id', pengguna_id)
  if (error) throw error
  return (data || [])
    .map((r) => r.roster)
    .filter((r) => r.tanggal >= dariTanggal && r.tanggal <= keTanggal)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
}

export async function simpanBarisRoster({ tanggal, mode_hari, zona_id, regu_id, disusun_oleh, pengguna_ids }) {
  const { data: baris, error } = await supabase
    .from('roster_piket')
    .upsert({ tanggal, mode_hari, zona_id, regu_id, disusun_oleh }, { onConflict: 'tanggal,zona_id,regu_id' })
    .select()
    .single()
  if (error) throw error

  const { error: errHapus } = await supabase.from('roster_personel').delete().eq('roster_piket_id', baris.id)
  if (errHapus) throw errHapus
  if (pengguna_ids?.length) {
    const { error: err2 } = await supabase
      .from('roster_personel')
      .insert(pengguna_ids.map((pengguna_id) => ({ roster_piket_id: baris.id, pengguna_id })))
    if (err2) throw err2
  }
  return baris
}

export async function salinRosterMingguSebelumnya(tanggalMulaiBaru, disusun_oleh) {
  const asal = new Date(tanggalMulaiBaru)
  asal.setDate(asal.getDate() - 7)
  const asalIso = asal.toISOString().slice(0, 10)
  const akhirAsal = new Date(asal)
  akhirAsal.setDate(akhirAsal.getDate() + 6)

  const barisAsal = await ambilRosterPeriode(asalIso, akhirAsal.toISOString().slice(0, 10))
  for (const b of barisAsal) {
    const tanggalBaru = new Date(b.tanggal)
    tanggalBaru.setDate(tanggalBaru.getDate() + 7)
    await simpanBarisRoster({
      tanggal: tanggalBaru.toISOString().slice(0, 10),
      mode_hari: b.mode_hari,
      zona_id: b.zona.id ?? b.zona_id,
      regu_id: b.regu.id ?? b.regu_id,
      disusun_oleh,
      pengguna_ids: (b.personel || []).map((p) => p.pengguna_id),
    })
  }
}

// Pembanding "dijadwalkan vs yang benar-benar buka sesi" untuk papan pemantauan.
export async function ambilJadwalHariIni(zona_id) {
  const hariIni = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('roster_piket')
    .select('regu:regu_id(nomor), personel:roster_personel(pengguna:pengguna_id(id, nama))')
    .eq('zona_id', zona_id)
    .eq('tanggal', hariIni)
  if (error) throw error
  return data
}
