'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import {
  createInitialState,
  errorBoxStyle,
  inputStyle,
  primaryButtonStyle,
  submitProfile,
  type ProfileFormState,
  type UserProfile,
} from '@/features/profile/shared/profile-form-shared'
import {
  initialPromptVisibility,
  promptVisibilityReducer,
  type WizardStep,
} from '@/features/profile/client/prompt-visibility-reducer'

const ONBOARDING_MODE_KEY = 'taburbarengub.profileOnboardingMode'
const PROMPT_DISMISSED_KEY = 'taburbarengub.profilePromptDismissed'
const ONBOARDING_DELAY_MS = 450
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

function ProgressDots({ step }: { step: WizardStep }) {
  const activeIndex = step === 'welcome' ? 0 : step === 'identity' ? 1 : 2

  return (
    <div aria-hidden="true" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          style={{
            width: index === activeIndex ? 22 : 9,
            height: 9,
            borderRadius: 999,
            background: index === activeIndex ? '#111827' : '#d1d5db',
            transition: 'width 160ms ease',
          }}
        />
      ))}
    </div>
  )
}

export function ProfileCompletionPrompt({
  profile,
  autoOpen = true,
  showDismissedBanner = true,
  triggerLabel,
}: {
  profile: UserProfile | null
  autoOpen?: boolean
  showDismissedBanner?: boolean
  triggerLabel?: string
}) {
  const router = useRouter()
  const [visibility, dispatch] = useReducer(promptVisibilityReducer, initialPromptVisibility)
  const mode = visibility.mode
  const open = visibility.tag === 'open'
  const dismissed = visibility.tag === 'dismissed'
  const step: WizardStep = visibility.tag === 'open' ? visibility.step : 'welcome'
  const [form, setForm] = useState<ProfileFormState>(() => createInitialState(profile))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [minBodyHeight, setMinBodyHeight] = useState(0)

  const isProfileComplete = Boolean(profile?.no_hp)

  useEffect(() => {
    if (isProfileComplete) return
    let active = true

    const timer = window.setTimeout(() => {
      if (!active) return

      const storedMode = window.sessionStorage.getItem(ONBOARDING_MODE_KEY)
      const wasDismissed = window.sessionStorage.getItem(PROMPT_DISMISSED_KEY) === 'true'

      if (storedMode === 'welcome') {
        dispatch({ type: 'mode_set_welcome' })
        window.sessionStorage.removeItem(ONBOARDING_MODE_KEY)
        window.sessionStorage.removeItem(PROMPT_DISMISSED_KEY)
      } else if (wasDismissed) {
        dispatch({ type: 'dismissed_restored' })
        return
      }

      if (autoOpen) {
        dispatch({ type: 'auto_opened' })
      }
    }, ONBOARDING_DELAY_MS)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [autoOpen, isProfileComplete])

  useEffect(() => {
    if (!open) return

    triggerRef.current = document.activeElement as HTMLElement | null

    const dialog = dialogRef.current
    dialog?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closePrompt()
        return
      }

      if (event.key !== 'Tab' || !dialog) return

      const items = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]
      const activeEl = document.activeElement

      if (event.shiftKey && (activeEl === first || activeEl === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      triggerRef.current?.focus()
    }

  }, [open, step])

  useEffect(() => {
    if (!open) return

    const scrollY = window.scrollY
    const body = document.body
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'

    return () => {
      body.style.position = previous.position
      body.style.top = previous.top
      body.style.left = previous.left
      body.style.right = previous.right
      body.style.width = previous.width
      body.style.overflow = previous.overflow
      window.scrollTo(0, scrollY)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return

    const measured = bodyRef.current?.scrollHeight ?? 0
    setMinBodyHeight((prev) => (measured > prev ? measured : prev))
  }, [open, step])

  if (isProfileComplete) {
    return null
  }

  function updateField(field: keyof ProfileFormState) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }
  }

  function openPrompt() {
    dispatch({ type: 'opened' })
  }

  function closePrompt() {
    window.sessionStorage.setItem(PROMPT_DISMISSED_KEY, 'true')
    dispatch({ type: 'closed' })
    setMinBodyHeight(0)
  }

  function handleProfileCompleted() {
    window.sessionStorage.removeItem(PROMPT_DISMISSED_KEY)
    dispatch({ type: 'completed' })
    setMinBodyHeight(0)
    router.refresh()

    window.requestAnimationFrame(() => {
      document.getElementById('sesi')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function goToIdentity() {
    setError(null)
    dispatch({ type: 'step_changed', step: 'identity' })
  }

  function goToExtra() {
    setError(null)

    if (!form.nama.trim()) {
      setError('Nama lengkap wajib diisi')
      return
    }

    if (!form.no_hp.trim()) {
      setError('No. HP wajib diisi')
      return
    }

    dispatch({ type: 'step_changed', step: 'extra' })
  }

  async function handleSubmit() {
    setError(null)

    if (form.tanggal_lahir && !/^\d{4}-\d{2}-\d{2}$/.test(form.tanggal_lahir)) {
      setError('Format tanggal lahir tidak valid')
      return
    }
    if (!form.profesi.trim()) {
      setError('Profesi wajib diisi')
      return
    }

    if (!form.domisili.trim()) {
      setError('Domisili wajib diisi')
      return
    }

    setLoading(true)

    const result = await submitProfile(form)

    if (!result.ok) {
      setError(result.error)
      setLoading(false)
      return
    }

    handleProfileCompleted()
    setLoading(false)
  }

  return (
    <>
      {triggerLabel && !open && (
        <button
          type="button"
          onClick={openPrompt}
          style={{
            background: '#111827',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: 10,
            fontWeight: 700,
            border: 0,
            cursor: 'pointer',
          }}
        >
          {triggerLabel}
        </button>
      )}

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-onboarding-title"
          tabIndex={-1}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(17, 24, 39, 0.48)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            overflowY: 'auto',
            outline: 'none',
          }}
        >
          <section
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              color: '#111827',
              borderRadius: 22,
              boxShadow: '0 24px 80px rgba(17, 24, 39, 0.28)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '24px 24px 12px' }}>
              <ProgressDots step={step} />
              <button
                type="button"
                onClick={closePrompt}
                aria-label="Tutup prompt profil"
                style={{
                  background: 'transparent',
                  border: 0,
                  color: '#6b7280',
                  width: 28,
                  height: 28,
                  fontSize: 20,
                  lineHeight: 1,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0 24px 24px',
              }}
            >
            <div ref={bodyRef} style={{ minHeight: minBodyHeight || undefined }}>
            {step === 'welcome' && (
              <div style={{ display: 'grid', gap: 18, textAlign: 'center' }}>
                <div aria-hidden="true" style={{ fontSize: 44 }}>
                  {mode === 'welcome' ? '🎉' : '👋'}
                </div>
                <div>
                  {mode === 'welcome' && (
                    <p style={{ color: '#047857', fontWeight: 800, marginBottom: 8 }}>
                      Akun berhasil dibuat
                    </p>
                  )}
                  <h1 id="profile-onboarding-title" style={{ fontSize: 30, lineHeight: 1.1, letterSpacing: -0.8 }}>
                    {mode === 'welcome' ? 'Selamat datang di TaburBarengUB' : 'Tinggal satu langkah lagi'}
                  </h1>
                  <p style={{ color: '#6b7280', lineHeight: 1.6, marginTop: 10 }}>
                    Sesi yang tersedia sudah menunggumu. Lengkapi profil agar kamu bisa mulai booking sesi.
                  </p>
                  <p style={{ color: '#6b7280', marginTop: 8, fontSize: 14 }}>
                    Hanya perlu sekitar satu menit.
                  </p>
                </div>

                <div style={{ border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e3a8a', borderRadius: 14, padding: 14, textAlign: 'left', lineHeight: 1.6 }}>
                  <strong>Mengapa kami membutuhkan data ini?</strong>
                  <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                    <li>Untuk booking dan tiket QR</li>
                    <li>Membantu panitia memahami profil peserta</li>
                    <li>Tidak ditampilkan kepada publik</li>
                  </ul>
                </div>

              </div>
            )}

            {step === 'identity' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <h1 id="profile-onboarding-title" style={{ fontSize: 28, lineHeight: 1.15, letterSpacing: -0.6 }}>
                    Identitas peserta
                  </h1>
                  <p style={{ color: '#6b7280', lineHeight: 1.6, marginTop: 8 }}>
                    Isi data dasar yang dibutuhkan untuk proses booking dan check-in.
                  </p>
                </div>

                <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  <span style={{ fontWeight: 700 }}>Nama Lengkap</span>
                  <input
                    value={form.nama}
                    onChange={updateField('nama')}
                    autoComplete="name"
                    required
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  <span style={{ fontWeight: 700 }}>Nama Panggilan</span>
                  <input
                    value={form.nama_panggilan}
                    onChange={updateField('nama_panggilan')}
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  <span style={{ fontWeight: 700 }}>No. HP</span>
                  <input
                    value={form.no_hp}
                    onChange={updateField('no_hp')}
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    style={inputStyle}
                  />
                </label>

                {error && (
                  <div role="alert" style={errorBoxStyle}>
                    {error}
                  </div>
                )}

              </div>
            )}

            {step === 'extra' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <h1 id="profile-onboarding-title" style={{ fontSize: 28, lineHeight: 1.15, letterSpacing: -0.6 }}>
                    Informasi tambahan
                  </h1>
                  <p style={{ color: '#6b7280', lineHeight: 1.6, marginTop: 8 }}>
                    Data ini membantu panitia memahami profil peserta dan menyusun program yang lebih relevan.
                  </p>
                </div>

                <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  <span style={{ fontWeight: 700 }}>Tanggal Lahir</span>
                  <input
                    type="date"
                    value={form.tanggal_lahir}
                    onChange={updateField('tanggal_lahir')}
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  <span style={{ fontWeight: 700 }}>Profesi</span>
                  <input
                    value={form.profesi}
                    onChange={updateField('profesi')}
                    required
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  <span style={{ fontWeight: 700 }}>Domisili</span>
                  <input
                    value={form.domisili}
                    onChange={updateField('domisili')}
                    required
                    style={inputStyle}
                  />
                </label>

                {error && (
                  <div role="alert" style={errorBoxStyle}>
                    {error}
                  </div>
                )}
              </div>
            )}
            </div>
            </div>

            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid #e5e7eb', padding: '16px 24px' }}>
              {step === 'welcome' && (
                <>
                  <button type="button" onClick={closePrompt} style={{ background: 'transparent', color: '#6b7280', border: 0, borderRadius: 10, padding: '11px 16px', fontWeight: 800, cursor: 'pointer' }}>
                    Nanti dulu
                  </button>
                  <button type="button" onClick={goToIdentity} style={primaryButtonStyle(false)}>
                    Mulai
                  </button>
                </>
              )}

              {step === 'identity' && (
                <>
                  <button type="button" onClick={() => { setError(null); dispatch({ type: 'step_changed', step: 'welcome' }) }} style={{ background: '#fff', color: '#111827', border: '1px solid #d1d5db', borderRadius: 10, padding: '11px 16px', fontWeight: 800, cursor: 'pointer' }}>
                    Kembali
                  </button>
                  <button type="button" onClick={goToExtra} style={primaryButtonStyle(false)}>
                    Lanjut
                  </button>
                </>
              )}

              {step === 'extra' && (
                <>
                  <button type="button" onClick={() => { setError(null); dispatch({ type: 'step_changed', step: 'identity' }) }} disabled={loading} style={{ background: '#fff', color: '#111827', border: '1px solid #d1d5db', borderRadius: 10, padding: '11px 16px', fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>
                    Kembali
                  </button>
                  <button type="button" onClick={handleSubmit} disabled={loading} style={primaryButtonStyle(loading)}>
                    {loading ? 'Menyimpan...' : 'Simpan Profil'}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {showDismissedBanner && dismissed && !open && (
        <div
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 16,
            zIndex: 40,
            maxWidth: 720,
            margin: '0 auto',
            border: '1px solid #bfdbfe',
            background: '#eff6ff',
            color: '#1e3a8a',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 12px 40px rgba(17, 24, 39, 0.16)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <strong>👋 Tinggal satu langkah lagi</strong>
              <p style={{ marginTop: 4 }}>Lengkapi profil untuk mulai booking sesi.</p>
            </div>
            <button
              type="button"
              onClick={openPrompt}
              style={{
                background: '#111827',
                color: '#fff',
                border: 0,
                borderRadius: 10,
                padding: '10px 14px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Lengkapi Profil
            </button>
          </div>
        </div>
      )}
    </>
  )
}
