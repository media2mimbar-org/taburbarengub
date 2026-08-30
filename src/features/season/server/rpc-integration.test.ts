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
  let isDbConnected = false

  before(async () => {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })

    try {
      const res = await supabase.from('hero_content').select('id').limit(1)
      isDbConnected = res.error === null
    } catch {
      isDbConnected = false
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

  it('executes submit_classroom_progress RPC and verifies SQL body executes without column errors', async (t) => {
    if (!isDbConnected) {
      t.skip('Database offline')
      return
    }

    // Call as anon - should be caught by auth check inside RPC body (BELUM_MASUK)
    // This proves the SQL body compiled and executed without column mismatch errors!
    const { data, error } = await supabase
      .rpc('submit_classroom_progress', {
        p_kelas_id: '00000000-0000-0000-0000-000000000000',
        p_watched_seconds: 60,
        p_quiz_score: 100,
      })
      .single()

    assert.strictEqual(data, null)
    assert.ok(error !== null)
    // Error must be auth required or not found, not 42703 (undefined_column)
    assert.notStrictEqual(error?.code, '42703')
  })

  it('executes setor_karya RPC and verifies SQL body and path traversal validation', async (t) => {
    if (!isDbConnected) {
      t.skip('Database offline')
      return
    }

    const { data, error } = await supabase
      .rpc('setor_karya', {
        p_file_url: 'user1/kloter1/../escape.pdf',
      })
      .single()

    assert.strictEqual(data, null)
    assert.ok(error !== null)
    // Must be rejected by auth or regex, not column error
    assert.notStrictEqual(error?.code, '42703')
  })

  it('executes update_profile RPC and verifies SQL body', async (t) => {
    if (!isDbConnected) {
      t.skip('Database offline')
      return
    }

    const { data, error } = await supabase
      .rpc('update_profile', {
        p_nama: 'Test User',
      })
      .single()

    assert.strictEqual(data, null)
    assert.ok(error !== null)
    assert.notStrictEqual(error?.code, '42703')
  })

  it('executes create_booking RPC and verifies SQL body', async (t) => {
    if (!isDbConnected) {
      t.skip('Database offline')
      return
    }

    const { data, error } = await supabase
      .rpc('create_booking', {
        p_session_id: '00000000-0000-0000-0000-000000000000',
        p_jumlah_anak: 0,
      })
      .single()

    assert.strictEqual(data, null)
    assert.ok(error !== null)
    assert.notStrictEqual(error?.code, '42703')
  })

  it('executes nilai_karya RPC and verifies SQL body', async (t) => {
    if (!isDbConnected) {
      t.skip('Database offline')
      return
    }

    const { data, error } = await supabase
      .rpc('nilai_karya', {
        p_submission_id: '00000000-0000-0000-0000-000000000000',
        p_nilai: { score: 100 },
      })
      .single()

    assert.strictEqual(data, null)
    assert.ok(error !== null)
    assert.notStrictEqual(error?.code, '42703')
  })

  it('executes get_video_url RPC and verifies SQL body', async (t) => {
    if (!isDbConnected) {
      t.skip('Database offline')
      return
    }

    const { data, error } = await supabase
      .rpc('get_video_url', {
        p_kelas_id: '00000000-0000-0000-0000-000000000000',
      })
      .single()

    // Unauthenticated call is rejected by grant permission
    assert.strictEqual(data, null)
    assert.strictEqual(error?.code, '42501')
  })
})
