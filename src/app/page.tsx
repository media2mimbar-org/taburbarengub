import Link from 'next/link'

export default function Landing() {
  return (
    <div style={{
      backgroundColor: '#fafafa',
      color: '#171717',
      maxWidth: 760,
      margin: '0 auto',
      padding: '48px 20px 80px'
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>TaburBarengUB</h1>
      <p style={{ fontSize: 16, marginBottom: '24px' }}>
        Platform event Tabur Bareng UB untuk info sesi, booking seat, dan QR check-in.
      </p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <Link href="/login" style={{ fontSize: 16, color: '#171717' }}>
          Masuk
        </Link>
        <Link href="/register" style={{ fontSize: 16, color: '#171717' }}>
          Daftar
        </Link>
      </div>
    </div>
  )
}