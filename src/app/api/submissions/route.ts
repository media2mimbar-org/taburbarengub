import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitWritingSchema } from '@/features/submission/shared/submission.schema'
import { submitWriting } from '@/features/submission/server/submission-service'

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

  const parsed = submitWritingSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // 3. Delegate to service layer (calls RPC setor_karya)
  const result = await submitWriting(supabase, parsed.data)

  if (!result.ok) {
    const statusCode =
      result.code === 'VALIDATION_ERROR'
        ? 400
        : result.code === 'UNAUTHORIZED'
          ? 401
          : result.code === 'NOT_OWNED' || result.code === 'FILE_NOT_OWNED'
            ? 403
            : result.code === 'WINDOW_CLOSED'
              ? 409
              : 500

    return NextResponse.json({ error: result.error, code: result.code }, { status: statusCode })
  }

  return NextResponse.json({ data: result.submission }, { status: 201 })
}
