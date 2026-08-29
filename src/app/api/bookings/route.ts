import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBookingSchema } from '@/features/booking/shared/booking.schema'
import { createBooking, BookingError } from '@/features/booking/server/booking-service'

export async function POST(request: Request) {
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Kamu harus login dulu' }, { status: 401 })
  }

  // 2. Parse & validate body JSON
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Body request harus berupa JSON valid' },
      { status: 400 }
    )
  }

  const parsed = createBookingSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // 3. Delegate to service layer
  try {
    const booking = await createBooking(
      supabase,
      parsed.data.session_id,
      parsed.data.jumlah_anak
    )
    return NextResponse.json({ data: booking }, { status: 201 })
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error(err)
    return NextResponse.json({ error: 'Terjadi kesalahan, coba lagi' }, { status: 500 })
  }
}
