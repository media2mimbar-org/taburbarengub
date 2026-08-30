import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import type { CompleteProfileInput, UpdateProfileInput } from '@/features/profile/shared/profile.schema'

type UserProfile = Database['public']['Tables']['users']['Row']

export class ProfileError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
  }
}

const PETA_ERROR: Record<string, { pesan: string; status: number }> = {
  '28000': { pesan: 'Kamu harus login dulu', status: 401 },
  '22000': { pesan: 'Data profil tidak valid', status: 400 },
  P0002: { pesan: 'Profil pengguna tidak ditemukan', status: 404 },
  TB401: { pesan: 'Nama lengkap wajib diisi', status: 400 },
  TB402: { pesan: 'No. HP wajib diisi', status: 400 },
  TB403: { pesan: 'Usia wajib diisi dan harus lebih dari 0', status: 400 },
  TB404: { pesan: 'Profile tidak ditemukan', status: 404 },
  TB405: { pesan: 'Profesi wajib diisi', status: 400 },
  TB406: { pesan: 'Domisili wajib diisi', status: 400 },
}

export async function updateUserProfile(
  supabase: SupabaseClient<Database>,
  input: UpdateProfileInput
): Promise<UserProfile> {
  const { data, error } = await supabase
    .rpc('update_profile', {
      p_nama: input.nama,
      p_nama_panggilan: input.nama_panggilan,
      p_no_hp: input.no_hp,
      p_jenis_kelamin: input.jenis_kelamin,
      p_usia: input.usia,
      p_profesi: input.profesi,
      p_domisili: input.domisili,
    })
    .single()

  if (error) {
    const dikenal = error.code ? PETA_ERROR[error.code] : undefined

    if (dikenal) {
      throw new ProfileError(dikenal.pesan, dikenal.status)
    }

    console.error('update_profile: errcode tidak dikenal', error.code, error.message)
    throw new ProfileError('Gagal menyimpan profil, coba lagi', 500)
  }

  return data as UserProfile
}

export async function completeUserProfile(
  supabase: SupabaseClient<Database>,
  input: CompleteProfileInput
): Promise<UserProfile> {
  return updateUserProfile(supabase, input)
}

/**
 * Keadaan profil user terhadap syarat booking.
 *
 * Menggantikan pola `!profile?.profile_completed` yang dipakai terpisah di
 * beberapa halaman. Pola itu memampatkan empat keadaan berbeda jadi satu
 * boolean, sehingga query yang gagal tidak bisa dibedakan dari profil yang
 * memang belum diisi — dan keduanya berujung menampilkan form.
 */
export type ProfileGate =
  /** Belum login. */
  | { tag: 'anonymous' }
  /**
   * Profil tidak bisa dipastikan. Jangan menawarkan form lengkapi profil di
   * keadaan ini: kalau barisnya memang hilang, complete_user_profile()
   * melakukan UPDATE (bukan UPSERT) sehingga selalu gagal dengan TB404.
   */
  | { tag: 'unavailable'; reason: 'query_failed' | 'row_missing' }
  /** Profil ada tapi belum lengkap — booking akan ditolak TB106. */
  | { tag: 'incomplete'; profile: UserProfile }
  /** Profil lengkap, boleh booking. */
  | { tag: 'complete'; profile: UserProfile }

/** ProfileGate untuk pemanggil yang sudah memastikan user-nya login. */
export type AuthenticatedProfileGate = Exclude<ProfileGate, { tag: 'anonymous' }>

/**
 * Membaca profil user dan menyimpulkan keadaannya dalam satu tempat.
 *
 * `userId` null berarti belum login, supaya pemanggil tidak perlu menyiapkan
 * cabang sendiri sebelum memanggil. Kalau userId dipastikan ada (halaman yang
 * sudah redirect ke /login lebih dulu), overload pertama membuang varian
 * 'anonymous' dari hasilnya supaya tidak ada cabang mati di pemanggil.
 */
export async function getProfileGate(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AuthenticatedProfileGate>
export async function getProfileGate(
  supabase: SupabaseClient<Database>,
  userId: string | null
): Promise<ProfileGate>
export async function getProfileGate(
  supabase: SupabaseClient<Database>,
  userId: string | null
): Promise<ProfileGate> {
  if (userId === null) {
    return { tag: 'anonymous' }
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('getProfileGate: gagal membaca profil', error.code, error.message)
    return { tag: 'unavailable', reason: 'query_failed' }
  }

  if (data === null) {
    // Akun ada di auth.users tapi barisnya di public.users tidak ada — dua
    // tabel terpisah, dijembatani trigger handle_new_user() yang cuma jalan
    // saat INSERT, jadi penghapusan di satu sisi tidak tersinkron.
    console.error('getProfileGate: baris public.users hilang untuk', userId)
    return { tag: 'unavailable', reason: 'row_missing' }
  }

  const isComplete = Boolean(
    data.nama &&
      data.nama.trim() !== '' &&
      data.no_hp &&
      data.no_hp.trim() !== ''
  )

  return isComplete
    ? { tag: 'complete', profile: data }
    : { tag: 'incomplete', profile: data }
}

export function hasWhatsAppNumber(profile: UserProfile | null | undefined): boolean {
  return Boolean(profile?.no_hp && profile.no_hp.trim() !== '')
}
