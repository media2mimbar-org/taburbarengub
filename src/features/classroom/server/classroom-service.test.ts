import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../lib/types/database.types.ts'
import {
  getClassListWithProgress,
  submitQuizProgress,
} from './classroom-service.ts'
import { submitQuizSchema } from '../shared/classroom.schema.ts'

interface QueryState {
  table: string
  action: 'select' | 'upsert'
  selectClause?: string
  upsertData?: unknown
  upsertOptions?: unknown
  filters: Record<string, unknown>
  inFilters: Record<string, unknown[]>
  orderColumn?: string
  orderOptions?: { ascending?: boolean }
}

interface RpcHandler {
  (fnName: string, args: Record<string, unknown>): {
    data: unknown
    error: { message: string; code?: string } | null
  }
}

interface MockHandler {
  (state: QueryState): {
    data: unknown
    error: { message: string; code?: string } | null
  }
}

function createMockSupabaseClient(
  handler: MockHandler,
  rpcHandler?: RpcHandler,
): SupabaseClient<Database> {
  return {
    rpc: async (fnName: string, args: Record<string, unknown>) => {
      if (rpcHandler) return rpcHandler(fnName, args)
      return { data: null, error: null }
    },
    from: (table: string) => {
      const state: QueryState = {
        table,
        action: 'select',
        filters: {},
        inFilters: {},
      }

      const builder: Record<string, unknown> = {
        select: (clause?: string) => {
          state.selectClause = clause
          return builder
        },
        eq: (col: string, val: unknown) => {
          state.filters[col] = val
          return builder
        },
        in: (col: string, vals: unknown[]) => {
          state.inFilters[col] = vals
          return builder
        },
        order: (col: string, opts?: { ascending?: boolean }) => {
          state.orderColumn = col
          state.orderOptions = opts
          return builder
        },
        upsert: (values: unknown, opts?: unknown) => {
          state.action = 'upsert'
          state.upsertData = values
          state.upsertOptions = opts
          return builder
        },
        maybeSingle: async () => handler(state),
        single: async () => handler(state),
        then: (
          onfulfilled?: (res: unknown) => unknown,
          onrejected?: (err: unknown) => unknown
        ) => {
          return Promise.resolve(handler(state)).then(onfulfilled, onrejected)
        },
      }

      return builder as unknown
    },
  } as unknown as SupabaseClient<Database>
}

describe('getClassListWithProgress', () => {
  const userId = 'user-123'
  const seasonId = 'season-456'
  const now = new Date('2026-09-01T12:00:00.000Z')

  const mockClasses = [
    {
      id: 'kelas-1',
      season_id: seasonId,
      nomor: 1,
      judul: 'Kelas 1: Pengenalan Tabur',
    },
    {
      id: 'kelas-2',
      season_id: seasonId,
      nomor: 2,
      judul: 'Kelas 2: Strategi Menulis',
    },
  ]

  const videoUrlLookup: Record<string, string> = {
    'kelas-1': 'https://youtube.com/watch?v=video1',
    'kelas-2': 'https://youtube.com/watch?v=video2',
  }

  it('locks video URLs when user does not own season', async () => {
    const supabase = createMockSupabaseClient((state) => {
      if (state.table === 'user_seasons') {
        return { data: null, error: null }
      }
      if (state.table === 'kelas') {
        return { data: mockClasses, error: null }
      }
      if (state.table === 'video_progress') {
        return { data: [], error: null }
      }
      return { data: null, error: null }
    })

    const result = await getClassListWithProgress(supabase, userId, seasonId, now)

    assert.strictEqual(result.length, 2)
    assert.strictEqual(result[0]?.is_locked, true)
    assert.strictEqual(result[0]?.video_url, null)
    assert.strictEqual(result[0]?.ditonton, false)
    assert.strictEqual(result[0]?.skor, null)

    assert.strictEqual(result[1]?.is_locked, true)
    assert.strictEqual(result[1]?.video_url, null)
    assert.strictEqual(result[1]?.ditonton, false)
    assert.strictEqual(result[1]?.skor, null)
  })

  it('locks video URLs when user owns season but before menyimak threshold', async () => {
    const supabase = createMockSupabaseClient((state) => {
      if (state.table === 'user_seasons') {
        return {
          data: {
            id: 'us-1',
            user_id: userId,
            season_id: seasonId,
            kloter_daftar_id: 'kloter-1',
            tanggal_diperoleh: '2026-08-25T00:00:00Z',
            sumber: 'checkout',
          },
          error: null,
        }
      }
      if (state.table === 'kloter_phases') {
        return {
          data: { opens_at: '2026-09-05T00:00:00Z' }, // opens in future relative to now (2026-09-01)
          error: null,
        }
      }
      if (state.table === 'kelas') {
        return { data: mockClasses, error: null }
      }
      if (state.table === 'video_progress') {
        return { data: [], error: null }
      }
      return { data: null, error: null }
    })

    const result = await getClassListWithProgress(supabase, userId, seasonId, now)

    assert.strictEqual(result.length, 2)
    assert.strictEqual(result[0]?.is_locked, true)
    assert.strictEqual(result[0]?.video_url, null)
    assert.strictEqual(result[1]?.is_locked, true)
    assert.strictEqual(result[1]?.video_url, null)
  })

  it('unlocks video URLs and attaches progress when threshold passes', async () => {
    const mockProgress = [
      {
        id: 'vp-1',
        user_id: userId,
        kelas_id: 'kelas-1',
        ditonton: true,
        skor: 100,
        jawaban_soal: null,
      },
    ]

    const supabase = createMockSupabaseClient(
      (state) => {
        if (state.table === 'user_seasons') {
          return {
            data: {
              id: 'us-1',
              user_id: userId,
              season_id: seasonId,
              kloter_daftar_id: 'kloter-1',
              tanggal_diperoleh: '2026-08-25T00:00:00Z',
              sumber: 'checkout',
            },
            error: null,
          }
        }
        if (state.table === 'kloter_phases') {
          return {
            data: { opens_at: '2026-09-01T00:00:00Z' }, // opened before now (2026-09-01T12:00:00Z)
            error: null,
          }
        }
        if (state.table === 'kelas') {
          return { data: mockClasses, error: null }
        }
        if (state.table === 'video_progress') {
          return { data: mockProgress, error: null }
        }
        return { data: null, error: null }
      },
      (fnName, args) => {
        if (fnName === 'get_video_url') {
          const kelasId = args['p_kelas_id'] as string
          return { data: videoUrlLookup[kelasId] ?? null, error: null }
        }
        return { data: null, error: null }
      },
    )

    const result = await getClassListWithProgress(supabase, userId, seasonId, now)

    assert.strictEqual(result.length, 2)
    // First class has progress
    assert.strictEqual(result[0]?.is_locked, false)
    assert.strictEqual(result[0]?.video_url, 'https://youtube.com/watch?v=video1')
    assert.strictEqual(result[0]?.ditonton, true)
    assert.strictEqual(result[0]?.skor, 100)

    // Second class unlocked but not watched
    assert.strictEqual(result[1]?.is_locked, false)
    assert.strictEqual(result[1]?.video_url, 'https://youtube.com/watch?v=video2')
    assert.strictEqual(result[1]?.ditonton, false)
    assert.strictEqual(result[1]?.skor, null)
  })

  it('returns empty array if kelas query returns error or empty', async () => {
    const supabase = createMockSupabaseClient((state) => {
      if (state.table === 'user_seasons') {
        return { data: null, error: null }
      }
      if (state.table === 'kelas') {
        return { data: null, error: { message: 'Database failure' } }
      }
      return { data: null, error: null }
    })

    const result = await getClassListWithProgress(supabase, userId, seasonId, now)
    assert.deepStrictEqual(result, [])
  })
})

describe('submitQuizSchema', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000'

  it('accepts valid input with 1 to 10 answers', () => {
    const input = {
      kelas_id: validUuid,
      answers: [
        { soal_id: 1, pilihan: 'A' },
        { soal_id: 2, pilihan: 'B' },
      ],
    }

    const result = submitQuizSchema.safeParse(input)
    assert.strictEqual(result.success, true)
  })

  it('rejects empty answers array', () => {
    const input = {
      kelas_id: validUuid,
      answers: [],
    }

    const result = submitQuizSchema.safeParse(input)
    assert.strictEqual(result.success, false)
  })

  it('rejects answers array exceeding 10 items', () => {
    const input = {
      kelas_id: validUuid,
      answers: Array.from({ length: 11 }, (_, i) => ({
        soal_id: i + 1,
        pilihan: 'A',
      })),
    }

    const result = submitQuizSchema.safeParse(input)
    assert.strictEqual(result.success, false)
  })

  it('rejects non-uuid kelas_id', () => {
    const input = {
      kelas_id: 'not-a-valid-uuid',
      answers: [{ soal_id: 1, pilihan: 'A' }],
    }

    const result = submitQuizSchema.safeParse(input)
    assert.strictEqual(result.success, false)
  })

  it('rejects non-positive soal_id', () => {
    const input = {
      kelas_id: validUuid,
      answers: [{ soal_id: 0, pilihan: 'A' }],
    }

    const result = submitQuizSchema.safeParse(input)
    assert.strictEqual(result.success, false)
  })

  it('rejects empty or whitespace-only pilihan', () => {
    const input = {
      kelas_id: validUuid,
      answers: [{ soal_id: 1, pilihan: '   ' }],
    }

    const result = submitQuizSchema.safeParse(input)
    assert.strictEqual(result.success, false)
  })
})

describe('submitQuizProgress', () => {
  const userId = 'user-123'
  const validUuid = '123e4567-e89b-12d3-a456-426614174000'

  it('returns error when validation fails', async () => {
    const supabase = createMockSupabaseClient(() => ({
      data: null,
      error: null,
    }))

    const result = await submitQuizProgress(supabase, userId, {
      kelas_id: 'invalid-id',
      answers: [],
    })

    assert.strictEqual(result.ok, false)
    if (!result.ok) {
      assert.ok(result.error.length > 0)
    }
  })

  it('computes score with answerKey, upserts video_progress, and returns progress record', async () => {
    let capturedUpsertData: unknown = null

    const mockSavedRow = {
      id: 'vp-saved-1',
      user_id: userId,
      kelas_id: validUuid,
      ditonton: true,
      skor: 67,
      jawaban_soal: null,
    }

    const supabase = createMockSupabaseClient((state) => {
      if (state.table === 'video_progress' && state.action === 'upsert') {
        capturedUpsertData = state.upsertData
        return { data: mockSavedRow, error: null }
      }
      return { data: null, error: null }
    })

    const input = {
      kelas_id: validUuid,
      answers: [
        { soal_id: 1, pilihan: 'A' }, // correct
        { soal_id: 2, pilihan: 'C' }, // incorrect (key is B)
        { soal_id: 3, pilihan: 'd' }, // correct (case-insensitive)
      ],
    }
    const answerKey = {
      1: 'A',
      2: 'B',
      3: 'D',
    }

    const result = await submitQuizProgress(supabase, userId, input, answerKey)

    assert.strictEqual(result.ok, true)
    if (result.ok) {
      assert.strictEqual(result.progress.id, 'vp-saved-1')
      assert.strictEqual(result.progress.skor, 67)
    }

    // Verify payload passed to upsert
    assert.ok(capturedUpsertData)
    const upsertRecord = capturedUpsertData as {
      user_id: string
      kelas_id: string
      ditonton: boolean
      skor: number
      jawaban_soal: {
        total_soal: number
        benar: number
        jawaban: Array<{ soal_id: number; is_correct: boolean; kunci: string }>
      }
    }
    assert.strictEqual(upsertRecord.user_id, userId)
    assert.strictEqual(upsertRecord.kelas_id, validUuid)
    assert.strictEqual(upsertRecord.ditonton, true)
    assert.strictEqual(upsertRecord.skor, 67)
    assert.strictEqual(upsertRecord.jawaban_soal.total_soal, 3)
    assert.strictEqual(upsertRecord.jawaban_soal.benar, 2)
    assert.strictEqual(upsertRecord.jawaban_soal.jawaban[0]?.is_correct, true)
    assert.strictEqual(upsertRecord.jawaban_soal.jawaban[1]?.is_correct, false)
    assert.strictEqual(upsertRecord.jawaban_soal.jawaban[2]?.is_correct, true)
  })

  it('computes 100 score when answerKey is not provided', async () => {
    let capturedUpsertData: unknown = null

    const mockSavedRow = {
      id: 'vp-saved-2',
      user_id: userId,
      kelas_id: validUuid,
      ditonton: true,
      skor: 100,
      jawaban_soal: null,
    }

    const supabase = createMockSupabaseClient((state) => {
      if (state.table === 'video_progress' && state.action === 'upsert') {
        capturedUpsertData = state.upsertData
        return { data: mockSavedRow, error: null }
      }
      return { data: null, error: null }
    })

    const input = {
      kelas_id: validUuid,
      answers: [
        { soal_id: 1, pilihan: 'Jawaban Bebas 1' },
        { soal_id: 2, pilihan: 'Jawaban Bebas 2' },
      ],
    }

    const result = await submitQuizProgress(supabase, userId, input)

    assert.strictEqual(result.ok, true)
    if (result.ok) {
      assert.strictEqual(result.progress.skor, 100)
    }

    const upsertRecord = capturedUpsertData as {
      skor: number
      jawaban_soal: {
        total_soal: number
        benar: number
      }
    }
    assert.strictEqual(upsertRecord.skor, 100)
    assert.strictEqual(upsertRecord.jawaban_soal.total_soal, 2)
    assert.strictEqual(upsertRecord.jawaban_soal.benar, 2)
  })

  it('returns error when database upsert fails', async () => {
    const supabase = createMockSupabaseClient((state) => {
      if (state.table === 'video_progress') {
        return { data: null, error: { message: 'Unique violation on constraint' } }
      }
      return { data: null, error: null }
    })

    const input = {
      kelas_id: validUuid,
      answers: [{ soal_id: 1, pilihan: 'A' }],
    }

    const result = await submitQuizProgress(supabase, userId, input)

    assert.strictEqual(result.ok, false)
    if (!result.ok) {
      assert.strictEqual(result.error, 'Unique violation on constraint')
    }
  })
})
