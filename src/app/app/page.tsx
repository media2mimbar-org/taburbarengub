import Link from 'next/link'
import { ProfileCompletionPrompt } from '@/features/profile/client/profile-completion-prompt'
import { createClient } from '@/lib/supabase/server'
import { getProfileGate } from '@/features/profile/server/profile-service'
import { formatDateTime } from '@/lib/format'

function bookingStatusLabel(status: string) {
  if (status === 'checked_in') return 'Sudah check-in'
  if (status === 'cancelled') return 'Tiket dibatalkan'
  return 'Sudah booking'
}

function bookingStatusBadgeStyle(status: string) {
  if (status === 'checked_in') {
    return {
      display: 'inline-flex',
      borderRadius: 999,
      padding: '4px 10px',
      fontSize: 12,
      fontWeight: 800,
      background: '#ecfdf5',
      color: '#047857',
      border: '1px solid #a7f3d0',
    } as const
  }

  if (status === 'cancelled') {
    return {
      display: 'inline-flex',
      borderRadius: 999,
      padding: '4px 10px',
      fontSize: 12,
      fontWeight: 800,
      background: '#fef2f2',
      color: '#b91c1c',
      border: '1px solid #fecaca',
    } as const
  }

  return {
    display: 'inline-flex',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 800,
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fde68a',
  } as const
}

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nowIso = new Date().toISOString()

  const [
    { data: hero },
    { data: upcomingSessionsData, error: upcomingSessionsError },
    { data: historySessionsData, error: historySessionsError },
    gate,
    { data: userBookings },
  ] = await Promise.all([
    supabase.from('hero_content').select('*').eq('id', 1).maybeSingle(),
    supabase
      .from('event_sessions')
      .select('*')
      .eq('status', 'published')
      .gte('tanggal_waktu', nowIso)
      .order('tanggal_waktu', { ascending: true }),
    supabase
      .from('event_sessions')
      .select('*')
      .eq('status', 'published')
      .lt('tanggal_waktu', nowIso)
      .order('tanggal_waktu', { ascending: false })
      .limit(6),
    getProfileGate(supabase, user?.id ?? null),
    user
      ? supabase
          .from('bookings')
          .select('id, session_id, status')
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
  ])

  const upcomingSessions = upcomingSessionsData ?? []
  const historySessions = historySessionsData ?? []
  const bookingBySessionId = new Map(
    (userBookings ?? []).map((booking) => [booking.session_id, booking])
  )
  // Profil hanya ada kalau gate berhasil membacanya. Tidak perlu memetakan
  // ulang field satu per satu — ProfileCompletionPrompt menerima baris utuh.
  const profile = gate.tag === 'complete' || gate.tag === 'incomplete' ? gate.profile : null
  const isAdmin = profile?.role === 'admin'

  return (
    <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
      <header
        style={{
          borderBottom: '1px solid #e5e7eb',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <Link href="/app" style={{ fontWeight: 800, fontSize: 18 }}>
            TaburBarengUB
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
            {user ? (
              <>
                <Link href="/tiket-saya">Tiket Saya</Link>
                {isAdmin && <Link href="/admin">Admin</Link>}
                <Link href="/logout">Keluar</Link>
              </>
            ) : (
              <>
                <Link href="/login">Masuk</Link>
                <Link
                  href="/register"
                  style={{
                    background: '#111827',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontWeight: 700,
                  }}
                >
                  Daftar
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* PRD 5.2 mewajibkan urutan tetap: (1) Judul Acara, (2) Filosofi "Tabur",
          (3) Tagline, (4) Profil pemateri — baru setelah itu daftar sesi.
          Sebelumnya Tagline dan Filosofi tertukar, dan keduanya terpecah ke dua
          kolom grid sehingga urutan bacanya tidak pernah sesuai PRD. Sekarang
          satu kolom berurutan; penataan visualnya diserahkan ke designer. */}
      <section style={{ background: '#ffffff' }}>
        <div
          style={{
            maxWidth: 760,
            margin: '0 auto',
            padding: '72px 20px 56px',
            display: 'grid',
            gap: 32,
          }}
        >
          {/* (1) Judul Acara */}
          <div>
            <p style={{ color: '#6b7280', fontWeight: 700, marginBottom: 12 }}>
              Program kajian berkelanjutan
            </p>
            <h1 style={{ fontSize: 48, lineHeight: 1.05, letterSpacing: -1.5 }}>
              {hero?.judul_acara ?? 'Tabur Bareng UB'}
            </h1>
          </div>

          {/* (2) Filosofi "Tabur" */}
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>Filosofi Tabur</h2>
            <p style={{ color: '#4b5563', lineHeight: 1.7 }}>
              {hero?.filosofi_tabur ??
                'Tabur adalah ikhtiar menebar ilmu dan menumbuhkan kesadaran melalui tadabbur yang bertahap, terarah, dan konsisten.'}
            </p>
          </div>

          {/* (3) Tagline / pesan inti program */}
          <p style={{ fontSize: 20, lineHeight: 1.6, color: '#374151' }}>
            {hero?.tagline ?? 'Tadabbur kekuatan muslimin yang tertidur'}
          </p>

          {/* (4) Profil singkat pemateri utama */}
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 18,
              padding: 24,
              background: '#f9fafb',
              display: 'flex',
              gap: 20,
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}
          >
            {hero?.foto_pemateri_url && (
              // Sengaja <img>, bukan next/image: URL-nya diisi admin lewat CMS
              // dan hostnya bisa berubah kapan saja, jadi tidak cocok dengan
              // images.remotePatterns yang harus ditulis di build config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.foto_pemateri_url}
                alt={`Foto ${hero.nama_pemateri ?? 'pemateri'}`}
                width={120}
                height={120}
                style={{ borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 220 }}>
              <h2 style={{ fontSize: 20, marginBottom: 12 }}>
                {hero?.nama_pemateri ?? 'Ustadz Budi Ashari'}
              </h2>
              <p style={{ color: '#4b5563', lineHeight: 1.7 }}>
                {hero?.bio_pemateri ??
                  'Profil singkat pemateri utama akan ditampilkan di sini. Konten ini dikelola sebagai konten global landing page.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a
              href="#sesi"
              style={{
                background: '#111827',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              Lihat Sesi
            </a>
            {!user && (
              <Link
                href="/register"
                style={{
                  background: '#f3f4f6',
                  color: '#111827',
                  padding: '12px 16px',
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                Buat Akun
              </Link>
            )}
          </div>
        </div>
      </section>

      <section id="sesi" style={{ maxWidth: 1120, margin: '0 auto', padding: '48px 20px 80px' }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>Sesi Mendatang</h2>
          <p style={{ color: '#6b7280' }}>
            Pilih sesi offline yang tersedia untuk melihat detail dan melakukan booking seat.
          </p>
        </div>

        {upcomingSessionsError && (
          <div role="alert" style={{ border: '1px solid #fecaca', background: '#fef2f2', padding: 16 }}>
            Gagal memuat sesi. Coba refresh halaman.
          </div>
        )}

        {!upcomingSessionsError && upcomingSessions.length === 0 && (
          <div style={{ border: '1px dashed #d1d5db', background: '#fff', padding: 24, borderRadius: 14 }}>
            Belum ada sesi published yang tersedia.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {upcomingSessions.map((session) => {
            const sisaKuota = Math.max(session.kapasitas - session.kuota_terisi, 0)
            const isFull = sisaKuota <= 0
            const existingBooking = bookingBySessionId.get(session.id)

            return (
              <article
                key={session.id}
                style={{
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  borderRadius: 16,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: 20, lineHeight: 1.3 }}>{session.nama_sesi}</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {existingBooking && (
                      <span style={bookingStatusBadgeStyle(existingBooking.status)}>
                        {bookingStatusLabel(existingBooking.status)}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ color: '#4b5563', lineHeight: 1.6 }}>
                  <p>{formatDateTime(session.tanggal_waktu)} WIB</p>
                  {session.lokasi_atau_link && <p>{session.lokasi_atau_link}</p>}
                </div>

                <p style={{ color: '#6b7280', lineHeight: 1.6, flex: 1 }}>
                  {session.deskripsi ?? 'Detail sesi akan ditampilkan di halaman detail.'}
                </p>

                <div style={{ fontSize: 14, color: '#374151' }}>
                  <strong>
                    Sisa kuota: {sisaKuota} / {session.kapasitas}
                  </strong>
                </div>

                {existingBooking && existingBooking.status !== 'cancelled' ? (
                  <Link
                    href={`/tiket-saya/${existingBooking.id}`}
                    style={{
                      textAlign: 'center',
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontWeight: 700,
                      background: '#111827',
                      color: '#ffffff',
                    }}
                  >
                    Lihat Tiket
                  </Link>
                ) : (
                  <Link
                    href={`/sesi/${session.id}`}
                    aria-disabled={isFull}
                    style={{
                      textAlign: 'center',
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontWeight: 700,
                      background: isFull ? '#f3f4f6' : '#111827',
                      color: isFull ? '#9ca3af' : '#ffffff',
                      pointerEvents: isFull ? 'none' : 'auto',
                    }}
                  >
                    {isFull ? 'Kuota Penuh' : 'Lihat Detail'}
                  </Link>
                )}
              </article>
            )
          })}
        </div>
      </section>

      {(historySessionsError || historySessions.length > 0) && (
        <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px 80px' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>Histori Sesi</h2>
            <p style={{ color: '#6b7280' }}>
              Arsip sesi yang sudah selesai. Untuk Fase 1, halaman ini bersifat informatif; replay video menyusul di fase berikutnya.
            </p>
          </div>

          {historySessionsError && (
            <div role="alert" style={{ border: '1px solid #fecaca', background: '#fef2f2', padding: 16 }}>
              Gagal memuat histori sesi. Coba refresh halaman.
            </div>
          )}

          {!historySessionsError && historySessions.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
              {historySessions.map((session) => {
                const existingBooking = bookingBySessionId.get(session.id)

                return (
                <article
                  key={session.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    borderRadius: 16,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: 20, lineHeight: 1.3 }}>{session.nama_sesi}</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {existingBooking && (
                        <span style={bookingStatusBadgeStyle(existingBooking.status)}>
                          {bookingStatusLabel(existingBooking.status)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ color: '#4b5563', lineHeight: 1.6 }}>
                    <p>{formatDateTime(session.tanggal_waktu)} WIB</p>
                    {session.lokasi_atau_link && <p>{session.lokasi_atau_link}</p>}
                  </div>

                  <p style={{ color: '#6b7280', lineHeight: 1.6, flex: 1 }}>
                    {session.deskripsi ?? 'Sesi ini sudah selesai.'}
                  </p>

                  <strong style={{ color: '#374151', fontSize: 14 }}>Sesi sudah selesai</strong>

                  <Link
                    href={
                      existingBooking && existingBooking.status !== 'cancelled'
                        ? `/tiket-saya/${existingBooking.id}`
                        : `/sesi/${session.id}`
                    }
                    style={{
                      textAlign: 'center',
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontWeight: 700,
                      background: existingBooking && existingBooking.status !== 'cancelled' ? '#111827' : '#f3f4f6',
                      color: existingBooking && existingBooking.status !== 'cancelled' ? '#ffffff' : '#111827',
                    }}
                  >
                    {existingBooking && existingBooking.status !== 'cancelled' ? 'Lihat Tiket' : 'Lihat Detail'}
                  </Link>
                </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Wireframe screen 1 meminta footer berisi info kontak / sosial media.
          Yang dirender di sini baru kerangkanya, karena kontak dan akun sosial
          yang asli belum ada di mana pun — tidak di hero_content, tidak di PRD.
          Menaruh nilai karangan di sini lebih buruk daripada mengosongkannya.
          Begitu panitia memberi datanya, tambahkan kolomnya ke hero_content
          supaya ikut bisa diedit lewat CMS admin, bukan di-hardcode. */}
      <footer style={{ borderTop: '1px solid #e5e7eb', background: '#ffffff' }}>
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '32px 20px',
            color: '#6b7280',
            fontSize: 14,
          }}
        >
          <p style={{ fontWeight: 700, color: '#111827' }}>
            {hero?.judul_acara ?? 'Tabur Bareng UB'}
          </p>
          <p style={{ marginTop: 6 }}>
            © {new Date().getFullYear()} — Program kajian berkelanjutan Al Fatih.
          </p>
        </div>
      </footer>

      {/*
        Hanya saat profil terbaca dan memang belum lengkap. Pada 'unavailable'
        form ini dijamin gagal (complete_user_profile() ber-UPDATE, bukan
        UPSERT, jadi baris yang hilang berujung TB404), jadi jangan ditawarkan.
      */}
      {gate.tag === 'incomplete' && (
        <ProfileCompletionPrompt profile={gate.profile} />
      )}
    </main>
  )
}
