import { NextResponse } from 'next/server'
import { AuthError, requireAdmin } from '@/lib/auth/require-admin'
import { createClient } from '@/lib/supabase/server'
import { gradeSubmissionSchema } from '@/features/submission/shared/submission.schema'
import { gradeSubmission } from '@/features/submission/server/submission-service'

export async function POST(request: Request) {
  const supabase = await createClient()

  let adminUser
  try {
    adminUser = await requireAdmin(supabase)
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

  const parsed = gradeSubmissionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const result = await gradeSubmission(supabase, adminUser.id, parsed.data)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ data: result.submission }, { status: 200 })
}
