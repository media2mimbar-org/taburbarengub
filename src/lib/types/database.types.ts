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
          status?: string
          tanggal_waktu?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_kloter_id_fkey"
            columns: ["kloter_id"]
            isOneToOne: false
            referencedRelation: "kloter_aktif"
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
          nomor: number
          season_id: string
          video_url: string | null
        }
        Insert: {
          id?: string
          judul: string
          nomor: number
          season_id: string
          video_url?: string | null
        }
        Update: {
          id?: string
          judul?: string
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
            referencedRelation: "kloter_aktif"
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
      kloter_phases: {
        Row: {
          closes_at: string
          id: string
          kloter_id: string
          opens_at: string
          override_active: boolean
          override_at: string | null
          override_by: string | null
          phase: Database["public"]["Enums"]["phase_type"]
        }
        Insert: {
          closes_at: string
          id?: string
          kloter_id: string
          opens_at: string
          override_active?: boolean
          override_at?: string | null
          override_by?: string | null
          phase: Database["public"]["Enums"]["phase_type"]
        }
        Update: {
          closes_at?: string
          id?: string
          kloter_id?: string
          opens_at?: string
          override_active?: boolean
          override_at?: string | null
          override_by?: string | null
          phase?: Database["public"]["Enums"]["phase_type"]
        }
        Relationships: [
          {
            foreignKeyName: "kloter_phases_kloter_id_fkey"
            columns: ["kloter_id"]
            isOneToOne: false
            referencedRelation: "kloter_aktif"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kloter_phases_kloter_id_fkey"
            columns: ["kloter_id"]
            isOneToOne: false
            referencedRelation: "kloters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kloter_phases_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kloters: {
        Row: {
          id: string
          kapasitas: number
          nomor: number
          season_id: string
          tanggal_mulai: string
          tanggal_selesai: string | null
        }
        Insert: {
          id?: string
          kapasitas: number
          nomor: number
          season_id: string
          tanggal_mulai: string
          tanggal_selesai?: string | null
        }
        Update: {
          id?: string
          kapasitas?: number
          nomor?: number
          season_id?: string
          tanggal_mulai?: string
          tanggal_selesai?: string | null
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
      seasons: {
        Row: {
          id: string
          nama: string
          nomor_kaidah: number
          status: string
          tanggal_mulai: string
          tanggal_selesai: string | null
        }
        Insert: {
          id?: string
          nama: string
          nomor_kaidah: number
          status?: string
          tanggal_mulai: string
          tanggal_selesai?: string | null
        }
        Update: {
          id?: string
          nama?: string
          nomor_kaidah?: number
          status?: string
          tanggal_mulai?: string
          tanggal_selesai?: string | null
        }
        Relationships: []
      }
      user_seasons: {
        Row: {
          id: string
          kloter_daftar_id: string
          season_id: string
          sumber: string
          tanggal_diperoleh: string
          user_id: string
        }
        Insert: {
          id?: string
          kloter_daftar_id: string
          season_id: string
          sumber: string
          tanggal_diperoleh?: string
          user_id: string
        }
        Update: {
          id?: string
          kloter_daftar_id?: string
          season_id?: string
          sumber?: string
          tanggal_diperoleh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_seasons_kloter_daftar_id_fkey"
            columns: ["kloter_daftar_id"]
            isOneToOne: false
            referencedRelation: "kloter_aktif"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_seasons_kloter_daftar_id_fkey"
            columns: ["kloter_daftar_id"]
            isOneToOne: false
            referencedRelation: "kloters"
            referencedColumns: ["id"]
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
      video_progress: {
        Row: {
          ditonton: boolean
          id: string
          jawaban_soal: Json | null
          kelas_id: string
          skor: number | null
          user_id: string
        }
        Insert: {
          ditonton?: boolean
          id?: string
          jawaban_soal?: Json | null
          kelas_id: string
          skor?: number | null
          user_id: string
        }
        Update: {
          ditonton?: boolean
          id?: string
          jawaban_soal?: Json | null
          kelas_id?: string
          skor?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_kelas_id_fkey"
            columns: ["kelas_id"]
            isOneToOne: false
            referencedRelation: "kelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_submissions: {
        Row: {
          created_at: string
          file_url: string
          id: string
          kloter_id: string
          nilai: Json | null
          status: string
          user_id: string
          versi: number
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          kloter_id: string
          nilai?: Json | null
          status?: string
          user_id: string
          versi?: number
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          kloter_id?: string
          nilai?: Json | null
          status?: string
          user_id?: string
          versi?: number
        }
        Relationships: [
          {
            foreignKeyName: "writing_submissions_kloter_id_fkey"
            columns: ["kloter_id"]
            isOneToOne: false
            referencedRelation: "kloter_aktif"
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
      kloter_aktif: {
        Row: {
          fase: Database["public"]["Enums"]["phase_type"] | null
          id: string | null
          kapasitas: number | null
          nomor: number | null
          season_id: string | null
          tanggal_mulai: string | null
          tanggal_selesai: string | null
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
      get_video_url: { Args: { p_kelas_id: string }; Returns: string }
      nilai_karya: {
        Args: { p_nilai: Json; p_submission_id: string }
        Returns: {
          created_at: string
          file_url: string
          id: string
          kloter_id: string
          nilai: Json | null
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
          nilai: Json | null
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
      phase_type:
        | "offline"
        | "pendaftaran"
        | "orientasi"
        | "menyimak"
        | "menulis_setor"
        | "wrapped"
        | "antara_kloter"
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
    Enums: {
      phase_type: [
        "offline",
        "pendaftaran",
        "orientasi",
        "menyimak",
        "menulis_setor",
        "wrapped",
        "antara_kloter",
      ],
    },
  },
} as const

