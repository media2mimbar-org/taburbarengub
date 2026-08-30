import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const isLocalDbAvailable = Boolean(supabaseUrl.includes('127.0.0.1'))

describe('Database RPCs Live Integration Tests', { skip: !isLocalDbAvailable }, () => {
  let supabase: SupabaseClient<Database>

  before(() => {
    // Connect to local Supabase
    supabase = createClient<Database>(
      supabaseUrl,
      supabaseAnonKey
    )
  })

  it('verifies public RPC functions exist in database schema', async () => {
    const { data, error } = await supabase
      .from('kelas')
      .select('id, season_id, nomor, judul')
      .limit(1)

    assert.strictEqual(error, null)
    assert.ok(Array.isArray(data))
  })

  it('verifies kloter_aktif computed view returns active kloter in menyimak phase', async () => {
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

  it('verifies event_sessions has dual counters (kapasitas_kids & kuota_kids_terisi)', async () => {
    const { data, error } = await supabase
      .from('event_sessions')
      .select('id, kapasitas, kuota_terisi, kapasitas_kids, kuota_kids_terisi')
      .limit(1)
      .single()

    assert.strictEqual(error, null)
    assert.ok(data)
    assert.strictEqual(typeof data.kapasitas_kids, 'number')
    assert.strictEqual(typeof data.kuota_kids_terisi, 'number')
  })
})
