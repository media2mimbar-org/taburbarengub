import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuthError, requireAdmin } from '@/lib/auth/require-admin'
import { checkInSchema } from '@/features/checkin/shared/checkin.schema'
import { checkInBooking, CheckInError } from '@/features/checkin/server/checkin-service'

export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    await requireAdmin(supabase)
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan autentikasi' }, { status: 500 })
  }
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Body request harus berupa JSON valid' },
      { status: 400 }
    )
  }

  const parsed = checkInSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const result = await checkInBooking(supabase, parsed.data.qr_token)
    return NextResponse.json({ data: result }, { status: 200 })
  } catch (err) {
    if (err instanceof CheckInError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }

    console.error(err)
    return NextResponse.json({ error: 'Terjadi kesalahan, coba lagi' }, { status: 500 })
  }
}
