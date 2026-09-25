import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../../lib/types/database.types.ts'
import {
  submitWriting,
  getUserSubmissions,
  gradeSubmission,
} from './submission-service.ts'
import {
  gradeSubmissionSchema,
  submitWritingSchema,
} from '../shared/submission.schema.ts'
import type { GradePayload } from '../shared/submission.types.ts'

interface MockQueryState {
  table: string
  action: 'select' | 'update'
  selectClause?: string
  updateData?: unknown
  filters: Record<string, unknown>
  orderColumn?: string
  orderOptions?: { ascending?: boolean }
}

interface MockSupabaseOptions {
  rpcHandler?: (
    fnName: string,
    args: Record<string, unknown>
  ) => { data: unknown; error: { message: string; details?: string; code?: string } | null }
  queryHandler?: (state: MockQueryState) => {
    data: unknown
    error: { message: string; details?: string; code?: string } | null
  }
}

function createMockSupabaseClient(
  options: MockSupabaseOptions
): SupabaseClient<Database> {
  return {
    rpc: async (fnName: string, args: Record<string, unknown>) => {
      if (options.rpcHandler) {
        return options.rpcHandler(fnName, args)
      }
      return { data: null, error: null }
    },
    from: (table: string) => {
      const state: MockQueryState = {
        table,
        action: 'select',
        filters: {},
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
        order: (col: string, opts?: { ascending?: boolean }) => {
          state.orderColumn = col
          state.orderOptions = opts
          return builder
        },
        update: (values: unknown) => {
          state.action = 'update'
          state.updateData = values
          return builder
        },
        single: async () => {
          if (options.queryHandler) {
            return options.queryHandler(state)
          }
          return { data: null, error: null }
        },
        then: (
          onfulfilled?: (res: unknown) => unknown,
          onrejected?: (err: unknown) => unknown
        ) => {
          const res = options.queryHandler
            ? options.queryHandler(state)
            : { data: null, error: null }
          return Promise.resolve(res).then(onfulfilled, onrejected)
        },
      }

      return builder as unknown
    },
  } as unknown as SupabaseClient<Database>
}

describe('submitWritingSchema', () => {
  it('accepts storage paths ending in .docx, .doc, or .pdf', () => {
    const validInputs = [
      { file_url: '123e4567-e89b-12d3-a456-426614174000/k1/naskah-1.docx' },
      { file_url: '123e4567-e89b-12d3-a456-426614174000/k1/naskah-1.pdf' },
      { file_url: '123e4567-e89b-12d3-a456-426614174000/k1/karya.DOC' },
    ]

    for (const input of validInputs) {
      const parsed = submitWritingSchema.safeParse(input)
      assert.strictEqual(parsed.success, true, `Expected valid: ${input.file_url}`)
    }
  })

  it('rejects URLs, other formats, and query strings', () => {
    const invalidInputs = [
      { file_url: 'https://storage.supabase.co/karya/naskah.pdf' },
      { file_url: 'user/naskah.txt' },
      { file_url: 'user/naskah.docx.exe' },
      { file_url: 'user/naskah.pdf?token=abc' },
      { file_url: 'user/naskah' },
    ]

    for (const input of invalidInputs) {
      const parsed = submitWritingSchema.safeParse(input)
      assert.strictEqual(parsed.success, false, `Expected invalid: ${input.file_url}`)
    }
  })
})

describe('gradeSubmissionSchema', () => {
  it('accepts valid grading input with all fields', () => {
    const valid = gradeSubmissionSchema.safeParse({
      submission_id: '123e4567-e89b-12d3-a456-426614174000',
      rubrik: {
        konten: 'A',
        bahasa: 'B',
      },
      feedback: 'Tulisan sangat menarik dan terstruktur rapi.',
    })

    assert.strictEqual(valid.success, true)
  })

  it('accepts valid grading input without feedback', () => {
    const valid = gradeSubmissionSchema.safeParse({
      submission_id: '123e4567-e89b-12d3-a456-426614174000',
      rubrik: {
        konten: 'C',
        bahasa: 'C',
      },
    })

    assert.strictEqual(valid.success, true)
  })

  it('rejects invalid uuid and invalid rubric grades', () => {
    assert.strictEqual(
      gradeSubmissionSchema.safeParse({
        submission_id: 'invalid-id',
        rubrik: { konten: 'A', bahasa: 'A' },
      }).success,
      false
    )

    assert.strictEqual(
      gradeSubmissionSchema.safeParse({
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        rubrik: { konten: 'D', bahasa: 'A' },
      }).success,
      false
    )
  })
})

describe('submitWriting', () => {
  it('returns VALIDATION_ERROR when input schema fails', async () => {
    const supabase = createMockSupabaseClient({})
    const result = await submitWriting(supabase, {
      file_url: 'u1/naskah.zip',
    })

    assert.strictEqual(result.ok, false)
    if (!result.ok) {
      assert.strictEqual(result.code, 'VALIDATION_ERROR')
      assert.match(result.error, /Word.*PDF/i)
    }
  })

  it('maps BELUM_MASUK hint to UNAUTHORIZED', async () => {
    const supabase = createMockSupabaseClient({
      rpcHandler: () => ({
        data: null,
        error: { message: 'Belum masuk', code: '28000', hint: 'BELUM_MASUK' },
      }),
    })

    const result = await submitWriting(supabase, {
      file_url: 'u1/karya.pdf',
    })

    assert.strictEqual(result.ok, false)
    if (!result.ok) {
      assert.strictEqual(result.code, 'UNAUTHORIZED')
      assert.strictEqual(result.error, 'Silakan masuk terlebih dahulu')
    }
  })

  it('maps BERKAS_BUKAN_MILIK hint to FILE_NOT_OWNED', async () => {
    const supabase = createMockSupabaseClient({
      rpcHandler: () => ({
        data: null,
        error: { message: 'Berkas bukan milikmu', code: '42501', hint: 'BERKAS_BUKAN_MILIK' },
      }),
    })

    const result = await submitWriting(supabase, { file_url: 'orang-lain/karya.pdf' })

    assert.strictEqual(result.ok, false)
    if (!result.ok) {
      assert.strictEqual(result.code, 'FILE_NOT_OWNED')
    }
  })

  it('maps JENDELA_SETOR_TERTUTUP hint to WINDOW_CLOSED', async () => {
    const supabase = createMockSupabaseClient({
      rpcHandler: () => ({
        data: null,
        error: {
          message: 'Belum/sudah lewat jendela setor (fase: menyimak)',
          code: '22000',
          hint: 'JENDELA_SETOR_TERTUTUP',
        },
      }),
    })

    const result = await submitWriting(supabase, {
      file_url: 'u1/karya.docx',
    })

    assert.strictEqual(result.ok, false)
    if (!result.ok) {
      assert.strictEqual(result.code, 'WINDOW_CLOSED')
      assert.strictEqual(result.error, 'Jendela setor karya sedang ditutup')
    }
  })

  it('maps BUKAN_SEASON_MILIK hint to NOT_OWNED', async () => {
    const supabase = createMockSupabaseClient({
      rpcHandler: () => ({
        data: null,
        error: {
          message: 'Bukan season milikmu yang sedang berjalan',
          code: '42501',
          hint: 'BUKAN_SEASON_MILIK',
        },
      }),
    })

    const result = await submitWriting(supabase, {
      file_url: 'u1/karya.pdf',
    })

    assert.strictEqual(result.ok, false)
    if (!result.ok) {
      assert.strictEqual(result.code, 'NOT_OWNED')
      assert.strictEqual(
        result.error,
        'Anda belum terdaftar pada season yang sedang berjalan'
      )
    }
  })

  it('maps other database errors to DB_ERROR', async () => {
    const supabase = createMockSupabaseClient({
      rpcHandler: () => ({
        data: null,
        error: {
          message: 'connection to database failed',
          code: '08006',
        },
      }),
    })

    const result = await submitWriting(supabase, {
      file_url: 'u1/karya.pdf',
    })

    assert.strictEqual(result.ok, false)
    if (!result.ok) {
      assert.strictEqual(result.code, 'DB_ERROR')
      assert.strictEqual(result.error, 'connection to database failed')
    }
  })

  it('returns mapped submission on success', async () => {
    const mockRow = {
      id: 'sub-123',
      user_id: 'user-456',
      kloter_id: 'kloter-789',
      versi: 1,
      file_url: 'u1/k1/naskah.docx',
      status: 'menunggu',
      nilai: null,
      created_at: '2026-08-29T10:00:00.000Z',
    }

    let calledRpc: { fnName: string; args: Record<string, unknown> } | null = null

    const supabase = createMockSupabaseClient({
      rpcHandler: (fnName, args) => {
        calledRpc = { fnName, args }
        return { data: mockRow, error: null }
      },
    })

    const result = await submitWriting(supabase, {
      file_url: 'u1/k1/naskah.docx',
    })

    assert.strictEqual(result.ok, true)
    assert.deepStrictEqual(calledRpc, {
      fnName: 'setor_karya',
      args: { p_file_url: 'u1/k1/naskah.docx' },
    })

    if (result.ok) {
      assert.strictEqual(result.submission.id, 'sub-123')
      assert.strictEqual(result.submission.user_id, 'user-456')
      assert.strictEqual(result.submission.kloter_id, 'kloter-789')
      assert.strictEqual(result.submission.versi, 1)
      assert.strictEqual(result.submission.status, 'menunggu')
      assert.strictEqual(result.submission.nilai, null)
      assert.strictEqual(result.submission.created_at, '2026-08-29T10:00:00.000Z')
    }
  })
})

describe('getUserSubmissions', () => {
  it('queries writing_submissions ordered by versi descending', async () => {
    const mockRows = [
      {
        id: 'sub-2',
        user_id: 'user-1',
        kloter_id: 'kloter-1',
        versi: 2,
        file_url: 'u1/v2.pdf',
        status: 'menunggu',
        nilai: null,
        created_at: '2026-08-29T12:00:00.000Z',
      },
      {
        id: 'sub-1',
        user_id: 'user-1',
        kloter_id: 'kloter-1',
        versi: 1,
        file_url: 'u1/v1.pdf',
        status: 'dinilai',
        nilai: {
          graded_by: 'mentor-1',
          graded_at: '2026-08-29T11:00:00.000Z',
          rubrik: { konten: 'B', bahasa: 'A' },
          feedback: 'Perbaiki bab 2',
        } as unknown as Json,
        created_at: '2026-08-29T10:00:00.000Z',
      },
    ]

    const recordedStates: MockQueryState[] = []

    const supabase = createMockSupabaseClient({
      queryHandler: (state) => {
        recordedStates.push(state)
        return { data: mockRows, error: null }
      },
    })

    const submissions = await getUserSubmissions(supabase, 'user-1', 'kloter-1')
    const recordedState = recordedStates[0]

    assert.strictEqual(submissions.length, 2)
    assert.strictEqual(recordedState?.table, 'writing_submissions')
    assert.strictEqual(recordedState?.filters['user_id'], 'user-1')
    assert.strictEqual(recordedState?.filters['kloter_id'], 'kloter-1')
    assert.strictEqual(recordedState?.orderColumn, 'versi')
    assert.strictEqual(recordedState?.orderOptions?.ascending, false)

    assert.strictEqual(submissions[0]?.id, 'sub-2')
    assert.strictEqual(submissions[0]?.versi, 2)
    assert.strictEqual(submissions[0]?.status, 'menunggu')
    assert.strictEqual(submissions[0]?.nilai, null)

    assert.strictEqual(submissions[1]?.id, 'sub-1')
    assert.strictEqual(submissions[1]?.versi, 1)
    assert.strictEqual(submissions[1]?.status, 'dinilai')
    assert.strictEqual(submissions[1]?.nilai?.rubrik.konten, 'B')
  })

  it('returns empty array when error occurs or data is empty', async () => {
    const supabase = createMockSupabaseClient({
      queryHandler: () => ({
        data: null,
        error: { message: 'Database error' },
      }),
    })

    const submissions = await getUserSubmissions(supabase, 'user-1', 'kloter-1')
    assert.deepStrictEqual(submissions, [])
  })
})

describe('gradeSubmission', () => {
  const mentorId = 'mentor-999'
  const submissionId = '123e4567-e89b-12d3-a456-426614174000'

  it('returns error when validation fails', async () => {
    const supabase = createMockSupabaseClient({})
    const result = await gradeSubmission(supabase, mentorId, {
      submission_id: 'not-a-uuid',
      rubrik: { konten: 'A', bahasa: 'A' },
    })

    assert.strictEqual(result.ok, false)
    if (!result.ok) {
      assert.match(result.error, /ID naskah tidak valid/)
    }
  })

  it('calls nilai_karya RPC with correct payload', async () => {
    const fixedTime = '2026-08-29T14:30:00.000Z'

    const updatedRow = {
      id: submissionId,
      user_id: 'user-123',
      kloter_id: 'kloter-456',
      versi: 1,
      file_url: 'u1/karya.pdf',
      status: 'dinilai',
      nilai: {
        graded_by: mentorId,
        graded_at: fixedTime,
        rubrik: { konten: 'A', bahasa: 'A' },
        feedback: 'Karya luar biasa!',
      },
      created_at: '2026-08-29T10:00:00.000Z',
    }

    let capturedFn = ''
    let capturedArgs: Record<string, unknown> = {}

    const supabase = createMockSupabaseClient({
      rpcHandler: (fnName, args) => {
        capturedFn = fnName
        capturedArgs = args
        return { data: updatedRow, error: null }
      },
    })

    const result = await gradeSubmission(
      supabase,
      mentorId,
      {
        submission_id: submissionId,
        rubrik: { konten: 'A', bahasa: 'A' },
        feedback: 'Karya luar biasa!',
      },
      fixedTime
    )

    assert.strictEqual(capturedFn, 'nilai_karya')
    assert.strictEqual(capturedArgs['p_submission_id'], submissionId)

    const payload = capturedArgs['p_nilai'] as GradePayload
    assert.strictEqual(payload.graded_by, mentorId)
    assert.strictEqual(payload.graded_at, fixedTime)
    assert.strictEqual(payload.rubrik.konten, 'A')
    assert.strictEqual(payload.feedback, 'Karya luar biasa!')

    assert.strictEqual(result.ok, true)
    if (result.ok) {
      assert.strictEqual(result.submission.id, submissionId)
      assert.strictEqual(result.submission.status, 'dinilai')
      assert.strictEqual(result.submission.nilai?.rubrik.konten, 'A')
    }
  })

  it('returns error when RPC fails', async () => {
    const supabase = createMockSupabaseClient({
      rpcHandler: () => ({
        data: null,
        error: { message: 'Akses ditolak', code: '42501' },
      }),
    })

    const result = await gradeSubmission(supabase, mentorId, {
      submission_id: submissionId,
      rubrik: { konten: 'B', bahasa: 'B' },
    })

    assert.strictEqual(result.ok, false)
    if (!result.ok) {
      assert.strictEqual(result.error, 'Akses ditolak')
    }
  })
})
