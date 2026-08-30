import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

describe('Database Live Integration & RPC Execution Tests', () => {
  let supabase: SupabaseClient<Database>
  let authClient: SupabaseClient<Database> | null = null
  let isDbConnected = false
  const testEmail = `test-integration-${Date.now()}@tabur.test`
  const testPassword = 'Password123!'

  before(async () => {
    try {
      supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      const res = await supabase.from('hero_content').select('id').limit(1)
      isDbConnected = res.error === null

      if (isDbConnected) {
        // Create an authenticated client for testing RPCs with real JWT
        authClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })

        const signUpRes = await authClient.auth.signUp({
          email: testEmail,
          password: testPassword,
        })

        if (!signUpRes.data.session) {
          const signInRes = await authClient.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
          })
          if (!signInRes.data.session) {
            authClient = null
          }
        }
      }
    } catch {
      isDbConnected = false
      authClient = null
    }
  })

  it('verifies live database connection or skips cleanly', (t) => {
    if (!isDbConnected) {
      t.skip('Local Supabase database is not running on ' + supabaseUrl)
      return
    }
    assert.strictEqual(isDbConnected, true)
  })

  it('verifies kloter_aktif computed view returns active kloter in menyimak phase', async (t) => {
    if (!isDbConnected) {
      t.skip('Database offline')
      return
    }

    const { data, error } = await supabase
      .from('kloter_aktif')
      .select('*')
      .maybeSingle()

    assert.strictEqual(error, null)
    if (data) {
      assert.ok(data.id)
      assert.strictEqual(data.fase, 'menyimak')
    }
  })

  it('executes update_profile RPC as authenticated user and verifies normalization & update', async (t) => {
    if (!isDbConnected || !authClient) {
      t.skip('Database or auth offline')
      return
    }

    const { data, error } = await authClient
      .rpc('update_profile', {
        p_nama: 'Integration Tester',
        p_nama_panggilan: 'Tester',
        p_no_hp: '081234567890',
        p_jenis_kelamin: 'ikhwan',
        p_tanggal_lahir: '1995-05-15',
        p_profesi: 'Engineer',
        p_domisili: 'Malang',
      })
      .single()

    assert.strictEqual(error, null)
    const userProfile = data as Database['public']['Tables']['users']['Row'] | null
    assert.ok(userProfile !== null)
    if (userProfile) {
      assert.strictEqual(userProfile.nama, 'Integration Tester')
      assert.strictEqual(userProfile.no_hp, '6281234567890') // Normalisasi 628
      assert.strictEqual(userProfile.jenis_kelamin, 'ikhwan')
      assert.strictEqual(userProfile.tanggal_lahir, '1995-05-15')
    }
  })
  it('executes submit_classroom_progress RPC with authenticated client and verifies ownership gate', async (t) => {
    if (!isDbConnected || !authClient) {
      t.skip('Database or auth offline')
      return
    }

    // Get an existing class id
    const { data: kelasList } = await supabase
      .from('kelas')
      .select('id')
      .limit(1)

    const kelasId = kelasList?.[0]?.id ?? '00000000-0000-0000-0000-000000000000'

    const { data, error } = await authClient
      .rpc('submit_classroom_progress', {
        p_kelas_id: kelasId,
        p_watched_seconds: 60,
        p_quiz_answers: [{ soal_id: 1, pilihan: 'A' }],
        p_quiz_score: 100,
      })
      .single()

    assert.strictEqual(data, null)
    assert.ok(error !== null)
    // Authenticated user doesn't own this season yet -> BUKAN_SEASON_MILIK (42501)
    // This proves the SQL body compiled, found the class, and evaluated user_seasons ownership!
    assert.strictEqual(error?.code, '42501')
  })

  it('executes setor_karya RPC and rejects directory traversal .. in file path', async (t) => {
    if (!isDbConnected || !authClient) {
      t.skip('Database or auth offline')
      return
    }

    const { data, error } = await authClient
      .rpc('setor_karya', {
        p_file_url: 'user1/kloter1/../escape.pdf',
      })
      .single()

    assert.strictEqual(data, null)
    assert.ok(error !== null)
    assert.strictEqual(error?.code, '22000') // FORMAT_FILE_TIDAK_VALID
  })

  it('executes create_booking RPC and validates booking invariants', async (t) => {
    if (!isDbConnected || !authClient) {
      t.skip('Database or auth offline')
      return
    }

    // Get an existing published session
    const { data: sessionList } = await supabase
      .from('event_sessions')
      .select('id')
      .eq('status', 'published')
      .limit(1)

    if (!sessionList || sessionList.length === 0) {
      t.skip('No published sessions in database')
      return
    }

    const sessionId = sessionList[0].id

    // User already has no_hp updated above -> should succeed or report existing/capacity
    const { data, error } = await authClient
      .rpc('create_booking', {
        p_session_id: sessionId,
        p_jumlah_anak: 0,
      })
      .single()

    if (error) {
      // If already booked, code TB105
      assert.ok(['TB105', 'TB103'].includes(error.code))
    } else {
      const booking = data as Database['public']['Tables']['bookings']['Row'] | null
      assert.ok(booking !== null)
      if (booking) {
        assert.strictEqual(booking.session_id, sessionId)
        assert.strictEqual(booking.status, 'booked')
      }
    }
  })
  it('executes nilai_karya RPC and rejects non-mentor user', async (t) => {
    if (!isDbConnected || !authClient) {
      t.skip('Database or auth offline')
      return
    }

    const { data, error } = await authClient
      .rpc('nilai_karya', {
        p_submission_id: '00000000-0000-0000-0000-000000000000',
        p_nilai: { score: 100 },
      })
      .single()

    assert.strictEqual(data, null)
    assert.ok(error !== null)
    // Non-mentor/non-admin user gets NASKAH_TIDAK_DITEMUKAN (P0002) or BUKAN_MENTOR_KLOTER (42501)
    assert.ok(['P0002', '42501'].includes(error?.code ?? ''))
  })
})
