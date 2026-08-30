import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export type AllowedRole = 'admin' | 'staff' | 'mentor'

export async function requireRole(
  supabase: SupabaseClient<Database>,
  allowedRoles: AllowedRole[]
): Promise<{ user: User; role: AllowedRole }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AuthError('Kamu harus login dulu', 401)
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as AllowedRole | undefined

  if (profileError || !role || !allowedRoles.includes(role)) {
    throw new AuthError('Akses ditolak', 403)
  }

  return { user, role }
}

export async function requireAdmin(
  supabase: SupabaseClient<Database>
): Promise<User> {
  const { user } = await requireRole(supabase, ['admin'])
  return user
}

export async function requireStaffOrAdmin(
  supabase: SupabaseClient<Database>
): Promise<User> {
  const { user } = await requireRole(supabase, ['admin', 'staff'])
  return user
}

export async function requireMentorOrAdmin(
  supabase: SupabaseClient<Database>
): Promise<User> {
  const { user } = await requireRole(supabase, ['admin', 'mentor'])
  return user
}
