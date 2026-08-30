'use client'

import { useEffect, useReducer, useRef } from 'react'
import { BackLink } from '@/components/ui/back-link'
import { formatDateTimeCompact } from '@/lib/format'
import {
  canStopScanner,
  initialScannerState,
  isScannerBusy,
  scannerReducer,
  type CheckInResult,
  type ScannerState,
} from '@/features/checkin/client/scanner-reducer'

type CameraDevice = {
  id: string
  label: string
}

type ScannerStartConfig = {
  fps: number
  qrbox: { width: number; height: number }
  aspectRatio?: number
}

type Html5QrcodeScanner = {
  start: (
    cameraConfig: { facingMode: 'environment' } | { deviceId: { exact: string } },
    config: ScannerStartConfig,
    onSuccess: (decodedText: string) => void,
    onError?: (errorMessage: string) => void
  ) => Promise<void>
  stop: () => Promise<void>
  clear: () => Promise<void>
  isScanning: boolean
}

type Html5QrcodeModule = {
  Html5Qrcode: {
    new (elementId: string): Html5QrcodeScanner
    getCameras: () => Promise<CameraDevice[]>
  }
}

const READER_ELEMENT_ID = 'qr-scanner-reader'

function getStatusLabel(state: ScannerState) {
  switch (state.tag) {
    case 'idle':
      return 'Belum mulai'
    case 'starting':
      return 'Menyalakan kamera'
    case 'scanning':
      return 'Siap scan'
    case 'checking_in':
      return 'Memproses check-in'
    case 'success':
      return 'Check-in berhasil'
    case 'error':
      return 'Ada masalah'
    case 'stopped':
      return 'Scanner berhenti'
    default: {
      const unhandled: never = state
      throw new Error(`Unhandled scanner state: ${JSON.stringify(unhandled)}`)
    }
  }
}

function getStatusColor(state: ScannerState) {
  switch (state.tag) {
    case 'checking_in':
      return { background: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
    case 'scanning':
    case 'success':
      return { background: '#ecfdf5', color: '#047857', border: '#a7f3d0' }
    case 'error':
      return { background: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
    case 'idle':
    case 'starting':
    case 'stopped':
      return { background: '#f3f4f6', color: '#374151', border: '#e5e7eb' }
    default: {
      const unhandled: never = state
      throw new Error(`Unhandled scanner state: ${JSON.stringify(unhandled)}`)
    }
  }
}

export function AdminScannerClient() {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const processingRef = useRef(false)
  const [state, dispatch] = useReducer(scannerReducer, initialScannerState)

  async function stopCameraResources() {
    const scanner = scannerRef.current
    if (!scanner) return

    try {
      if (scanner.isScanning) {
        await scanner.stop()
      }
      await scanner.clear()
    } catch {
      // Best-effort cleanup
    } finally {
      scannerRef.current = null
    }
  }

  async function handleStopClick() {
    await stopCameraResources()
    dispatch({ type: 'stopped' })
  }

  async function submitCheckIn(qrToken: string) {
    if (processingRef.current) return

    processingRef.current = true
    dispatch({ type: 'qr_scanned', qrToken })

    await stopCameraResources()

    try {
      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qr_token: qrToken }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { data?: CheckInResult; error?: unknown }
        | null

      if (!response.ok) {
        const message =
          typeof payload?.error === 'string'
            ? payload.error
            : 'Gagal memproses check-in, coba lagi'
        dispatch({ type: 'check_in_failed', message })
        return
      }

      if (payload?.data) {
        dispatch({ type: 'check_in_succeeded', result: payload.data })
      } else {
        dispatch({ type: 'check_in_failed', message: 'Response check-in tidak valid' })
      }
    } catch {
      dispatch({ type: 'check_in_failed', message: 'Tidak bisa terhubung ke server, coba lagi' })
    } finally {
      processingRef.current = false
    }
  }

  async function startScanner() {
    processingRef.current = false
    dispatch({ type: 'start_requested' })

    if (!navigator.mediaDevices?.getUserMedia) {
      dispatch({
        type: 'camera_unsupported',
        message: 'Browser ini tidak mendukung akses kamera. Coba Chrome Android atau Safari iOS terbaru.',
      })
      return
    }

    try {
      const { Html5Qrcode } = (await import('html5-qrcode')) as unknown as Html5QrcodeModule
      const scanner = new Html5Qrcode(READER_ELEMENT_ID)
      scannerRef.current = scanner

      const config: ScannerStartConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      }

      const onSuccess = (decodedText: string) => {
        const qrToken = decodedText.trim()
        if (qrToken.length > 0) {
          void submitCheckIn(qrToken)
        }
      }

      // Coba kamera belakang dulu. Kalau gagal, fallback ke daftar kamera.
      try {
        await scanner.start({ facingMode: 'environment' }, config, onSuccess)
      } catch {
        const cameras = await Html5Qrcode.getCameras()
        const fallbackCamera =
          cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ?? cameras[0]

        if (!fallbackCamera) {
          throw new Error('Tidak ada kamera yang terdeteksi')
        }

        await scanner.start(
          { deviceId: { exact: fallbackCamera.id } },
          config,
          onSuccess
        )
      }

      dispatch({ type: 'scanner_started' })
    } catch (err) {
      scannerRef.current = null
      dispatch({
        type: 'scanner_start_failed',
        message: err instanceof Error ? err.message : 'Gagal menyalakan scanner QR',
      })
    }
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      if (scanner?.isScanning) {
        void scanner.stop().finally(() => scanner.clear())
      }
    }
  }, [])

  const statusColor = getStatusColor(state)
  const busy = isScannerBusy(state)
  const scannedQrToken =
    state.tag === 'checking_in' ? state.qrToken : state.tag === 'error' ? state.qrToken : null

  return (
    <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 80px' }}>
        <BackLink style={{ display: 'inline-block', marginBottom: 20 }} />

        <section
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 20,
            padding: 24,
            boxShadow: '0 10px 30px rgba(17, 24, 39, 0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: '#6b7280', fontWeight: 700, marginBottom: 8 }}>Staff check-in</p>
              <h1 style={{ fontSize: 34, lineHeight: 1.1, letterSpacing: -0.8 }}>Scan QR</h1>
              <p style={{ color: '#4b5563', lineHeight: 1.7, marginTop: 12 }}>
                Arahkan kamera ke QR tiket peserta. Sistem akan validasi token dan menandai
                peserta sebagai checked-in jika tiket masih aktif.
              </p>
            </div>

            <span
              style={{
                flexShrink: 0,
                borderRadius: 999,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 800,
                background: statusColor.background,
                color: statusColor.color,
                border: `1px solid ${statusColor.border}`,
              }}
            >
              {getStatusLabel(state)}
            </span>
          </div>

          <div
            style={{
              marginTop: 22,
              border: '1px solid #d1d5db',
              background: '#111827',
              borderRadius: 16,
              padding: 12,
            }}
          >
            <div
              id={READER_ELEMENT_ID}
              style={{
                width: '100%',
                minHeight: 320,
                borderRadius: 12,
                overflow: 'hidden',
                background: '#0b1220',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={startScanner}
              disabled={busy}
              style={{
                background: busy ? '#9ca3af' : '#111827',
                color: '#ffffff',
                border: 0,
                borderRadius: 10,
                padding: '11px 16px',
                fontWeight: 800,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {state.tag === 'starting'
                ? 'Menyalakan kamera...'
                : state.tag === 'checking_in'
                  ? 'Memproses...'
                  : 'Mulai scan'}
            </button>
            <button
              type="button"
              onClick={handleStopClick}
              disabled={!canStopScanner(state)}
              style={{
                background: '#ffffff',
                color: '#111827',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                padding: '11px 16px',
                fontWeight: 800,
                cursor: canStopScanner(state) ? 'pointer' : 'not-allowed',
              }}
            >
              Stop
            </button>
          </div>

          {state.tag === 'checking_in' && (
            <div style={{ padding: 14, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', marginTop: 16, borderRadius: 12 }}>
              Memproses check-in...
            </div>
          )}

          {state.tag === 'success' && (
            <div role="status" style={{ padding: 18, border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#064e3b', marginTop: 16, borderRadius: 12 }}>
              <h2 style={{ marginBottom: 10, fontSize: 22 }}>Check-in berhasil</h2>
              <div style={{ display: 'grid', gap: 6, lineHeight: 1.6 }}>
                <p><strong>Nama:</strong> {state.result.nama}</p>
                <p><strong>Sesi:</strong> {state.result.nama_sesi}</p>
                <p><strong>Jadwal:</strong> {formatDateTimeCompact(state.result.tanggal_waktu)} WIB</p>
                <p><strong>Status:</strong> {state.result.booking_status}</p>
                <p><strong>Waktu check-in:</strong> {formatDateTimeCompact(state.result.checked_in_at)} WIB</p>
              </div>
            </div>
          )}

          {scannedQrToken && (
            <div style={{ padding: 14, border: '1px solid #e5e7eb', background: '#f9fafb', marginTop: 16, borderRadius: 12 }}>
              <strong>QR terbaca:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 8, color: '#4b5563' }}>{scannedQrToken}</pre>
            </div>
          )}

          {state.tag === 'error' && (
            <div role="alert" style={{ padding: 18, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', marginTop: 16, borderRadius: 12 }}>
              <strong>Gagal:</strong> {state.message}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
