import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitQuizSchema } from '@/features/classroom/shared/classroom.schema'
import { submitQuizProgress } from '@/features/classroom/server/classroom-service'

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

  // 2. Parse & Validate request body
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Body request harus berupa JSON valid' },
      { status: 400 }
    )
  }

  const parsed = submitQuizSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // 3. Delegate to service layer
  const result = await submitQuizProgress(supabase, user.id, parsed.data)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ data: result.progress }, { status: 200 })
}
