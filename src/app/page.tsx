import Link from 'next/link'
import {
  TaburMark,
  TaburWordmark,
  TaburLockup,
  HeroTreeScene,
} from '@/components/brand/tabur-brand'
import { Reveal } from '@/components/landing/reveal'
import { NavAuthButton } from '@/components/landing/nav-auth-button'

export default function LandingPage() {
  return (
    <>
      {/* ================= NAV ================= */}
      <nav className="nav">
        <div className="nav-inner">
          <TaburMark className="nav-mark" aria-hidden="true" />
          <div className="nav-links">
            <Link href="#program" className="hide-sm">
              Program
            </Link>
            <Link href="#kajian" className="hide-sm">
              Kajian
            </Link>
            <span className="sep hide-sm" />
            <NavAuthButton />
            <Link href="#program" className="daftar">
              Lihat Program
            </Link>
          </div>
        </div>
      </nav>

      {/* ================= HERO ================= */}
      <header className="hero">
        <div className="cloud c1" />
        <div className="cloud c2" />
        <div className="cloud c3" />

        <TaburWordmark
          className="hero-logo"
          variant="optik"
          aria-hidden="true"
        />
        <span
          className="visually-hidden"
          style={{ position: 'absolute', left: -9999 }}
        >
          tabur bareng UB
        </span>

        <p className="hero-tag">
          <span className="hero-script">tadabbur, bersama</span>
          <br />
          Belajar memahami Qur&rsquo;an dengan kaidah &mdash; bareng Ustadz Budi
          Ashari.
        </p>

        <div className="hero-actions">
          <Link className="btn btn-solid" href="#kajian">
            Ikut Kajian &mdash; Gratis
          </Link>
          <Link className="btn btn-ghost" href="#program">
            Lihat Program
          </Link>
        </div>

        <p className="hero-assure">
          Kajian terbuka untuk umum &mdash; datang saja, tanpa syarat apa pun.
        </p>

        <HeroTreeScene />
      </header>

      {/* ================= MAIN ================= */}
      <main>
        {/* ================= VIDEO ================= */}
        <section className="band video-band">
          <Reveal className="wrap">
            <h2 className="title">Apa Itu Tabur?</h2>
            <p className="lead" style={{ margin: '0 auto' }}>
              Kenali Tabur lewat satu tayangan singkat.
            </p>
            <div className="video-frame">
              <div className="play">
                <svg
                  width="22"
                  height="26"
                  viewBox="0 0 22 26"
                  aria-hidden="true"
                >
                  <path
                    d="M0 1.6 C0 .4 1.3-.3 2.3.3l18.4 11.4c1 .6 1 2 0 2.6L2.3 25.7c-1 .6-2.3-.1-2.3-1.3z"
                    fill="#2F3E4E"
                  />
                </svg>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ================= MANIFESTO ================= */}
        <section className="band">
          <Reveal className="wrap manifesto">
            <h2>
              Kenapa <span className="script dark">Tadabbur</span>
              <br />
              adalah satu-satunya
              <br />
              pilihan untuk
              <br />
              <span className="script dark">Memakmurkan</span>{' '}
              bumi?
            </h2>
            <div>
              <p>
                Kebanyakan manusia hari ini memahami Qur&apos;an hanya pada
                lapisan paling luar. Tapi kemudian kebanyakan manusia
                terburu-buru menyimpulkan bahwa Qur&apos;an tidak menyelesaikan
                masalah mereka.
              </p>
              <p>
                Padahal Allah juga telah memandu pada kita bagaimana caranya.
                Jelas tidak ada cara lain untuk memahami Qur&apos;an selain
                dengan Tadabbur. Perlu kaidah dan daya pikir agar tadabbur
                bekerja dalam seluruh lini kehidupan kita.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ================= KENAPA TABUR ================= */}
        <section className="band">
          <Reveal className="wrap split">
            <div className="media">Foto: menabur benih</div>
            <div>
              <h2 className="kenapa-heading">
                Kenapa
                <span className="kenapa-logo-line">
                  <TaburWordmark
                    className="wm-inline"
                    role="img"
                    aria-label="tabur"
                  />
                  <span className="kenapa-q">?</span>
                </span>
              </h2>
              <p>
                Tabur adalah sebuah gerakan yang meniru sebuah aktivitas penting
                dalam kehidupan bumi: tabur benih.
              </p>
              <p>
                Kalau dalam makna sesungguhnya tabur benih adalah sebuah awal
                menuju kemakmuran, maka mestinya sang penabur mesti memilih benih
                terbaik yang akan ditanam olehnya.
              </p>
              <p>
                Begitu pula Tabur. Kita akan pilihkan benih terbaik berupa
                ayat-ayat Allah, yang akan ditanam dengan proses bernama
                tadabbur, dipupuk dengan akal agar subur, akan sempurna dan
                kokoh dengan hati, sehingga membuat penanamnya terhibur.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ================= SANG GURU ================= */}
        <section className="band">
          <Reveal className="wrap split reverse">
            <div className="media masjid">Foto: Ustadz Budi Ashari</div>
            <div>
              <h2>
                <span className="guru-name">Ustadz Budi Ashari</span>
                <span className="guru-sub">Sang Guru</span>
              </h2>
              <p>
                Tabur adalah sebuah gerakan yang meniru sebuah aktivitas penting
                dalam kehidupan bumi: tabur benih.
              </p>
              <p>
                Kalau dalam makna sesungguhnya tabur benih adalah sebuah awal
                menuju kemakmuran, maka mestinya sang penabur mesti memilih benih
                terbaik yang akan ditanam olehnya.
              </p>
              <p>
                Begitu pula Tabur. Kita akan pilihkan benih terbaik berupa
                ayat-ayat Allah, yang akan ditanam dengan proses bernama
                tadabbur, dipupuk dengan akal agar subur, akan sempurna dan
                kokoh dengan hati, sehingga membuat penanamnya terhibur.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ================= PROGRAM / KELAS ================= */}
        <section
          className="band"
          id="program"
          style={{ background: 'var(--color-embun)' }}
        >
          <Reveal className="wrap">
            <p className="eyebrow">Kelas Online &mdash; 1 Kaidah, 1 Season</p>
            <h2 className="title">
              Belajar Tadabbur, Selangkah demi Selangkah
            </h2>
            <p className="lead">
              Empat belas kaidah tadabbur, dipelajari satu per satu. Setiap
              season kamu menuntaskan satu kaidah &mdash; menyimak, menulis,
              dibimbing mentor, sampai karya tadabburmu sendiri lahir.
            </p>

            <div className="steps">
              <div className="step">
                <div className="step-dot">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M14.8 9.2l-2 4.4-3.6 1.2 2-4.4z" />
                  </svg>
                </div>
                <span className="step-eyebrow">Langkah 1</span>
                <h3>Orientasi</h3>
                <p>Berkenalan dengan kelas, mentor, dan cara belajarnya.</p>
              </div>

              <div className="step">
                <div className="step-dot">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M10.2 8.6v6.8l5.6-3.4z" />
                  </svg>
                </div>
                <span className="step-eyebrow">Langkah 2</span>
                <h3>Menyimak</h3>
                <p>
                  Enam kelas video + soal pemahaman, ditutup sesi live bersama
                  Ustadz Budi.
                </p>
              </div>

              <div className="step">
                <div className="step-dot">
                  <svg viewBox="0 0 24 24">
                    <path d="M4.5 19.5l1.1-3.9L15.9 5.3a1.9 1.9 0 0 1 2.7 0l.1.1a1.9 1.9 0 0 1 0 2.7L8.4 18.4z" />
                    <path d="M13.8 7.4l2.8 2.8" />
                  </svg>
                </div>
                <span className="step-eyebrow">Langkah 3</span>
                <h3>Menulis &amp; Setor</h3>
                <p>
                  Menulis tadabburmu sendiri &mdash; dibaca dan dinilai langsung
                  oleh mentor.
                </p>
              </div>

              <div className="step">
                <div className="step-dot">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="9.5" r="5" />
                    <path d="M9.3 13.6L8 20.5l4-2.4 4 2.4-1.3-6.9" />
                  </svg>
                </div>
                <span className="step-eyebrow">Langkah 4</span>
                <h3>Sertifikat</h3>
                <p>
                  Tanda satu kaidah tuntas. Dan season-mu belum selesai: terus
                  menulis tiap bulan.
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: 36,
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                flexWrap: 'wrap',
              }}
            >
              <Link className="btn btn-solid" href="/login">
                Lihat Detail Program
              </Link>
              <span className="chip">
                Pendaftaran dibuka berkala &mdash; rombongan terbatas 300 kursi
              </span>
            </div>
          </Reveal>
        </section>

        {/* ================= KAJIAN TERDEKAT ================= */}
        <section className="band" id="kajian">
          <Reveal className="wrap">
            <p className="eyebrow">Kajian Offline &mdash; Gratis</p>
            <h2 className="title">Rasakan Dulu Tadabburnya</h2>
            <p className="lead">
              Kajian tatap muka bersama Ustadz Budi Ashari &mdash; terbuka untuk
              umum, tanpa biaya. Di sinilah metode Tabur didemonstrasikan
              langsung.
            </p>

            <div
              className="cards"
              style={{
                marginTop: 34,
                gridTemplateColumns: 'minmax(260px, 460px)',
              }}
            >
              <article className="card card-light" style={{ minHeight: 0 }}>
                <span className="num">Terdekat</span>
                <h3>Kajian Tadabbur &mdash; Kaidah 1</h3>
                <p style={{ margin: '10px 0 18px' }}>
                  Ahad, 19 Oktober &middot; 08.00 WIB
                  <br />
                  Masjid Raya UB &middot; tersedia Kids Corner
                </p>
                <Link className="chip" href="/login">
                  Amankan kursi &mdash; gratis
                </Link>
              </article>
            </div>
          </Reveal>
        </section>

        {/* ================= STATS ================= */}
        <section className="band" style={{ paddingTop: 0 }}>
          <Reveal className="wrap">
            <div className="stats">
              <div className="stat">
                <div className="n">1</div>
                <div className="l">Season Berjalan</div>
              </div>
              <div className="stat">
                <div className="n">1.500</div>
                <div className="l">Peserta Kajian</div>
              </div>
              <div className="stat">
                <div className="n">200</div>
                <div className="l">Karya Tadabbur</div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer>
        <div className="footer-inner">
          <TaburLockup />
          <div className="find">
            <h2>Find Us</h2>
            <div className="socials">
              <a href="#" aria-label="Instagram">
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.8"
                >
                  <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
                  <circle cx="12" cy="12" r="4.4" />
                  <circle cx="17.6" cy="6.4" r="1.1" fill="#fff" stroke="none" />
                </svg>
              </a>
              <a href="#" aria-label="YouTube">
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.8"
                >
                  <rect x="2" y="5" width="20" height="14" rx="4.5" />
                  <path d="M10.4 9.2 L15 12 l-4.6 2.8z" fill="#fff" stroke="none" />
                </svg>
              </a>
              <a href="#" aria-label="WhatsApp">
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                >
                  <path d="M3.4 20.6 4.8 16.4A8.3 8.3 0 1 1 8 19.4z" />
                  <path
                    d="M8.9 8.3c.3-.1.7 0 .9.4l.7 1.3c.1.3.1.6-.1.8l-.5.6c.6 1.1 1.5 2 2.6 2.6l.6-.5c.2-.2.5-.2.8-.1l1.3.7c.4.2.5.6.4.9-.3.8-1.1 1.3-2 1.2-2.8-.4-5.3-2.9-5.7-5.7-.1-.9.3-1.7 1-2.2z"
                    fill="#fff"
                    stroke="none"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <p className="colophon">Tabur Bareng UB &middot; Media 2Mimbar</p>
      </footer>
    </>
  )
}
