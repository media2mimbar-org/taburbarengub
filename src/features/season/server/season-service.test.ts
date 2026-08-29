import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import {
  getActiveKloter,
  getSeasonOverview,
  getSeasonDetails,
  getUserSeasonOwnership,
  getPublicSeasonCalendar,
  getPublicCalendar,
} from './season-service.ts'

interface MockQueryHandler {
  (params: { table: string; select?: string; filters: Record<string, unknown> }): {
    data: unknown
    error: { message: string; code?: string } | null
  }
}

function createMockSupabaseClient(handler: MockQueryHandler): SupabaseClient<Database> {
  return {
    from: (table: string) => {
      let selectClause: string | undefined
      const filters: Record<string, unknown> = {}

      const builder = {
        select: (clause: string) => {
          selectClause = clause
          return builder
        },
        eq: (column: string, value: unknown) => {
          filters[column] = value
          return builder
        },
        maybeSingle: async () => {
          const result = handler({ table, select: selectClause, filters })
          return result
        },
      }

      return builder as unknown
    },
  } as unknown as SupabaseClient<Database>
}

describe('getActiveKloter', () => {
  it('returns mapped KloterAktif object when row exists with valid id', async () => {
    const mockRow = {
      id: 'kloter-1-id',
      season_id: 'season-1-id',
      nomor: 1,
      tanggal_mulai: '2026-09-01T00:00:00Z',
      tanggal_selesai: '2026-09-15T00:00:00Z',
      kapasitas: 100,
      fase: 'menyimak',
    }

    const client = createMockSupabaseClient(({ table }) => {
      if (table === 'kloter_aktif') {
        return { data: mockRow, error: null }
      }
      return { data: null, error: null }
    })

    const result = await getActiveKloter(client)
    assert.deepStrictEqual(result, mockRow)
  })

  it('returns null when view is empty (no active kloter)', async () => {
    const client = createMockSupabaseClient(({ table }) => {
      if (table === 'kloter_aktif') {
        return { data: null, error: null }
      }
      return { data: null, error: null }
    })

    const result = await getActiveKloter(client)
    assert.strictEqual(result, null)
  })

  it('returns null when data row has null id (fail-closed)', async () => {
    const client = createMockSupabaseClient(({ table }) => {
      if (table === 'kloter_aktif') {
        return { data: { id: null, fase: null }, error: null }
      }
      return { data: null, error: null }
    })

    const result = await getActiveKloter(client)
    assert.strictEqual(result, null)
  })

  it('returns null when database returns an error', async () => {
    const client = createMockSupabaseClient(({ table }) => {
      if (table === 'kloter_aktif') {
        return { data: null, error: { message: 'Database connection error' } }
      }
      return { data: null, error: null }
    })

    const result = await getActiveKloter(client)
    assert.strictEqual(result, null)
  })
})

describe('getSeasonOverview', () => {
  it('returns structured season with classes and kloters sorted by nomor ascending', async () => {
    const mockSeasonData = {
      id: 'season-alpha',
      nomor_kaidah: 1,
      nama: 'Musim Kaidah 1',
      tanggal_mulai: '2026-09-01T00:00:00Z',
      tanggal_selesai: '2026-10-31T00:00:00Z',
      status: 'berjalan' as const,
      kelas: [
        { id: 'k3', season_id: 'season-alpha', nomor: 3, judul: 'Kelas 3', video_url: null },
        { id: 'k1', season_id: 'season-alpha', nomor: 1, judul: 'Kelas 1', video_url: 'https://video.url/1' },
        { id: 'k2', season_id: 'season-alpha', nomor: 2, judul: 'Kelas 2', video_url: null },
      ],
      kloters: [
        {
          id: 'kloter-2',
          season_id: 'season-alpha',
          nomor: 2,
          tanggal_mulai: '2026-09-15T00:00:00Z',
          tanggal_selesai: '2026-09-30T00:00:00Z',
          kapasitas: 100,
          kloter_phases: [
            {
              id: 'p2',
              kloter_id: 'kloter-2',
              phase: 'menyimak' as const,
              opens_at: '2026-09-16T00:00:00Z',
              closes_at: '2026-09-20T00:00:00Z',
              override_active: false,
              override_at: null,
              override_by: null,
            },
          ],
        },
        {
          id: 'kloter-1',
          season_id: 'season-alpha',
          nomor: 1,
          tanggal_mulai: '2026-09-01T00:00:00Z',
          tanggal_selesai: '2026-09-15T00:00:00Z',
          kapasitas: 100,
          kloter_phases: [
            {
              id: 'p1',
              kloter_id: 'kloter-1',
              phase: 'pendaftaran' as const,
              opens_at: '2026-09-01T00:00:00Z',
              closes_at: '2026-09-05T00:00:00Z',
              override_active: false,
              override_at: null,
              override_by: null,
            },
          ],
        },
      ],
    }

    const client = createMockSupabaseClient(({ table, filters }) => {
      if (table === 'seasons' && filters.id === 'season-alpha') {
        return { data: mockSeasonData, error: null }
      }
      return { data: null, error: null }
    })

    const result = await getSeasonOverview(client, 'season-alpha')
    assert.ok(result)
    assert.strictEqual(result.id, 'season-alpha')
    assert.strictEqual(result.nama, 'Musim Kaidah 1')

    // Verifikasi pengurutan kelas ascending
    assert.strictEqual(result.kelas.length, 3)
    assert.strictEqual(result.kelas[0].nomor, 1)
    assert.strictEqual(result.kelas[1].nomor, 2)
    assert.strictEqual(result.kelas[2].nomor, 3)

    // Verifikasi pengurutan kloter ascending
    assert.strictEqual(result.kloters.length, 2)
    assert.strictEqual(result.kloters[0].nomor, 1)
    assert.strictEqual(result.kloters[1].nomor, 2)
  })

  it('returns null when season is not found', async () => {
    const client = createMockSupabaseClient(() => ({ data: null, error: null }))
    const result = await getSeasonOverview(client, 'non-existent-id')
    assert.strictEqual(result, null)
  })

  it('returns null when query returns error', async () => {
    const client = createMockSupabaseClient(() => ({
      data: null,
      error: { message: 'Database error' },
    }))
    const result = await getSeasonOverview(client, 'season-alpha')
    assert.strictEqual(result, null)
  })

  it('getSeasonDetails is an alias for getSeasonOverview', async () => {
    assert.strictEqual(getSeasonDetails, getSeasonOverview)
  })
})

describe('getUserSeasonOwnership', () => {
  it('returns null when user does not own season', async () => {
    const client = createMockSupabaseClient(({ table }) => {
      if (table === 'user_seasons') {
        return { data: null, error: null }
      }
      return { data: null, error: null }
    })

    const result = await getUserSeasonOwnership(client, 'user-123', 'season-alpha')
    assert.strictEqual(result, null)
  })

  it('returns null when user_seasons query encounters database error', async () => {
    const client = createMockSupabaseClient(({ table }) => {
      if (table === 'user_seasons') {
        return { data: null, error: { message: 'DB error' } }
      }
      return { data: null, error: null }
    })

    const result = await getUserSeasonOwnership(client, 'user-123', 'season-alpha')
    assert.strictEqual(result, null)
  })

  it('returns ownership and menyimakOpensAt date when owned and menyimak phase exists', async () => {
    const mockUserSeason = {
      id: 'us-001',
      user_id: 'user-123',
      season_id: 'season-alpha',
      kloter_daftar_id: 'kloter-01',
      tanggal_diperoleh: '2026-09-02T10:00:00Z',
      sumber: 'beli' as const,
    }

    const mockPhaseRow = {
      opens_at: '2026-09-05T08:00:00Z',
    }

    const client = createMockSupabaseClient(({ table, filters }) => {
      if (table === 'user_seasons' && filters.user_id === 'user-123' && filters.season_id === 'season-alpha') {
        return { data: mockUserSeason, error: null }
      }
      if (table === 'kloter_phases' && filters.kloter_id === 'kloter-01' && filters.phase === 'menyimak') {
        return { data: mockPhaseRow, error: null }
      }
      return { data: null, error: null }
    })

    const result = await getUserSeasonOwnership(client, 'user-123', 'season-alpha')
    assert.ok(result)
    assert.strictEqual(result.owned, true)
    assert.strictEqual(result.ownsSeason, true)
    assert.strictEqual(result.userSeasonId, 'us-001')
    assert.strictEqual(result.seasonId, 'season-alpha')
    assert.strictEqual(result.kloterDaftarId, 'kloter-01')
    assert.strictEqual(result.tanggalDiperoleh, '2026-09-02T10:00:00Z')
    assert.strictEqual(result.sumber, 'beli')
    assert.strictEqual(result.menyimakOpensAt, '2026-09-05T08:00:00Z')
  })

  it('returns ownership with menyimakOpensAt null when menyimak phase is not found', async () => {
    const mockUserSeason = {
      id: 'us-002',
      user_id: 'user-456',
      season_id: 'season-alpha',
      kloter_daftar_id: 'kloter-02',
      tanggal_diperoleh: '2026-09-03T10:00:00Z',
      sumber: 'gratis' as const,
    }

    const client = createMockSupabaseClient(({ table, filters }) => {
      if (table === 'user_seasons' && filters.user_id === 'user-456' && filters.season_id === 'season-alpha') {
        return { data: mockUserSeason, error: null }
      }
      if (table === 'kloter_phases') {
        return { data: null, error: null }
      }
      return { data: null, error: null }
    })

    const result = await getUserSeasonOwnership(client, 'user-456', 'season-alpha')
    assert.ok(result)
    assert.strictEqual(result.owned, true)
    assert.strictEqual(result.sumber, 'gratis')
    assert.strictEqual(result.menyimakOpensAt, null)
  })
})

describe('getPublicSeasonCalendar', () => {
  it('returns activeKloter and currentSeason when active kloter is present', async () => {
    const mockActiveKloter = {
      id: 'kloter-aktif-id',
      season_id: 'season-current-id',
      nomor: 1,
      tanggal_mulai: '2026-09-01T00:00:00Z',
      tanggal_selesai: '2026-09-15T00:00:00Z',
      kapasitas: 100,
      fase: 'orientasi' as const,
    }

    const mockSeason = {
      id: 'season-current-id',
      nomor_kaidah: 1,
      nama: 'Kaidah 1',
      tanggal_mulai: '2026-09-01T00:00:00Z',
      tanggal_selesai: '2026-10-31T00:00:00Z',
      status: 'berjalan' as const,
    }

    const client = createMockSupabaseClient(({ table, filters }) => {
      if (table === 'kloter_aktif') {
        return { data: mockActiveKloter, error: null }
      }
      if (table === 'seasons' && filters.id === 'season-current-id') {
        return { data: mockSeason, error: null }
      }
      return { data: null, error: null }
    })

    const result = await getPublicSeasonCalendar(client)
    assert.deepStrictEqual(result.activeKloter, mockActiveKloter)
    assert.deepStrictEqual(result.currentSeason, mockSeason)
  })

  it('falls back to active "berjalan" season when no active kloter is available', async () => {
    const mockSeason = {
      id: 'season-berjalan-id',
      nomor_kaidah: 2,
      nama: 'Kaidah 2',
      tanggal_mulai: '2026-10-01T00:00:00Z',
      tanggal_selesai: '2026-11-30T00:00:00Z',
      status: 'berjalan' as const,
    }

    const client = createMockSupabaseClient(({ table, filters }) => {
      if (table === 'kloter_aktif') {
        return { data: null, error: null }
      }
      if (table === 'seasons' && filters.status === 'berjalan') {
        return { data: mockSeason, error: null }
      }
      return { data: null, error: null }
    })

    const result = await getPublicSeasonCalendar(client)
    assert.strictEqual(result.activeKloter, null)
    assert.deepStrictEqual(result.currentSeason, mockSeason)
  })

  it('getPublicCalendar is an alias for getPublicSeasonCalendar', async () => {
    assert.strictEqual(getPublicCalendar, getPublicSeasonCalendar)
  })
})
