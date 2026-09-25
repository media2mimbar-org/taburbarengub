import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jawabKuisSchema } from '@/features/classroom/shared/classroom.schema'
import { getSoalKelas, jawabKuis } from '@/features/classroom/server/classroom-service'

// Status HTTP dari hint RPC. Gerbangnya di DB; di sini cuma penerjemahan.
function statusDari(code: string): number {
  if (code === 'BELUM_MASUK') return 401
  if (code === 'BUKAN_PESERTA_BIMBINGAN') return 403
  if (code === 'KELAS_TIDAK_DITEMUKAN') return 404
  if (code === 'VALIDATION_ERROR' || code === 'JAWABAN_TIDAK_VALID') return 400
  if (code.startsWith('KUIS_')) return 409
  return 500
}

async function requireUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  return { supabase, user: error ? null : data.user }
}

/** GET ?kelas_id= — membuka kuis dan menyajikan soal tanpa kunci. */
export async function GET(request: Request) {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Kamu harus login dulu' }, { status: 401 })

  const kelasId = new URL(request.url).searchParams.get('kelas_id')
  if (!kelasId) return NextResponse.json({ error: 'kelas_id wajib diisi' }, { status: 400 })

  const result = await getSoalKelas(supabase, kelasId)
  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: statusDari(result.code) })
  }
  return NextResponse.json({ data: result.soal })
}

/** POST { kelas_id, jawaban } — sekali kirim, final. */
export async function POST(request: Request) {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Kamu harus login dulu' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body request harus berupa JSON valid' }, { status: 400 })
  }

  const parsed = jawabKuisSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const result = await jawabKuis(supabase, parsed.data)
  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: statusDari(result.code) })
  }
  return NextResponse.json({ data: { selesai: true } })
}
