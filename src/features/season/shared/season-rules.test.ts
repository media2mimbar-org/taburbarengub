import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessVideo,
  isSubmissionWindowOpen,
  getPhaseLabel,
  PHASE_LABELS,
} from './season-rules.ts'
import type { PhaseType } from './season.types.ts'

describe('canAccessVideo', () => {
  const fixedNow = new Date('2026-09-01T12:00:00.000Z')

  it('returns false if user does not own season', () => {
    const result = canAccessVideo({
      ownsSeason: false,
      menyimakOpensAt: '2026-08-01T00:00:00.000Z',
      now: fixedNow,
    })
    assert.strictEqual(result, false)
  })

  it('returns false if menyimakOpensAt is null or undefined', () => {
    assert.strictEqual(
      canAccessVideo({
        ownsSeason: true,
        menyimakOpensAt: null,
        now: fixedNow,
      }),
      false
    )

    assert.strictEqual(
      canAccessVideo({
        ownsSeason: true,
        menyimakOpensAt: undefined,
        now: fixedNow,
      }),
      false
    )
  })

  it('returns false if menyimakOpensAt is invalid date string', () => {
    assert.strictEqual(
      canAccessVideo({
        ownsSeason: true,
        menyimakOpensAt: 'invalid-date',
        now: fixedNow,
      }),
      false
    )
  })

  it('returns false if now is before menyimakOpensAt', () => {
    const result = canAccessVideo({
      ownsSeason: true,
      menyimakOpensAt: '2026-09-05T00:00:00.000Z',
      now: fixedNow,
    })
    assert.strictEqual(result, false)
  })

  it('returns true if now is exactly equal to menyimakOpensAt', () => {
    const exactOpensAt = '2026-09-01T12:00:00.000Z'
    const result = canAccessVideo({
      ownsSeason: true,
      menyimakOpensAt: exactOpensAt,
      now: fixedNow,
    })
    assert.strictEqual(result, true)
  })

  it('returns true if now is after menyimakOpensAt', () => {
    const result = canAccessVideo({
      ownsSeason: true,
      menyimakOpensAt: '2026-08-20T00:00:00.000Z',
      now: fixedNow,
    })
    assert.strictEqual(result, true)
  })

  it('returns true for archived/past season when opens_at was far in the past', () => {
    const result = canAccessVideo({
      ownsSeason: true,
      menyimakOpensAt: '2025-01-01T00:00:00.000Z',
      now: fixedNow,
    })
    assert.strictEqual(result, true)
  })

  it('accepts Date objects for menyimakOpensAt and now', () => {
    const pastOpensAt = new Date('2026-08-15T00:00:00.000Z')
    const futureOpensAt = new Date('2026-09-15T00:00:00.000Z')

    assert.strictEqual(
      canAccessVideo({
        ownsSeason: true,
        menyimakOpensAt: pastOpensAt,
        now: fixedNow,
      }),
      true
    )

    assert.strictEqual(
      canAccessVideo({
        ownsSeason: true,
        menyimakOpensAt: futureOpensAt,
        now: fixedNow,
      }),
      false
    )
  })

  it('defaults to current time if now is omitted', () => {
    // Past date relative to today (2026)
    const pastDate = new Date(Date.now() - 60_000).toISOString()
    assert.strictEqual(
      canAccessVideo({
        ownsSeason: true,
        menyimakOpensAt: pastDate,
      }),
      true
    )

    // Future date relative to today
    const futureDate = new Date(Date.now() + 60_000_000).toISOString()
    assert.strictEqual(
      canAccessVideo({
        ownsSeason: true,
        menyimakOpensAt: futureDate,
      }),
      false
    )
  })
})

describe('isSubmissionWindowOpen', () => {
  it('returns true only for "menulis_setor"', () => {
    assert.strictEqual(isSubmissionWindowOpen('menulis_setor'), true)
  })

  it('returns false for all other phases', () => {
    const otherPhases: PhaseType[] = [
      'offline',
      'pendaftaran',
      'orientasi',
      'menyimak',
      'wrapped',
      'antara_kloter',
    ]

    for (const phase of otherPhases) {
      assert.strictEqual(
        isSubmissionWindowOpen(phase),
        false,
        `Expected false for phase: ${phase}`
      )
    }
  })

  it('returns false for null and undefined', () => {
    assert.strictEqual(isSubmissionWindowOpen(null), false)
    assert.strictEqual(isSubmissionWindowOpen(undefined), false)
  })
})

describe('getPhaseLabel', () => {
  it('maps each phase_type to its expected Indonesian string', () => {
    const expectedMappings: Record<PhaseType, string> = {
      offline: 'Kajian Offline',
      pendaftaran: 'Pendaftaran',
      orientasi: 'Orientasi',
      menyimak: 'Menyimak Materi',
      menulis_setor: 'Menulis & Setor',
      wrapped: 'Selesai & Sertifikat',
      antara_kloter: 'Antara Kloter',
    }

    for (const [phase, expectedLabel] of Object.entries(expectedMappings) as [PhaseType, string][]) {
      assert.strictEqual(getPhaseLabel(phase), expectedLabel)
      assert.strictEqual(PHASE_LABELS[phase], expectedLabel)
    }
  })
})
