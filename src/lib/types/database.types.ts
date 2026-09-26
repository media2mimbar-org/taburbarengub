export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          checked_in_at: string | null
          created_at: string
          id: string
          jumlah_anak: number
          qr_token: string
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          id?: string
          jumlah_anak?: number
          qr_token: string
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          id?: string
          jumlah_anak?: number
          qr_token?: string
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "event_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          id: string
          issued_at: string
          jenis: string
          nama_penerima: string
          user_id: string
          user_season_id: string
        }
        Insert: {
          id?: string
          issued_at?: string
          jenis: string
          nama_penerima: string
          user_id: string
          user_season_id: string
        }
        Update: {
          id?: string
          issued_at?: string
          jenis?: string
          nama_penerima?: string
          user_id?: string
          user_season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_season_id_fkey"
            columns: ["user_season_id"]
            isOneToOne: false
            referencedRelation: "user_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sessions: {
        Row: {
          created_at: string
          deskripsi: string | null
          id: string
          kapasitas: number
          kapasitas_kids: number
          kloter_id: string | null
          kuota_kids_terisi: number
          kuota_terisi: number
          lokasi_atau_link: string | null
          nama_sesi: string
          rekaman_url: string | null
          status: string
          tanggal_waktu: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          id?: string
          kapasitas: number
          kapasitas_kids?: number
          kloter_id?: string | null
          kuota_kids_terisi?: number
          kuota_terisi?: number
          lokasi_atau_link?: string | null
          nama_sesi: string
          rekaman_url?: string | null
          status?: string
          tanggal_waktu: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          id?: string
          kapasitas?: number
          kapasitas_kids?: number
          kloter_id?: string | null
          kuota_kids_terisi?: number
          kuota_terisi?: number
          lokasi_atau_link?: string | null
          nama_sesi?: string
          rekaman_url?: string | null
          status?: string
          tanggal_waktu?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_kloter_id_fkey"
            columns: ["kloter_id"]
            isOneToOne: false
            referencedRelation: "kloter_dalam_fase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sessions_kloter_id_fkey"
            columns: ["kloter_id"]
            isOneToOne: false
            referencedRelation: "kloters"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_content: {
        Row: {
          bio_pemateri: string | null
          filosofi_tabur: string | null
          foto_pemateri_url: string | null
          id: number
          judul_acara: string
          nama_pemateri: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          bio_pemateri?: string | null
          filosofi_tabur?: string | null
          foto_pemateri_url?: string | null
          id?: number
          judul_acara?: string
          nama_pemateri?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          bio_pemateri?: string | null
          filosofi_tabur?: string | null
          foto_pemateri_url?: string | null
          id?: number
          judul_acara?: string
          nama_pemateri?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kelas: {
        Row: {
          id: string
          judul: string
          jumlah_soal_tampil: number
          nomor: number
          season_id: string
          video_url: string | null
        }
        Insert: {
          id?: string
          judul: string
          jumlah_soal_tampil?: number
          nomor: number
          season_id: string
          video_url?: string | null
        }
        Update: {
          id?: string
          judul?: string
          jumlah_soal_tampil?: number
          nomor?: number
          season_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kelas_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      kloter_mentors: {
        Row: {
          created_at: string
          id: string
          kloter_id: string
          mentor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kloter_id: string
          mentor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kloter_id?: string
          mentor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kloter_mentors_kloter_id_fkey"
            columns: ["kloter_id"]
            isOneToOne: false
            referencedRelation: "kloter_dalam_fase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kloter_mentors_kloter_id_fkey"
            columns: ["kloter_id"]
            isOneToOne: false
            referencedRelation: "kloters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kloter_mentors_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kloters: {
        Row: {
          ambang_pengingat: string
          id: string
          kapasitas: number
          livestream_at: string | null
          livestream_url: string | null
          nomor: number
          season_id: string
          status: string
          tanggal_mulai: string
          tanggal_selesai: string | null
          target_penilaian: string | null
          tgl_mulai_menyimak: string
          tgl_mulai_orientasi: string
          tgl_mulai_setor: string
          tgl_tenggat_setor: string
        }
        Insert: {
          ambang_pengingat?: string
          id?: string
          kapasitas: number
          livestream_at?: string | null
          livestream_url?: string | null
          nomor: number
          season_id: string
          status?: string
          tanggal_mulai: string
          tanggal_selesai?: string | null
          target_penilaian?: string | null
          tgl_mulai_menyimak: string
          tgl_mulai_orientasi: string
          tgl_mulai_setor: string
          tgl_tenggat_setor: string
        }
        Update: {
          ambang_pengingat?: string
          id?: string
          kapasitas?: number
          livestream_at?: string | null
          livestream_url?: string | null
          nomor?: number
          season_id?: string
          status?: string
          tanggal_mulai?: string
          tanggal_selesai?: string | null
          target_penilaian?: string | null
          tgl_mulai_menyimak?: string
          tgl_mulai_orientasi?: string
          tgl_mulai_setor?: string
          tgl_tenggat_setor?: string
        }
        Relationships: [
          {
            foreignKeyName: "kloters_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      kuis_peserta: {
        Row: {
          id: string
          jawaban_soal: Json | null
          kelas_id: string
          skor: number | null
          soal_terpilih: string[]
          user_id: string
        }
        Insert: {
          id?: string
          jawaban_soal?: Json | null
          kelas_id: string
          skor?: number | null
          soal_terpilih?: string[]
          user_id: string
        }
        Update: {
          id?: string
          jawaban_soal?: Json | null
          kelas_id?: string
          skor?: number | null
          soal_terpilih?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kuis_peserta_kelas_id_fkey"
            columns: ["kelas_id"]
            isOneToOne: false
            referencedRelation: "kelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kuis_peserta_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      naskah_dibaca: {
        Row: {
          dibaca_at: string
          mentor_id: string
          submission_id: string
        }
        Insert: {
          dibaca_at?: string
          mentor_id: string
          submission_id: string
        }
        Update: {
          dibaca_at?: string
          mentor_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "naskah_dibaca_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naskah_dibaca_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "naskah_mengikat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naskah_dibaca_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "writing_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      penilaian_naskah: {
        Row: {
          dinilai_at: string
          dinilai_oleh: string
          nilai: Json
          submission_id: string
        }
        Insert: {
          dinilai_at?: string
          dinilai_oleh: string
          nilai: Json
          submission_id: string
        }
        Update: {
          dinilai_at?: string
          dinilai_oleh?: string
          nilai?: Json
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "penilaian_naskah_dinilai_oleh_fkey"
            columns: ["dinilai_oleh"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penilaian_naskah_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "naskah_mengikat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penilaian_naskah_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "writing_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          id: string
          nama: string
          nomor_kaidah: number
          tanggal_mulai: string
          tanggal_selesai: string | null
          terbit: boolean
        }
        Insert: {
          id?: string
          nama: string
          nomor_kaidah: number
          tanggal_mulai: string
          tanggal_selesai?: string | null
          terbit?: boolean
        }
        Update: {
          id?: string
          nama?: string
          nomor_kaidah?: number
          tanggal_mulai?: string
          tanggal_selesai?: string | null
          terbit?: boolean
        }
        Relationships: []
      }
      soal: {
        Row: {
          aktif: boolean
          created_at: string
          id: string
          kelas_id: string
          kunci: number
          pertanyaan: string
          pilihan: Json
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          id?: string
          kelas_id: string
          kunci: number
          pertanyaan: string
          pilihan: Json
        }
        Update: {
          aktif?: boolean
          created_at?: string
          id?: string
          kelas_id?: string
          kunci?: number
          pertanyaan?: string
          pilihan?: Json
        }
        Relationships: [
          {
            foreignKeyName: "soal_kelas_id_fkey"
            columns: ["kelas_id"]
            isOneToOne: false
            referencedRelation: "kelas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_seasons: {
        Row: {
          id: string
          jenis: string
          kloter_daftar_id: string | null
          season_id: string
          sumber: string
          tanggal_diperoleh: string
          user_id: string
        }
        Insert: {
          id?: string
          jenis: string
          kloter_daftar_id?: string | null
          season_id: string
          sumber: string
          tanggal_diperoleh?: string
          user_id: string
        }
        Update: {
          id?: string
          jenis?: string
          kloter_daftar_id?: string | null
          season_id?: string
          sumber?: string
          tanggal_diperoleh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kloter_daftar_se_season"
            columns: ["kloter_daftar_id", "season_id"]
            isOneToOne: false
            referencedRelation: "kloter_dalam_fase"
            referencedColumns: ["id", "season_id"]
          },
          {
            foreignKeyName: "kloter_daftar_se_season"
            columns: ["kloter_daftar_id", "season_id"]
            isOneToOne: false
            referencedRelation: "kloters"
            referencedColumns: ["id", "season_id"]
          },
          {
            foreignKeyName: "user_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_seasons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          domisili: string | null
          email: string
          id: string
          jenis_kelamin: string | null
          nama: string | null
          nama_panggilan: string | null
          no_hp: string | null
          profesi: string | null
          role: string
          tanggal_lahir: string | null
        }
        Insert: {
          created_at?: string
          domisili?: string | null
          email: string
          id: string
          jenis_kelamin?: string | null
          nama?: string | null
          nama_panggilan?: string | null
          no_hp?: string | null
          profesi?: string | null
          role?: string
          tanggal_lahir?: string | null
        }
        Update: {
          created_at?: string
          domisili?: string | null
          email?: string
          id?: string
          jenis_kelamin?: string | null
          nama?: string | null
          nama_panggilan?: string | null
          no_hp?: string | null
          profesi?: string | null
          role?: string
          tanggal_lahir?: string | null
        }
        Relationships: []
      }
      writing_submissions: {
        Row: {
          created_at: string
          file_url: string
          id: string
          kloter_id: string
          status: string
          user_id: string
          versi: number
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          kloter_id: string
          status?: string
          user_id: string
          versi?: number
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          kloter_id?: string
          status?: string
          user_id?: string
          versi?: number
        }
        Relationships: [
          {
            foreignKeyName: "writing_submissions_kloter_id_fkey"
            columns: ["kloter_id"]
            isOneToOne: false
            referencedRelation: "kloter_dalam_fase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_submissions_kloter_id_fkey"
            columns: ["kloter_id"]
            isOneToOne: false
            referencedRelation: "kloters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      kloter_dalam_fase: {
        Row: {
          ambang_pengingat: string | null
          fase: string | null
          id: string | null
          kapasitas: number | null
          livestream_at: string | null
          nomor: number | null
          season_id: string | null
          status: string | null
          tanggal_mulai: string | null
          tgl_mulai_menyimak: string | null
          tgl_mulai_orientasi: string | null
          tgl_mulai_setor: string | null
          tgl_tenggat_setor: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kloters_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      naskah_mengikat: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string | null
          kloter_id: string | null
          status: string | null
          user_id: string | null
          versi: number | null
        }
        Relationships: [
          {
            foreignKeyName: "writing_submissions_kloter_id_fkey"
            columns: ["kloter_id"]
            isOneToOne: false
            referencedRelation: "kloter_dalam_fase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_submissions_kloter_id_fkey"
            columns: ["kloter_id"]
            isOneToOne: false
            referencedRelation: "kloters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_in_booking: {
        Args: { p_qr_token: string }
        Returns: {
          booking_id: string
          booking_status: string
          checked_in_at: string
          nama: string
          nama_sesi: string
          session_id: string
          tanggal_waktu: string
          user_id: string
        }[]
      }
      create_booking: {
        Args: { p_jumlah_anak?: number; p_session_id: string }
        Returns: {
          checked_in_at: string | null
          created_at: string
          id: string
          jumlah_anak: number
          qr_token: string
          session_id: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      daftarkan_peserta: {
        Args: { p_season_id: string; p_sumber: string; p_user_id: string }
        Returns: {
          id: string
          jenis: string
          kloter_daftar_id: string | null
          season_id: string
          sumber: string
          tanggal_diperoleh: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_seasons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_penulis_naskah: {
        Args: { p_kloter_id: string }
        Returns: {
          nama: string
          no_hp: string
          user_id: string
        }[]
      }
      get_season_peristiwa: {
        Args: { p_season_id: string }
        Returns: {
          jadwal: string
          jenis: string
          kloter_nomor: number
          media_url: string
        }[]
      }
      get_soal_kelas: {
        Args: { p_kelas_id: string }
        Returns: {
          id: string
          pertanyaan: string
          pilihan: Json
        }[]
      }
      get_status_kuis: {
        Args: { p_season_id: string }
        Returns: {
          kelas_id: string
          nomor: number
          status: string
        }[]
      }
      get_video_url: { Args: { p_kelas_id: string }; Returns: string }
      jawab_kuis: {
        Args: { p_jawaban: Json; p_kelas_id: string }
        Returns: {
          id: string
          jawaban_soal: Json | null
          kelas_id: string
          skor: number | null
          soal_terpilih: string[]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "kuis_peserta"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      koreksi_kunci: {
        Args: { p_kunci: number; p_soal_id: string }
        Returns: number
      }
      nilai_karya: {
        Args: { p_nilai: Json; p_submission_id: string }
        Returns: {
          created_at: string
          file_url: string
          id: string
          kloter_id: string
          status: string
          user_id: string
          versi: number
        }
        SetofOptions: {
          from: "*"
          to: "writing_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      setor_karya: {
        Args: { p_file_url: string }
        Returns: {
          created_at: string
          file_url: string
          id: string
          kloter_id: string
          status: string
          user_id: string
          versi: number
        }
        SetofOptions: {
          from: "*"
          to: "writing_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      status_siklus: {
        Args: { s: Database["public"]["Tables"]["seasons"]["Row"] }
        Returns: string
      }
      tandai_dibaca: {
        Args: { p_submission_id: string }
        Returns: {
          dibaca_at: string
          mentor_id: string
          submission_id: string
        }
        SetofOptions: {
          from: "*"
          to: "naskah_dibaca"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ubah_status_kloter: {
        Args: { p_aksi: string; p_kloter_id: string }
        Returns: {
          ambang_pengingat: string
          id: string
          kapasitas: number
          livestream_at: string | null
          livestream_url: string | null
          nomor: number
          season_id: string
          status: string
          tanggal_mulai: string
          tanggal_selesai: string | null
          target_penilaian: string | null
          tgl_mulai_menyimak: string
          tgl_mulai_orientasi: string
          tgl_mulai_setor: string
          tgl_tenggat_setor: string
        }
        SetofOptions: {
          from: "*"
          to: "kloters"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ubah_status_season: {
        Args: { p_aksi: string; p_season_id: string }
        Returns: {
          id: string
          nama: string
          nomor_kaidah: number
          tanggal_mulai: string
          tanggal_selesai: string | null
          terbit: boolean
        }
        SetofOptions: {
          from: "*"
          to: "seasons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_profile: {
        Args: {
          p_domisili?: string
          p_jenis_kelamin?: string
          p_nama?: string
          p_nama_panggilan?: string
          p_no_hp?: string
          p_profesi?: string
          p_tanggal_lahir?: string
        }
        Returns: {
          created_at: string
          domisili: string | null
          email: string
          id: string
          jenis_kelamin: string | null
          nama: string | null
          nama_panggilan: string | null
          no_hp: string | null
          profesi: string | null
          role: string
          tanggal_lahir: string | null
        }
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

