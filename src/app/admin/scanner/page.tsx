import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireStaffOrAdmin } from '@/lib/auth/require-admin'
import { AdminScannerClient } from '@/features/checkin/client/admin-scanner-client'

export default async function AdminScannerPage() {
  const supabase = await createClient()

  try {
    await requireStaffOrAdmin(supabase)
  } catch {
    redirect('/admin')
  }

  return <AdminScannerClient />
}
